import { spawn, exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function getMediaDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    const val = parseFloat(stdout.trim());
    console.log(`[DEBUG] ffprobe stdout for ${filePath}: "${stdout.trim()}", parsed as ${val}`);
    return isNaN(val) ? 0 : val;
  } catch (e) {
    console.log(`[DEBUG] ffprobe error for ${filePath}: ${e}`);
    return 0;
  }
}
import path from 'path';
import fs from 'fs/promises';

interface Settings {
  startPageId: string;
  endPageId: string;
  voiceOffsetSecs: number;
  sfxGlobalCutOff: number;
  imageSfxVolume: number;
  audioBackupMusicVolume: number;
  audioBackupMusicLag: number;
  voiceAudioVolume: number;
  mainSfxAudioVolume: number;
  narratorVideoPosX?: number;
  narratorVideoPosY?: number;
  narratorVideoClipX1?: number;
  narratorVideoClipX2?: number;
  narratorVideoClipY1?: number;
  narratorVideoClipY2?: number;
  narratorVideoScale?: number;
  pages: any[];
}

interface Media {
  introVideo?: string;
  outroVideo?: string;
  transitionSfx?: string;
  backupMusic?: string;
  narratorVideo?: string;
}

async function saveBase64File(dataUri: string, filePath: string) {
  if (!dataUri || !dataUri.startsWith('data:')) return null;
  const matches = dataUri.match(/^data:(.*?);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const buffer = Buffer.from(matches[2], 'base64');
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function renderVideo(settings: Settings, media: Media, uploadedPageMedia: Record<string, string>, onProgress: (progress: number, msg: string) => void, onTrace: (log: string) => void): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  const jobId = Date.now().toString();
  const outputName = `video_${jobId}.mp4`;
  const outputPath = path.join(process.cwd(), 'outputs', outputName);
  
  await fs.mkdir(path.join(process.cwd(), 'outputs'), { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });

  const inputs: string[] = [];
  const filterGraph: string[] = [];
  
  let inputIdx = 0;
  const addInput = (filePath: string) => {
    inputs.push('-i', filePath);
    return inputIdx++;
  };

  const uniformVideo = `scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,setsar=1,fps=24`;
  const uniformAudio = `aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo`;

  let timelineBlocks = 0;
  const vOuts: string[] = [];
  const aOuts: string[] = [];

  // ==========================================
  // INTRO (Common to both branches)
  // ==========================================
  if (media.introVideo) {
    const idx = addInput(media.introVideo);
    filterGraph.push(`[${idx}:v]${uniformVideo}[v_intro]`);
    filterGraph.push(`[${idx}:a]${uniformAudio}[a_intro]`);
    vOuts.push('[v_intro]');
    aOuts.push('[a_intro]');
    timelineBlocks++;
  }

  // ==========================================
  // NARRATOR VIDEO BRANCH
  // ==========================================
  if (media.narratorVideo) {
    onTrace("Detected Narrator Video! Using complex overlay pipeline.");
    
    // 1. Process Narrator Video
    const nvIdx = addInput(media.narratorVideo);
    const clipX1 = settings.narratorVideoClipX1 || 0;
    const clipX2 = settings.narratorVideoClipX2 || 0;
    const clipY1 = settings.narratorVideoClipY1 || 0;
    const clipY2 = settings.narratorVideoClipY2 || 0;
    const scale = (settings.narratorVideoScale || 100) / 100;
    const posX = settings.narratorVideoPosX || 0;
    const posY = settings.narratorVideoPosY || 0;

    // Crop then scale narrator video (trimming source media dead space before scaling). Also sanitize WebM timestamps.
    filterGraph.push(`[${nvIdx}:v]setpts=PTS-STARTPTS,crop=iw-(${clipX1}+${clipX2}):ih-(${clipY1}+${clipY2}):${clipX1}:${clipY1},scale=iw*${scale}:ih*${scale}[v_narrator_ready]`);
    filterGraph.push(`[${nvIdx}:a]asetpts=PTS-STARTPTS,volume=${settings.voiceAudioVolume / 100},${uniformAudio}[a_narrator_ready]`);

    // 2. Process Page Visuals and SFX (Excluding AI Voice)
    let pageVOuts: string[] = [];
    let pageAInputsToMix: string[] = [];
    
    // Create base audio track just for timeline length safety
    let totalPagesDuration = 0;
    
    let narratorDuration = 0;
    try {
      narratorDuration = await getMediaDuration(media.narratorVideo);
    } catch(e) {}
    let narratorEndPageEndTime = 0;

    for (let i = 0; i < settings.pages.length; i++) {
      const page = settings.pages[i];
      const totalVoiceDuration = Math.max(0.1, page.audioDuration || 5); 
      // In Narrator Video mode, pacing is dictated strictly by the provided timestamps/durations.
      // We do not add voiceOffsetSecs because it would cause the visuals and SFX to drift out of sync with the continuous narrator audio.
      let totalPageDuration = totalVoiceDuration;
      
      let pageImages = [page.finalPageImageUrl, page.finalPageImageUrlAngle1, page.finalPageImageUrlAngle2, page.finalPageImageUrlAngle3].filter(Boolean);
      if (pageImages.length === 0) {
        pageImages = [page.imageUrl, page.imageUrlAngle1, page.imageUrlAngle2, page.imageUrlAngle3].filter(Boolean);
      }
      if (pageImages.length === 0) continue;

      const validImages: string[] = [];
      for (let j = 0; j < pageImages.length; j++) {
        const fieldName = `page_${i}_img_${j}`;
        if (uploadedPageMedia[fieldName]) {
          validImages.push(uploadedPageMedia[fieldName]);
        } else {
          const imgPath = path.join(uploadDir, `${jobId}_p${i}_img${j}.png`);
          const savedImg = await saveBase64File(pageImages[j], imgPath);
          if (savedImg) validImages.push(imgPath);
        }
      }
      if (validImages.length === 0) continue;

      let pageVideoDuration = 0;
      let pageVideoSpeedMultiplier = 1.0;
      let pageVideoTrimSecs = 0;
      
      if (uploadedPageMedia[`page_${i}_video`]) {
        pageVideoSpeedMultiplier = page.pageVideoSpeedMultiplier || 1.0;
        pageVideoTrimSecs = page.pageVideoCutoffSecs;
        if (!pageVideoTrimSecs) {
          const actualDuration = await getMediaDuration(uploadedPageMedia[`page_${i}_video`]);
          if (actualDuration > 0) {
            pageVideoTrimSecs = actualDuration / pageVideoSpeedMultiplier;
          } else {
            onTrace(`WARNING: Video for page ${i} has 0 duration (possibly corrupted or missing file).`);
          }
        }
        pageVideoDuration = pageVideoTrimSecs || 0;
      }
      
      let imagesTotalDuration = totalPageDuration;
      if (pageVideoDuration > 0) {
        imagesTotalDuration = Math.max(0.5, totalPageDuration - pageVideoDuration);
        totalPageDuration = imagesTotalDuration + pageVideoDuration;
      }

      const splitDuration = imagesTotalDuration / validImages.length;
      if (i === 0) console.log(`[DEBUG] Page 0 splitDuration: ${splitDuration}`);
      let singlePageVOuts: string[] = [];

      // Generate visuals and transition SFX for this specific page
      for (let j = 0; j < validImages.length; j++) {
        const idx = addInput(validImages[j]);
        const imageDuration = (j === validImages.length - 1) ? (splitDuration + pageVideoDuration) : splitDuration;
        if (i === 0) console.log(`[DEBUG] Page 0 Image ${j} duration: ${imageDuration}`);
        filterGraph.push(`[${idx}:v]loop=loop=-1:size=1,setpts=N/FRAME_RATE/TB,${uniformVideo},trim=duration=${imageDuration}[vp${i}_i${j}]`);
        singlePageVOuts.push(`[vp${i}_i${j}]`);

        if (j > 0 && media.transitionSfx) {
          const tsfxIdx = addInput(media.transitionSfx);
          const absoluteDelayMs = Math.floor((totalPagesDuration + (splitDuration * j)) * 1000);
          filterGraph.push(`[${tsfxIdx}:a]${uniformAudio},volume=${settings.imageSfxVolume / 100},adelay=${absoluteDelayMs}|${absoluteDelayMs}[ap${i}_tsfx${j}]`);
          pageAInputsToMix.push(`[ap${i}_tsfx${j}]`);
        }
      }

      // Concat the images for this specific page to track them linearly
      filterGraph.push(`${singlePageVOuts.join('')}concat=n=${singlePageVOuts.length}:v=1:a=0[vp_concat_${i}]`);
      
      let currentVOut = `[vp_concat_${i}]`;

      // Page Video and Overlay
      let pageVidStream = '';
      if (uploadedPageMedia[`page_${i}_video`]) {
        const vidIdx = addInput(uploadedPageMedia[`page_${i}_video`]);
        const speedMultiplier = pageVideoSpeedMultiplier;
        const setptsFilter = speedMultiplier !== 1.0 ? `setpts=${1 / speedMultiplier}*(PTS-STARTPTS)` : 'setpts=PTS-STARTPTS';
        filterGraph.push(`[${vidIdx}:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160:0:0,setsar=1,${setptsFilter}[pv_base_${i}]`);
        pageVidStream = `[pv_base_${i}]`;
        
        let trimSecs = pageVideoTrimSecs;
        
        if (trimSecs) {
          filterGraph.push(`${pageVidStream}trim=duration=${trimSecs}[pv_trim_${i}]`);
          pageVidStream = `[pv_trim_${i}]`;
        }

        if (page.mutePageVideoAudio === false) {
          const absoluteDelayMs = Math.floor((totalPagesDuration + imagesTotalDuration) * 1000);
          const delayFilter = absoluteDelayMs > 0 ? `adelay=${absoluteDelayMs}|${absoluteDelayMs}` : '';
          const audioTrimFilter = trimSecs ? `atrim=duration=${trimSecs},` : '';
          const atempoFilter = speedMultiplier !== 1.0 ? `atempo=${speedMultiplier},` : '';
          filterGraph.push(`[${vidIdx}:a]${uniformAudio},${atempoFilter}${audioTrimFilter}asetpts=PTS-STARTPTS${delayFilter ? ',' + delayFilter : ''}[ap${i}_vid_sfx]`);
          pageAInputsToMix.push(`[ap${i}_vid_sfx]`);
        }
      }

      if (uploadedPageMedia[`page_${i}_video_overlay`] && pageVidStream) {
        const ovIdx = addInput(uploadedPageMedia[`page_${i}_video_overlay`]);
        filterGraph.push(`[${ovIdx}:v]scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2:color=black@0,setpts=PTS-STARTPTS[po_${i}]`);
        filterGraph.push(`${pageVidStream}[po_${i}]overlay[pv_combined_${i}]`);
        pageVidStream = `[pv_combined_${i}]`;
      }

      if (pageVidStream) {
        let enableFilter = '';
        if (imagesTotalDuration > 0) {
          filterGraph.push(`${pageVidStream}setpts=PTS+${imagesTotalDuration}/TB[pv_delayed_${i}]`);
          pageVidStream = `[pv_delayed_${i}]`;
          enableFilter = `enable='gte(t,${imagesTotalDuration})':`;
        }
        filterGraph.push(`${currentVOut}${pageVidStream}overlay=${enableFilter}eof_action=pass,trim=duration=${totalPageDuration}[vp_vid_combined_${i}]`);
        currentVOut = `[vp_vid_combined_${i}]`;
      }

      pageVOuts.push(currentVOut);

      // Page specific SFX
      const hasPredefinedSfx = page.soundEffectId && page.soundEffectId !== 'none' && page.soundEffectId !== 'custom';
      if (page.customSoundEffectUrl || uploadedPageMedia[`page_${i}_sfx`] || hasPredefinedSfx) {
        let sfxToPlay: string | null = null;
        if (uploadedPageMedia[`page_${i}_sfx`]) {
          sfxToPlay = uploadedPageMedia[`page_${i}_sfx`];
        } else if (hasPredefinedSfx) {
          sfxToPlay = path.join(process.cwd(), 'public', 'sound-effects', page.soundEffectId);
        } else if (page.customSoundEffectUrl) {
          const customSfxPath = path.join(uploadDir, `${jobId}_p${i}_sfx.mp3`);
          sfxToPlay = await saveBase64File(page.customSoundEffectUrl, customSfxPath);
        }

        if (sfxToPlay) {
          const idx = addInput(sfxToPlay);
          const absoluteDelayMs = Math.floor(totalPagesDuration * 1000);
          const cut = settings.sfxGlobalCutOff;
          const delayFilter = absoluteDelayMs > 0 ? `,adelay=${absoluteDelayMs}|${absoluteDelayMs}` : '';
          filterGraph.push(`[${idx}:a]${uniformAudio},asetpts=PTS-STARTPTS,volume=${settings.mainSfxAudioVolume / 100},atrim=duration=${cut},afade=t=out:st=${Math.max(0, cut - 1)}:d=1${delayFilter}[ap${i}_sfx]`);
          pageAInputsToMix.push(`[ap${i}_sfx]`);
        }
      }

      totalPagesDuration += totalPageDuration;
      
      if (narratorDuration > 0 && narratorEndPageEndTime === 0 && totalPagesDuration >= narratorDuration) {
        narratorEndPageEndTime = totalPagesDuration;
      }
    }

    if (narratorDuration > 0 && narratorEndPageEndTime === 0) {
      narratorEndPageEndTime = totalPagesDuration;
    }

    if (pageVOuts.length === 0) {
      throw new Error("No valid page images found in the selected range. Please generate images for the pages before rendering the video.");
    }

    if (pageVOuts.length > 0) {
      // Concat all page visual sequences into one continuous background track
      filterGraph.push(`${pageVOuts.join('')}concat=n=${pageVOuts.length}:v=1:a=0[v_all_pages]`);
      
      // Mix all SFXs into a single continuous SFX track
      if (pageAInputsToMix.length > 0) {
        filterGraph.push(`anullsrc=channel_layout=stereo:sample_rate=48000:duration=${totalPagesDuration}[a_silence_base]`);
        pageAInputsToMix.unshift(`[a_silence_base]`);
        filterGraph.push(`${pageAInputsToMix.join('')}amix=inputs=${pageAInputsToMix.length}:duration=first:dropout_transition=0:normalize=0[a_all_sfx]`);
      } else {
        filterGraph.push(`anullsrc=channel_layout=stereo:sample_rate=48000:duration=${totalPagesDuration}[a_all_sfx]`);
      }

      // 3. Overlay Narrator Video onto Pages Sequence
      if (narratorEndPageEndTime > 0) {
        filterGraph.push(`[v_all_pages][v_narrator_ready]overlay=x=${posX}:y=${posY}:eof_action=repeat:enable='between(t,0,${narratorEndPageEndTime})'[v_pages_overlaid]`);
      } else {
        filterGraph.push(`[v_all_pages][v_narrator_ready]overlay=x=${posX}:y=${posY}:eof_action=pass[v_pages_overlaid]`);
      }

      // 4. Mix Narrator Audio with Page SFX
      filterGraph.push(`[a_all_sfx][a_narrator_ready]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a_pages_mixed]`);

      // 5. Append to the main output sequence
      vOuts.push('[v_pages_overlaid]');
      aOuts.push('[a_pages_mixed]');
      timelineBlocks++;
    }

  } else {
    // ==========================================
    // EXISTING LOGIC BRANCH (No Narrator Video)
    // ==========================================
    onTrace("No Narrator Video detected. Using standard sequential page generation.");
    
    for (let i = 0; i < settings.pages.length; i++) {
      const page = settings.pages[i];
      const totalVoiceDuration = Math.max(0.1, page.audioDuration || 5); 
      let totalPageDuration = totalVoiceDuration + settings.voiceOffsetSecs;
      
      let pageImages = [page.finalPageImageUrl, page.finalPageImageUrlAngle1, page.finalPageImageUrlAngle2, page.finalPageImageUrlAngle3].filter(Boolean);
      if (pageImages.length === 0) {
        pageImages = [page.imageUrl, page.imageUrlAngle1, page.imageUrlAngle2, page.imageUrlAngle3].filter(Boolean);
      }
      if (pageImages.length === 0) continue;

      const validImages: string[] = [];
      for (let j = 0; j < pageImages.length; j++) {
        const fieldName = `page_${i}_img_${j}`;
        if (uploadedPageMedia[fieldName]) {
          validImages.push(uploadedPageMedia[fieldName]);
        } else {
          const imgPath = path.join(uploadDir, `${jobId}_p${i}_img${j}.png`);
          const savedImg = await saveBase64File(pageImages[j], imgPath);
          if (savedImg) validImages.push(imgPath);
        }
      }
      if (validImages.length === 0) continue;

      let pageVideoDuration = 0;
      let pageVideoSpeedMultiplier = 1.0;
      let pageVideoTrimSecs = 0;
      
      if (uploadedPageMedia[`page_${i}_video`]) {
        pageVideoSpeedMultiplier = page.pageVideoSpeedMultiplier || 1.0;
        pageVideoTrimSecs = page.pageVideoCutoffSecs;
        if (!pageVideoTrimSecs) {
          const actualDuration = await getMediaDuration(uploadedPageMedia[`page_${i}_video`]);
          if (actualDuration > 0) {
            pageVideoTrimSecs = actualDuration / pageVideoSpeedMultiplier;
          } else {
            onTrace(`WARNING: Video for page ${i} has 0 duration (possibly corrupted or missing file).`);
          }
        }
        pageVideoDuration = pageVideoTrimSecs || 0;
      }
      
      let imagesTotalDuration = totalPageDuration;
      if (pageVideoDuration > 0) {
        imagesTotalDuration = Math.max(0.5, totalPageDuration - pageVideoDuration);
        totalPageDuration = imagesTotalDuration + pageVideoDuration;
      }

      const splitDuration = imagesTotalDuration / validImages.length;
      let pageVOuts: string[] = [];
      let pageAInputsToMix: string[] = [];

      filterGraph.push(`anullsrc=channel_layout=stereo:sample_rate=48000:duration=${totalPageDuration}[ap${i}_base]`);
      pageAInputsToMix.push(`[ap${i}_base]`);

      for (let j = 0; j < validImages.length; j++) {
        const idx = addInput(validImages[j]);
        const imageDuration = (j === validImages.length - 1) ? (splitDuration + pageVideoDuration) : splitDuration;
        filterGraph.push(`[${idx}:v]loop=loop=-1:size=1,setpts=N/FRAME_RATE/TB,${uniformVideo},trim=duration=${imageDuration}[vp${i}_i${j}]`);
        pageVOuts.push(`[vp${i}_i${j}]`);

        if (j > 0 && media.transitionSfx) {
          const tsfxIdx = addInput(media.transitionSfx);
          const delayMs = Math.floor(splitDuration * j * 1000);
          filterGraph.push(`[${tsfxIdx}:a]${uniformAudio},asetpts=PTS-STARTPTS,volume=${settings.imageSfxVolume / 100},adelay=${delayMs}|${delayMs}[ap${i}_tsfx${j}]`);
          pageAInputsToMix.push(`[ap${i}_tsfx${j}]`);
        }
      }

      filterGraph.push(`${pageVOuts.join('')}concat=n=${pageVOuts.length}:v=1:a=0[vp${i}_base]`);
      
      let currentVOutNonNarr = `[vp${i}_base]`;

      // Page Video and Overlay
      let pageVidStream = '';
      if (uploadedPageMedia[`page_${i}_video`]) {
        const vidIdx = addInput(uploadedPageMedia[`page_${i}_video`]);
        const speedMultiplier = pageVideoSpeedMultiplier;
        const setptsFilter = speedMultiplier !== 1.0 ? `setpts=${1 / speedMultiplier}*(PTS-STARTPTS)` : 'setpts=PTS-STARTPTS';
        filterGraph.push(`[${vidIdx}:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160:0:0,setsar=1,${setptsFilter}[pv_base_${i}]`);
        pageVidStream = `[pv_base_${i}]`;

        let trimSecs = pageVideoTrimSecs;

        if (trimSecs) {
          filterGraph.push(`${pageVidStream}trim=duration=${trimSecs}[pv_trim_${i}]`);
          pageVidStream = `[pv_trim_${i}]`;
        }

        if (page.mutePageVideoAudio === false) {
          const delayMs = Math.floor(imagesTotalDuration * 1000);
          const audioTrimFilter = trimSecs ? `atrim=duration=${trimSecs},` : '';
          const atempoFilter = speedMultiplier !== 1.0 ? `atempo=${speedMultiplier},` : '';
          const delayFilter = delayMs > 0 ? `,adelay=${delayMs}|${delayMs}` : '';
          filterGraph.push(`[${vidIdx}:a]${uniformAudio},${atempoFilter}${audioTrimFilter}asetpts=PTS-STARTPTS${delayFilter}[ap${i}_vid_sfx]`);
          pageAInputsToMix.push(`[ap${i}_vid_sfx]`);
        }
      }

      if (uploadedPageMedia[`page_${i}_video_overlay`] && pageVidStream) {
        const ovIdx = addInput(uploadedPageMedia[`page_${i}_video_overlay`]);
        filterGraph.push(`[${ovIdx}:v]scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2:color=black@0,setpts=PTS-STARTPTS[po_${i}]`);
        filterGraph.push(`${pageVidStream}[po_${i}]overlay[pv_combined_${i}]`);
        pageVidStream = `[pv_combined_${i}]`;
      }

      if (pageVidStream) {
        let enableFilter = '';
        if (imagesTotalDuration > 0) {
          filterGraph.push(`${pageVidStream}setpts=PTS+${imagesTotalDuration}/TB[pv_delayed_${i}]`);
          pageVidStream = `[pv_delayed_${i}]`;
          enableFilter = `enable='gte(t,${imagesTotalDuration})':`;
        }
        filterGraph.push(`${currentVOutNonNarr}${pageVidStream}overlay=${enableFilter}eof_action=pass,trim=duration=${totalPageDuration}[vp_vid_combined_${i}]`);
        currentVOutNonNarr = `[vp_vid_combined_${i}]`;
      }

      vOuts.push(currentVOutNonNarr);

      if (page.audioUrl || uploadedPageMedia[`page_${i}_voice`]) {
        const voicePath = uploadedPageMedia[`page_${i}_voice`] || path.join(uploadDir, `${jobId}_p${i}_voice.mp3`);
        let savedVoice = uploadedPageMedia[`page_${i}_voice`] ? voicePath : await saveBase64File(page.audioUrl, voicePath);
        if (savedVoice) {
          const idx = addInput(voicePath);
          const delayMs = settings.voiceOffsetSecs * 1000;
          filterGraph.push(`[${idx}:a]${uniformAudio},asetpts=PTS-STARTPTS,volume=${settings.voiceAudioVolume / 100},adelay=${delayMs}|${delayMs}[ap${i}_voice]`);
          pageAInputsToMix.push(`[ap${i}_voice]`);
        }
      }

      const hasPredefinedSfx = page.soundEffectId && page.soundEffectId !== 'none' && page.soundEffectId !== 'custom';
      if (page.customSoundEffectUrl || uploadedPageMedia[`page_${i}_sfx`] || hasPredefinedSfx) {
        let sfxToPlay: string | null = null;
        if (uploadedPageMedia[`page_${i}_sfx`]) {
          sfxToPlay = uploadedPageMedia[`page_${i}_sfx`];
        } else if (hasPredefinedSfx) {
          sfxToPlay = path.join(process.cwd(), 'public', 'sound-effects', page.soundEffectId);
        } else if (page.customSoundEffectUrl) {
          const customSfxPath = path.join(uploadDir, `${jobId}_p${i}_sfx.mp3`);
          sfxToPlay = await saveBase64File(page.customSoundEffectUrl, customSfxPath);
        }

        if (sfxToPlay) {
          const idx = addInput(sfxToPlay);
          const cut = settings.sfxGlobalCutOff;
          filterGraph.push(`[${idx}:a]${uniformAudio},asetpts=PTS-STARTPTS,volume=${settings.mainSfxAudioVolume / 100},atrim=duration=${cut},afade=t=out:st=${Math.max(0, cut - 1)}:d=1[ap${i}_sfx]`);
          pageAInputsToMix.push(`[ap${i}_sfx]`);
        }
      }

      filterGraph.push(`${pageAInputsToMix.join('')}amix=inputs=${pageAInputsToMix.length}:duration=first:dropout_transition=0:normalize=0[ap${i}]`);
      aOuts.push(`[ap${i}]`);
      timelineBlocks++;
    }

    if (timelineBlocks === 0) {
      throw new Error("No valid page images found in the selected range. Please generate images for the pages before rendering the video.");
    }
  }

  // ==========================================
  // OUTRO (Common to both branches)
  // ==========================================
  if (media.outroVideo) {
    const idx = addInput(media.outroVideo);
    filterGraph.push(`[${idx}:v]${uniformVideo}[v_outro]`);
    filterGraph.push(`[${idx}:a]${uniformAudio}[a_outro]`);
    vOuts.push('[v_outro]');
    aOuts.push('[a_outro]');
    timelineBlocks++;
  }

  // ==========================================
  // CONCATENATE MASTER TIMELINE
  // ==========================================
  let concatInputs = '';
  for (let i = 0; i < timelineBlocks; i++) {
    concatInputs += `${vOuts[i]}${aOuts[i]}`;
  }
  
  if (timelineBlocks > 0) {
    filterGraph.push(`${concatInputs}concat=n=${timelineBlocks}:v=1:a=1[v_concat][a_concat]`);
    filterGraph.push(`[v_concat]format=nv12[vout]`); // Required for QSV
  }

  // ==========================================
  // MIX BACKUP MUSIC
  // ==========================================
  if (media.backupMusic && timelineBlocks > 0) {
    inputs.push('-stream_loop', '-1');
    const idx = addInput(media.backupMusic);
    const lagMs = settings.audioBackupMusicLag * 1000;
    filterGraph.push(`[${idx}:a]volume=${settings.audioBackupMusicVolume / 100},adelay=${lagMs}|${lagMs},${uniformAudio}[a_bgm]`);
    filterGraph.push(`[a_concat][a_bgm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`);
  } else if (timelineBlocks > 0) {
    filterGraph.push(`[a_concat]anull[aout]`);
  }

  if (timelineBlocks === 0) {
    throw new Error("No media blocks were generated. Cannot create video.");
  }

  // Write filter graph to a script file to avoid ENAMETOOLONG on Windows
  const filterScriptPath = path.join(uploadDir, `${jobId}_filter.txt`);
  await fs.writeFile(filterScriptPath, filterGraph.join(';'));

  // Build Command
  const args = [
    '-y',
    ...inputs,
    '-filter_complex_script', filterScriptPath,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'h264_qsv',
    '-preset', 'veryfast',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath
  ];

  onProgress(20, 'Starting FFmpeg QSV Rendering...');
  onTrace(`Starting FFmpeg rendering pipeline...`);
  onTrace(`Total inputs loaded: ${inputs.length / 2}`);
  onTrace(`Executing: ffmpeg ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args);
    let outputLog = '';

    process.stderr.on('data', (data) => {
      const msg = data.toString();
      outputLog += msg;
      
      const lines = msg.split('\n');
      for (const line of lines) {
        if (line.trim()) onTrace(line.trim());
      }
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(outputName);
      } else {
        console.error('FFmpeg Log:', outputLog);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}
