import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw, AudioLines } from 'lucide-react';
import { Button } from '../../ui/Button';
import { translations } from '../../../lib/i18n';
import { Language, ClonedVoiceProfile } from '../../../types';

interface AudioPlayerProps {
  audioUrl: string;
  lang: Language;
  textSnippet?: string;
  voiceName?: string;
  isCloned?: boolean;
  clonedProfile?: ClonedVoiceProfile | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  lang,
  textSnippet,
  voiceName,
  isCloned,
  clonedProfile,
}) => {
  const t = translations[lang];
  const audioRef = useRef<HTMLAudioElement>(null);
  const sampleAudioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    setIsPlaying(false);
    setIsPlayingSample(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlayingSample && sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      setIsPlayingSample(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const togglePlaySample = () => {
    if (!sampleAudioRef.current || !clonedProfile?.sampleAudioUrl) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (isPlayingSample) {
      sampleAudioRef.current.pause();
      setIsPlayingSample(false);
    } else {
      sampleAudioRef.current.play();
      setIsPlayingSample(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    const namePart = (voiceName || 'voice').replace(/\s+/g, '_');
    a.download = `jong_use_tts_${namePart}_${Date.now()}.wav`;
    a.click();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={handleTimeUpdate}
      />
      {clonedProfile?.sampleAudioUrl && (
        <audio
          ref={sampleAudioRef}
          src={clonedProfile.sampleAudioUrl}
          onEnded={() => setIsPlayingSample(false)}
        />
      )}

      {/* Header with speaker information */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isCloned
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
              : 'bg-amber-50 text-amber-600'
          }`}>
            {isCloned ? <AudioLines className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-stone-900 text-sm">
                {voiceName ? voiceName : 'Natural AI Speech'}
              </h3>
              {isCloned && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Cloned Voice
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-khmer line-clamp-1 max-w-[200px] sm:max-w-xs">{textSnippet}</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleDownload}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          {t.downloadAudio} (WAV)
        </Button>
      </div>

      {/* Cloned voice comparison bar */}
      {isCloned && clonedProfile?.sampleAudioUrl && (
        <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
          <div className="flex items-center gap-1.5 text-stone-600 font-khmer">
            <AudioLines className="w-4 h-4 text-emerald-600" />
            <span>ប្រៀបធៀបសំឡេងដើម (Original Sample):</span>
          </div>
          <button
            type="button"
            onClick={togglePlaySample}
            className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-emerald-700 font-bold hover:bg-emerald-50 flex items-center gap-1 transition-colors text-xs font-khmer shadow-2xs"
          >
            {isPlayingSample ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlayingSample ? 'កំពុងស្តាប់...' : 'ស្តាប់សំឡេងដើម'}
          </button>
        </div>
      )}

      {/* Waveform Animation */}
      <div className="h-20 bg-stone-900 rounded-2xl flex items-center justify-center gap-1.5 px-6 relative overflow-hidden">
        {[40, 65, 30, 90, 45, 80, 20, 95, 60, 35, 75, 50, 85, 40, 70, 30, 90, 50].map((height, i) => (
          <div
            key={i}
            className={`w-1.5 bg-gradient-to-t ${
              isCloned ? 'from-emerald-500 to-teal-400' : 'from-emerald-500 to-amber-400'
            } rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{
              height: isPlaying ? `${Math.max(15, (height * (1 + (i % 3) * 0.2)) % 100)}%` : '20%',
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* Controls & Scrubber */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-xs font-mono text-stone-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
          {[0.85, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                playbackRate === rate
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
