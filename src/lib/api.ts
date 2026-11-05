import { OcrResult, SubtitleSegment, ClonedVoiceProfile } from '../types';

async function parseJsonResponse<T>(res: Response, defaultError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorMessage = defaultError;
    if (contentType.includes('application/json')) {
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || defaultError;
      } catch {
        // ignore JSON parse error
      }
    } else {
      const text = await res.text().catch(() => '');
      if (res.status === 504 || text.includes('Gateway Timeout') || text.includes('Timeout')) {
        errorMessage = 'សំណើត្រូវចំណាយពេលយូរពេក ឬដាច់ការភ្ជាប់ (Request timed out). សូមសាកល្បងម្ដងទៀត។';
      } else if (res.status === 413) {
        errorMessage = 'ទំហំរូបភាពធំពេក (Image payload too large). សូមជ្រើសរើសរូបភាពតូចជាងនេះ។';
      } else {
        errorMessage = `កំហុសពីម៉ាស៊ីនមេ (Server ${res.status}): ${defaultError}`;
      }
    }
    throw new Error(errorMessage);
  }

  if (!contentType.includes('application/json')) {
    const raw = await res.text().catch(() => '');
    if (raw.trim().startsWith('<')) {
      throw new Error('ម៉ាស៊ីនមេបានផ្ដល់ទម្រង់មិនត្រឹមត្រូវ។ សូមផ្ទុកទំព័រឡើងវិញ ឬសាកល្បងម្ដងទៀត។');
    }
    throw new Error('Unexpected response format from server');
  }

  return res.json();
}

export interface OcrRequest {
  imageBase64: string;
  mimeType?: string;
  targetLang?: string;
  translate?: boolean;
}

export interface GenerateSrtRequest {
  script: string;
  language?: string;
  speed?: 'ultra_fast' | 'fast' | 'normal' | 'slow';
  chunkMode?: 'short_punchy' | 'medium_short' | 'standard';
  maxCharsPerLine?: number;
  startTimeOffset?: number;
  translateTo?: string;
}

export interface GenerateSrtResponse {
  success: boolean;
  srt: string;
  segments: SubtitleSegment[];
  count: number;
  fallbackUsed?: boolean;
}

export async function generateSrt(req: GenerateSrtRequest): Promise<GenerateSrtResponse> {
  const res = await fetch('/api/generate-srt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  return parseJsonResponse<GenerateSrtResponse>(res, 'Failed to generate SRT subtitles');
}

export interface IdPhotoRequest {
  imageBase64: string;
  mimeType?: string;
  attire: string;
  bgColor: string;
  gender?: string;
}

export interface UpscaleRequest {
  imageBase64: string;
  mimeType?: string;
  scale?: string;
  enhanceFaces?: boolean;
  denoise?: boolean;
}

export interface BgRemoveRequest {
  imageBase64: string;
  mimeType?: string;
  bgColor?: string;
}

export async function processOcr(req: OcrRequest): Promise<OcrResult> {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  return parseJsonResponse<OcrResult>(res, 'Failed to process OCR');
}

export async function generateIdPhoto(req: IdPhotoRequest): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/idphoto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  return parseJsonResponse<{ success: boolean; imageUrl: string }>(res, 'Failed to generate ID photo');
}

export async function generateTts(
  text: string,
  lang = 'km',
  voice = 'Kore',
  cloneProfile?: ClonedVoiceProfile,
  speed?: number,
  pitch?: number
): Promise<{ audioBase64: string; audioUrl: string }> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ text, lang, voice, cloneProfile, speed, pitch }),
  });

  const data = await parseJsonResponse<{ audioBase64: string; mimeType?: string }>(res, 'Failed to synthesize speech');
  return {
    audioBase64: data.audioBase64,
    audioUrl: data.audioBase64,
  };
}

export async function cloneVoice(
  audioBase64: string,
  mimeType = 'audio/webm',
  customName?: string,
  referenceTranscript?: string,
  cloneMethod: 'zero_shot' | 'zero_shot_transcript' = 'zero_shot_transcript'
): Promise<ClonedVoiceProfile> {
  const res = await fetch('/api/clone-voice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      audioBase64,
      mimeType,
      customName,
      referenceTranscript,
      cloneMethod,
      engine: 'VoxCPM2',
    }),
  });

  return parseJsonResponse<ClonedVoiceProfile>(res, 'Failed to clone voice');
}

export async function processUpscale(req: UpscaleRequest): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/upscale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  return parseJsonResponse<{ success: boolean; imageUrl: string }>(res, 'Failed to upscale image');
}

export async function processBgRemove(req: BgRemoveRequest): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/bgremove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  return parseJsonResponse<{ success: boolean; imageUrl: string }>(res, 'Failed to remove background');
}
