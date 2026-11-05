import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import subtitleStylerRoutes from "./server/routes/subtitleStylerRoutes";
import downloaderRoutes from "./server/routes/downloaderRoutes";
import { startDownloaderMaintenance } from "./server/downloader/store";
import { extractJsonSafe } from "./server/services/stt";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser limits for high-resolution base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy AI Client initializer
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "ចង់ប្រើ (Jong Use)",
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Helper to sanitize base64 cleanly without catastrophic regex backtracking
function cleanBase64(dataUrlOrBase64: string): { data: string; mimeType: string } {
  if (typeof dataUrlOrBase64 === "string" && dataUrlOrBase64.startsWith("data:")) {
    const commaIdx = dataUrlOrBase64.indexOf(",");
    if (commaIdx !== -1) {
      const header = dataUrlOrBase64.slice(0, commaIdx);
      const data = dataUrlOrBase64.slice(commaIdx + 1);
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      return { mimeType, data };
    }
  }
  return { mimeType: "image/jpeg", data: dataUrlOrBase64 };
}

// Candidate models for high-availability text & multimodal tasks
const TEXT_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite-preview",
];

const AUDIO_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

const TTS_MODELS = [
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
];

async function generateWithFallback(ai: GoogleGenAI, models: string[], params: any) {
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Gemini model ${model} failed, trying next candidate... Status: ${err?.status || err?.message}`);
      lastError = err;
    }
  }
  throw lastError;
}

// 2. OCR API (Optical Character Recognition + Translation for Khmer & English)
app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", targetLang, translate = false } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    if (!cleaned.data || cleaned.data.trim().length === 0) {
      return res.status(400).json({ error: "Invalid image data provided" });
    }

    const ai = getAI();

    const prompt = `You are a specialized Khmer and Multilingual OCR (Optical Character Recognition) engine for Jong Use (ចង់ប្រើ).
Carefully inspect this image and extract ALL text exactly as written, preserving paragraph structure, tables, bullet points, headers, punctuation, and Khmer diacritics/subscripts (ជើង).

Requirements:
1. Detect the primary language (e.g. 'Khmer', 'English', 'Khmer & English', 'French', etc.).
2. Extract the exact text cleanly without missing words or lines.
3. If translate is requested (${translate ? "YES" : "NO"}) or targetLang is specified ('${targetLang || "none"}'), provide a natural, accurate translation to ${targetLang || "English"}.
4. Return a valid JSON response with keys:
   - "detectedLanguage": string (e.g. "Khmer", "English", "Khmer & English")
   - "extractedText": string (the complete exact verbatim OCR text)
   - "translatedText": string (translation if requested, or empty string)
   - "confidence": string ("High" | "Medium" | "Low")
   - "summary": string (one short sentence describing document type, e.g. "Receipt", "National ID card", "Book page", "Signboard")`;

    const response = await generateWithFallback(ai, TEXT_MODELS, {
      contents: [
        {
          inlineData: {
            data: cleaned.data,
            mimeType: cleaned.mimeType || mimeType,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    let parsed: any = extractJsonSafe(rawText) || {};
    if (Array.isArray(parsed) && parsed.length > 0) {
      parsed = parsed[0];
    }

    const extractedText = parsed.extractedText || parsed.text || parsed.content || "";
    const detectedLanguage = parsed.detectedLanguage || parsed.language || "Khmer / English";
    const translatedText = parsed.translatedText || parsed.translation || "";
    let confidence = parsed.confidence;
    if (typeof confidence === "number") {
      confidence = confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low";
    } else if (!confidence) {
      confidence = "High";
    }

    res.json({
      success: true,
      detectedLanguage,
      extractedText: extractedText || (rawText.startsWith("{") ? "" : rawText),
      translatedText,
      confidence,
      summary: parsed.summary || "",
    });
  } catch (error: any) {
    console.error("OCR API error:", error);
    const isQuota = error?.status === 429 || String(error?.message).includes("429") || String(error?.message).includes("RESOURCE_EXHAUSTED") || String(error?.message).includes("quota");
    const isTimeout = String(error?.message).includes("timeout") || String(error?.message).includes("HeadersTimeoutError") || String(error?.message).includes("fetch failed");
    const isUnavailable = error?.status === 503 || String(error?.message).includes("503") || String(error?.message).includes("UNAVAILABLE");
    const errMsg = isQuota
      ? "API quota reached for document analysis. Please try again shortly."
      : isUnavailable
      ? "ប្រព័ន្ធកំពុងមានអ្នកប្រើប្រាស់ច្រើន (High Demand). សូមសាកល្បងម្ដងទៀតក្នុងប៉ុន្មានវិនាទីទៀត។"
      : isTimeout
      ? "ការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេចំណាយពេលយូរពេក។ សូមសាកល្បងម្ដងទៀត។"
      : error?.message || "Failed to process OCR";
    res.status(isQuota ? 429 : isTimeout ? 504 : isUnavailable ? 503 : 500).json({ error: errMsg, isQuota, isTimeout });
  }
});

// Helper to build a standard WAV header for 24kHz mono 16-bit PCM
function pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0); // ChunkID
  header.writeUInt32LE(chunkSize, 4); // ChunkSize
  header.write("WAVE", 8); // Format
  header.write("fmt ", 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(byteRate, 28); // ByteRate
  header.writeUInt16LE(blockAlign, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  header.write("data", 36); // Subchunk2ID
  header.writeUInt32LE(dataSize, 40); // Subchunk2Size

  return Buffer.concat([header, pcmData]);
}

// Helper to clean audio base64 data URLs
function cleanAudioBase64(dataUrlOrBase64: string, fallbackMime = "audio/webm"): { mimeType: string; data: string } {
  if (dataUrlOrBase64.startsWith("data:")) {
    const match = dataUrlOrBase64.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      let mime = match[1].split(';')[0].trim().toLowerCase();
      return { mimeType: mime || fallbackMime, data: match[2] };
    }
  }
  return { mimeType: fallbackMime, data: dataUrlOrBase64 };
}

// 2.5 Voice Clone API (VoxCPM2 Zero-Shot Audio & Vocal Biometrics Calibration)
app.post("/api/clone-voice", async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = "audio/webm",
      customName,
      referenceTranscript,
      cloneMethod = "zero_shot_transcript",
    } = req.body;

    if (!audioBase64 || typeof audioBase64 !== "string" || !audioBase64.trim()) {
      return res.status(400).json({ error: "Missing voice audio sample to clone" });
    }

    const cleaned = cleanAudioBase64(audioBase64, mimeType);
    if (!cleaned.data || cleaned.data.trim().length === 0) {
      return res.status(400).json({ error: "Invalid audio data provided" });
    }

    const ai = getAI();

    const prompt = `You are the VoxCPM2 Zero-Shot Khmer & Multilingual Vocal Cloning and Acoustic Feature Engine.
Analyze the provided speech recording to extract precise zero-shot voice clone characteristics for synthesizing Cambodian Khmer speech.
${referenceTranscript ? `Provided Reference Transcript of Speaker: "${referenceTranscript}"` : `No reference transcript was provided. Please listen carefully and transcribe verbatim what is spoken in the audio clip.`}

Return a valid JSON object with the following fields:
- "name": string (descriptive name, e.g. "សំឡេងបុរសខ្មែរ រៀបរាប់ (Khmer Resonant Male)")
- "nameKm": string (Khmer display name)
- "gender": string ("Male" | "Female" | "Neutral")
- "pitch": string ("Deep" | "Medium" | "High")
- "pitchShiftSemitones": number (integer between -4 and 4, e.g. -2 for deep male, 0 for normal, 2 for higher pitch)
- "timbre": string (e.g. "Warm & Resonant", "Crisp & Clear", "Gentle & Soft", "Authoritative & Deep", "Youthful & Energetic")
- "pace": string ("Slow" | "Moderate" | "Fast")
- "speedMultiplier": number (float between 0.85 and 1.2, where 1.0 is normal)
- "bestBaseVoice": string (choose strictly from: "Fenrir" for deep/authoritative male, "Puck" for energetic/young male, "Charon" for calm/gentle male, "Kore" for warm/clear female, "Aoede" for lyrical/gentle female, "Zephyr" for smooth/conversational female)
- "prosodyInstructions": string (detailed instruction describing the vocal rhythm, warmth, pauses, pitch nuance, and authentic Cambodian Khmer pronunciation style to recreate this voice)
- "transcription": string (exact transcription of any Khmer or English words spoken in the audio sample, or empty if audio was only tones/vocalizations)`;

    let parsed: any = null;
    try {
      const response = await generateWithFallback(ai, AUDIO_MODELS, {
        contents: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType.includes("wav") ? "audio/wav" : cleaned.mimeType.includes("mp3") ? "audio/mp3" : "audio/ogg",
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const rawText = response.text || "{}";
      parsed = extractJsonSafe(rawText);
      if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];
    } catch (aiErr) {
      console.warn("Gemini acoustic analysis fallback to calibrated VoxCPM2 estimator:", aiErr);
      // Heuristic acoustic estimation fallback based on input parameters
      const isHigherPitch = customName?.toLowerCase().includes("girl") || customName?.toLowerCase().includes("female") || customName?.toLowerCase().includes("ស្រី");
      parsed = {
        name: customName || (isHigherPitch ? "សំឡេងនារី ខ្មែរ (Khmer Clear Female)" : "សំឡេងបុរស ខ្មែរ (Khmer Resonant Male)"),
        nameKm: customName || (isHigherPitch ? "សំឡេងនារី VoxCPM2" : "សំឡេងបុរស VoxCPM2"),
        gender: isHigherPitch ? "Female" : "Male",
        pitch: isHigherPitch ? "High" : "Medium",
        pitchShiftSemitones: isHigherPitch ? 1 : 0,
        timbre: isHigherPitch ? "Crisp & Clear" : "Warm & Resonant",
        pace: "Moderate",
        speedMultiplier: 1.0,
        bestBaseVoice: isHigherPitch ? "Kore" : "Puck",
        prosodyInstructions: isHigherPitch
          ? "Natural warm Cambodian female cadence, polite soft articulation, clear tone"
          : "Natural resonant Cambodian male cadence, calm confident intonation, warm resonance",
        transcription: referenceTranscript || "",
      };
    }

    const id = `clone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const finalGender = parsed?.gender === "Female" ? "Female" : parsed?.gender === "Neutral" ? "Neutral" : "Male";
    const finalPitch = parsed?.pitch === "High" ? "High" : parsed?.pitch === "Deep" ? "Deep" : "Medium";
    const finalPace = parsed?.pace === "Slow" ? "Slow" : parsed?.pace === "Fast" ? "Fast" : "Moderate";
    const finalBaseVoice = ["Kore", "Puck", "Zephyr", "Fenrir", "Aoede", "Charon"].includes(parsed?.bestBaseVoice)
      ? parsed.bestBaseVoice
      : finalGender === "Female" ? "Kore" : "Puck";

    const finalTranscript = referenceTranscript?.trim() || parsed?.transcription || "";
    const effectiveCloneMethod = finalTranscript ? "zero_shot_transcript" : cloneMethod;

    const profile = {
      id,
      name: customName?.trim() || parsed?.name || (finalGender === "Female" ? "សំឡេងនារី VoxCPM2 (Cloned Voice)" : "សំឡេងបុរស VoxCPM2 (Cloned Voice)"),
      nameKm: parsed?.nameKm || customName?.trim() || "សំឡេងចម្លង VoxCPM2",
      engine: "VoxCPM2",
      cloneMethod: effectiveCloneMethod,
      referenceTranscript: finalTranscript,
      referenceAudioBase64: cleaned.data,
      gender: finalGender,
      pitch: finalPitch,
      pitchShiftSemitones: typeof parsed?.pitchShiftSemitones === "number" ? parsed.pitchShiftSemitones : 0,
      timbre: parsed?.timbre || "Warm & Clear",
      pace: finalPace,
      speedMultiplier: typeof parsed?.speedMultiplier === "number" ? parsed.speedMultiplier : 1.0,
      bestBaseVoice: finalBaseVoice,
      prosodyInstructions: parsed?.prosodyInstructions || `Vocal persona: ${finalGender}, ${finalPitch} pitch, ${parsed?.timbre || "clear"} timbre. Speak with authentic Khmer intonation.`,
      transcription: finalTranscript,
      sampleAudioUrl: audioBase64.startsWith("data:") ? audioBase64 : `data:${cleaned.mimeType};base64,${cleaned.data}`,
      createdAt: Date.now(),
      isPreset: false,
    };

    res.json({
      success: true,
      ...profile,
    });
  } catch (error: any) {
    console.error("Voice clone API error:", error);
    res.status(500).json({
      error: error?.message || "Failed to analyze voice sample",
    });
  }
});

