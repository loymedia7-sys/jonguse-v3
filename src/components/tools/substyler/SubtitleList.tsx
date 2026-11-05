import React, { useState } from 'react';
import { SubtitleItem, SubtitleWord } from '../../../../server/templates/presets';
import { Play, Plus, Trash2, Scissors, Check, Clock, ChevronDown, ChevronUp, Sparkles, Zap, Mic } from 'lucide-react';
import { Language } from '../../../types';

interface SubtitleListProps {
  subtitles: SubtitleItem[];
  currentTime: number;
  onUpdateSubtitles: (subs: SubtitleItem[]) => void;
  onJumpToTime: (timeSec: number) => void;
  lang?: Language;
  onAutoClean?: () => void;
  isAutoCleaning?: boolean;
  onChunkWords?: (size: 1 | 2 | 3) => void;
}

export const SubtitleList: React.FC<SubtitleListProps> = ({
  subtitles,
  currentTime,
  onUpdateSubtitles,
  onJumpToTime,
  lang = 'km',
  onAutoClean,
  isAutoCleaning = false,
  onChunkWords,
}) => {
  const [expandedWordsId, setExpandedWordsId] = useState<number | null>(null);

  // Update text of an item
  const handleTextChange = (id: number, newText: string) => {
    onUpdateSubtitles(
      subtitles.map((s) => (s.id === id ? { ...s, text: newText } : s))
    );
  };

  // Update start time
  const handleStartChange = (id: number, newStart: number) => {
    onUpdateSubtitles(
      subtitles.map((s) => (s.id === id ? { ...s, start: Math.max(0, newStart) } : s))
    );
  };

  // Update end time
  const handleEndChange = (id: number, newEnd: number) => {
    onUpdateSubtitles(
      subtitles.map((s) => (s.id === id ? { ...s, end: Math.max(s.start + 0.1, newEnd) } : s))
    );
  };

  // Add new subtitle line after specified id
  const handleAddLine = (afterId?: number) => {
    const afterIndex = afterId ? subtitles.findIndex((s) => s.id === afterId) : subtitles.length - 1;
    const refItem = afterIndex >= 0 ? subtitles[afterIndex] : null;
    const newStart = refItem ? Number((refItem.end + 0.1).toFixed(2)) : 0;
    const newEnd = Number((newStart + 2.5).toFixed(2));

    const newItem: SubtitleItem = {
      id: Date.now(),
      start: newStart,
      end: newEnd,
      text: lang === 'km' ? 'ឃ្លា Subtitle ថ្មី...' : 'New subtitle line...',
    };

    const nextSubs = [...subtitles];
    if (afterIndex >= 0) {
      nextSubs.splice(afterIndex + 1, 0, newItem);
    } else {
      nextSubs.push(newItem);
    }

    // Re-index IDs sequentially
    onUpdateSubtitles(nextSubs.map((s, idx) => ({ ...s, id: idx + 1 })));
  };

  // Delete line
  const handleDeleteLine = (id: number) => {
    const nextSubs = subtitles.filter((s) => s.id !== id);
    onUpdateSubtitles(nextSubs.map((s, idx) => ({ ...s, id: idx + 1 })));
  };

  // Split line in half
  const handleSplitLine = (id: number) => {
    const index = subtitles.findIndex((s) => s.id === id);
    if (index === -1) return;
    const target = subtitles[index];
    const words = target.text.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return;

    const mid = Math.ceil(words.length / 2);
    const text1 = words.slice(0, mid).join(' ');
    const text2 = words.slice(mid).join(' ');

    const midTime = Number(((target.start + target.end) / 2).toFixed(2));

    const item1: SubtitleItem = {
      id: target.id,
      start: target.start,
      end: midTime,
      text: text1,
    };
    const item2: SubtitleItem = {
      id: target.id + 1,
      start: midTime,
      end: target.end,
      text: text2,
    };

    const nextSubs = [...subtitles];
    nextSubs.splice(index, 1, item1, item2);
    onUpdateSubtitles(nextSubs.map((s, idx) => ({ ...s, id: idx + 1 })));
  };

  // Auto-tighten subtitle timing to match vocal track
  const handleTrackVoiceSync = () => {
    if (subtitles.length === 0) return;
    const synced = subtitles.map((sub, idx) => {
      const nextSub = subtitles[idx + 1];
      let start = Math.max(0, sub.start);
      let end = sub.end;
      if (nextSub && end > nextSub.start) {
        end = Math.max(start + 0.25, Number((nextSub.start - 0.05).toFixed(2)));
      }
      if (sub.words && sub.words.length > 0) {
        const firstW = sub.words[0];
        const lastW = sub.words[sub.words.length - 1];
        if (firstW && firstW.s !== undefined) start = Number(firstW.s.toFixed(2));
        if (lastW && lastW.e !== undefined) end = Number(lastW.e.toFixed(2));
      }
      return {
        ...sub,
        id: idx + 1,
        start: Number(start.toFixed(2)),
        end: Number(Math.max(start + 0.25, end).toFixed(2)),
      };
    });
    onUpdateSubtitles(synced);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
      {/* Header with Title & Auto-clean */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-100">
        <div>
          <h3 className="text-sm font-bold text-stone-900 font-khmer flex items-center gap-2">
            <span>Subtitle Editor ({subtitles.length} {lang === 'km' ? 'ឃ្លា' : 'lines'})</span>
          </h3>
          <p className="text-[11px] text-stone-500 font-khmer">
            {lang === 'km' ? 'កែសម្រួលអត្ថបទ ពេលវេលាចាប់ផ្តើម/បញ្ចប់ និងពាក្យរៀបរាប់' : 'Edit text, timing, and word-level timestamps'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAutoClean && (
            <button
              type="button"
              onClick={onAutoClean}
              disabled={isAutoCleaning || subtitles.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-khmer font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="តម្រៀបពាក្យខ្មែរ កាត់បន្ទាត់វែង និងជួសជុលអក្ខរាវិរុទ្ធ"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'km' ? 'Auto-clean' : 'Auto Clean'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAddLine()}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-khmer font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បន្ថែមឃ្លា' : 'Add Line'}</span>
          </button>
        </div>
      </div>

      {/* Voice Tracking & Quick Word Chunking Toolbar for Pop Animation */}
      {subtitles.length > 0 && onChunkWords && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs font-khmer">
          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{lang === 'km' ? 'តម្រឹមតាមសម្លេង (Voice Track Pop-up):' : 'Voice Track Pop-up:'}</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleTrackVoiceSync}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="តម្រឹមពេលវេលាឱ្យស៊ីគ្នាឥតខ្ចោះជាមួយសម្លេងនិយាយ"
            >
              <Mic className="w-3 h-3 text-white" />
              <span>{lang === 'km' ? '🎯 Sync សម្លេង' : 'Sync Voice'}</span>
            </button>
            <button
              type="button"
              onClick={() => onChunkWords(1)}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-stone-900 text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="បំបែកជា ១ ពាក្យម្តងៗសម្រាប់ Pop-up ស្ទីល TikTok Viral"
            >
              <span>⚡ ១ ពាក្យ</span>
            </button>
            <button
              type="button"
              onClick={() => onChunkWords(2)}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-stone-900 text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="បំបែកជា ២ ពាក្យម្តងៗ"
            >
              <span>⚡ ២ ពាក្យ</span>
            </button>
            <button
              type="button"
              onClick={() => onChunkWords(3)}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-stone-900 text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="បំបែកជា ៣ ពាក្យម្តងៗ"
            >
              <span>⚡ ៣ ពាក្យ</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtitles Item List */}
      {subtitles.length === 0 ? (
        <div className="py-8 text-center text-stone-400 text-xs font-khmer border border-dashed border-stone-200 rounded-xl">
          {lang === 'km' ? 'មិនទាន់មាន Subtitle នៅឡើយទេ។ សូម Upload វីដេអូ ឬចុច បន្ថែមឃ្លា។' : 'No subtitles yet. Upload a video or add a line.'}
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {subtitles.map((sub, idx) => {
            const isActive = currentTime >= sub.start && currentTime <= sub.end;
            const hasWords = sub.words && sub.words.length > 0;
            const isWordsExpanded = expandedWordsId === sub.id;

            return (
              <div
                key={sub.id || idx}
                className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                  isActive
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-1 ring-amber-500/20'
                    : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50'
                }`}
              >
                {/* Top Row: Index, Time Inputs, Quick Jump, Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Start & End Seconds Input */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-md px-1.5 py-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={sub.start}
                          onChange={(e) => handleStartChange(sub.id, parseFloat(e.target.value) || 0)}
                          className="w-14 text-center font-mono text-xs focus:outline-none"
                          title="Start time (seconds)"
                        />
                        <span className="text-[10px] text-stone-400">s</span>
                      </div>

                      <span className="text-stone-300">➔</span>

                      <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-md px-1.5 py-0.5">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={sub.end}
                          onChange={(e) => handleEndChange(sub.id, parseFloat(e.target.value) || 0)}
                          className="w-14 text-center font-mono text-xs focus:outline-none"
                          title="End time (seconds)"
                        />
                        <span className="text-[10px] text-stone-400">s</span>
                      </div>

                      <span className="text-[10px] text-stone-400">
                        ({(sub.end - sub.start).toFixed(1)}s)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onJumpToTime(sub.start)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-amber-100/50 transition-colors cursor-pointer"
                      title="លោតវីដេអូទៅកាន់ចំណុចនេះ (Jump to time)"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSplitLine(sub.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                      title="បំបែកជា ២ ឃ្លា (Split Line)"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddLine(sub.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                      title="បន្ថែមឃ្លាបន្ទាប់ (Insert Below)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLine(sub.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="លុបឃ្លានេះ (Delete Line)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle Text Textarea */}
                <div>
                  <textarea
                    rows={2}
                    value={sub.text}
                    onChange={(e) => handleTextChange(sub.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white font-khmer text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none leading-relaxed"
                    placeholder="វាយអត្ថបទ Subtitle នៅទីនេះ..."
                  />
                </div>

                {/* Word Timestamps Expandable Bar */}
                {hasWords && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedWordsId(isWordsExpanded ? null : sub.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                    >
                      <span>{sub.words!.length} {lang === 'km' ? 'ពាក្យ Word-level Timestamps' : 'words synchronized'}</span>
                      {isWordsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isWordsExpanded && (
                      <div className="mt-1.5 flex flex-wrap gap-1 p-2 bg-white rounded-lg border border-amber-200/70">
                        {sub.words!.map((w, wIdx) => {
                          const isWordActive = currentTime >= w.s && currentTime <= w.e;
                          return (
                            <span
                              key={wIdx}
                              className={`px-2 py-0.5 rounded text-[11px] font-khmer border transition-colors ${
                                isWordActive
                                  ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                                  : 'bg-stone-50 text-stone-700 border-stone-200'
                              }`}
                            >
                              {w.w} <span className="font-mono text-[9px] opacity-70">({w.s.toFixed(1)}s)</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
