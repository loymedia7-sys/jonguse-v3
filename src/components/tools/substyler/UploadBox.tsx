import React, { useRef, useState } from 'react';
import { Upload, Film, FileText, CheckCircle2, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Language } from '../../../types';

interface UploadBoxProps {
  lang?: Language;
  onVideoSelected: (file: File, autoTranscribe: boolean) => void;
  onSrtSelected: (file: File) => void;
  onLoadDemo: () => void;
  isProcessing: boolean;
  processingStep?: string;
  hasVideo: boolean;
  videoFileName?: string;
}

export const UploadBox: React.FC<UploadBoxProps> = ({
  lang = 'km',
  onVideoSelected,
  onSrtSelected,
  onLoadDemo,
  isProcessing,
  processingStep = '',
  hasVideo,
  videoFileName = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.webm')) {
        onVideoSelected(file, autoTranscribe);
      } else if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
        onSrtSelected(file);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 font-khmer">
              {lang === 'km' ? 'បញ្ចូលវីដេអូ ឬឯកសារ Subtitle' : 'Upload Video or Subtitle File'}
            </h3>
            <p className="text-xs text-stone-500 font-khmer">
              {lang === 'km' ? 'គាំទ្រ MP4, MOV, WebM និងឯកសារ .SRT / .VTT' : 'Supports MP4, MOV, WebM and .SRT / .VTT'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLoadDemo}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-khmer font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Film className="w-3.5 h-3.5 text-amber-600" />
          <span>{lang === 'km' ? 'ប្រើវីដេអូគំរូ (Demo)' : 'Load Demo Video'}</span>
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          isDragOver
            ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
            : hasVideo
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-stone-300 hover:border-amber-400 bg-stone-50/50'
        }`}
      >
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onVideoSelected(file, autoTranscribe);
          }}
        />
        <input
          ref={srtInputRef}
          type="file"
          accept=".srt,.vtt,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSrtSelected(file);
          }}
        />

        {isProcessing ? (
          <div className="py-6 space-y-3">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-800 font-khmer">
                {processingStep || (lang === 'km' ? 'កំពុងដំណើរការទាញយកសំឡេង និងបង្កើត Subtitle...' : 'Processing video pipeline...')}
              </p>
              <p className="text-xs text-stone-500 font-khmer">
                Pipeline: FFmpeg → 16kHz mono WAV → Gemini STT (Khmer) → Auto-clean
              </p>
            </div>
          </div>
        ) : hasVideo ? (
          <div className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800 font-mono line-clamp-1">
                  {videoFileName || 'video_uploaded.mp4'}
                </p>
                <p className="text-[11px] text-stone-500 font-khmer">
                  {lang === 'km' ? 'វីដេអូរួចរាល់សម្រាប់កែសម្រួល Style និង Timecodes' : 'Video ready for styling & timing adjustments'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-khmer transition-colors"
              >
                {lang === 'km' ? 'ប្តូរវីដេអូ' : 'Change Video'}
              </button>
              <button
                type="button"
                onClick={() => srtInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-khmer transition-colors flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>{lang === 'km' ? 'បញ្ចូល .SRT ផ្សេង' : 'Import SRT'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center mx-auto">
              <Film className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-stone-800 font-khmer">
                {lang === 'km' ? 'អូសទម្លាក់វីដេអូ ឬចុចដើម្បីជ្រើសរើស' : 'Drag & drop your video, or click to browse'}
              </p>
              <p className="text-xs text-stone-500 font-khmer mt-1">
                {lang === 'km'
                  ? 'កម្មវិធីនឹងទាញយកសំឡេង 16kHz mono WAV ហើយ transcribe ជាអក្សរខ្មែរដោយស្វ័យប្រវត្ត'
                  : 'Automatic extraction to 16kHz mono WAV + Khmer Speech-to-Text with timestamps'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs font-khmer transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{lang === 'km' ? 'ជ្រើសរើសវីដេអូ (Video File)' : 'Select Video File'}</span>
              </button>

              <button
                type="button"
                onClick={() => srtInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-khmer transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-200"
              >
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                <span>{lang === 'km' ? 'បញ្ចូលតែឯកសារ .SRT' : 'Import .SRT only'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-Transcribe checkbox */}
      <div className="flex items-center justify-between pt-1 px-1 text-xs text-stone-600 font-khmer border-t border-stone-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoTranscribe}
            onChange={(e) => setAutoTranscribe(e.target.checked)}
            className="w-4 h-4 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500"
          />
          <span className="font-semibold text-stone-800">
            {lang === 'km' ? 'បម្លែងសំឡេងជាអក្សរស្វ័យប្រវត្ត (Auto Speech-to-Text)' : 'Auto Transcribe Audio with Gemini STT'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
            Khmer 16kHz
          </span>
        </label>

        <span className="text-[11px] text-stone-400">
          Max 150MB
        </span>
      </div>
    </div>
  );
};