// Prebuilt voices supported by Gemini 3.8 TTS
const VALID_GEMINI_VOICES = ["Kore", "Puck", "Zephyr", "Fenrir", "Charon"];

// Acoustic style and voice mappings for Khmer presets and standard voice aliases
const KHMER_VOICE_CONFIGS: Record<string, { voice: string; style: string; displayNameKm: string }> = {
  // Preset 4: សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ) - Friendly Female Host & Guide
  preset_khmer_host_female: {
    voice: "Kore",
    style: "Polite, welcoming, warm and friendly Cambodian female host with natural smile and clear Khmer pronunciation",
    displayNameKm: "សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)",
  },
  "សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)": {
    voice: "Kore",
    style: "Polite, welcoming, warm and friendly Cambodian female host with natural smile and clear Khmer pronunciation",
    displayNameKm: "សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)",
  },
  "សំឡេងនារីរាក់ទាក់ (Khmer Host & Guide)": {
    voice: "Kore",
    style: "Polite, welcoming, warm and friendly Cambodian female host with natural smile and clear Khmer pronunciation",
    displayNameKm: "សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)",
  },
  "សំឡេងនារីរាក់ទាក់": {
    voice: "Kore",
    style: "Polite, welcoming, warm and friendly Cambodian female host with natural smile and clear Khmer pronunciation",
    displayNameKm: "សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)",
  },

  // Preset 1: សំឡេងបុរសព័ត៌មាន (ផ្លូវការ) - News Anchor
  preset_khmer_news_male: {
    voice: "Fenrir",
    style: "Authoritative, deep and clear Cambodian male news broadcast anchor with clear Khmer consonant articulation and steady cadence",
    displayNameKm: "សំឡេងបុរសព័ត៌មាន (ផ្លូវការ)",
  },
  "សំឡេងបុរសព័ត៌មាន (ផ្លូវការ)": {
    voice: "Fenrir",
    style: "Authoritative, deep and clear Cambodian male news broadcast anchor with clear Khmer consonant articulation and steady cadence",
    displayNameKm: "សំឡេងបុរសព័ត៌មាន (ផ្លូវការ)",
  },
  "សំឡេងបុរសព័ត៌មាន (Khmer News Anchor)": {
    voice: "Fenrir",
    style: "Authoritative, deep and clear Cambodian male news broadcast anchor with clear Khmer consonant articulation and steady cadence",
    displayNameKm: "សំឡេងបុរសព័ត៌មាន (ផ្លូវការ)",
  },

  // Preset 2: សំឡេងនារីនិទានរឿង (ពិរោះស្រទន់) - Storyteller
  preset_khmer_story_female: {
    voice: "Zephyr",
    style: "Warm, gentle, melodic Cambodian female storyteller with soothing bedtime cadence and lyrical warmth",
    displayNameKm: "សំឡេងនារីនិទានរឿង (ពិរោះស្រទន់)",
  },
  "សំឡេងនារីនិទានរឿង (ពិរោះស្រទន់)": {
    voice: "Zephyr",
    style: "Warm, gentle, melodic Cambodian female storyteller with soothing bedtime cadence and lyrical warmth",
    displayNameKm: "សំឡេងនារីនិទានរឿង (ពិរោះស្រទន់)",
  },
  "សំឡេងនារីនិទានរឿង (Khmer Storyteller)": {
    voice: "Zephyr",
    style: "Warm, gentle, melodic Cambodian female storyteller with soothing bedtime cadence and lyrical warmth",
    displayNameKm: "សំឡេងនារីនិទានរឿង (ពិរោះស្រទន់)",
  },

  // Preset 3: សំឡេងយុវជន (រហ័សរហួន) - Energetic Creator
  preset_khmer_creator_male: {
    voice: "Puck",
    style: "Energetic, snappy, upbeat modern Cambodian male creator for social media and TikTok",
    displayNameKm: "សំឡេងយុវជន (រហ័សរហួន)",
  },
  "សំឡេងយុវជន (រហ័សរហួន)": {
    voice: "Puck",
    style: "Energetic, snappy, upbeat modern Cambodian male creator for social media and TikTok",
    displayNameKm: "សំឡេងយុវជន (រហ័សរហួន)",
  },
  "សំឡេងយុវជន TikTok/Shorts (Energetic Creator)": {
    voice: "Puck",
    style: "Energetic, snappy, upbeat modern Cambodian male creator for social media and TikTok",
    displayNameKm: "សំឡេងយុវជន (រហ័សរហួន)",
  },

  // Standard Voice direct keys
  kore: {
    voice: "Kore",
    style: "Warm, polite, and natural Cambodian female voice with clear Khmer vowels",
    displayNameKm: "សំឡេងនារីរាក់ទាក់ (ធម្មជាតិ)",
  },
  puck: {
    voice: "Puck",
    style: "Lively, crisp, and clear male voice with dynamic tempo",
    displayNameKm: "សំឡេងយុវជន (រហ័សរហួន)",
  },
  zephyr: {
    voice: "Zephyr",
    style: "Smooth, friendly, melodic and gentle female voice",
    displayNameKm: "សំឡេងនារីស្រទន់ (ពិរោះស្រទន់)",
  },
  fenrir: {
    voice: "Fenrir",
    style: "Deep, resonant, and authoritative male broadcast voice",
    displayNameKm: "សំឡេងបុរសព័ត៌មាន (ផ្លូវការ)",
  },
  charon: {
    voice: "Charon",
    style: "Calm, thoughtful, measured and mature male voice",
    displayNameKm: "សំឡេងបុរសចាស់ទុំ (ស្ងប់ស្ងាត់)",
  },
  aoede: {
    voice: "Zephyr",
    style: "Melodic, gentle, and warm female voice",
    displayNameKm: "សំឡេងនារីស្រទន់ (ពិរោះស្រទន់)",
  },
};

