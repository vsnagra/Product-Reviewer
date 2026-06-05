import express from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import { Readable } from 'stream';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();

const upload = multer({ 
  dest: 'uploads/',
  limits: { fieldSize: 50 * 1024 * 1024 } // 50MB limit for base64 thumbnails
});

const router = express.Router();

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3011/api/youtube/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Store token persistently
const TOKEN_PATH = 'youtube_token.json';
let currentToken: any = null;

if (fs.existsSync(TOKEN_PATH)) {
  try {
    currentToken = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(currentToken);
  } catch (e) {
    console.error('Error reading youtube token file', e);
  }
}

router.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  });
  res.redirect(authUrl);
});

router.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    currentToken = tokens;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    // Redirect back to frontend with success
    res.redirect('http://localhost:3000/?youtube_auth=success');
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.redirect('http://localhost:3000/?youtube_auth=error');
  }
});

router.get('/status', (req, res) => {
  res.json({ isAuthenticated: !!currentToken });
});

router.get('/playlists', async (req, res) => {
  if (!currentToken) return res.status(401).json({ error: 'Not authenticated' });
  try {
    oauth2Client.setCredentials(currentToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const response = await youtube.playlists.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50
    });
    res.json(response.data.items || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/outputs', (req, res) => {
  const outputsDir = 'outputs';
  if (!fs.existsSync(outputsDir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(outputsDir).filter(f => f.endsWith('.mp4'));
  res.json(files.map(f => ({ filename: f, path: `outputs/${f}` })));
});

router.post('/upload', upload.single('videoFile'), async (req, res) => {
  if (!currentToken) {
    return res.status(401).json({ error: 'Not authenticated with YouTube' });
  }

  const { title, description, thumbnailBase64, playlistId, privacyStatus, madeForKids } = req.body;
  const videoPath = req.file ? req.file.path : req.body.videoPath;

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(400).json({ error: 'Video file does not exist or was not provided.' });
  }

  try {
    oauth2Client.setCredentials(currentToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Starting YouTube Video Upload...');
    
    // 1. Upload Video
    const fileSize = fs.statSync(videoPath).size;
    const resUpload = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || 'Incarnation Studios Render',
          description: description || '',
          tags: ['IncarnationStudios', 'Animation', 'Story'],
        },
        status: {
          privacyStatus: privacyStatus || 'private', // private default for safety
          selfDeclaredMadeForKids: madeForKids || false
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    }, {
      onUploadProgress: evt => {
        const progress = (evt.bytesRead / fileSize) * 100;
        console.log(`YouTube Upload Progress: ${Math.round(progress)}%`);
      },
    });

    const videoId = resUpload.data.id;
    console.log(`Video uploaded successfully! ID: ${videoId}`);

    // 2. Set Thumbnail
    if (thumbnailBase64 && videoId) {
      console.log('Uploading custom thumbnail...');
      const match = thumbnailBase64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], 'base64');
        const readable = Readable.from(buffer);
        await youtube.thumbnails.set({
          videoId: videoId,
          media: {
            body: readable,
          }
        });
        console.log('Thumbnail set successfully!');
      }
    }

    // 3. Add to Playlist
    if (playlistId && videoId) {
      console.log('Adding to playlist...');
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });
      console.log('Added to playlist successfully!');
    }

    res.json({ success: true, videoId: videoId });
  } catch (err: any) {
    console.error('Error during YouTube upload:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
