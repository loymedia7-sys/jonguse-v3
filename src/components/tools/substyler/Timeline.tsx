import React, { useRef, useState, useEffect } from 'react';
import { SubtitleItem } from '../../../../server/templates/presets';
import { ZoomIn, ZoomOut, Scissors, Clock, AlertCircle } from 'lucide-react';
import { Language } from '../../../types';

interface TimelineProps {
  subtitles: SubtitleItem[];
  currentTime: number;
  duration: number;
  waveform?: number[];
  onSeek: (timeSec: number) => void;
  onUpdateSubtitles: (subs: SubtitleItem[]) => void;
  lang?: Language;
}

export const Timeline: React.FC<TimelineProps> = ({
  subtitles,
  currentTime,
  duration,
  waveform = [],
  onSeek,
  onUpdateSubtitles,
  lang = 'km',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 to 4.0
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragType, setDragType] = useState<'move' | 'start' | 'end' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [origItem, setOrigItem] = useState<SubtitleItem | null>(null);

  const safeDuration = Math.max(1, duration || (subtitles.length > 0 ? subtitles[subtitles.length - 1].end + 2 : 10));

  // Handle timeline click to scrub
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingId !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * safeDuration);
  };

  // Dragging start
  const handleMouseDown = (
    e: React.MouseEvent,
    item: SubtitleItem,
    type: 'move' | 'start' | 'end'
  ) => {
    e.stopPropagation();
    setDraggingId(item.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setOrigItem({ ...item });
  };

  // Mouse move while dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId || !dragType || !origItem || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX;
      const deltaSec = (deltaX / rect.width) * safeDuration;

      let newStart = origItem.start;
      let newEnd = origItem.end;

      if (dragType === 'move') {
        const dur = origItem.end - origItem.start;
        newStart = Math.max(0, Math.min(safeDuration - dur, origItem.start + deltaSec));
        newEnd = newStart + dur;
      } else if (dragType === 'start') {
        newStart = Math.max(0, Math.min(origItem.end - 0.2, origItem.start + deltaSec));
      } else if (dragType === 'end') {
        newEnd = Math.max(origItem.start + 0.2, Math.min(safeDuration, origItem.end + deltaSec));
      }

      onUpdateSubtitles(
        subtitles.map((s) =>
          s.id === draggingId
            ? {
                ...s,
                start: Number(newStart.toFixed(2)),
                end: Number(newEnd.toFixed(2)),
              }
            : s
        )
      );
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      setDragType(null);
      setOrigItem(null);
    };

    if (draggingId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragType, dragStartX, origItem, safeDuration, subtitles, onUpdateSubtitles]);

  // Default simulated waveform if none provided
  const displayWaveform =
    waveform.length > 0
      ? waveform
      : Array.from({ length: 80 }, (_, i) => 0.15 + 0.5 * Math.abs(Math.sin(i * 0.3)));

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / safeDuration) * 100));

  return (
    <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800 shadow-md space-y-3 select-none">
      {/* Timeline Controls Bar */}
      <div className="flex items-center justify-between text-xs text-stone-400 font-khmer">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-200">
            {lang === 'km' ? 'Waveform & Timeline Editor' : 'Waveform Timeline'}
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            ({currentTime.toFixed(2)}s / {safeDuration.toFixed(2)}s)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
            <button
              type="button"
              onClick={() => setZoomLevel(Math.max(1.0, zoomLevel - 0.5))}
              className="p-1 rounded text-stone-400 hover:text-stone-200 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[10px] font-mono text-stone-300">{zoomLevel}x</span>
            <button
              type="button"
              onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.5))}
              className="p-1 rounded text-stone-400 hover:text-stone-200 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Track Container */}
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          style={{ width: `${zoomLevel * 100}%` }}
          className="relative h-28 bg-stone-950 rounded-xl border border-stone-800 cursor-pointer overflow-hidden group"
        >
          {/* Audio Waveform Layer */}
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-50 pointer-events-none">
            {displayWaveform.map((val, i) => (
              <div
                key={i}
                className="w-1 bg-amber-500/70 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(10, val * 85)}%` }}
              />
            ))}
          </div>

          {/* Time Marker Rulers (every 5 seconds) */}
          <div className="absolute top-0 left-0 right-0 h-4 border-b border-stone-800/80 flex justify-between px-2 text-[9px] font-mono text-stone-500 pointer-events-none">
            {Array.from({ length: Math.min(12, Math.floor(safeDuration / 2) + 1) }).map((_, idx) => {
              const sec = idx * 2;
              if (sec > safeDuration) return null;
              return (
                <span key={idx}>
                  {sec}s
                </span>
              );
            })}
          </div>

          {/* Subtitle Blocks */}
          <div className="absolute inset-0 top-5 bottom-1 pointer-events-none">
            {subtitles.map((sub) => {
              const leftPercent = Math.max(0, Math.min(100, (sub.start / safeDuration) * 100));
              const rightPercent = Math.max(0, Math.min(100, (sub.end / safeDuration) * 100));
              const widthPercent = Math.max(1, rightPercent - leftPercent);
              const isActive = currentTime >= sub.start && currentTime <= sub.end;

              return (
                <div
                  key={sub.id}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, sub, 'move')}
                  className={`absolute top-1 bottom-1 rounded-lg pointer-events-auto border flex items-center justify-between px-1.5 transition-all shadow-xs cursor-move ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 border-white ring-2 ring-amber-400 font-bold z-10'
                      : 'bg-stone-800/90 text-stone-200 border-amber-500/40 hover:bg-stone-700/90 z-5'
                  }`}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, sub, 'start')}
                    className="w-2 h-full -ml-1 cursor-ew-resize hover:bg-amber-300 rounded-l flex items-center justify-center shrink-0"
                    title="ទាញកែសម្រួលពេលចាប់ផ្តើម"
                  >
                    <div className="w-0.5 h-3 bg-stone-400/80 rounded" />
                  </div>

                  {/* Text Label */}
                  <div className="truncate text-[11px] font-khmer px-1 select-none flex-1 text-center">
                    {sub.text}
                  </div>

                  {/* Right Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, sub, 'end')}
                    className="w-2 h-full -mr-1 cursor-ew-resize hover:bg-amber-300 rounded-r flex items-center justify-center shrink-0"
                    title="ទាញកែសម្រួលពេលបញ្ចប់"
                  >
                    <div className="w-0.5 h-3 bg-stone-400/80 rounded" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Playhead Scrubber */}
          <div
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20 transition-all duration-75 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          >
            <div className="w-2.5 h-2.5 bg-red-500 -ml-1 -top-0.5 rounded-full" />
          </div>
        </div>
      </div>

      {/* Guide text */}
      <div className="flex items-center justify-between text-[11px] text-stone-500 font-khmer px-1">
        <span>💡 {lang === 'km' ? 'អូសដុំ Subtitle ដើម្បីប្តូរពេល ឬអូសគែមសងខាងដើម្បីពង្រីក/បង្រួមរយៈពេល' : 'Drag subtitle block to move, or drag edges to adjust timing.'}</span>
        <span className="text-[10px] font-mono text-stone-400">{subtitles.length} blocks</span>
      </div>
    </div>
  );
};
