import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractAudioToWav16k, burnSubtitlesWithFfmpeg, generateWaveformData, runFfmpegCommand } from '../services/ffmpeg';
import { transcribeKhmerAudioWithGemini } from '../services/stt';
import { autoEditSubtitles, splitSubtitlesToWordChunks } from '../services/autoEdit';
import { generateAss, generateSrt, generateVtt, parseSrtToSubtitles } from '../services/assBuilder';
import { TEMPLATE_PRESETS, SubtitleProjectData, SubtitleItem } from '../templates/presets';

const router = Router();

// Storage directory in /tmp or cwd
const UPLOAD_DIR = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit
});

/**
 * 1. GET /api/subtitle-styler/templates - Returns all available presets
 */
router.get('/templates', (req: Request, res: Response) => {
  res.json({
    success: true,
    templates: Object.values(TEMPLATE_PRESETS),
  });
});

/**
 * 2. POST /api/subtitle-styler/upload - Upload video file, extract audio to 16kHz WAV, extract waveform
 * Supports both client-extracted 16kHz WAV (for zero-dependency Cloud Run deployment) and server FFmpeg
 */
router.post(
  '/upload',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const videoFile = filesMap?.['video']?.[0];
      const audioFile = filesMap?.['audio']?.[0];

      if (!videoFile && !audioFile) {
        return res.status(400).json({ error: 'No video or audio file provided' });
      }

      const baseName = videoFile
        ? path.parse(videoFile.filename).name
        : `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const wavPath = path.join(UPLOAD_DIR, `${baseName}_16k.wav`);

      let extractedWav = false;

      // 1. If client provided pre-extracted 16kHz WAV (from Web Audio API), use it immediately!
      if (audioFile && fs.existsSync(audioFile.path)) {
        try {
          fs.copyFileSync(audioFile.path, wavPath);
          extractedWav = true;
        } catch (copyErr) {
          console.warn('Could not copy client-extracted audio:', copyErr);
        }
      }

      // 2. If client audio wasn't provided but video was, try server-side FFmpeg extraction
      if (!extractedWav && videoFile) {
        try {
          await extractAudioToWav16k(videoFile.path, wavPath);
          extractedWav = true;
        } catch (ffmpegErr: any) {
          console.warn('Server FFmpeg audio extraction warning (falling back to direct video multimodal STT):', ffmpegErr.message);
        }
      }

      // 3. Generate waveform amplitude points
      let waveform: number[] = [];
      if (extractedWav && fs.existsSync(wavPath)) {
        waveform = await generateWaveformData(wavPath, 100);
      } else {
        // Fallback realistic waveform so audio timeline renders nicely even without ffmpeg
        waveform = Array.from({ length: 100 }, (_, i) =>
          Number((0.15 + 0.45 * Math.abs(Math.sin((i * Math.PI) / 8) * Math.cos(i * 0.15))).toFixed(3))
        );
      }

      const autoTranscribe = req.body.autoTranscribe === 'true' || req.body.autoTranscribe === true;
      let autoSubtitles: SubtitleItem[] = [];
      let sttError: string | null = null;

      // 4. Optional auto-transcribe immediately on upload
      if (autoTranscribe) {
        try {
          let audioBuffer: Buffer | null = null;
          let mimeType = 'audio/wav';

          if (extractedWav && fs.existsSync(wavPath)) {
            audioBuffer = fs.readFileSync(wavPath);
            mimeType = 'audio/wav';
          } else if (videoFile && fs.existsSync(videoFile.path)) {
            // Multimodal Fallback: Transcribe directly from the video file container
            audioBuffer = fs.readFileSync(videoFile.path);
            const ext = path.extname(videoFile.originalname || videoFile.filename).toLowerCase();
            mimeType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';
          }

          if (audioBuffer) {
            const rawSubs = await transcribeKhmerAudioWithGemini(audioBuffer, mimeType);
            autoSubtitles = autoEditSubtitles(rawSubs);
          }
        } catch (err: any) {
          console.warn('Auto transcribe on upload error:', err.message);
          sttError = err.message;
        }
      }

      res.json({
        success: true,
        fileId: baseName,
        videoFileName: videoFile ? videoFile.originalname : (req.body.fileName || 'video_media.mp4'),
        videoUrl: videoFile ? `/api/subtitle-styler/file/${videoFile.filename}` : null,
        audioUrl: extractedWav ? `/api/subtitle-styler/file/${baseName}_16k.wav` : null,
        hasAudio: extractedWav || Boolean(videoFile),
        waveform,
        subtitles: autoSubtitles,
        transcribeError: sttError,
      });
    } catch (error: any) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to process uploaded video' });
    }
  }
);

/**
 * 3. POST /api/subtitle-styler/transcribe - Transcribes audio using Gemini STT + Auto-clean
 * Supports 16kHz WAV, client audio base64, or direct fallback to source video file
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/wav';

    if (req.file) {
      audioBuffer = fs.readFileSync(req.file.path);
      mimeType = req.file.mimetype || 'audio/wav';
    } else if (req.body.fileId) {
      // 1. Try finding extracted wav in UPLOAD_DIR
      const wavPath = path.join(UPLOAD_DIR, `${req.body.fileId}_16k.wav`);
      if (fs.existsSync(wavPath)) {
        audioBuffer = fs.readFileSync(wavPath);
        mimeType = 'audio/wav';
      } else {
        // 2. Multimodal Fallback: find source video in UPLOAD_DIR
        const files = fs.readdirSync(UPLOAD_DIR);
        const videoMatch = files.find(
          (f) =>
            f.startsWith(req.body.fileId) &&
            !f.includes('_burned') &&
            !f.endsWith('.wav') &&
            !f.endsWith('.ass')
        );
        if (videoMatch) {
          const videoFilePath = path.join(UPLOAD_DIR, videoMatch);
          audioBuffer = fs.readFileSync(videoFilePath);
          const ext = path.extname(videoMatch).toLowerCase();
          mimeType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';
        }
      }
    } else if (req.body.audioBase64) {
      const b64 = req.body.audioBase64.replace(/^data:[^;]+;base64,/, '');
      audioBuffer = Buffer.from(b64, 'base64');
      mimeType = req.body.mimeType || 'audio/wav';
    }

    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio or video source found to transcribe' });
    }

    // Call Gemini STT
    const rawSubtitles = await transcribeKhmerAudioWithGemini(audioBuffer, mimeType);

    // Run auto-edit (split long lines max 42 chars / 2 lines with Intl.Segmenter, normalize punctuation)
    const cleanedSubtitles = autoEditSubtitles(rawSubtitles);

    res.json({
      success: true,
      count: cleanedSubtitles.length,
      subtitles: cleanedSubtitles,
      rawCount: rawSubtitles.length,
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    const isQuota = error.status === 429 || String(error.message).includes('429') || String(error.message).includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 500).json({
      error: isQuota
        ? 'Speech-to-Text API quota exceeded. Please try again in a few moments.'
        : error.message || 'Failed to transcribe audio',
      isQuota,
    });
  }
});

/**
 * 4. POST /api/subtitle-styler/auto-edit - Cleans and formats subtitle lines
 */
router.post('/auto-edit', (req: Request, res: Response) => {
  try {
    const { subtitles, options } = req.body;
    if (!Array.isArray(subtitles)) {
      return res.status(400).json({ error: 'Invalid subtitles array' });
    }

    const processed = autoEditSubtitles(subtitles, options);
    res.json({
      success: true,
      subtitles: processed,
      count: processed.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Auto-edit failed' });
  }
});

/**
 * 4.5 POST /api/subtitle-styler/chunk-words - Split subtitles into 1, 2, or 3 word chunks (for pop animations)
 */
router.post('/chunk-words', (req: Request, res: Response) => {
  try {
    const { subtitles, chunkSize = 1 } = req.body;
    if (!Array.isArray(subtitles)) {
      return res.status(400).json({ error: 'Invalid subtitles array' });
    }

    const validSize = [1, 2, 3].includes(Number(chunkSize)) ? (Number(chunkSize) as 1 | 2 | 3) : 1;
    const chunked = splitSubtitlesToWordChunks(subtitles, validSize);
    res.json({
      success: true,
      subtitles: chunked,
      count: chunked.length,
      chunkSize: validSize,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to chunk words' });
  }
});

/**
 * 5. POST /api/subtitle-styler/import-srt - Imports raw SRT text or file
 */
router.post('/import-srt', upload.single('srtFile'), (req: Request, res: Response) => {
  try {
    let srtText = req.body.srtText || '';
    if (req.file) {
      srtText = fs.readFileSync(req.file.path, 'utf8');
    }

    if (!srtText || !srtText.trim()) {
      return res.status(400).json({ error: 'No SRT content provided' });
    }

    const subtitles = parseSrtToSubtitles(srtText);
    res.json({
      success: true,
      subtitles,
      count: subtitles.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to parse SRT' });
  }
});

/**
 * 6. POST /api/subtitle-styler/export - Exports .srt, .vtt, .ass, or burns into video with FFmpeg
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const projectData: SubtitleProjectData = req.body.projectData || {
      subtitles: req.body.subtitles || [],
      style: req.body.style,
      template: req.body.template || 'karaoke-highlight',
    };

    const format = req.body.format || 'srt'; // 'srt' | 'vtt' | 'ass' | 'burn-video'
    const fileId = req.body.fileId;

    if (format === 'srt') {
      const srt = generateSrt(projectData);
      return res.json({
        success: true,
        format: 'srt',
        content: srt,
        filename: 'subtitles.srt',
      });
    }

    if (format === 'vtt') {
      const vtt = generateVtt(projectData);
      return res.json({
        success: true,
        format: 'vtt',
        content: vtt,
        filename: 'subtitles.vtt',
      });
    }

    if (format === 'ass') {
      const ass = generateAss(projectData);
      return res.json({
        success: true,
        format: 'ass',
        content: ass,
        filename: 'subtitles.ass',
      });
    }

    if (format === 'burn-video') {
      // Find source video
      if (!fileId) {
        return res.status(400).json({ error: 'Missing fileId for server video burn-in' });
      }

      // If fileId is 'sample_demo', ensure sample_demo.mp4 exists
      if (fileId === 'sample_demo') {
        const samplePath = path.join(UPLOAD_DIR, 'sample_demo.mp4');
        if (!fs.existsSync(samplePath) || fs.statSync(samplePath).size < 1000) {
          await runFfmpegCommand([
            '-y',
            '-f', 'lavfi', '-i', 'testsrc=duration=15:size=1280x720:rate=30',
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=15',
            '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.0', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
            '-movflags', '+faststart',
            samplePath
          ]);
        }
      }

      const files = fs.readdirSync(UPLOAD_DIR);
      // Strictly avoid matching previous _burned outputs, _burn.ass, or .wav files as source!
      const videoMatch = files.find(
        (f) =>
          f.startsWith(fileId) &&
          !f.includes('_burned') &&
          !f.includes('_burn.ass') &&
          !f.includes('tmp_') &&
          !f.endsWith('.wav') &&
          !f.endsWith('.ass')
      );

      if (!videoMatch) {
        return res.status(404).json({ error: 'Original video file not found on server' });
      }

      const sourceVideoPath = path.join(UPLOAD_DIR, videoMatch);
      const assPath = path.join(UPLOAD_DIR, `${fileId}_burn.ass`);
      const outputVideoPath = path.join(UPLOAD_DIR, `${fileId}_burned.mp4`);

      // Write ASS file
      const assContent = generateAss(projectData);
      fs.writeFileSync(assPath, assContent, 'utf8');

      // Burn into video using FFmpeg
      await burnSubtitlesWithFfmpeg(sourceVideoPath, assPath, outputVideoPath);

      // Verify output video exists and is non-empty
      if (!fs.existsSync(outputVideoPath) || fs.statSync(outputVideoPath).size === 0) {
        throw new Error('Video encoding produced empty output');
      }

      return res.json({
        success: true,
        format: 'burn-video',
        videoUrl: `/api/subtitle-styler/file/${fileId}_burned.mp4`,
        downloadUrl: `/api/subtitle-styler/file/${fileId}_burned.mp4?download=true`,
        filename: `${fileId}_burned.mp4`,
      });
    }

    return res.status(400).json({ error: `Unsupported export format: ${format}` });
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export subtitles' });
  }
});

/**
 * 6.5 GET /api/subtitle-styler/sample-demo - Generates / loads sample video with audio and Khmer subtitles
 */
router.get('/sample-demo', async (req: Request, res: Response) => {
  try {
    const samplePath = path.join(UPLOAD_DIR, 'sample_demo.mp4');
    const wavPath = path.join(UPLOAD_DIR, 'sample_demo_16k.wav');

    // Create sample demo video if it doesn't exist
    if (!fs.existsSync(samplePath) || fs.statSync(samplePath).size < 1000) {
      await runFfmpegCommand([
        '-y',
        '-f', 'lavfi', '-i', 'testsrc=duration=15:size=1280x720:rate=30',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=15',
        '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.0', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-movflags', '+faststart',
        samplePath,
      ]);
    }

    if (!fs.existsSync(wavPath)) {
      try {
        await extractAudioToWav16k(samplePath, wavPath);
      } catch (e) {
        console.warn('WAV extract warning for sample demo:', e);
      }
    }

    let waveform: number[] = [];
    if (fs.existsSync(wavPath)) {
      waveform = await generateWaveformData(wavPath, 100);
    }

    const demoSubtitles: SubtitleItem[] = [
      {
        id: 1,
        start: 0.5,
        end: 3.5,
        text: 'សូមស្វាគមន៍មកកាន់ កម្មវិធី ចង់ប្រើ (Jong Use)',
        words: [
          { w: 'សូមស្វាគមន៍', s: 0.5, e: 1.2 },
          { w: 'មកកាន់', s: 1.2, e: 1.7 },
          { w: 'កម្មវិធី', s: 1.7, e: 2.2 },
          { w: 'ចង់ប្រើ', s: 2.2, e: 3.5 },
        ],
      },
      {
        id: 2,
        start: 4.0,
        end: 7.2,
        text: 'ឧបករណ៍កែសម្រួល Subtitle វីដេអូ ដោយស្វ័យប្រវត្ត',
        words: [
          { w: 'ឧបករណ៍', s: 4.0, e: 4.6 },
          { w: 'កែសម្រួល', s: 4.6, e: 5.3 },
          { w: 'Subtitle', s: 5.3, e: 6.0 },
          { w: 'វីដេអូ', s: 6.0, e: 6.5 },
          { w: 'ស្វ័យប្រវត្ត', s: 6.5, e: 7.2 },
        ],
      },
      {
        id: 3,
        start: 7.8,
        end: 11.2,
        text: 'គាំទ្រពុម្ពអក្សរខ្មែរ Noto Sans, Battambang និង Koulen',
        words: [
          { w: 'គាំទ្រ', s: 7.8, e: 8.3 },
          { w: 'ពុម្ពអក្សរខ្មែរ', s: 8.3, e: 9.2 },
          { w: 'Noto Sans,', s: 9.2, e: 9.9 },
          { w: 'Battambang', s: 9.9, e: 10.5 },
          { w: 'Koulen', s: 10.5, e: 11.2 },
        ],
      },
      {
        id: 4,
        start: 11.8,
        end: 14.8,
        text: 'Export វីដេអូបានច្បាស់ត្រជាក់ភ្នែក និងទាញយក SRT ឥតគិតថ្លៃ!',
        words: [
          { w: 'Export', s: 11.8, e: 12.3 },
          { w: 'វីដេអូ', s: 12.3, e: 12.8 },
          { w: 'ច្បាស់', s: 12.8, e: 13.4 },
          { w: 'ទាញយក', s: 13.4, e: 14.0 },
          { w: 'ឥតគិតថ្លៃ!', s: 14.0, e: 14.8 },
        ],
      },
    ];

    res.json({
      success: true,
      fileId: 'sample_demo',
      videoFileName: 'sample_demo.mp4',
      videoUrl: '/api/subtitle-styler/file/sample_demo.mp4',
      duration: 15,
      waveform,
      subtitles: demoSubtitles,
    });
  } catch (error: any) {
    console.error('Sample demo load error:', error);
    res.status(500).json({ error: error.message || 'Failed to load sample demo' });
  }
});

/**
 * 7. GET /api/subtitle-styler/file/:filename - Serves media files safely with range requests & proper download headers
 */
router.get('/file/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Handle clean file download with proper Content-Disposition and Content-Type
  if (req.query.download === 'true') {
    const rawName = (req.query.filename as string) || (filename.includes('_burned') ? 'jong_use_burned_subtitles.mp4' : filename);
    const cleanDownloadName = rawName.endsWith('.mp4') ? rawName : `${rawName}.mp4`;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanDownloadName}"`);
    return res.download(filePath, cleanDownloadName);
  }

  // Handle video streaming range headers
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range && (filename.endsWith('.mp4') || filename.endsWith('.webm') || filename.endsWith('.mov'))) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': filename.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    if (filename.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
    res.sendFile(filePath);
  }
});

export default router;
