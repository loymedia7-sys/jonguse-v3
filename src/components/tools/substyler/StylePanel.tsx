import React from 'react';
import { SubtitleStyle } from '../../../../server/templates/presets';
import { Type, Palette, Layout, Sliders, Box, Eye, Sparkles } from 'lucide-react';
import { Language } from '../../../types';

interface StylePanelProps {
  style: SubtitleStyle;
  onChangeStyle: (newStyle: SubtitleStyle) => void;
  lang?: Language;
}

export const KHMER_FONTS_LIST = [
  { id: 'Noto Sans Khmer', name: 'Noto Sans Khmer (ស្តង់ដារ)' },
  { id: 'Battambang', name: 'Battambang (បាត់ដំបង - ពេញនិយម)' },
  { id: 'Koulen', name: 'Koulen (គូលែន - Bold TikTok)' },
  { id: 'Kantumruy Pro', name: 'Kantumruy Pro (កន្ទុំរុយ - Smooth)' },
  { id: 'Bayon', name: 'Bayon (បាយ័ន - Cinematic)' },
  { id: 'Siemreap', name: 'Siemreap (សៀមរាប)' },
  { id: 'Moul', name: 'Moul (មូល - Classical)' },
  { id: 'Preahvihear', name: 'Preahvihear (ព្រះវិហារ)' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (English)' },
];

export const COLOR_SWATCHES = [
  '#FFFFFF',
  '#FFE600',
  '#22D3EE',
  '#F43F5E',
  '#22C55E',
  '#F59E0B',
  '#A855F7',
  '#000000',
];

export const StylePanel: React.FC<StylePanelProps> = ({
  style,
  onChangeStyle,
  lang = 'km',
}) => {
  const update = (partial: Partial<SubtitleStyle>) => {
    onChangeStyle({ ...style, ...partial });
  };

  return (
    <div className="bg-[#0e131f] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-5 text-stone-200">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-stone-800/80">
        <Sliders className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white font-khmer">
          {lang === 'km' ? 'កែសម្រួល Style អក្សរ (Style & Typography)' : 'Subtitle Style Panel'}
        </h3>
      </div>

      {/* 1. Font Family & Size */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-stone-300 font-khmer flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'km' ? 'ពុម្ពអក្សរ (Font Family)' : 'Khmer Font'}</span>
          </span>
          <span className="font-mono text-[11px] text-amber-400">{style.font}</span>
        </label>

        <select
          value={style.font}
          onChange={(e) => update({ font: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-khmer focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          {KHMER_FONTS_LIST.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: `"${f.id}", sans-serif` }}>
              {f.name}
            </option>
          ))}
        </select>

        {/* Font Size Slider */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-stone-400 font-khmer">
            <span>{lang === 'km' ? 'ទំហំអក្សរ (Font Size):' : 'Font Size:'}</span>
            <span className="font-mono text-stone-200">{style.size}px</span>
          </div>
          <input
            type="range"
            min="22"
            max="72"
            step="1"
            value={style.size}
            onChange={(e) => update({ size: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* 2. Text Color & Swatches */}
      <div className="space-y-2 pt-2 border-t border-stone-800/80">
        <label className="text-xs font-semibold text-stone-300 font-khmer flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'km' ? 'ពណ៌អក្សរ (Text Color)' : 'Text Color'}</span>
          </span>
          <span className="font-mono text-[11px] text-stone-400">{style.color}</span>
        </label>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style.color}
            onChange={(e) => update({ color: e.target.value })}
            className="w-8 h-8 rounded-lg border border-stone-700 bg-stone-800 cursor-pointer p-0.5"
          />
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => update({ color: hex })}
                style={{ backgroundColor: hex }}
                className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                  style.color.toLowerCase() === hex.toLowerCase()
                    ? 'border-white scale-110 shadow-xs'
                    : 'border-stone-700 hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Outline / Stroke */}
      <div className="space-y-2 pt-2 border-t border-stone-800/80">
        <div className="flex items-center justify-between text-xs text-stone-300 font-khmer">
          <span>{lang === 'km' ? 'គែមអក្សរ (Outline / Stroke):' : 'Outline:'}</span>
          <span className="font-mono text-stone-400">{style.outlineWidth ?? 4}px</span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="color"
            value={style.outline}
            onChange={(e) => update({ outline: e.target.value })}
            className="w-8 h-8 rounded-lg border border-stone-700 bg-stone-800 cursor-pointer p-0.5"
          />
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={style.outlineWidth ?? 4}
            onChange={(e) => update({ outlineWidth: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* 4. Background Box */}
      <div className="space-y-2 pt-2 border-t border-stone-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-300 font-khmer flex items-center gap-1.5 cursor-pointer">
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'km' ? 'ប្រអប់ផ្ទៃខាងក្រោយ (Background Box)' : 'Background Box'}</span>
          </label>
          <input
            type="checkbox"
            checked={Boolean(style.bgBox)}
            onChange={(e) => update({ bgBox: e.target.checked })}
            className="w-4 h-4 text-amber-500 rounded-sm border-stone-700 bg-stone-800 cursor-pointer"
          />
        </div>

        {style.bgBox && (
          <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-stone-400 font-khmer">{lang === 'km' ? 'ពណ៌ប្រអប់:' : 'Box Color:'}</span>
              <input
                type="color"
                value={style.bgColor || '#000000'}
                onChange={(e) => update({ bgColor: e.target.value })}
                className="w-7 h-7 rounded-md border border-stone-700 bg-stone-800 cursor-pointer p-0.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-400 font-khmer">
                <span>{lang === 'km' ? 'ភាពថ្លា (Opacity):' : 'Opacity:'}</span>
                <span className="font-mono text-stone-200">
                  {Math.round((style.bgOpacity ?? 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={style.bgOpacity ?? 0.85}
                onChange={(e) => update({ bgOpacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Position (Bottom, Middle, Top) */}
      <div className="space-y-2 pt-2 border-t border-stone-800/80">
        <label className="text-xs font-semibold text-stone-300 font-khmer flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'km' ? 'ទីតាំងលើវីដេអូ (Position)' : 'Vertical Position'}</span>
          </span>
          <span className="font-mono text-[11px] text-stone-400">
            {style.positionYPercent ?? 82}%
          </span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'top', labelKm: 'ខាងលើ', labelEn: 'Top', val: 18 },
            { id: 'middle', labelKm: 'កណ្តាល', labelEn: 'Middle', val: 50 },
            { id: 'bottom', labelKm: 'ខាងក្រោម', labelEn: 'Bottom', val: 82 },
          ].map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() =>
                update({
                  position: pos.id as any,
                  positionYPercent: pos.val,
                })
              }
              className={`py-1.5 px-2 rounded-xl text-xs font-khmer transition-all border cursor-pointer ${
                style.position === pos.id
                  ? 'bg-amber-500 border-amber-400 text-stone-950 font-bold shadow-xs'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {lang === 'km' ? pos.labelKm : pos.labelEn}
            </button>
          ))}
        </div>

        {/* Fine vertical position slider */}
        <input
          type="range"
          min="10"
          max="92"
          step="1"
          value={style.positionYPercent ?? 82}
          onChange={(e) => update({ positionYPercent: parseInt(e.target.value, 10) })}
          className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-1"
        />
      </div>

      {/* 6. Animation Mode (Instant Pop vs Animated) */}
      <div className="space-y-2 pt-2 border-t border-stone-800/80">
        <label className="text-xs font-semibold text-stone-300 font-khmer flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'km' ? 'ចលនាអក្សរ (Animation)' : 'Animation Style'}</span>
          </span>
          <span className="font-mono text-[11px] text-amber-400">
            {style.animation === 'none' || !style.animation ? 'Pop Up (No Animation)' : style.animation}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'none', labelKm: '⚡ Pop Up (គ្មាន Animation)', labelEn: 'Instant Pop (No Animation)' },
            { id: 'pop', labelKm: '✨ Soft Pop (ស្រាលៗ)', labelEn: 'Soft Pop' },
            { id: 'fade', labelKm: '🎬 Fade (ស្រទន់)', labelEn: 'Gentle Fade' },
            { id: 'bounce', labelKm: '🎉 Bounce (លោតញាក់)', labelEn: 'Spring Bounce' },
          ].map((anim) => (
            <button
              key={anim.id}
              type="button"
              onClick={() => update({ animation: anim.id as any })}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-khmer text-left transition-all border cursor-pointer ${
                (style.animation || 'none') === anim.id
                  ? 'bg-amber-500 border-amber-400 text-stone-950 font-bold shadow-xs'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {lang === 'km' ? anim.labelKm : anim.labelEn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
