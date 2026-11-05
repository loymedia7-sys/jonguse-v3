import React from 'react';
import { Language } from '../../types';

interface LangToggleProps {
  currentLang: Language;
  onToggle: (lang: Language) => void;
}

// Crisp Authentic Vector Flag for Cambodia (🇰🇭)
export const CambodiaFlagSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-3.5' }) => (
  <svg
    viewBox="0 0 48 32"
    className={`${className} shrink-0 rounded-[2px] shadow-xs border border-stone-300/60 overflow-hidden`}
    aria-label="Cambodia Flag"
  >
    {/* Blue bands (top and bottom: 1/4 each) */}
    <rect width="48" height="32" fill="#032EA6" />
    {/* Red center band (1/2 height) */}
    <rect y="8" width="48" height="16" fill="#ED1B2F" />
    
    {/* Angkor Wat Center Silhouette */}
    <g fill="#FFFFFF" transform="translate(14, 9.5) scale(0.42)">
      {/* Base platform */}
      <rect x="0" y="24" width="48" height="3" />
      <rect x="2" y="22" width="44" height="2" />
      <rect x="5" y="19" width="38" height="3" />
      
      {/* Central main tower */}
      <path d="M24 0 L20 10 L21 19 L27 19 L28 10 Z" />
      <path d="M22 6 L24 1 L26 6 L25 10 L23 10 Z" fill="#ED1B2F" />
      
      {/* Left tower */}
      <path d="M12 7 L9 13 L10 19 L17 19 L18 13 Z" />
      <path d="M11 11 L13 8 L15 11 L14 14 L12 14 Z" fill="#ED1B2F" />
      
      {/* Right tower */}
      <path d="M36 7 L33 13 L34 19 L41 19 L42 13 Z" />
      <path d="M35 11 L37 8 L39 11 L38 14 L36 14 Z" fill="#ED1B2F" />
      
      {/* Intermediate wall connectors */}
      <rect x="17" y="15" width="4" height="4" />
      <rect x="27" y="15" width="4" height="4" />
    </g>
  </svg>
);

// Crisp Authentic Vector Flag for United States (🇺🇸)
export const UsaFlagSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-3.5' }) => (
  <svg
    viewBox="0 0 48 32"
    className={`${className} shrink-0 rounded-[2px] shadow-xs border border-stone-300/60 overflow-hidden`}
    aria-label="USA Flag"
  >
    {/* 13 Red and White Stripes */}
    <rect width="48" height="32" fill="#B22234" />
    <rect y="2.46" width="48" height="2.46" fill="#FFFFFF" />
    <rect y="7.38" width="48" height="2.46" fill="#FFFFFF" />
    <rect y="12.3" width="48" height="2.46" fill="#FFFFFF" />
    <rect y="17.22" width="48" height="2.46" fill="#FFFFFF" />
    <rect y="22.14" width="48" height="2.46" fill="#FFFFFF" />
    <rect y="27.06" width="48" height="2.46" fill="#FFFFFF" />
    
    {/* Blue Canton */}
    <rect width="20" height="17.22" fill="#3C3B6E" />
    
    {/* Star Dots Grid */}
    <g fill="#FFFFFF">
      {/* Row 1 */}
      <circle cx="3.5" cy="3" r="0.9" />
      <circle cx="7.5" cy="3" r="0.9" />
      <circle cx="11.5" cy="3" r="0.9" />
      <circle cx="15.5" cy="3" r="0.9" />
      {/* Row 2 */}
      <circle cx="5.5" cy="5.5" r="0.9" />
      <circle cx="9.5" cy="5.5" r="0.9" />
      <circle cx="13.5" cy="5.5" r="0.9" />
      {/* Row 3 */}
      <circle cx="3.5" cy="8" r="0.9" />
      <circle cx="7.5" cy="8" r="0.9" />
      <circle cx="11.5" cy="8" r="0.9" />
      <circle cx="15.5" cy="8" r="0.9" />
      {/* Row 4 */}
      <circle cx="5.5" cy="10.5" r="0.9" />
      <circle cx="9.5" cy="10.5" r="0.9" />
      <circle cx="13.5" cy="10.5" r="0.9" />
      {/* Row 5 */}
      <circle cx="3.5" cy="13.5" r="0.9" />
      <circle cx="7.5" cy="13.5" r="0.9" />
      <circle cx="11.5" cy="13.5" r="0.9" />
      <circle cx="15.5" cy="13.5" r="0.9" />
    </g>
  </svg>
);

export const LangToggle: React.FC<LangToggleProps> = ({ currentLang, onToggle }) => {
  const isKm = currentLang === 'km';

  const handleSwitch = () => {
    onToggle(isKm ? 'en' : 'km');
  };

  return (
    <button
      id="single-lang-toggle-btn"
      type="button"
      onClick={handleSwitch}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 shadow-xs hover:border-stone-300 transition-all cursor-pointer select-none active:scale-95 text-xs font-semibold"
      title={isKm ? 'Click to switch to English (🇺🇸)' : 'ចុចដើម្បីប្ដូរទៅភាសាខ្មែរ (🇰🇭)'}
    >
      {isKm ? (
        <>
          <CambodiaFlagSvg className="w-5 h-3.5" />
          <span className="font-khmer text-xs font-bold text-stone-900">ខ្មែរ</span>
        </>
      ) : (
        <>
          <UsaFlagSvg className="w-5 h-3.5" />
          <span className="text-xs font-bold text-stone-900 tracking-wide">EN</span>
        </>
      )}
    </button>
  );
};
