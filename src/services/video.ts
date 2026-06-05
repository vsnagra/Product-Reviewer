import { fetchFile } from '@ffmpeg/util';

let ffmpeg: any = null;

const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) {
    resolve();
    return;
  }
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => resolve();
  script.onerror = reject;
  document.head.appendChild(script);
});

export const getFFmpeg = async (onLog?: (msg: string) => void): Promise<any> => {
  const trace = (msg: string) => {
    const ts = new Date().toISOString().split('T')[1].replace('Z', '');
    if (onLog) onLog(`[${ts}] ${msg}`);
  };

  if (ffmpeg) {
    trace("[TRACE] FFmpeg instance already exists.");
    return ffmpeg;
  }
  trace("[TRACE] Instantiating new FFmpeg...");
  
  try {
    await loadScript('/ffmpeg/ffmpeg.js');
    const FFmpegClass = (window as any).FFmpegWASM.FFmpeg;
    ffmpeg = new FFmpegClass();
    
    if (onLog) {
      ffmpeg.on('log', ({ message }: { message: string }) => trace(`[FFMPEG CORE] ${message}`));
    }
  } catch (e) {
    trace(`[TRACE] Error loading FFmpeg script: ${e}`);
    throw e;
  }
  
  const errorHandler = (e: ErrorEvent) => trace(`[GLOBAL ERROR] ${e.message} at ${e.filename}:${e.lineno}`);
  window.addEventListener('error', errorHandler);
  
  // Load ffmpeg
  trace("[TRACE] Loading FFmpeg core...");
  try {
    trace("[TRACE] Calling ffmpeg.load()...");
    
    const loadPromise = ffmpeg.load({
      coreURL: new URL('/ffmpeg/ffmpeg-core.js', window.location.origin).href,
      wasmURL: new URL('/ffmpeg/ffmpeg-core.wasm', window.location.origin).href,
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("ffmpeg.load() timed out after 30 seconds")), 30000)
    );
    
    await Promise.race([loadPromise, timeoutPromise]);
    
    trace("[TRACE] FFmpeg core loaded successfully.");
  } catch (err) {
    trace(`[TRACE] Error loading FFmpeg: ${err}`);
    throw err;
  } finally {
    window.removeEventListener('error', errorHandler);
  }
  
  return ffmpeg;
};

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const createVideo = async (
  imageUrl: string,
  audioUrl: string,
  audioDuration: number,
  voiceOffset: number,
  onProgress: (progress: number) => void,
  onLog?: (message: string) => void
): Promise<string> => {
  const trace = (msg: string) => {
    const ts = new Date().toISOString().split('T')[1].replace('Z', '');
    console.log(`[${ts}] ${msg}`);
    if (onLog) onLog(`[${ts}] ${msg}`);
  };

  trace("[TRACE] Starting createVideo function...");

  try {
    trace("[TRACE] Calling getFFmpeg()...");
    const ff = await getFFmpeg(trace);
    trace("[TRACE] getFFmpeg() returned successfully.");
    
    const progressCallback = ({ progress }: { progress: number }) => {
      onProgress(progress * 100);
    };
    
    const logCallback = ({ message }: { message: string }) => {
      if (onLog) onLog(`[FFMPEG] ${message}`);
    };
    
    ff.on('progress', progressCallback);
    ff.on('log', logCallback);

    // Write files to FFmpeg virtual file system
    const imageFileName = 'image.png';
    const audioFileName = 'audio.mp3'; // Assuming mp3 or wav
    
    trace("[TRACE] Fetching image file...");
    let imageFile;
    try {
      if (imageUrl.startsWith('data:')) {
        imageFile = dataUrlToUint8Array(imageUrl);
      } else {
        imageFile = await fetchFile(imageUrl);
      }
    } catch (e) {
      throw new Error(`Failed to fetch image file: ${e instanceof Error ? e.message : String(e)}`);
    }
    trace(`[TRACE] Image file fetched. Writing to virtual FS...`);
    await ff.writeFile(imageFileName, imageFile);
    trace("[TRACE] Image file written to virtual FS.");

    trace("[TRACE] Fetching audio file...");
    let audioFile;
    try {
      if (audioUrl.startsWith('data:')) {
        audioFile = dataUrlToUint8Array(audioUrl);
      } else {
        audioFile = await fetchFile(audioUrl);
      }
    } catch (e) {
      throw new Error(`Failed to fetch audio file: ${e instanceof Error ? e.message : String(e)}`);
    }
    trace(`[TRACE] Audio file fetched. Writing to virtual FS...`);
    await ff.writeFile(audioFileName, audioFile);
    trace("[TRACE] Audio file written to virtual FS.");

    const totalDuration = audioDuration + (voiceOffset * 2);
    const outputFileName = 'output.mp4';

    // FFmpeg command to create video from image and audio
    // -loop 1: loop the single image
    // -i image.png: input image
    // -i audio.mp3: input audio
    // -t totalDuration: total duration of the video
    // -c:v libx264: H.264 codec
    // -preset ultrafast: Speed up encoding significantly
    // -profile:v high: High Profile
    // -pix_fmt yuv420p: Chroma Subsampling 4:2:0
    // -coder 1: CABAC
    // -bf 2: 2 consecutive B-frames
    // -g 12: Closed GOP, GOP length half of frame rate (24 / 2 = 12)
    // -s 3840x2160: 4K Resolution
    // -r 24: Frame Rate 24 fps
    // -movflags +faststart: Web Optimization with moov atom at the front
    // Audio delay: adelay=voiceOffset*1000|voiceOffset*1000
    
    const args = [
      '-loop', '1',
      '-framerate', '24',
      '-i', imageFileName,
      '-i', audioFileName,
    ];

    if (voiceOffset > 0) {
      args.push('-f', 'lavfi', '-t', voiceOffset.toString(), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
      args.push('-filter_complex', '[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[silence];[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[voice];[silence][voice]concat=n=2:v=0:a=1,apad[aud]');
      args.push('-map', '0:v');
      args.push('-map', '[aud]');
    } else {
      args.push('-filter_complex', '[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad[aud]');
      args.push('-map', '0:v');
      args.push('-map', '[aud]');
    }

    args.push(
      '-t', totalDuration.toString(),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-coder', '1',
      '-bf', '2',
      '-g', '12',
      '-s', '3840x2160',
      '-r', '24',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputFileName
    );

    trace(`[TRACE] Executing FFmpeg with args: ${args.join(' ')}`);
    const execResult = await ff.exec(args);
    trace(`[TRACE] FFmpeg execution completed with code: ${execResult}`);
    
    if (execResult !== 0) {
      throw new Error(`FFmpeg execution failed with code ${execResult}`);
    }

    ff.off('progress', progressCallback);
    ff.off('log', logCallback);

    trace("[TRACE] Reading output file from virtual FS...");
    const data = await ff.readFile(outputFileName);
    trace(`[TRACE] Output file read. Creating blob URL...`);
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    
    trace("[TRACE] Video creation complete.");
    return url;
  } catch (error) {
    trace(`[TRACE] ERROR caught in createVideo: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};
