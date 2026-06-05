import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { renderVideo } from './videoRenderer';
import youtubeRouter from './youtube';

const app = express();
const port = 3012;

app.use(cors());
app.use(express.json({ limit: '5000mb' }));

app.use('/api/youtube', youtubeRouter);

// Set up temporary storage for uploaded media assets
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fieldSize: 5000 * 1024 * 1024, // 5GB limit for massive JSON strings
    fileSize: 5000 * 1024 * 1024   // 5GB limit for large video files
  } 
});

// In-memory job state store
const jobs: Record<string, { status: string; progress: number; message: string; downloadUrl?: string; error?: string; traceLogs: string[] }> = {};

const uploadMiddleware = upload.any();

app.post('/api/transcode/start', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message, 'Field:', err.field);
      return res.status(400).json({ error: `Multer Error: ${err.message} on field '${err.field}'` });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(500).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const jobId = uuidv4();
    jobs[jobId] = { status: 'PENDING', progress: 0, message: 'Job initialized', traceLogs: [] };

    const files = (req.files || []) as Express.Multer.File[];
    
    for (const f of files) {
      if (f.size === 0) {
        throw new Error(`File ${f.fieldname} (${f.originalname}) is 0 bytes! The browser sent an empty file.`);
      }
    }
    console.log(`Received ${files.length} files. Total size: ${files.reduce((acc, f) => acc + f.size, 0)} bytes.`);
    
    // Extract parameters
    const settings = {
      startPageId: req.body.startPageId,
      endPageId: req.body.endPageId,
      voiceOffsetSecs: Number(req.body.voiceOffsetSecs),
      sfxGlobalCutOff: Number(req.body.sfxGlobalCutOff),
      imageSfxVolume: Number(req.body.imageSfxVolume),
      audioBackupMusicVolume: Number(req.body.audioBackupMusicVolume),
      audioBackupMusicLag: Number(req.body.audioBackupMusicLag),
      voiceAudioVolume: Number(req.body.voiceAudioVolume),
      mainSfxAudioVolume: Number(req.body.mainSfxAudioVolume),
      narratorVideoPosX: Number(req.body.narratorVideoPosX),
      narratorVideoPosY: Number(req.body.narratorVideoPosY),
      narratorVideoClipX1: Number(req.body.narratorVideoClipX1),
      narratorVideoClipX2: Number(req.body.narratorVideoClipX2),
      narratorVideoClipY1: Number(req.body.narratorVideoClipY1),
      narratorVideoClipY2: Number(req.body.narratorVideoClipY2),
      narratorVideoScale: Number(req.body.narratorVideoScale),
      pages: JSON.parse(req.body.pages || '[]')
    };

    const media = {
      introVideo: files.find(f => f.fieldname === 'introVideo')?.path,
      outroVideo: files.find(f => f.fieldname === 'outroVideo')?.path,
      transitionSfx: files.find(f => f.fieldname === 'transitionSfx')?.path,
      backupMusic: files.find(f => f.fieldname === 'backupMusic')?.path,
      narratorVideo: files.find(f => f.fieldname === 'narratorVideo')?.path
    };

    // Add a mapping of uploaded page media files
    console.log(`[DEBUG] Received files: ${files.map(f => f.fieldname).join(", ")}`);
    const uploadedPageMedia: Record<string, string> = {};
    files.forEach(f => {
      if (f.fieldname.startsWith('page_')) {
        uploadedPageMedia[f.fieldname] = f.path;
      }
    });

    // Run async so we don't block the HTTP response
    runJob(jobId, settings, media, uploadedPageMedia);

    res.json({ jobId });
  } catch (error: any) {
    console.error('Error starting transcode:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transcode/sync-durations', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    const narratorVideo = files.find(f => f.fieldname === 'narratorVideo')?.path;
    const pages = req.body.pages;
    
    if (!narratorVideo || !pages) {
      return res.status(400).json({ error: "Missing narratorVideo or pages JSON." });
    }

    const audioPath = path.join(process.cwd(), 'uploads', `${Date.now()}-audio.wav`);
    
    // Extract Audio
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y', '-i', narratorVideo, '-vn', '-c:a', 'pcm_s16le', '-ar', '16000', audioPath
      ]);
      ffmpeg.on('close', (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg audio extraction exited with code ${code}`));
      });
    });

    // Spawn Python Script
    const pythonScript = path.join(process.cwd(), 'server', 'sync_durations.py');
    const pythonProcess = spawn('python', [pythonScript, audioPath, pages]);
    
    let resultData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data: Buffer) => {
      resultData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data: Buffer) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code: number) => {
      // Clean up audio file
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      
      try {
        const jsonResult = JSON.parse(resultData);
        if (jsonResult.error) {
           return res.status(500).json({ error: jsonResult.error, stderr: errorData });
        }
        res.json(jsonResult);
      } catch (e) {
        res.status(500).json({ error: "Failed to parse Python output.", raw: resultData, stderr: errorData });
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sound-effects/scan', (req, res) => {
  try {
    const sfxDir = path.join(process.cwd(), 'public', 'sound-effects');
    if (!fs.existsSync(sfxDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(sfxDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transcode/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Serve the generated outputs
app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));

async function runJob(jobId: string, settings: any, media: any, uploadedPageMedia: Record<string, string>) {
  try {
    jobs[jobId].status = 'RUNNING';
    jobs[jobId].message = 'Configuring FFmpeg pipeline...';
    
    // Update progress callback
    const onProgress = (progress: number, message: string) => {
      jobs[jobId].progress = progress;
      jobs[jobId].message = message;
    };

    const onTrace = (log: string) => {
      console.log(`[TRACE] ${log}`);
      jobs[jobId].traceLogs.push(`[${new Date().toISOString()}] ${log}`);
    };

    const outputFileName = await renderVideo(settings, media, uploadedPageMedia, onProgress, onTrace);
    
    jobs[jobId].status = 'SUCCEEDED';
    jobs[jobId].progress = 100;
    jobs[jobId].message = 'Video rendering complete';
    jobs[jobId].downloadUrl = `/outputs/${outputFileName}`;

  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err);
    jobs[jobId].status = 'FAILED';
    jobs[jobId].error = err.message;
  }
}

app.listen(port, () => {
  console.log(`Video processing backend running on http://localhost:${port}`);
});