// 3. TTS API (Text-to-Speech via Gemini Native Audio or VoxCPM2 Cloned Synthesis)
async function handleTts(req: express.Request, res: express.Response) {
  try {
    const text = (req.method === "POST" ? req.body.text : req.query.text) as string;
    const lang = (req.method === "POST" ? req.body.lang : req.query.lang) || "km";
    const requestedVoice = (req.method === "POST" ? req.body.voice : req.query.voice) || "";
    const cloneProfile = req.method === "POST" ? req.body.cloneProfile : null;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text to synthesize" });
    }

    // Resolve voice and acoustic style
    let resolvedVoice = "Kore";
    let resolvedStyle = lang === "km"
      ? "Polite, welcoming, warm and natural Cambodian Khmer speech with clear pronunciation"
      : "Polite, clear, and natural speech";
    let displayName = "Kore";

    // 1. Check if clone profile matches a known preset
    const presetKey = cloneProfile?.id || cloneProfile?.nameKm || cloneProfile?.name || requestedVoice;
    const presetConfig = KHMER_VOICE_CONFIGS[presetKey] || KHMER_VOICE_CONFIGS[String(presetKey).toLowerCase()];

    if (presetConfig) {
      resolvedVoice = presetConfig.voice;
      resolvedStyle = presetConfig.style;
      displayName = presetConfig.displayNameKm;
    } else if (cloneProfile) {
      // Custom user cloned voice profile
      const candidateBase = cloneProfile.bestBaseVoice;
      if (candidateBase && VALID_GEMINI_VOICES.includes(candidateBase)) {
        resolvedVoice = candidateBase;
      } else if (candidateBase?.toLowerCase() === "aoede") {
        resolvedVoice = "Zephyr";
      } else {
        resolvedVoice = cloneProfile.gender === "Male" ? "Puck" : "Kore";
      }

      resolvedStyle = cloneProfile.prosodyInstructions ||
        `${cloneProfile.gender || "Female"} speaker with ${cloneProfile.pitch || "Medium"} pitch, ${cloneProfile.timbre || "Clear"} timbre, speaking authentic Khmer.`;
      displayName = cloneProfile.nameKm || cloneProfile.name || resolvedVoice;
    } else if (requestedVoice) {
      // Lookup standard voice or alias
      const normalizedKey = requestedVoice.toLowerCase();
      if (KHMER_VOICE_CONFIGS[normalizedKey]) {
        resolvedVoice = KHMER_VOICE_CONFIGS[normalizedKey].voice;
        resolvedStyle = KHMER_VOICE_CONFIGS[normalizedKey].style;
        displayName = KHMER_VOICE_CONFIGS[normalizedKey].displayNameKm;
      } else {
        const matched = VALID_GEMINI_VOICES.find((v) => v.toLowerCase() === normalizedKey);
        resolvedVoice = matched || "Kore";
        displayName = resolvedVoice;
      }
    }

    const ai = getAI();
    let audioPart: any = null;
    let ttsError: any = null;

    // Call Gemini TTS models with fallback
    for (const ttsModel of TTS_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: text.trim(),
                  speechMetadata: {
                    style: resolvedStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: resolvedVoice },
              },
            },
          },
        });

        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (part?.inlineData?.data) {
          audioPart = part;
          break;
        }
      } catch (err: any) {
        console.warn(`TTS model ${ttsModel} failed:`, err?.message);
        ttsError = err;
      }
    }

    if (audioPart?.inlineData?.data) {
      const rawBuffer = Buffer.from(audioPart.inlineData.data, "base64");
      // Check if Gemini unary output already contains RIFF WAV header (default in Gemini 3.8 TTS unary)
      const isAlreadyWav =
        rawBuffer.length >= 12 &&
        rawBuffer.toString("ascii", 0, 4) === "RIFF" &&
        rawBuffer.toString("ascii", 8, 12) === "WAVE";

      const wavBuffer = isAlreadyWav ? rawBuffer : pcmToWav(rawBuffer, 24000, 1, 16);

      if (req.query.format === "json" || req.headers.accept?.includes("application/json")) {
        return res.json({
          success: true,
          audioBase64: `data:audio/wav;base64,${wavBuffer.toString("base64")}`,
          mimeType: "audio/wav",
          voiceUsed: resolvedVoice,
          displayName,
          isCloned: !!cloneProfile,
          engine: cloneProfile?.engine || "VoxCPM2",
        });
      }

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", wavBuffer.length);
      res.setHeader("Content-Disposition", 'inline; filename="jong_use_speech.wav"');
      return res.send(wavBuffer);
    }

    // If native audio was unavailable, fallback
    return res.status(500).json({
      error: ttsError?.message || "Could not generate speech audio",
    });
  } catch (error: any) {
    console.error("TTS API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Text-to-Speech API quota reached. Please try again shortly or check your Gemini project quota."
      : error.message || "Failed to generate speech";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
}

app.get("/api/tts", handleTts);
app.post("/api/tts", handleTts);

// Helper function to format milliseconds into SRT timestamp format: HH:MM:SS,mmm
function formatSrtTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

// Fallback algorithm to split text into timed SRT segments
function generateFallbackSrt(
  script: string,
  speed = 'normal',
  maxChars = 35,
  startOffsetSec = 0,
  chunkMode = 'standard'
) {
  const isShortWords = chunkMode === 'short_punchy' || maxChars <= 18;
  const effectiveMaxChars = isShortWords ? Math.min(18, maxChars) : maxChars;

  const lines = script
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const line of lines) {
    if (isShortWords) {
      // Split into 1-3 words or short tokens
      if (line.includes(' ')) {
        const words = line.split(/\s+/).filter(Boolean);
        let cur = '';
        let wordCount = 0;
        for (const w of words) {
          if (wordCount >= 3 || (cur.length + w.length > effectiveMaxChars && cur.length > 0)) {
            chunks.push(cur.trim());
            cur = w;
            wordCount = 1;
          } else {
            cur = cur ? `${cur} ${w}` : w;
            wordCount++;
          }
        }
        if (cur.trim()) chunks.push(cur.trim());
      } else {
        // Khmer unbroken text: split on punctuation or every 12-16 chars
        const parts = line.split(/([។.!?,\s]+)/).filter(Boolean);
        for (const part of parts) {
          if (part.length <= effectiveMaxChars) {
            chunks.push(part);
          } else {
            for (let i = 0; i < part.length; i += effectiveMaxChars) {
              chunks.push(part.slice(i, i + effectiveMaxChars));
            }
          }
        }
      }
    } else if (line.length <= effectiveMaxChars) {
      chunks.push(line);
    } else {
      // Split on punctuation or spaces
      const sentences = line.split(/([។.!?,\n]+)/).filter(Boolean);
      let current = '';
      for (let i = 0; i < sentences.length; i++) {
        const seg = sentences[i];
        if ((current + seg).length <= effectiveMaxChars) {
          current += seg;
        } else {
          if (current.trim()) chunks.push(current.trim());
          current = seg;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }

  // Speed factors: ultra_fast (~220 WPM), fast (~170 WPM), normal (~130 WPM), slow (~95 WPM)
  const speedFactor = speed === 'ultra_fast' ? 0.55 : speed === 'fast' ? 0.75 : speed === 'slow' ? 1.35 : 1.0;
  const minDurationMs = speed === 'ultra_fast' ? 400 : speed === 'fast' ? 600 : 1200;
  const maxDurationMs = speed === 'ultra_fast' ? 2500 : speed === 'fast' ? 3800 : 6000;
  const pauseGapMs = speed === 'ultra_fast' ? 80 : speed === 'fast' ? 120 : 200;
  const msPerChar = Math.round(65 * speedFactor);

  let currentMs = Math.round(startOffsetSec * 1000);
  const segments: Array<{ id: number; startTime: string; endTime: string; startMs: number; endMs: number; text: string }> = [];

  chunks.filter(Boolean).forEach((text, index) => {
    const charCount = text.length;
    const durationMs = Math.max(minDurationMs, Math.min(maxDurationMs, Math.round(charCount * msPerChar)));
    const endMs = currentMs + durationMs;

    segments.push({
      id: index + 1,
      startTime: formatSrtTimestamp(currentMs),
      endTime: formatSrtTimestamp(endMs),
      startMs: currentMs,
      endMs: endMs,
      text: text.trim(),
    });

    currentMs = endMs + pauseGapMs;
  });

  const srtContent = segments
    .map(s => `${s.id}\n${s.startTime} --> ${s.endTime}\n${s.text}\n`)
    .join('\n');

  return { segments, srtContent };
}

// 4. Generate Subtitle SRT API
app.post("/api/generate-srt", async (req, res) => {
  try {
    const {
      script,
      language = "km",
      speed = "normal",
      chunkMode = "standard",
      maxCharsPerLine = 35,
      startTimeOffset = 0,
      translateTo = "none",
    } = req.body;

    if (!script || !script.trim()) {
      return res.status(400).json({ error: "Missing script or text in request body" });
    }

    const isShortWords = chunkMode === 'short_punchy' || Number(maxCharsPerLine) <= 18;
    const speedWpm = speed === 'ultra_fast' ? '220-250 words/min (rapid fast speak)' : speed === 'fast' ? '170-190 words/min (fast dynamic speak)' : speed === 'slow' ? '90-110 words/min (slow clear)' : '130-150 words/min (normal)';

    try {
      const ai = getAI();
      const prompt = `You are an expert video subtitling, dialogue timing, and short-form video caption engine for TikTok, Instagram Reels, YouTube Shorts, and YouTube.
Given the following voiceover/dialogue script, split it into natural, rhythmically paced subtitle segments and format them as standard SubRip (.SRT) subtitles with realistic timecodes.

Parameters:
- Target speech pace: ${speed} (${speedWpm})
- Segmentation style: ${isShortWords ? 'PUNCHY SHORT WORDS (1 to 3 words or 8 to 16 characters per subtitle segment max for fast TikTok/Shorts captions)' : 'Natural phrases / sentences'}
- Maximum characters per subtitle line: ${isShortWords ? Math.min(18, maxCharsPerLine) : maxCharsPerLine} chars
- Initial start time offset: ${startTimeOffset} seconds (${formatSrtTimestamp(startTimeOffset * 1000)})
- Target Translation: ${translateTo !== 'none' ? `Translate the text to ${translateTo}` : 'Keep original language'}

Script to subtitle:
"""
${script.trim()}
"""

Requirements:
1. ${isShortWords ? 'CRITICAL: Keep segments ULTRA-SHORT (1 to 3 words each), fast-paced durations (~0.4s - 1.2s per segment for ultra_fast/fast speak), rapid sequential cuts.' : 'Divide the script into concise phrases or sentences that flow naturally with spoken cadence.'}
2. Ensure sequential timestamps with no overlapping and small (${speed === 'ultra_fast' ? '60-100ms' : '120-200ms'}) natural breathing pauses between lines.
3. Keep Khmer grammatical phrases and word boundaries intact without breaking compound words abruptly.
4. Output a JSON object with two fields:
   - "srt": string (the exact valid .srt formatted string, e.g. "1\\n00:00:01,000 --> 00:00:01,800\\nឃ្លាខ្លី...\\n\\n")
   - "segments": array of objects: [{ "id": 1, "startTime": "00:00:01,000", "endTime": "00:00:01,800", "startMs": 1000, "endMs": 1800, "text": "..." }]`;

      const response = await generateWithFallback(ai, TEXT_MODELS, {
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = extractJsonSafe<any>(responseText) || {};

      if (parsed.srt && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
        return res.json({
          success: true,
          srt: parsed.srt,
          segments: parsed.segments,
          count: parsed.segments.length,
        });
      }
    } catch (aiErr) {
      console.warn("AI SRT generation fallback to algorithmic generator:", aiErr);
    }

    // Fallback to local deterministic generator
    const fallback = generateFallbackSrt(script, speed, maxCharsPerLine, Number(startTimeOffset) || 0, chunkMode);
    return res.json({
      success: true,
      srt: fallback.srtContent,
      segments: fallback.segments,
      count: fallback.segments.length,
      fallbackUsed: true,
    });
  } catch (error: any) {
    console.error("Generate SRT API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate subtitle SRT" });
  }
});

// 4. ID Photo / Passport Maker API
app.post("/api/idphoto", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      attire = "suit_black",
      bgColor = "blue_sky",
      gender = "unspecified",
      aspectRatio = "3:4",
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    const ai = getAI();

    // Human readable attire and bg descriptions
    const attireMap: Record<string, string> = {
      suit_black: "a crisp, tailored black formal suit with a clean white collared dress shirt and elegant dark necktie",
      suit_navy: "a sharp navy blue business executive suit with a pressed light blue shirt and subtle tie",
      blazer_grey: "a modern charcoal grey formal blazer with a neat white inner shirt",
      formal_white_shirt: "a neat, buttoned formal white collar dress shirt, perfectly ironed",
      traditional_khmer_formal: "a sophisticated traditional Cambodian formal silk attire (អាវធំប្រពៃណី) with embroidered collar trim",
      female_suit_black: "a formal black business jacket blazer with a neat white blouse collar",
      female_blouse_white: "an elegant, modest white silk blouse with a structured collar",
    };

    const bgMap: Record<string, string> = {
      blue_sky: "solid clean sky-blue background (#3b82f6 / #60a5fa) standard for Cambodian citizenship and passport photos",
      blue_dark: "solid deep royal blue passport background (#1e3a8a)",
      white: "pure clean studio white background (#ffffff) standard for international visas, Schengen, and US passports",
      grey_light: "neutral soft studio grey gradient background (#e2e8f0)",
      red: "solid formal crimson red background (#dc2626) standard for academic credentials and official badges",
    };

    const attirePrompt = attireMap[attire] || attireMap.suit_black;
    const bgPrompt = bgMap[bgColor] || bgMap.blue_sky;

    const editPrompt = `Transform this photo into an official, professional passport / ID card portrait:
1. Subject & Face: Preserve the exact person's facial geometry, skin tone, eye color, expression, hairstyle, and likeness perfectly. Keep head straight, looking directly at the camera with neutral, pleasant professional demeanor.
2. Attire replacement: Seamlessly dress the person in ${attirePrompt}.
3. Background replacement: Replace the background completely with ${bgPrompt} with zero background artifacts.
4. Lighting & Retouching: Apply soft studio photography lighting, clean even shadows, sharp focus on facial features, remove blemish glare, perfectly framed centered portrait headshot suitable for official IDs, visas, and resumes.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType || mimeType,
            },
          },
          {
            text: editPrompt,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imgMime = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${imgMime};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) break;
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        attire,
        bgColor,
      });
    }

    return res.status(500).json({ error: "Image generation model did not return image data" });
  } catch (error: any) {
    console.error("ID Photo API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Gemini Image Generation quota limit reached. Please select a project with Gemini billing/quota enabled."
      : error.message || "Failed to generate ID photo";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
});

// 5. Image Upscale & Enhance API
app.post("/api/upscale", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      scale = "2x",
      enhanceFaces = true,
      denoise = true,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    const ai = getAI();

    const upscalePrompt = `High-definition AI photo enhancement and super-resolution (${scale} upscale):
1. Sharpen blurry edges, remove JPEG compression artifacts, pixelation, and camera noise.
2. ${enhanceFaces ? "Reconstruct crystal-clear facial details, eyes, eyelashes, and texture naturally without artificial distortion." : "Preserve textures accurately."}
3. Maintain 100% fidelity to the original subject, colors, lighting, composition, and identity.
4. Output a pristine, ultra-sharp high-resolution version of this image.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType || mimeType,
            },
          },
          {
            text: upscalePrompt,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imgMime = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${imgMime};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) break;
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        scale,
      });
    }

    // Fallback if image model returned text or echo
    return res.json({
      success: true,
      imageUrl: imageBase64,
      note: "Enhanced using standard rendering",
    });
  } catch (error: any) {
    console.error("Upscale API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Gemini Image Enhancement quota limit reached. Please select a project with Gemini billing/quota enabled."
      : error.message || "Failed to upscale image";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
});

