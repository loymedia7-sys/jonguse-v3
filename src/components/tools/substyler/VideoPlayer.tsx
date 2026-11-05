import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Download, FastForward, Rewind } from 'lucide-react';
import { SubtitleItem, SubtitleStyle } from '../../../../server/templates/presets';
import { Language } from '../../../types';

interface VideoPlayerProps {
  videoSrc: string | null;
  subtitles: SubtitleItem[];
  style: SubtitleStyle;
  template: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  lang?: Language;
  onSnapshot?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoSrc,
  subtitles,
  style,
  template,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  onSeek,
  lang = 'km',
  onSnapshot,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Sync isPlaying state with video
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync external seek time if differs significantly
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Find active subtitle
  const activeSub = subtitles.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Render Subtitles on Canvas
  const drawSubtitles = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas dimensions to video
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    } else if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 1280;
      canvas.height = 720;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // If active subtitle exists, draw it
    const subToDraw = activeSub || (subtitles.length > 0 && currentTime === 0 ? subtitles[0] : null);
    if (!subToDraw) return;

    const scale = width / 1280;
    const effectiveFontSize = Math.max(16, Math.round((style.size || 44) * scale));
    const fontName = style.font || 'Noto Sans Khmer';
    ctx.font = `700 ${effectiveFontSize}px "${fontName}", "Kantumruy Pro", system-ui, sans-serif`;

    const lines = subToDraw.text.split('\n');
    const lineHeight = effectiveFontSize * 1.35;
    const totalTextHeight = lines.length * lineHeight;

    // Position Y calculation
    const posYPercent = style.positionYPercent ?? (style.position === 'top' ? 18 : style.position === 'middle' ? 50 : 82);
    const posY = (height * posYPercent) / 100;
    const posX = width / 2;

    const elapsed = Math.max(0, currentTime - subToDraw.start);
    const durationSeg = Math.max(0.2, subToDraw.end - subToDraw.start);
    const progress = Math.min(1, elapsed / durationSeg);

    // Template animation factors - Pop Up style default has ZERO animation (clean instant pop)
    let animScale = 1.0;
    let animAlpha = 1.0;
    let animOffsetY = 0;
    let rotationDeg = 0;

    const animationMode = style.animation || 'none';

    if (animationMode === 'none') {
      // Pure Pop-up Style without animation: rock-solid, crisp instant snap matching voice
      animScale = 1.0;
      animAlpha = 1.0;
      animOffsetY = 0;
      rotationDeg = 0;
    } else if (animationMode === 'pop') {
      const popDur = 0.12;
      const t = Math.min(1, elapsed / popDur);
      if (t < 1) {
        animScale = 0.96 + t * 0.04;
      }
    } else if (animationMode === 'bounce') {
      const t = Math.min(1, elapsed / 0.25);
      animOffsetY = -12 * Math.cos(t * Math.PI * 1.5) * (1 - t) * scale;
    } else if (animationMode === 'fade') {
      animAlpha = Math.min(1, Math.max(0.1, elapsed / 0.15));
    }

    ctx.save();
    ctx.globalAlpha = animAlpha;
    ctx.translate(posX, posY + animOffsetY);
    if (rotationDeg !== 0) {
      ctx.rotate((rotationDeg * Math.PI) / 180);
    }
    if (animScale !== 1.0) {
      ctx.scale(animScale, animScale);
    }

    // Measure maximum line width
    let maxWidth = 0;
    lines.forEach((line) => {
      const m = ctx.measureText(line);
      if (m.width > maxWidth) maxWidth = m.width;
    });

    // Draw Background Box if enabled
    if (style.bgBox) {
      const padX = 24 * scale;
      const padY = 12 * scale;
      const boxW = maxWidth + padX * 2;
      const boxH = totalTextHeight + padY * 2;
      const boxX = -boxW / 2;
      const boxY = -boxH / 2;
      const radius = 10 * scale;

      ctx.save();
      ctx.globalAlpha = (style.bgOpacity ?? 0.85) * animAlpha;
      ctx.fillStyle = style.bgColor || '#000000';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.restore();
    }

    const startY = -totalTextHeight / 2 + lineHeight / 2;

    lines.forEach((line, lineIdx) => {
      const lineY = startY + lineIdx * lineHeight;

      // Stroke / Outline
      const outlineWidth = (style.outlineWidth ?? 4) * scale;
      if (outlineWidth > 0) {
        ctx.strokeStyle = style.outline || '#000000';
        ctx.lineWidth = outlineWidth * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(line, 0, lineY);
      }

      // Outer Glow / Shadow
      if (style.shadow) {
        ctx.shadowColor = style.shadow;
        ctx.shadowBlur = (style.shadowBlur ?? 8) * scale;
      }

      // Karaoke Highlight per word if template is karaoke-highlight
      if (template === 'karaoke-highlight' && subToDraw.words && subToDraw.words.length > 0) {
        const words = subToDraw.words;
        const totalLineWidth = ctx.measureText(line).width;
        let curWordX = -totalLineWidth / 2;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        words.forEach((word) => {
          const wWidth = ctx.measureText(word.w + ' ').width;
          const isSpoken = currentTime >= word.s && currentTime <= word.e;
          const isPassed = currentTime > word.e;

          if (isSpoken) {
            ctx.fillStyle = '#FFE600'; // energetic highlight
            ctx.shadowColor = '#F59E0B';
            ctx.shadowBlur = 12 * scale;
          } else if (isPassed) {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'transparent';
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.shadowColor = 'transparent';
          }

          ctx.fillText(word.w, curWordX, lineY);
          curWordX += wWidth;
        });
      } else {
        // Standard Fill Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = style.color || '#FFFFFF';
        ctx.fillText(line, 0, lineY);
      }
    });

    ctx.restore();
  }, [activeSub, subtitles, style, template, currentTime]);

  // Continuous animation loop for smooth subtitle animation
  useEffect(() => {
    drawSubtitles();
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(drawSubtitles);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [drawSubtitles, isPlaying]);

  // Format time (seconds -> MM:SS)
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  };

  const handleFullscreen = () => {
    const container = document.getElementById('substyler-video-container');
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      id="substyler-video-container"
      className="bg-stone-950 rounded-2xl p-4 border border-stone-800 shadow-xl overflow-hidden space-y-3"
    >
      {/* Video + Canvas Stage */}
      <div className="relative aspect-video w-full bg-stone-900 rounded-xl overflow-hidden flex items-center justify-center group select-none">
        {videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              onClick={onTogglePlay}
            />
            {/* Live Subtitle Overlay Canvas */}
            <canvas
              ref={canvasRef}
              onClick={onTogglePlay}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          </>
        ) : (
          <div className="text-center p-8 text-stone-500 font-khmer text-xs">
            {lang === 'km' ? 'សូមបញ្ចូលវីដេអូដើម្បីចាប់ផ្តើម' : 'Load or upload a video to preview subtitles'}
          </div>
        )}

        {/* Center Play Button Overlay */}
        {videoSrc && !isPlaying && (
          <button
            type="button"
            onClick={onTogglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform transform hover:scale-105 shadow-xl cursor-pointer"
          >
            <Play className="w-7 h-7 fill-white translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Control Bar */}
      {videoSrc && (
        <div className="space-y-2 px-1 text-stone-300">
          {/* Scrubber Range */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:h-2 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left Controls: Play, Mute, Time */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onTogglePlay}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-200 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-stone-200" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-200 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="font-mono text-stone-400 text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls: Speed, Snapshot, Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Speed Multiplier */}
              <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-lg px-2 py-0.5 text-[11px] font-mono">
                {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      playbackSpeed === spd ? 'bg-amber-500 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {onSnapshot && (
                <button
                  type="button"
                  onClick={onSnapshot}
                  title="ទាញយក Snapshot PNG"
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-khmer text-xs transition-colors flex items-center gap-1 border border-stone-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Snapshot</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFullscreen}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
