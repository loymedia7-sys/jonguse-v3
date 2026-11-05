import React, { useState } from 'react';
import { TEMPLATE_PRESETS, TemplatePreset, SubtitleStyle } from '../../../../server/templates/presets';
import { Sparkles, Mic, Zap, Wand2, Box, Eye, Check, Flame, Crown, Film, Heart, ShieldAlert, Award } from 'lucide-react';
import { Language } from '../../../types';

interface TemplatePickerProps {
  selectedTemplate: string;
  onSelectTemplate: (templateId: string, defaultStyle: SubtitleStyle, wordChunkSize?: 1 | 2 | 3) => void;
  lang?: Language;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  selectedTemplate,
  onSelectTemplate,
  lang = 'km',
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'viral' | 'pop' | 'boxed' | 'karaoke' | 'cinematic'>('all');
  const presetsList = Object.values(TEMPLATE_PRESETS);

  const filteredPresets = presetsList.filter((p) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'viral') return p.category === 'viral' || p.badge?.includes('Viral') || p.badge?.includes('Creator');
    if (filterCategory === 'pop') return p.category === 'pop' || p.template.includes('pop') || p.wordChunkSize;
    if (filterCategory === 'boxed') return p.category === 'boxed' || p.style.bgBox;
    if (filterCategory === 'karaoke') return p.category === 'karaoke';
    if (filterCategory === 'cinematic') return p.category === 'cinematic';
    return true;
  });

  const getIcon = (preset: TemplatePreset) => {
    if (preset.id === 'pop-1-word') return <Zap className="w-4 h-4 text-amber-400" />;
    if (preset.id === 'pop-2-words') return <Zap className="w-4 h-4 text-amber-300" />;
    if (preset.id === 'pop-3-words') return <Zap className="w-4 h-4 text-cyan-400" />;
    if (preset.id === 'hormozi-green-pop') return <Flame className="w-4 h-4 text-emerald-400" />;
    if (preset.id === 'mrbeast-gold-pop') return <Crown className="w-4 h-4 text-amber-400" />;
    if (preset.id === 'tiktok-clean-white') return <Award className="w-4 h-4 text-white" />;
    if (preset.id === 'boxed-pill-pop') return <Box className="w-4 h-4 text-purple-400" />;
    if (preset.id === 'boxed-yellow-pop') return <Box className="w-4 h-4 text-amber-300" />;
    if (preset.id === 'cyber-neon-pop') return <Sparkles className="w-4 h-4 text-cyan-400" />;
    if (preset.id === 'hyper-violet-pop') return <Heart className="w-4 h-4 text-fuchsia-400" />;
    if (preset.id === 'sunset-orange-pop') return <Flame className="w-4 h-4 text-orange-400" />;
    if (preset.id === 'ali-abdaal-minimal') return <Eye className="w-4 h-4 text-sky-400" />;
    if (preset.id === 'karaoke-highlight') return <Mic className="w-4 h-4 text-amber-400" />;
    if (preset.id === 'crimson-punch') return <ShieldAlert className="w-4 h-4 text-red-400" />;
    if (preset.id === 'cinematic-serif') return <Film className="w-4 h-4 text-stone-300" />;
    if (preset.id === 'emerald-mint') return <Sparkles className="w-4 h-4 text-emerald-400" />;
    return <Eye className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="bg-[#0e131f] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header with Title and Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white font-khmer">
            {lang === 'km' ? 'ម៉ូត Subtitle Pop-up & Presets (១៦ ម៉ូត)' : 'Subtitle Pop-up & Presets (16 Styles)'}
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800 text-[11px] font-khmer">
          {[
            { id: 'all', labelKm: 'ទាំងអស់', labelEn: 'All' },
            { id: 'pop', labelKm: '⚡ Pop-up ១-៣ ពាក្យ', labelEn: '1-3 Words' },
            { id: 'viral', labelKm: '🔥 Viral Creators', labelEn: 'Viral' },
            { id: 'boxed', labelKm: '📦 Boxed Pill', labelEn: 'Boxed' },
            { id: 'karaoke', labelKm: '🎙️ Karaoke', labelEn: 'Karaoke' },
            { id: 'cinematic', labelKm: '🎬 Classic', labelEn: 'Classic' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id as any)}
              className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {lang === 'km' ? cat.labelKm : cat.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => {
          const isSelected = selectedTemplate === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectTemplate(preset.id, preset.style, preset.wordChunkSize)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-1 ring-amber-500/40'
                  : 'border-stone-800/90 bg-[#121827] hover:border-stone-700 hover:bg-[#161e31]'
              }`}
            >
              {/* Header inside card */}
              <div className="flex items-start justify-between gap-2 w-full mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-stone-800/90 border border-stone-700/60">
                    {getIcon(preset)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-khmer line-clamp-1 flex items-center gap-1.5">
                      <span>{lang === 'km' ? preset.nameKm : preset.nameEn}</span>
                    </h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-stone-400 font-khmer">
                        {preset.style.font}
                      </span>
                      {preset.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          {preset.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Crisp Visual Preview Box (Pop style without dizzy animation) */}
              <div className="w-full py-2.5 px-3 bg-stone-950/90 rounded-lg border border-stone-800/80 flex items-center justify-center text-center overflow-hidden min-h-[46px]">
                {preset.id === 'pop-1-word' ? (
                  <div className="text-sm font-black font-khmer text-[#FFE600] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>⚡ លេចធ្លោ ⚡</span>
                  </div>
                ) : preset.id === 'pop-2-words' ? (
                  <div className="text-xs font-bold font-khmer text-white space-x-1.5" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">វីដេអូ</span>
                    <span className="text-[#FBBF24] font-black underline decoration-amber-400">លេចធ្លោ</span>
                  </div>
                ) : preset.id === 'pop-3-words' ? (
                  <div className="text-xs font-bold font-khmer text-cyan-300 space-x-1" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>លឿន</span>
                    <span className="text-white">ដូច</span>
                    <span className="text-cyan-400 font-black">រន្ទះ!</span>
                  </div>
                ) : preset.id === 'hormozi-green-pop' ? (
                  <div className="text-xs font-black font-khmer text-[#22C55E] tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,1)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>ចំណូលកើនឡើង!</span>
                  </div>
                ) : preset.id === 'mrbeast-gold-pop' ? (
                  <div className="text-xs font-black font-khmer text-[#FFD700] drop-shadow-[0_0_5px_rgba(220,38,38,0.9)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>ឈ្នះរង្វាន់ធំ!</span>
                  </div>
                ) : preset.id === 'tiktok-clean-white' ? (
                  <div className="text-xs font-black font-khmer text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>ស ស្អាត ច្បាស់ 100%</span>
                  </div>
                ) : preset.id === 'boxed-pill-pop' ? (
                  <div className="text-[11px] font-bold font-khmer px-2.5 py-0.5 rounded-full bg-black text-[#FFE600] border border-stone-700 shadow-xs" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>⚡ Pop Capsule</span>
                  </div>
                ) : preset.id === 'boxed-yellow-pop' ? (
                  <div className="text-[11px] font-black font-khmer px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black shadow-xs" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>CapCut Viral Box</span>
                  </div>
                ) : preset.id === 'cyber-neon-pop' ? (
                  <div className="text-xs font-bold font-khmer text-[#06B6D4] drop-shadow-[0_0_8px_#06B6D4]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>🧊 Cyber Ice Cyan 🧊</span>
                  </div>
                ) : preset.id === 'hyper-violet-pop' ? (
                  <div className="text-xs font-bold font-khmer text-[#E879F9] drop-shadow-[0_0_8px_#A855F7]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>🟣 Hyper Violet 🟣</span>
                  </div>
                ) : preset.id === 'sunset-orange-pop' ? (
                  <div className="text-xs font-black font-khmer text-[#FB923C] drop-shadow-[0_1px_4px_rgba(0,0,0,1)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>🧡 Sunset Warm 🧡</span>
                  </div>
                ) : preset.id === 'ali-abdaal-minimal' ? (
                  <div className="text-[11px] font-medium font-khmer px-2.5 py-0.5 rounded-md bg-[#0F172A] text-slate-100 border border-slate-700" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>Ali Abdaal Clean</span>
                  </div>
                ) : preset.id === 'karaoke-highlight' ? (
                  <div className="text-xs font-bold font-khmer space-x-1" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span className="text-white">សម្លេង </span>
                    <span className="text-[#FFE600] underline decoration-amber-400 decoration-2 underline-offset-2">មនុស្សពិត</span>
                    <span className="text-stone-400"> ខ្មែរ</span>
                  </div>
                ) : preset.id === 'crimson-punch' ? (
                  <div className="text-xs font-black font-khmer text-[#EF4444] drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>🔴 ចំណុចសំខាន់ 🔴</span>
                  </div>
                ) : preset.id === 'cinematic-serif' ? (
                  <div className="text-xs font-khmer text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>ភាពយន្តឯកសារខ្មែរ</span>
                  </div>
                ) : preset.id === 'emerald-mint' ? (
                  <div className="text-xs font-bold font-khmer text-[#34D399] drop-shadow-[0_1px_4px_rgba(0,0,0,1)]" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>🌿 Fresh Mint 🌿</span>
                  </div>
                ) : (
                  <div className="text-xs font-khmer text-white" style={{ fontFamily: `"${preset.style.font}", sans-serif` }}>
                    <span>ស្ទីល Pop-up ច្បាស់ៗ</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-[10px] text-stone-400 font-khmer mt-2 line-clamp-1">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
