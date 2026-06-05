import { GlobalSettings, useAppStore } from '../store';

const INWORLD_API_KEY = "OXdDTnphRlJXOWRhVENMaGF6WWF6SE9DZVZ6ZkFnOXM6UXI4eVdzREU2YWx6RDhOdHhkNUpoaTN5MTJHdFlvMGJGYWNYQVVxNXRmbmdWQ3k1U251NXRJNGgwODJYSVJlZg==";

export interface Voice {
  id: string;
  name: string;
  gender: string;
}

export async function fetchVoices(): Promise<Voice[]> {
  try {
    const response = await fetch('https://api.inworld.ai/tts/v1/voices', {
      headers: {
        'Authorization': `Basic ${INWORLD_API_KEY}`
      }
    });
    const data = await response.json();
    if (data.voices) {
      return data.voices.map((v: any) => ({
        id: v.voiceId,
        name: v.displayName,
        gender: v.tags?.includes('female') ? 'female' : 'male'
      }));
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch voices:", e);
    return [];
  }
}

export async function generateVoiceAudio(text: string, voiceId: string, options: GlobalSettings): Promise<string> {
  const { addTraceLog, addErrorLog } = useAppStore.getState();
  addTraceLog(`[Inworld TTS] Starting generation. Voice: ${voiceId}, Text Length: ${text.length}`);
  
  try {
    addTraceLog(`[Inworld TTS] Sending fetch request...`);
    const response = await fetch('https://api.inworld.ai/tts/v1/voice', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${INWORLD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voiceId,
        modelId: options.modelId,
        audioConfig: {
          audioEncoding: options.audioEncoding,
          sampleRateHertz: options.sampleRateHertz,
          speakingRate: options.speakingRate
        },
        temperature: options.temperature,
        applyTextNormalization: options.applyTextNormalization
      })
    });

    addTraceLog(`[Inworld TTS] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errText = await response.text();
      addErrorLog(`[Inworld TTS] HTTP Error ${response.status}`, errText);
      throw new Error(`HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.audioContent) {
      addTraceLog(`[Inworld TTS] Successfully received audioContent.`);
      const mimeType = options.audioEncoding === 'MP3' ? 'audio/mp3' : 'audio/wav';
      return `data:${mimeType};base64,${data.audioContent}`;
    }
    
    addErrorLog(`[Inworld TTS] Missing audioContent in response`, JSON.stringify(data));
    throw new Error(data.message || "Failed to generate audio (no audioContent)");
  } catch (error: any) {
    addTraceLog(`[Inworld TTS] Caught exception: ${error.message}`);
    throw error;
  }
}

let currentAudio: HTMLAudioElement | null = null;

export function playMockAudio(url: string) {
  stopAudio();

  if (url.startsWith('data:audio') || url.startsWith('/sound-effects/')) {
    currentAudio = new Audio(url);
    currentAudio.play();
  } else if (url.startsWith('mock-audio://')) {
    // Fallback for old mock data
    const urlObj = new URL(url);
    const text = urlObj.searchParams.get('text') || '';
    const speed = parseFloat(urlObj.searchParams.get('speed') || '1');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    window.speechSynthesis.speak(utterance);
  }
}

export function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  window.speechSynthesis.cancel();
}

export function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    if (url.startsWith('mock-audio://')) {
      const urlObj = new URL(url);
      const text = urlObj.searchParams.get('text') || '';
      const speed = parseFloat(urlObj.searchParams.get('speed') || '1');
      const words = text.split(/\s+/).length;
      resolve(words / (2.5 * speed));
      return;
    }

    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(0);
    });
  });
}
