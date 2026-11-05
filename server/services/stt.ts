import { GoogleGenAI } from '@google/genai';
import { SubtitleItem } from '../templates/presets';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing in server environment. When deploying to Google Cloud Run, please set the GEMINI_API_KEY environment variable in your service settings.'
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const STT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

/**
 * Bulletproof JSON extractor that safely extracts JSON arrays or objects from model outputs,
 * even when the model adds markdown code fences, trailing explanations, commentary, or trailing commas.
 */
export function extractJsonSafe<T = any>(rawText: string): T | null {
  if (!rawText || !rawText.trim()) return null;
  const text = rawText.trim();

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(text);
  } catch {}

  // Attempt 2: Extract between ```json and ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const inner = codeBlockMatch[1].trim();
    try {
      return JSON.parse(inner);
    } catch {
      try {
        return JSON.parse(inner.replace(/,\s*([}\]])/g, '$1'));
      } catch {}
    }
  }

  // Attempt 3: Slice strictly between first '[' and last ']' (ideal for JSON arrays)
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidateArray = text.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidateArray);
    } catch {
      try {
        // Strip trailing commas before closing braces/brackets
        const cleanedCommas = candidateArray.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleanedCommas);
      } catch {}
    }
  }

  // Attempt 4: Slice strictly between first '{' and last '}' (for JSON objects)
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidateObj = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidateObj);
    } catch {
      try {
        const cleanedCommas = candidateObj.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleanedCommas);
      } catch {}
    }
  }

  // Attempt 5: Handle partially truncated array (e.g. cut off before final ']')
  if (firstBracket !== -1 && (lastBracket === -1 || lastBracket < firstBracket)) {
    const lastCloseBrace = text.lastIndexOf('}');
    if (lastCloseBrace > firstBracket) {
      const repaired = text.slice(firstBracket, lastCloseBrace + 1) + ']';
      try {
        return JSON.parse(repaired.replace(/,\s*([}\]])/g, '$1'));
      } catch {}
    }
  }

  return null;
}

/**
 * Transcribes audio (WAV, MP3, etc.) to Khmer text with start/end time per word or sentence.
 * Returns SubtitleItem[] in the unified data format:
 * [ { id: 1, start: 1.2, end: 3.8, text: "សួស្តី", words: [ { w: "សួស្តី", s: 1.2, e: 3.8 } ] } ]
 */
export async function transcribeKhmerAudioWithGemini(
  audioBuffer: Buffer,
  mimeType = 'audio/wav'
): Promise<SubtitleItem[]> {
  const ai = getAI();
  const base64Audio = audioBuffer.toString('base64');

  const prompt = `You are a high-precision Khmer speech recognition (STT) and voice-tracking subtitle engine for Cambodian video creators (TikTok, YouTube Shorts, Reels).
Your task is to transcribe this audio recording with exact voice-synchronized timestamps matching when words are spoken.

VOICE TRACKING & TIMING REQUIREMENTS:
1. STRICT VOICE SYNCHRONIZATION:
   - "start" must match the EXACT millisecond the speaker begins vocalizing the first syllable.
   - "end" must match when the speaker stops speaking or pauses.
   - Never stretch timestamps across silent pauses or background music. The subtitle must match the vocal track tightly.
2. TIGHT PUNCHY PHRASES (POP-UP STYLE):
   - Break speech into short, dynamic chunks of 1 to 3 words (or short 4-word natural phrases), typically lasting 0.40s to 1.80s each.
   - This ensures subtitles pop up in real-time right as each word is uttered by the voice.
3. DETAILED WORD-LEVEL TIMESTAMPS:
   - For every segment, provide the "words" array with {"w": wordText, "s": startTimeInSec, "e": endTimeInSec}.
   - Word timestamps must match the exact duration the speaker pronounces that specific word.
4. ACCURATE KHMER SPELLING & DIACRITICS:
   - Ensure accurate Khmer vowels, subscripts (ជើង), and Bantuoc (់)/Viriam (៍).
5. FORMAT: Output STRICTLY a valid JSON array of objects. No markdown code blocks, no backticks, no commentary:
[
  {
    "id": 1,
    "start": 0.50,
    "end": 1.40,
    "text": "សូមស្វាគមន៍",
    "words": [
      { "w": "សូមស្វាគមន៍", "s": 0.50, "e": 1.40 }
    ]
  },
  {
    "id": 2,
    "start": 1.45,
    "end": 2.30,
    "text": "មកកាន់ ចង់ប្រើ",
    "words": [
      { "w": "មកកាន់", "s": 1.45, "e": 1.85 },
      { "w": "ចង់ប្រើ", "s": 1.88, "e": 2.30 }
    ]
  }
]`;

  let lastError: any = null;

  for (const model of STT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              data: base64Audio,
              mimeType,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const raw = response.text || '[]';
      const parsed = extractJsonSafe<any>(raw);

      if (!parsed) {
        console.warn(`Model ${model} JSON parse failed, raw preview: ${raw.slice(0, 150)}...`);
        continue;
      }

      let list: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.subtitles)
        ? parsed.subtitles
        : Array.isArray(parsed.segments)
        ? parsed.segments
        : [];

      // If the model returned plain text or a single text property
      if (list.length === 0 && (parsed.text || parsed.transcript || parsed.transcription)) {
        const fullText = String(parsed.text || parsed.transcript || parsed.transcription || '').trim();
        if (fullText) {
          // Split into sentences or phrases by Khmer punctuation or newlines
          const phrases = fullText.split(/(?<=[។!?\n])\s+/).filter(Boolean);
          let offset = 0.5;
          list = phrases.map((phrase, i) => {
            const duration = Math.max(1.5, Math.min(4.5, phrase.length * 0.1));
            const item = {
              id: i + 1,
              start: Number(offset.toFixed(2)),
              end: Number((offset + duration).toFixed(2)),
              text: phrase.trim(),
            };
            offset += duration + 0.2;
            return item;
          });
        }
      }

      if (list.length > 0) {
        return list.map((item, index) => {
          const id = Number(item.id) || index + 1;
          const start = Math.max(0, Number(item.start ?? item.startTime ?? 0));
          const end = Math.max(start + 0.3, Number(item.end ?? item.endTime ?? start + 2.0));
          const text = String(item.text || item.content || '').trim();

          const words: any[] = Array.isArray(item.words)
            ? item.words.map((w: any) => ({
                w: String(w.w || w.word || '').trim(),
                s: Number(w.s ?? w.start ?? start),
                e: Number(w.e ?? w.end ?? end),
              })).filter((w: any) => w.w.length > 0)
            : [];

          return {
            id,
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
            text,
            words: words.length > 0 ? words : undefined,
          };
        });
      }

      // If the model parsed successfully and confirmed there was no speech / empty audio
      if (parsed && typeof parsed === 'object') {
        console.log(`Model ${model} parsed successfully: no audible speech or silent audio detected.`);
        return [];
      }
    } catch (err: any) {
      console.warn(`STT model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  // If last error is API key related, make it explicit
  if (lastError && (lastError.message?.includes('API_KEY') || lastError.message?.includes('apiKey') || lastError.status === 401)) {
    throw new Error('GEMINI_API_KEY is missing or invalid in server deployment. Please verify your GEMINI_API_KEY environment variable.');
  }

  throw lastError || new Error('Failed to transcribe audio with Gemini STT');
}