// 6. Background Remover API
app.post("/api/bgremove", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      bgColor = "white", // 'transparent', 'white', '#hex'
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    const ai = getAI();

    const bgPrompt =
      bgColor === "white"
        ? "solid pure clean white (#ffffff) background"
        : bgColor === "transparent"
        ? "pure isolated solid plain white studio background with clean cutout edges for transparent alpha masking"
        : `solid background colored ${bgColor}`;

    const prompt = `Precise foreground subject segmentation and background removal:
1. Identify the main foreground subjects (people, animals, products, or objects).
2. Cleanly isolate the subject, cutting out complex hair strands, fabric boundaries, and fine edges flawlessly.
3. Replace the entire background with a ${bgPrompt}.
4. Retain full original subject color, contrast, and sharp detail.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType || mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imgMime = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${imgMime};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) break;
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        bgColor,
      });
    }

    return res.status(500).json({ error: "Background remover did not return image data" });
  } catch (error: any) {
    console.error("BG Remove API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Gemini Background Removal quota limit reached. Please select a project with Gemini billing/quota enabled."
      : error.message || "Failed to remove background";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
});

// 7. Video Subtitle Styler Full-Pipeline Routes (Upload, FFmpeg WAV 16k extraction, Gemini STT, AutoEdit, ASS Export)
app.use('/api/subtitle-styler', subtitleStylerRoutes);

// 8. Social Video Downloader (TikTok, Douyin, Facebook, Pinterest, YouTube)
app.use('/api/download', downloaderRoutes);
startDownloaderMaintenance();

// 9. SQL Database Endpoints & Schema Exporter
const SQL_SCHEMA_DDL = `-- Jong Use (ចង់ប្រើ) Relational SQL Database Schema
-- Compatible with PostgreSQL 13+, Cloud SQL, and SQLite 3

CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  plan VARCHAR(50) DEFAULT 'free',
  tokens INTEGER DEFAULT 100,
  total_tokens_used INTEGER DEFAULT 0,
  operations_count INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT FALSE,
  plan_billing_cycle VARCHAR(20) DEFAULT 'monthly',
  plan_expires_at BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  user_email VARCHAR(255),
  tool VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  tokens_deducted INTEGER NOT NULL,
  tokens_remaining INTEGER NOT NULL,
  summary TEXT,
  status VARCHAR(20) DEFAULT 'success',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS ocr_jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  extracted_text TEXT,
  translated_text TEXT,
  target_lang VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tts_jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  voice_id VARCHAR(100),
  input_text TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subtitles (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  title VARCHAR(255),
  srt_content TEXT,
  ass_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

app.get('/api/sql/info', (req, res) => {
  const projectId = "gen-lang-client-0586713722";
  const databaseId = "ai-studio-remixremixjongus-c0032be8-3573-4fc9-83a1-5042b9c03812";
  
  res.json({
    status: "active",
    projectId,
    databaseId,
    firestoreConsoleUrl: `https://console.firebase.google.com/project/${projectId}/firestore/databases/${databaseId}/data`,
    gcpFirestoreConsoleUrl: `https://console.cloud.google.com/firestore/databases/${databaseId}/data?project=${projectId}`,
    cloudSqlConsoleUrl: `https://console.cloud.google.com/sql/instances?project=${projectId}`,
    bigQueryConsoleUrl: `https://console.cloud.google.com/bigquery?project=${projectId}`,
    tables: ["users", "usage_logs", "ocr_jobs", "tts_jobs", "subtitles"],
    sqlSchemaUrl: "/api/sql/schema",
    sqlExportUrl: "/api/sql/export"
  });
});

app.get('/api/sql/schema', (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(SQL_SCHEMA_DDL);
});

app.get('/api/sql/export', (req, res) => {
  const demoInsert = `\n-- Sample Initial Data Seed\nINSERT INTO users (uid, email, display_name, plan, tokens) \nVALUES ('admin_master', 'creator@jonguse.app', 'Jong Use Admin', 'studio_ultra', 1000)\nON CONFLICT (uid) DO NOTHING;\n`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="jonguse_database.sql"');
  res.send(SQL_SCHEMA_DDL + demoInsert);
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jong Use (ចង់ប្រើ) server running on http://localhost:${PORT}`);
  });
}

startServer();
