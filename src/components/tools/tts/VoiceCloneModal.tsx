import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Upload,
  Square,
  Play,
  Pause,
  CheckCircle2,
  X,
  Volume2,
  RefreshCw,
  Info,
  Radio,
  FileAudio,
  AudioLines,
  Sparkles,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Music2,
} from 'lucide-react';
import { ClonedVoiceProfile, Language, VoiceCloneMethod } from '../../../types';
import { translations } from '../../../lib/i18n';
import { cloneVoice } from '../../../lib/api';
import { extractAudioAndWaveformFromMediaFile } from '../../../lib/audioExtractor';
import { Button } from '../../ui/Button';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: ClonedVoiceProfile) => void;
  lang: Language;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const CALIBRATION_PHRASES = [
  {
    titleKm: 'ឃ្លាគំរូទី ១ (ស្វាគមន៍ផ្លូវការ)',
    textKm: 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធសំឡេងឆ្លាតវៃ។ ខ្ញុំរីករាយណាស់ដែលបានចូលរួមបង្កើតសំឡេងអានជាភាសាខ្មែរដ៏ពិរោះ។',
  },
  {
    titleKm: 'ឃ្លាគំរូទី ២ (និទានរឿង & ព័ត៌មាន)',
    textKm: 'អរុណសួស្តីពុកម៉ែបងប្អូនទាំងអស់គ្នា! ថ្ងៃនេះខ្ញុំមានដំណឹងល្អ និងរឿងរ៉ាវគួរឱ្យចាប់អារម្មណ៍ជាច្រើនដើម្បីចែករំលែក។',
  },
  {
    titleKm: 'ឃ្លាគំរូទី ៣ (ការសន្ទនាទូទៅ)',
    textKm: 'បច្ចេកវិទ្យាបញ្ញាសិប្បនិម្មិត AI ជួយឱ្យជីវិតរស់នៅរបស់យើងកាន់តែងាយស្រួល និងបង្កើនផលិតភាពការងារបានយ៉ាងច្រើន។',
  },
];

