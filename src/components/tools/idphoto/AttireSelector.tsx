import React from 'react';
import { Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Shirt, Palette, Check } from 'lucide-react';
import { Card } from '../../ui/Card';

interface AttireSelectorProps {
  selectedAttire: string;
  onSelectAttire: (attire: string) => void;
  selectedBg: string;
  onSelectBg: (bg: string) => void;
  lang: Language;
}

export const AttireSelector: React.FC<AttireSelectorProps> = ({
  selectedAttire,
  onSelectAttire,
  selectedBg,
  onSelectBg,
  lang,
}) => {
  const t = translations[lang];

  const attires = [
    { id: 'suit_black', label: t.idPhotoAttire_suit_black, badge: 'Standard' },
    { id: 'suit_navy', label: t.idPhotoAttire_suit_navy, badge: 'Executive' },
    { id: 'traditional_khmer_formal', label: t.idPhotoAttire_traditional_khmer, badge: 'Khmer' },
    { id: 'formal_white_shirt', label: t.idPhotoAttire_formal_white, badge: 'Formal' },
    { id: 'blazer_grey', label: t.idPhotoAttire_blazer_grey, badge: 'Modern' },
    { id: 'female_suit_black', label: t.idPhotoAttire_female_suit, badge: 'Women' },
    { id: 'female_blouse_white', label: t.idPhotoAttire_female_blouse, badge: 'Women' },
  ];

  const backgrounds = [
    { id: 'blue_sky', label: t.idPhotoBg_blue_sky, colorHex: '#3b82f6', tag: 'Cambodia ID' },
    { id: 'white', label: t.idPhotoBg_white, colorHex: '#ffffff', tag: 'Visa / Global' },
    { id: 'blue_dark', label: t.idPhotoBg_blue_dark, colorHex: '#1e3a8a', tag: 'Passport' },
    { id: 'grey_light', label: t.idPhotoBg_grey_light, colorHex: '#e2e8f0', tag: 'Studio' },
    { id: 'red', label: t.idPhotoBg_red, colorHex: '#dc2626', tag: 'Official' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Background Color Selection */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Palette className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            {t.idPhotoBg}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {backgrounds.map((bg) => {
            const isSelected = selectedBg === bg.id;
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => onSelectBg(bg.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-200'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-6 h-6 rounded-lg border border-stone-300 shadow-2xs shrink-0"
                    style={{ backgroundColor: bg.colorHex }}
                  />
                  <div className="text-xs font-semibold text-stone-800 font-khmer leading-tight">
                    {bg.label}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2. Attire Selection */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Shirt className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            {t.idPhotoAttire}
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {attires.map((attire) => {
            const isSelected = selectedAttire === attire.id;
            return (
              <button
                key={attire.id}
                type="button"
                onClick={() => onSelectAttire(attire.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-200'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-khmer">{attire.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200">
                    {attire.badge}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
