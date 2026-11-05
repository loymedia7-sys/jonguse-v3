import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language, SubtitleSegment } from '../types';
import { translations } from '../lib/i18n';
import {
  SubtitleItem,
  SubtitleStyle,
  SubtitleProjectData,
  TEMPLATE_PRESETS,
} from '../../server/templates/presets';
import { UploadBox } from '../components/tools/substyler/UploadBox';
import { VideoPlayer } from '../components/tools/substyler/VideoPlayer';
import { SubtitleList } from '../components/tools/substyler/SubtitleList';
import { Timeline } from '../components/tools/substyler/Timeline';
import { StylePanel } from '../components/tools/substyler/StylePanel';
import { TemplatePicker } from '../components/tools/substyler/TemplatePicker';
import { extractAudioFromMediaFile, extractAudioAndWaveformFromMediaFile } from '../lib/audioExtractor';
import {
  Video,
  Download,
  Film,
  Sparkles,
  FileText,
  Zap,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Flame,
  Clock,
  Layers,
  Sliders,
  Scissors,
} from 'lucide-react';

interface VideoSubtitleStylerPageProps {
  lang?: Language;
  onLogActivity?: (tool: 'videostyle', title: string, summary?: string, previewUrl?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  initialSrt?: string;
  initialSegments?: SubtitleSegment[];
  tokens?: number;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
}

export const VideoSubtitleStylerPage: React.FC<VideoSubtitleStylerPageProps> = ({
  lang = 'km',
  onLogActivity,
  showToast,
  initialSrt = '',
  initialSegments = [],
  tokens,
  onCheckAndDeductTokens,
}) => {
  const t = (key: keyof typeof translations['km']) => {
    return translations[lang]?.[key] || translations['km'][key] || key;
  };

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [fileId, setFileId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [waveform, setWaveform] = useState<number[]>([]);

  // Pipeline Unified Data Format:
  // { subtitles: SubtitleItem[], style: SubtitleStyle, template: string }
  const [projectData, setProjectData] = useState<SubtitleProjectData>(() => {
    const defaultTemplate = 'karaoke-highlight';
    const preset = TEMPLATE_PRESETS[defaultTemplate];
    return {
      subtitles: [],
      style: preset ? { ...preset.style } : {
        font: 'Noto Sans Khmer',
        size: 44,
        color: '#FFFFFF',
        outline: '#000000',
        outlineWidth: 5,
        shadow: '#F59E0B',
        shadowBlur: 14,
        bgBox: true,
        bgColor: '#0A0E17',
        bgOpacity: 0.85,
        position: 'bottom',
        positionYPercent: 82,
      },
      template: defaultTemplate,
    };
  });

  // Pipeline Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isAutoCleaning, setIsAutoCleaning] = useState<boolean>(false);

  // Export States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedContent, setExportedContent] = useState<{ srt?: string; vtt?: string; ass?: string }>({});

  // Sync initialProps from Subtitle Generator if passed
  useEffect(() => {
    if (initialSegments && initialSegments.length > 0) {
      const converted: SubtitleItem[] = initialSegments.map((s, idx) => ({
        id: idx + 1,
        start: Number((s.startMs / 1000).toFixed(2)),
        end: Number((s.endMs / 1000).toFixed(2)),
        text: s.text,
      }));
      setProjectData((prev) => ({ ...prev, subtitles: converted }));
    } else if (initialSrt && initialSrt.trim()) {
      handleImportSrtText(initialSrt);
    }
  }, [initialSrt, initialSegments]);

  // Import raw SRT text
  const handleImportSrtText = async (srtText: string) => {
    try {
      const res = await fetch('/api/subtitle-styler/import-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srtText }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtitles)) {
        setProjectData((prev) => ({ ...prev, subtitles: data.subtitles }));
      }
    } catch (err) {
      console.warn('Import SRT error:', err);
    }
  };

  // Pipeline Step 1: Upload Video, Extract Audio (Client Web Audio API + Server fallback), and Speech-to-Text (Khmer)
  const handleVideoUpload = async (file: File, autoTranscribe: boolean) => {
    try {
      setIsProcessing(true);
      setProcessingStep(
        lang === 'km'
          ? 'កំពុងស្រង់សំឡេង 16kHz ចេញពីវីដេអូ...'
          : 'Extracting 16kHz audio directly in browser...'
      );

      const localBlobUrl = URL.createObjectURL(file);
      setVideoSrc(localBlobUrl);
      setVideoFileName(file.name);
      setCurrentTime(0);
      setExportedVideoUrl(null);

      // 1. Extract 16kHz mono WAV + Waveform directly in browser (guarantees zero-dependency success on Cloud Run)
      let clientAudioBlob: Blob | null = null;
      try {
        const extracted = await extractAudioAndWaveformFromMediaFile(file);
        if (extracted) {
          clientAudioBlob = extracted.blob;
          if (extracted.waveform && extracted.waveform.length > 0) {
            setWaveform(extracted.waveform);
          }
        }
      } catch (extractErr) {
        console.warn('Browser Web Audio extraction note:', extractErr);
      }

      setProcessingStep(
        lang === 'km'
          ? 'កំពុងបញ្ជូនទិន្នន័យសំឡេងទៅកាន់ Cloud Run Server...'
          : 'Sending audio stream to server for transcription...'
      );

      // Cloud Run HTTP request payload limit is 32MB.
      // If video > 28MB, send ONLY the extracted lightweight 16kHz WAV audio stream (~1-5MB) to avoid 413 Payload Too Large!
      const isLargeVideo = file.size > 28 * 1024 * 1024;
      const formData = new FormData();

      if (isLargeVideo) {
        if (!clientAudioBlob) {
          throw new Error(
            lang === 'km'
              ? 'វីដេអូមានទំហំធំជាង 28MB ហើយមិនអាចស្រង់សំឡេងក្នុង Browser បានទេ។ សូមសាកល្បងវីដេអូខ្លីជាងនេះ ឬទំហំតូចជាង 28MB សម្រាប់ Cloud Run។'
              : 'Video is over 28MB and browser audio extraction was not supported. Please select a video under 28MB.'
          );
        }
        formData.append('audio', clientAudioBlob, 'extracted_audio.wav');
        formData.append('fileName', file.name);
      } else {
        formData.append('video', file);
        if (clientAudioBlob) {
          formData.append('audio', clientAudioBlob, 'extracted_audio.wav');
        }
      }
      formData.append('autoTranscribe', String(autoTranscribe));

      const response = await fetch('/api/subtitle-styler/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(
            lang === 'km'
              ? 'ទំហំវីដេអូធំជាងកំណត់របស់ Cloud Run (32MB limit)។'
              : 'Upload exceeded Cloud Run request limit (32MB). The audio stream path will be used.'
          );
        }
        const errorText = await response.text();
        throw new Error(errorText || `Server returned error ${response.status}`);
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Upload failed');
      }

      setFileId(resData.fileId);
      if (resData.waveform && Array.isArray(resData.waveform) && resData.waveform.length > 0) {
        setWaveform(resData.waveform);
      }

      // If auto-transcribe returned subtitles on upload
      if (resData.subtitles && Array.isArray(resData.subtitles) && resData.subtitles.length > 0) {
        setProjectData((prev) => ({ ...prev, subtitles: resData.subtitles }));
        if (showToast) {
          showToast(
            lang === 'km'
              ? `បាន Transcribe និងបង្កើត ${resData.subtitles.length} Subtitle ដោយជោគជ័យ!`
              : `Transcribed ${resData.subtitles.length} subtitle lines!`
          );
        }
      } else if (autoTranscribe) {
        // If upload did not return subtitles, explicitly trigger /transcribe step
        setProcessingStep(
          lang === 'km'
            ? 'កំពុងបម្លែងសំឡេងជាអក្សរខ្មែរ (Gemini Speech-to-Text)...'
            : 'Transcribing Khmer speech with Gemini STT...'
        );

        let transBody: any = { fileId: resData.fileId };

        const transRes = await fetch('/api/subtitle-styler/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transBody),
        });
        const transData = await transRes.json();
        if (transData.success && Array.isArray(transData.subtitles) && transData.subtitles.length > 0) {
          setProjectData((prev) => ({ ...prev, subtitles: transData.subtitles }));
          if (showToast) {
            showToast(
              lang === 'km'
                ? `បានបញ្ចប់ការ Transcribe ${transData.subtitles.length} ឃ្លា!`
                : `Transcribed ${transData.subtitles.length} lines!`
            );
          }
        } else if (transData.error) {
          console.warn('Transcribe note:', transData.error);
          if (showToast) {
            showToast(transData.error, 'error');
          }
        } else {
          if (showToast) {
            showToast(
              lang === 'km'
                ? 'មិនមានសំឡេងនិយាយច្បាស់ក្នុងវីដេអូ ឬជាវីដេអូស្ងាត់។ អ្នកអាចបន្ថែម Subtitle ដោយដៃបាន។'
                : 'No clear speech detected in audio. You can add subtitles manually.'
            );
          }
        }
      }

      if (resData.transcribeError && showToast) {
        showToast(resData.transcribeError, 'error');
      }

      setIsProcessing(false);
      setProcessingStep('');
    } catch (err: any) {
      console.error('Video upload pipeline error:', err);
      setIsProcessing(false);
      setProcessingStep('');
      if (showToast) {
        showToast(err.message || 'Pipeline error', 'error');
      }
    }
  };

  // Handle SRT file upload
  const handleSrtUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('srtFile', file);
      const res = await fetch('/api/subtitle-styler/import-srt', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtitles)) {
        setProjectData((prev) => ({ ...prev, subtitles: data.subtitles }));
        if (showToast) {
          showToast(lang === 'km' ? `បានបញ្ចូល ${data.subtitles.length} Subtitle ពីឯកសារ SRT!` : `Imported ${data.subtitles.length} subtitle lines!`);
        }
      }
    } catch (e: any) {
      if (showToast) showToast('Failed to import SRT', 'error');
    }
  };

  // Load Sample Demo Video & Khmer Subtitles from server
  const handleLoadDemo = async () => {
    try {
      setIsProcessing(true);
      setProcessingStep(lang === 'km' ? 'កំពុងទាញយក Video គំរូ និង Subtitle ខ្មែរ...' : 'Loading sample video and Khmer subtitles...');

      const res = await fetch('/api/subtitle-styler/sample-demo');
      const data = await res.json();

      if (data.success && data.videoUrl) {
        setFileId(data.fileId || 'sample_demo');
        setVideoSrc(data.videoUrl);
        setVideoFileName(data.videoFileName || 'sample_demo.mp4');
        setDuration(data.duration || 15);
        if (data.waveform && Array.isArray(data.waveform)) {
          setWaveform(data.waveform);
        }
        if (data.subtitles && Array.isArray(data.subtitles)) {
          setProjectData((prev) => ({ ...prev, subtitles: data.subtitles }));
        }
        setExportedVideoUrl(null);
        setCurrentTime(0);

        if (showToast) {
          showToast(lang === 'km' ? 'បានបញ្ចូលវីដេអូ និង Subtitle គំរូជោគជ័យ!' : 'Loaded sample video and Khmer subtitles!');
        }
      } else {
        throw new Error(data.error || 'Failed to load sample demo');
      }
      setIsProcessing(false);
      setProcessingStep('');
    } catch (e: any) {
      console.warn('Sample demo load failed:', e);
      setIsProcessing(false);
      setProcessingStep('');
      if (showToast) {
        showToast('Failed to load sample demo', 'error');
      }
    }
  };

  // Pipeline Step 4: Auto-clean + split into subtitle lines (using Intl.Segmenter with km locale)
  const handleAutoClean = async () => {
    if (projectData.subtitles.length === 0) return;
    try {
      setIsAutoCleaning(true);
      const res = await fetch('/api/subtitle-styler/auto-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: projectData.subtitles,
          options: {
            maxCharsPerLine: 42,
            maxLines: 2,
            mergeShortDurationSec: 0.6,
          },
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtitles)) {
        setProjectData((prev) => ({ ...prev, subtitles: data.subtitles }));
        if (showToast) {
          showToast(lang === 'km' ? 'បាន Auto-clean និងតម្រៀបឃ្លា (Intl.Segmenter) ជោគជ័យ!' : 'Auto-cleaned and formatted lines!');
        }
      }
      setIsAutoCleaning(false);
    } catch (e: any) {
      setIsAutoCleaning(false);
      if (showToast) showToast('Auto-clean failed', 'error');
    }
  };

  // Pipeline Step 5: Quick Word Chunking (1, 2, or 3 words)
  const handleChunkWords = async (chunkSize: 1 | 2 | 3) => {
    if (projectData.subtitles.length === 0) return;
    try {
      const res = await fetch('/api/subtitle-styler/chunk-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: projectData.subtitles,
          chunkSize,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtitles)) {
        setProjectData((prev) => ({ ...prev, subtitles: data.subtitles }));
        if (showToast) {
          showToast(
            lang === 'km'
              ? `បានបំបែកជា ${data.subtitles.length} ឃ្លា (${chunkSize} ពាក្យម្តង) សម្រាប់ Pop-up Animation!`
              : `Split into ${data.subtitles.length} lines (${chunkSize} words each)!`
          );
        }
      }
    } catch (e: any) {
      if (showToast) showToast('Failed to chunk words', 'error');
    }
  };

  // Pipeline Step 6: Select Template Preset
  const handleSelectTemplate = (templateId: string, defaultStyle: SubtitleStyle, wordChunkSize?: 1 | 2 | 3) => {
    setProjectData((prev) => ({
      ...prev,
      template: templateId,
      style: { ...defaultStyle },
    }));

    if (wordChunkSize && projectData.subtitles.length > 0) {
      handleChunkWords(wordChunkSize);
    }

    if (showToast) {
      showToast(lang === 'km' ? `បានជ្រើសរើស Style: ${templateId}` : `Selected style preset: ${templateId}`);
    }
  };

  // Pipeline Step 7: Export Subtitle Files (.srt, .vtt, .ass)
  const handleDownloadFile = async (format: 'srt' | 'vtt' | 'ass') => {
    if (projectData.subtitles.length === 0) {
      if (showToast) showToast('No subtitles to export', 'error');
      return;
    }

    try {
      const res = await fetch('/api/subtitle-styler/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData,
          format,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.content) {
        throw new Error(data.error || 'Export failed');
      }

      const mimeType = format === 'ass' ? 'text/x-ssa' : format === 'vtt' ? 'text/vtt' : 'application/x-subrip';
      const blob = new Blob([data.content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitles_${projectData.style.font.toLowerCase()}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 1000);

      if (onLogActivity) {
        onLogActivity('videostyle', `Exported .${format.toUpperCase()} Subtitles`, `Font: ${projectData.style.font}, Template: ${projectData.template}`);
      }
      if (showToast) {
        showToast(lang === 'km' ? `បានទាញយកឯកសារ .${format.toUpperCase()} ដោយជោគជ័យ!` : `Downloaded .${format.toUpperCase()} successfully!`);
      }
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Export failed', 'error');
    }
  };

  // Pipeline Step 7: Burn-in Video Export (Universal H.264 / AAC MP4 via FFmpeg)
  const handleExportBurnedVideo = async () => {
    if (!videoSrc || projectData.subtitles.length === 0) {
      if (showToast) showToast('Please load video and subtitles first', 'error');
      return;
    }

    if (!fileId) {
      if (showToast) {
        showToast(
          lang === 'km'
            ? 'កំពុងរង់ចាំការ Upload វីដេអូទៅកាន់ Server... សូមព្យាយាមម្តងទៀត'
            : 'Video is still uploading or fileId is missing. Please wait a moment and try again.',
          'error'
        );
      }
      return;
    }

    if (onCheckAndDeductTokens) {
      const allowed = await onCheckAndDeductTokens(
        8,
        'videostyle',
        `Export Video Subtitles (${projectData.style.font})`,
        `Exported burned-in video with ${projectData.template}`
      );
      if (!allowed) return;
    }

    setIsExporting(true);
    setExportProgress(15);
    setExportStatusText(
      lang === 'km'
        ? 'កំពុងចាប់ផ្តើមប្រព័ន្ធ Render ជាមួយ FFmpeg...'
        : 'Starting FFmpeg video burn-in...'
    );

    try {
      setExportProgress(35);
      setExportStatusText(
        lang === 'km'
          ? 'FFmpeg កំពុង Render ពុម្ពអក្សរខ្មែរ និង Animation Effect ចូល Video Frames...'
          : 'FFmpeg rendering Khmer fonts and subtitle animations into video frames...'
      );

      const res = await fetch('/api/subtitle-styler/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData,
          format: 'burn-video',
          fileId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.videoUrl) {
        throw new Error(data.error || 'Server FFmpeg burn-in failed');
      }

      setExportedVideoUrl(data.videoUrl);
      setExportProgress(100);
      setIsExporting(false);
      setExportStatusText(
        lang === 'km'
          ? 'បានបញ្ចប់ការ Burn វីដេអូ ១០០% ជោគជ័យ (H.264/AAC MP4)!'
          : 'Video burn-in completed successfully 100% (Universal MP4)!'
      );

      if (onLogActivity) {
        onLogActivity(
          'videostyle',
          `Burned Video Subtitles (${projectData.style.font})`,
          `Rendered burned video using FFmpeg`
        );
      }
      if (showToast) {
        showToast(
          lang === 'km'
            ? 'វីដេអូបាន Render រួចរាល់ ១០០%! អ្នកអាចចុចមើល ឬទាញយកឥឡូវនេះ'
            : 'Burned video rendered 100%! Ready to preview and download.'
        );
      }
    } catch (err: any) {
      console.error('Burn-in video error:', err);
      setIsExporting(false);
      setExportProgress(0);
      if (showToast) {
        showToast(err.message || 'Export video failed', 'error');
      }
    }
  };

  // Dedicated universal MP4 download handler with clean Content-Disposition headers
  const handleDownloadBurnedVideo = () => {
    if (!exportedVideoUrl) return;
    const downloadEndpoint = exportedVideoUrl.includes('?')
      ? `${exportedVideoUrl}&download=true`
      : `${exportedVideoUrl}?download=true`;

    const a = document.createElement('a');
    a.href = downloadEndpoint;
    a.download = `jong_use_burned_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1000);

    if (showToast) {
      showToast(lang === 'km' ? 'កំពុងទាញយកឯកសារ MP4...' : 'Downloading universal MP4 video...');
    }
  };

  // Download Current Snapshot HD Image (PNG)
  const handleSnapshot = () => {
    const canvas = document.querySelector('#substyler-video-container canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `subtitle_snapshot_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1000);

    if (showToast) {
      showToast(lang === 'km' ? 'បានទាញយករូបភាព Snapshot ដោយជោគជ័យ!' : 'Snapshot downloaded!');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-khmer">
              {lang === 'km' ? 'កែសម្រួល Style Subtitle លើវីដេអូ' : 'Video Subtitle Styler'}
            </h1>
            <p className="text-sm text-stone-500 font-khmer">
              {lang === 'km'
                ? 'Upload Video ➔ Extract Audio 16kHz WAV ➔ Speech-to-Text ➔ Auto-clean ➔ Style ➔ Export'
                : 'Upload Video ➔ Extract Audio 16kHz WAV ➔ Speech-to-Text ➔ Auto-clean ➔ Style ➔ Export'}
            </p>
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 font-semibold border border-stone-200">
            FFmpeg 16kHz & ASS
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-amber-50 text-amber-800 font-semibold border border-amber-200">
            Gemini STT
          </span>
        </div>
      </div>

      {/* Pipeline Step 1 & 2: Upload Box */}
      <UploadBox
        lang={lang}
        onVideoSelected={handleVideoUpload}
        onSrtSelected={handleSrtUpload}
        onLoadDemo={handleLoadDemo}
        isProcessing={isProcessing}
        processingStep={processingStep}
        hasVideo={Boolean(videoSrc)}
        videoFileName={videoFileName}
      />

      {/* Main Grid: Video Player + Subtitle Editor (Left 7 cols) & Style Panels (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Player, Timeline, and Subtitle List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Player Component */}
          <VideoPlayer
            videoSrc={videoSrc}
            subtitles={projectData.subtitles}
            style={projectData.style}
            template={projectData.template}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSeek={(t) => setCurrentTime(t)}
            lang={lang}
            onSnapshot={handleSnapshot}
          />

          {/* Timeline Waveform Component */}
          {videoSrc && (
            <Timeline
              subtitles={projectData.subtitles}
              currentTime={currentTime}
              duration={duration}
              waveform={waveform}
              onSeek={(t) => setCurrentTime(t)}
              onUpdateSubtitles={(newSubs) =>
                setProjectData((prev) => ({ ...prev, subtitles: newSubs }))
              }
              lang={lang}
            />
          )}

          {/* Subtitle List Component */}
          <SubtitleList
            subtitles={projectData.subtitles}
            currentTime={currentTime}
            onUpdateSubtitles={(newSubs) =>
              setProjectData((prev) => ({ ...prev, subtitles: newSubs }))
            }
            onJumpToTime={(t) => setCurrentTime(t)}
            lang={lang}
            onAutoClean={handleAutoClean}
            isAutoCleaning={isAutoCleaning}
            onChunkWords={handleChunkWords}
          />
        </div>

        {/* Right Column: Templates, Styles, and Export Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Template Picker */}
          <TemplatePicker
            selectedTemplate={projectData.template}
            onSelectTemplate={handleSelectTemplate}
            lang={lang}
          />

          {/* Style Customizer Panel */}
          <StylePanel
            style={projectData.style}
            onChangeStyle={(newStyle) =>
              setProjectData((prev) => ({ ...prev, style: newStyle }))
            }
            lang={lang}
          />

          {/* Export Action Card */}
          <div className="bg-[#0e131f] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-khmer">
                  {lang === 'km' ? 'ទាញយក & Export វីដេអូ' : 'Export & Downloads'}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Burn-in / Subtitles
              </span>
            </div>

            {/* Subtitle File Exports: SRT, VTT, ASS */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-stone-400 font-khmer">
                {lang === 'km' ? 'ទាញយកឯកសារ Subtitle (Text Files):' : 'Export Subtitle Files:'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFile('srt')}
                  disabled={projectData.subtitles.length === 0}
                  className="py-2 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-xs font-mono text-amber-300 font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.SRT</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile('vtt')}
                  disabled={projectData.subtitles.length === 0}
                  className="py-2 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-xs font-mono text-cyan-300 font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.VTT</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile('ass')}
                  disabled={projectData.subtitles.length === 0}
                  className="py-2 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-xs font-mono text-rose-300 font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.ASS</span>
                </button>
              </div>
            </div>

            {/* Video Burn-in Action */}
            <div className="pt-2 border-t border-stone-800/80 space-y-3">
              {isExporting ? (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs font-khmer text-stone-300">
                    <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>{exportStatusText}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-amber-500 to-emerald-400 transition-all duration-150 rounded-full"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              ) : exportedVideoUrl ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-khmer flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{lang === 'km' ? 'វីដេអូបាន Burn-in រួចរាល់ ១០០%!' : 'Burned video is ready!'}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200 font-bold">
                      H.264 MP4
                    </span>
                  </div>

                  {/* Inline Video Player to preview and verify playable video right inside the app */}
                  <div className="rounded-xl overflow-hidden border border-emerald-800/60 bg-black aspect-video relative shadow-inner">
                    <video
                      src={exportedVideoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadBurnedVideo}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm font-khmer shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{lang === 'km' ? 'ទាញយកវីដេអូ MP4 (Download MP4 Video)' : 'Download Burned MP4 Video'}</span>
                  </button>

                  <p className="text-[11px] text-center text-stone-400 font-khmer leading-relaxed">
                    {lang === 'km'
                      ? '✓ វីដេអូប្រភេទ MP4 (H.264/AAC) ចាក់បានយ៉ាងរលូនលើ QuickTime, Windows Player, iPhone, Android និង Facebook/TikTok'
                      : '✓ Universal MP4 (H.264/AAC) format, 100% playable on QuickTime, Windows Media Player, iPhone, Android & Social Media'}
                  </p>

                  <button
                    type="button"
                    onClick={() => setExportedVideoUrl(null)}
                    className="w-full text-center text-xs text-stone-400 hover:text-stone-200 font-khmer transition-colors flex items-center justify-center gap-1 pt-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'km' ? 'ប្តូរ Style ហើយ Render ម្តងទៀត' : 'Adjust Style & Re-render'}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExportBurnedVideo}
                  disabled={!videoSrc || projectData.subtitles.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm font-khmer shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Film className="w-4 h-4 text-white" />
                  <span>{lang === 'km' ? 'Burn Subtitle ចូលក្នុងវីដេអូ (FFmpeg)' : 'Burn Subtitles into Video'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 font-bold ml-1">
                    8 Tokens
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
