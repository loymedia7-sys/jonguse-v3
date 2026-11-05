import React from 'react';
import { Language } from '../../types';
import { translations } from '../../lib/i18n';
import { Heart, ShieldCheck } from 'lucide-react';

interface FooterProps {
  currentLang: Language;
}

export const Footer: React.FC<FooterProps> = ({ currentLang }) => {
  const t = translations[currentLang];

  return (
    <footer className="border-t border-stone-200 bg-white py-8 mt-16 text-xs text-stone-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bayon text-base text-stone-800">ចង់ប្រើ (Jong Use)</span>
          <span>•</span>
          <span>{t.subTagline}</span>
        </div>

        <div className="flex items-center gap-4 text-stone-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Private & Fast</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