// Helper to synthesize a calibrated speech-like test audio sample directly in browser
function generateSampleWav(frequency = 220, durationSec = 3): { dataUrl: string; blob: Blob } {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate harmonic speech-like formant tone
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope attack/decay
    const envelope = Math.sin((Math.PI * t) / durationSec);
    // Harmonic frequencies
    const s1 = Math.sin(2 * Math.PI * frequency * t);
    const s2 = 0.5 * Math.sin(2 * Math.PI * frequency * 2 * t);
    const s3 = 0.25 * Math.sin(2 * Math.PI * frequency * 3 * t);
    const sampleVal = Math.max(-1, Math.min(1, (s1 + s2 + s3) * envelope * 0.7));
    view.setInt16(offset, sampleVal < 0 ? sampleVal * 0x8000 : sampleVal * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const dataUrl = `data:audio/wav;base64,${btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )}`;
  return { dataUrl, blob };
}

export const VoiceCloneModal: React.FC<VoiceCloneModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  lang,
  showToast,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [cloneMethod, setCloneMethod] = useState<VoiceCloneMethod>('zero_shot_transcript');
  const [customName, setCustomName] = useState('');
  const [referenceTranscript, setReferenceTranscript] = useState('');
  const [showMethodGuide, setShowMethodGuide] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('audio/webm');
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [clonedProfile, setClonedProfile] = useState<ClonedVoiceProfile | null>(null);

  // Audio Playback
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCustomName('');
    setReferenceTranscript('');
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setUploadedFile(null);
    setUploadedAudioUrl(null);
    setFileBase64(null);
    setClonedProfile(null);
    setIsPlayingPreview(false);
    setRecordDuration(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // 1. Microphone Recording Logic (5-30s support for VoxCPM2)
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mime = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mime = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedAudioUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          setFileBase64(reader.result as string);
          setFileMimeType(mime.split(';')[0]);
        };
        reader.readAsDataURL(fullBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      showToast(
        lang === 'km'
          ? 'មិនអាចបើក Microphone បានទេ។ សូមអនុញ្ញាត Microphone permission ក្នុង Browser របស់អ្នក ឬប្រើ "សាកល្បងសំឡេងគំរូ" ខាងក្រោម។'
          : 'Cannot access microphone. Please enable microphone permission or use the demo voice button below.',
        'error'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn(err);
      }
    }
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // 2. File / Video Upload Logic (supports MP3, WAV, M4A, MP4 video)
  const handleFileChange = async (file: File) => {
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov');
    const isAudio =
      file.type.startsWith('audio/') ||
      file.name.endsWith('.mp3') ||
      file.name.endsWith('.wav') ||
      file.name.endsWith('.m4a') ||
      file.name.endsWith('.webm');

    if (!isAudio && !isVideo) {
      showToast(
        lang === 'km'
          ? 'សូមជ្រើសរើសឯកសារសំឡេង ឬវីដេអូ (MP3, WAV, M4A, MP4, WebM)'
          : 'Please select an audio or video file (MP3, WAV, M4A, MP4, WebM)',
        'error'
      );
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      showToast(lang === 'km' ? 'ឯកសារធំពេក (លើសពី 30MB)' : 'File is too large (> 30MB)', 'error');
      return;
    }

    setUploadedFile(file);
    if (!customName) {
      setCustomName(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (isVideo) {
      setIsExtractingAudio(true);
      showToast(lang === 'km' ? 'កំពុងស្រង់សំឡេងចេញពីវីដេអូ...' : 'Extracting audio from video...', 'success');
      const extracted = await extractAudioAndWaveformFromMediaFile(file, 60);
      setIsExtractingAudio(false);

      if (extracted) {
        const audioUrl = URL.createObjectURL(extracted.blob);
        setUploadedAudioUrl(audioUrl);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFileBase64(reader.result as string);
          setFileMimeType('audio/wav');
        };
        reader.readAsDataURL(extracted.blob);
        return;
      }
    }

    const url = URL.createObjectURL(file);
    setUploadedAudioUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
      setFileMimeType(file.type || 'audio/wav');
    };
    reader.readAsDataURL(file);
  };

  // 3. Quick Demo Sample Loader (Zero-friction testing)
  const handleLoadDemoSample = (nameKm: string, frequency = 220, defaultTranscript: string) => {
    stopRecording();
    const sample = generateSampleWav(frequency, 4);
    setFileBase64(sample.dataUrl);
    setFileMimeType('audio/wav');
    setUploadedAudioUrl(sample.dataUrl);
    setUploadedFile(null);
    setRecordedBlob(sample.blob);
    setRecordedAudioUrl(sample.dataUrl);
    setCustomName(nameKm);
    setReferenceTranscript(defaultTranscript);
    showToast(
      lang === 'km'
        ? `បានផ្ទុក "${nameKm}" រួចរាល់! ចុច "ចម្លងសំឡេងជាមួយ VoxCPM2" ដើម្បីបន្ត`
        : `Loaded demo sample "${nameKm}"! Click "Clone with VoxCPM2" below`,
      'success'
    );
  };

  // 4. Audio Preview
  const togglePlayAudio = (url: string) => {
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(url);
      audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.src = url;
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // 5. Submit to VoxCPM2 Clone Voice API
  const handleCloneSubmit = async () => {
    // If still recording, stop and wait 400ms for buffer
    if (isRecording) {
      stopRecording();
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!fileBase64) {
      showToast(
        lang === 'km'
          ? 'សូមថតសំឡេង ឬ Upload ឯកសារ ឬចុច "សាកល្បងសំឡេងគំរូ" ជាមុនសិន'
          : 'Please record, upload, or click a demo sample first',
        'error'
      );
      return;
    }

    setAnalyzing(true);
    try {
      const profile = await cloneVoice(
        fileBase64,
        fileMimeType,
        customName.trim() || undefined,
        referenceTranscript.trim() || undefined,
        cloneMethod === 'zero_shot_transcript' ? 'zero_shot_transcript' : 'zero_shot'
      );

      profile.sampleAudioUrl = recordedAudioUrl || uploadedAudioUrl || fileBase64;
      profile.engine = 'VoxCPM2';
      profile.cloneMethod = cloneMethod;
      profile.referenceTranscript = referenceTranscript.trim() || profile.transcription || '';
      setClonedProfile(profile);
      showToast(
        lang === 'km'
          ? 'បានវិភាគ និងបង្កើតសំឡេងចម្លង VoxCPM2 ជោគជ័យ!'
          : 'VoxCPM2 voice clone profile generated successfully!',
        'success'
      );
    } catch (err: any) {
      console.error('Clone voice error:', err);
      showToast(err.message || 'Failed to clone voice', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAndSelect = () => {
    if (clonedProfile) {
      onSaveProfile(clonedProfile);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentPreviewUrl = activeTab === 'record' ? recordedAudioUrl : uploadedAudioUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8 animate-fade-in">
        {/* Header with VoxCPM2 Branding */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-emerald-50/70 via-white to-purple-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bayon text-base text-stone-900">
                  {lang === 'km' ? 'ចម្លងសំឡេងផ្ទាល់ខ្លួន (Voice Cloning)' : 'AI Voice Cloning'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono font-bold border border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  VoxCPM2
                </span>
              </div>
              <p className="text-xs text-stone-500 font-khmer">
                {lang === 'km'
                  ? 'បច្ចេកវិទ្យា VoxCPM2 Zero-Shot Cloning — គ្មានដែនកំណត់សំឡេង ថត ឬ Upload 5-30s ដើម្បីបង្កើត'
                  : 'VoxCPM2 zero-shot voice cloning — no limits, use any 5-30s reference audio clip'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Method Selector: Zero-shot vs Zero-shot with Transcript */}
          <div className="space-y-2">
            <label className="text-xs font-bold font-khmer text-stone-700 flex items-center justify-between">
              <span>{lang === 'km' ? 'វិធីសាស្ត្រចម្លងសំឡេង (Cloning Method)' : 'Cloning Method'}</span>
              <button
                type="button"
                onClick={() => setShowMethodGuide(!showMethodGuide)}
                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'តារាងប្រៀបធៀបគុណភាព' : 'Audio & Quality Guide'}</span>
                {showMethodGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </label>

            {/* Quality and Audio Requirement Guide */}
            {showMethodGuide && (
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-khmer space-y-2 animate-fade-in">
                <div className="font-bold text-stone-800 text-[11px]">
                  {lang === 'km' ? 'តម្រូវការរយៈពេលសំឡេង និងកម្រិតគុណភាព:' : 'How much audio does one voice need?'}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 font-mono">
                        <th className="py-1 px-2">Method</th>
                        <th className="py-1 px-2">Audio needed</th>
                        <th className="py-1 px-2">Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/60 font-sans">
                      <tr className="bg-emerald-50/50 font-medium">
                        <td className="py-1.5 px-2 text-emerald-900 font-bold">Zero-shot (reference clip)</td>
                        <td className="py-1.5 px-2">5-30 seconds</td>
                        <td className="py-1.5 px-2 text-emerald-800">Good, close to the voice</td>
                      </tr>
                      <tr className="bg-purple-50/60 font-medium">
                        <td className="py-1.5 px-2 text-purple-950 font-bold">Zero-shot with transcript ⭐</td>
                        <td className="py-1.5 px-2">5-30 seconds + text</td>
                        <td className="py-1.5 px-2 text-purple-900 font-bold">Better, more accurate (Best for Khmer)</td>
                      </tr>
                      <tr className="text-stone-600">
                        <td className="py-1.5 px-2">LoRA fine-tune</td>
                        <td className="py-1.5 px-2">5-10+ minutes</td>
                        <td className="py-1.5 px-2">Very close, better Khmer pronunciation</td>
                      </tr>
                      <tr className="text-stone-600">
                        <td className="py-1.5 px-2">Full fine-tune</td>
                        <td className="py-1.5 px-2">30+ mins to hours</td>
                        <td className="py-1.5 px-2">Best, but needs a strong GPU</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-stone-500">
                  {lang === 'km'
                    ? '💡 ក្នុង VoxCPM2 Zero-shot គ្មានដែនកំណត់ចំនួនសំឡេងឡើយ។ រាល់ពេលចម្លង ម៉ូដែលប្រើតែឃ្លាគំរូ ៥-៣០ វិនាទីប៉ុណ្ណោះ។'
                    : '💡 In zero-shot cloning, a voice is just a 5-30s reference clip you give the model each time. Nothing is stored in the model, so you can create as many voices as you have clips.'}
                </p>
              </div>
            )}

            {/* Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCloneMethod('zero_shot_transcript')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  cloneMethod === 'zero_shot_transcript'
                    ? 'border-purple-500 bg-purple-50/60 shadow-xs ring-1 ring-purple-500'
                    : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-stone-900 font-khmer flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    {lang === 'km' ? 'Zero-shot ជាមួយ Transcript' : 'Zero-shot with transcript'}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-900">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-khmer">
                  {lang === 'km' ? '5-30s + អត្ថបទ (កាន់តែពិរោះ ច្បាស់ និងត្រឹមត្រូវខ្ពស់)' : '5-30 seconds + text for highest Khmer accuracy'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCloneMethod('zero_shot')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  cloneMethod === 'zero_shot'
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-stone-900 font-khmer flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    {lang === 'km' ? 'Zero-shot (ឯកសារសំឡេងសុទ្ធ)' : 'Zero-shot (Reference clip)'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-khmer">
                  {lang === 'km' ? '5-30s សំឡេងគំរូធម្មជាតិ ស្រដៀងសំឡេងដើម' : '5-30s audio sample, good voice likeness'}
                </p>
              </button>
            </div>
          </div>

          {/* Quick Demo Pre-recorded Clips (Instant 1-Click Try) */}
          <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 font-khmer flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'km' ? 'សាកល្បងភ្លាមៗដោយប្រើសំឡេងគំរូ (Quick Try):' : 'Quick Test with Demo Sample:'}
              </span>
              <span className="text-[10px] text-emerald-700 font-khmer">១ ចុចដើម្បីផ្ទុក</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleLoadDemoSample(
                    'សំឡេងបុរសគំរូ (Male Demo)',
                    180,
                    'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធសំឡេងឆ្លាតវៃ។ ខ្ញុំរីករាយណាស់ដែលបានចូលរួមបង្កើតសំឡេងអានជាភាសាខ្មែរ។'
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-khmer font-bold transition-colors cursor-pointer shadow-2xs"
              >
                🎙️ សំឡេងបុរសខ្មែរ (Male Demo)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleLoadDemoSample(
                    'សំឡេងនារីគំរូ (Female Demo)',
                    260,
                    'អរុណសួស្តីពុកម៉ែបងប្អូនទាំងអស់គ្នា! ថ្ងៃនេះខ្ញុំមានដំណឹងល្អ និងរឿងរ៉ាវគួរឱ្យចាប់អារម្មណ៍ជាច្រើន។'
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-khmer font-bold transition-colors cursor-pointer shadow-2xs"
              >
                🎙️ សំឡេងនារីខ្មែរ (Female Demo)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleLoadDemoSample(
                    'សំឡេងនិទានរឿង (Narrator Demo)',
                    210,
                    'កាលពីព្រេងនាយ មានកូនកោះដ៏ស្រស់ស្អាតមួយ ដែលព័ទ្ធជុំវិញដោយព្រៃព្រឹក្សាខៀវស្រងាត់។'
                  )
                }
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-khmer font-bold transition-colors cursor-pointer shadow-2xs"
              >
                📖 សំឡេងនិទាន (Narrator Demo)
              </button>
            </div>
          </div>

          {/* Record vs Upload Tabs */}
          <div className="flex p-1 bg-stone-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('record');
                if (audioPreviewRef.current) audioPreviewRef.current.pause();
                setIsPlayingPreview(false);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-khmer flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'record'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Mic className="w-4 h-4" />
              {t.ttsRecordAudio} (5-30 វិនាទី)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                if (audioPreviewRef.current) audioPreviewRef.current.pause();
                setIsPlayingPreview(false);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-khmer flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              {t.ttsUploadAudio} (MP3, WAV, MP4)
            </button>
          </div>

          {/* TAB 1: RECORD LIVE */}
          {activeTab === 'record' && (
            <div className="space-y-3">
              {/* Calibration prompts */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>{t.ttsRecordPrompt} (អានឃ្លាគំរូខាងក្រោម ៥ ទៅ ៣០ វិនាទី):</span>
                </div>
                <div className="space-y-1.5">
                  {CALIBRATION_PHRASES.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white/90 rounded-xl border border-amber-200/50 text-xs font-khmer text-stone-700 leading-relaxed cursor-pointer hover:border-amber-400 transition-colors"
                      onClick={() => setReferenceTranscript(item.textKm)}
                    >
                      <span className="font-bold text-amber-900 block mb-0.5 text-[11px]">
                        {item.titleKm}:
                      </span>
                      "{item.textKm}"
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Record Box */}
              <div className="p-5 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 flex flex-col items-center justify-center text-center space-y-3">
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-red-500/20 animate-ping absolute" />
                      <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-300">
                        <Radio className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold text-red-600">
                      00:{recordDuration < 10 ? `0${recordDuration}` : recordDuration} / 00:30
                    </div>
                    <p className="text-xs text-stone-600 font-khmer font-bold">
                      {t.ttsRecordingLive} (អានឃ្លាគំរូខាងលើឱ្យឮច្បាស់)
                    </p>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={stopRecording}
                      icon={<Square className="w-4 h-4" />}
                    >
                      {t.ttsStopRecord}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Mic className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bayon text-sm text-stone-800">
                        {recordedBlob ? 'បានថតរួចរាល់! អាចថតម្តងទៀតបាន' : 'ថតសំឡេងគំរូ ៥ - ៣០ វិនាទី'}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-khmer mt-0.5">
                        {lang === 'km'
                          ? 'ចុចប៊ូតុងខាងក្រោម រួចអានឃ្លាគំរូខាងលើដោយសំឡេងធម្មជាតិរបស់អ្នក'
                          : 'Click below and read the sample text with your natural voice'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={startRecording}
                      icon={<Mic className="w-4 h-4" />}
                    >
                      {recordedBlob ? 'ថតម្តងទៀត (Record Again)' : t.ttsStartRecord}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD AUDIO / VIDEO */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4,.mov"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className="p-6 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 hover:bg-stone-100/50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer space-y-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileAudio className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bayon text-sm text-stone-800">
                    {uploadedFile ? uploadedFile.name : 'ចុច ឬអូសទម្លាក់ឯកសារសំឡេង ឬវីដេអូ'}
                  </h4>
                  <p className="text-[11px] text-stone-500 font-khmer mt-0.5">
                    {isExtractingAudio
                      ? 'កំពុងស្រង់សំឡេងចេញពីវីដេអូ...'
                      : uploadedFile
                      ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • ${uploadedFile.type || 'audio'}`
                      : 'គាំទ្រឯកសារ MP3, WAV, M4A, WebM និង MP4 Video (ទំហំរហូតដល់ 30MB)'}
                  </p>
                </div>
                <Button size="sm" variant="outline" icon={<Upload className="w-4 h-4" />} type="button">
                  {uploadedFile ? 'ជ្រើសរើសឯកសារផ្សេង' : 'Browse File'}
                </Button>
              </div>
            </div>
          )}

          {/* Audio Sample Preview */}
          {currentPreviewUrl && (
            <div className="p-3 bg-stone-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePlayAudio(currentPreviewUrl)}
                  className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    {t.ttsListenSample}
                  </span>
                  <span className="text-[11px] text-stone-500 font-khmer">
                    VoxCPM2 Reference Clip (5-30s Audio)
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 px-2.5 py-1 bg-white rounded-lg border border-stone-200">
                Ready
              </span>
            </div>
          )}

          {/* Reference Transcript Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 font-khmer flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  {lang === 'km'
                    ? 'អត្ថបទនិយាយក្នុងសំឡេងគំរូ (Reference Transcript)'
                    : 'Reference Audio Transcript (Optional, for better accuracy)'}
                </span>
              </label>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono font-bold">
                VoxCPM2 Mode
              </span>
            </div>
            <textarea
              rows={2}
              value={referenceTranscript}
              onChange={(e) => setReferenceTranscript(e.target.value)}
              placeholder={
                lang === 'km'
                  ? 'សរសេរអត្ថបទ ឬពាក្យដែលអ្នកបាននិយាយក្នុងសំឡេងគំរូខាងលើ (ជួយឱ្យការបញ្ចេញសំឡេងកាន់តែដូចបេះបិទ)...'
                  : 'Type the exact words spoken in the audio clip for highest acoustic fidelity...'
              }
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-khmer leading-relaxed"
            />
          </div>

          {/* Custom Name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              ឈ្មោះសំឡេងចម្លង (Voice Name)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t.ttsVoiceNamePlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-khmer"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['សំឡេងខ្ញុំផ្ទាល់', 'សំឡេងនិទានរឿង', 'សំឡេងព័ត៌មានផ្លូវការ', 'សំឡេងស្វាគមន៍'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCustomName(name)}
                  className="text-[11px] font-khmer px-2 py-0.5 rounded-md bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-600 transition-colors cursor-pointer"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze & Clone Action */}
          {!clonedProfile && (
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-700 hover:to-purple-700 text-white font-khmer font-bold shadow-xs cursor-pointer"
              disabled={analyzing}
              loading={analyzing}
              onClick={handleCloneSubmit}
              icon={<AudioLines className="w-5 h-5" />}
            >
              {analyzing
                ? 'VoxCPM2 កំពុងវិភាគ និងចម្លងសំឡេង...'
                : isRecording
                ? 'បញ្ឈប់ការថត & ចម្លងសំឡេង (Stop & Clone)'
                : !fileBase64
                ? 'សូមថតសំឡេង ឬជ្រើសរើសសំឡេងគំរូជាមុន'
                : 'ចម្លងសំឡេងជាមួយ VoxCPM2 (Clone with VoxCPM2)'}
            </Button>
          )}

          {/* Biometrics Result Preview */}
          {clonedProfile && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-purple-50/50 border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bayon text-sm">
                    {lang === 'km' ? 'VoxCPM2 បានចម្លងសំឡេងជោគជ័យ!' : 'VoxCPM2 Cloned Successfully!'}
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-900 rounded-full border border-purple-200 font-mono">
                  VoxCPM2 Zero-Shot
                </span>
              </div>

              {/* Grid of detected traits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Gender</span>
                  <span className="text-xs font-bold text-stone-800">{clonedProfile.gender}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Pitch</span>
                  <span className="text-xs font-bold text-stone-800">{clonedProfile.pitch}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Timbre</span>
                  <span className="text-xs font-bold text-stone-800 truncate block" title={clonedProfile.timbre}>
                    {clonedProfile.timbre}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Pace</span>
                  <span className="text-xs font-bold text-stone-800">{clonedProfile.pace}</span>
                </div>
              </div>

              {/* Instructions summary */}
              <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs font-khmer text-stone-600 space-y-1 shadow-xs">
                <span className="font-bold text-emerald-950 block text-[11px]">
                  {t.ttsVoiceTraits}:
                </span>
                <p className="text-[11px] leading-relaxed text-stone-700">
                  {clonedProfile.prosodyInstructions}
                </p>
                {clonedProfile.referenceTranscript && (
                  <p className="text-[11px] text-purple-800 font-medium bg-purple-50 p-2 rounded-lg mt-1.5 border border-purple-100">
                    📝 អត្ថបទគំរូ VoxCPM2: "{clonedProfile.referenceTranscript}"
                  </p>
                )}
              </div>

              {/* Save and Select Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setClonedProfile(null)}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  វិភាគម្តងទៀត
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveAndSelect}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-khmer font-bold shadow-xs cursor-pointer"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  រក្សាទុក និងជ្រើសរើសសំឡេងនេះ (Use Voice)
                </Button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-stone-400 text-center font-khmer">
            {t.ttsCloneNotice}
          </p>
        </div>
      </div>
    </div>
  );
};
