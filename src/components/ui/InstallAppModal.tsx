import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, Share, PlusSquare, X } from 'lucide-react';
import { Language } from '../../types';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Detect if already running standalone PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0e1322] border border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-stone-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center gap-4 mb-5">
          <img
            src="/logo.png"
            alt="JongUse App Logo"
            className="w-16 h-16 rounded-2xl border border-stone-700 shadow-lg object-cover"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-white font-khmer">ចង់ប្រើ (JongUse)</h3>
              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                App
              </span>
            </div>
            <p className="text-xs text-stone-400 font-khmer mt-0.5">
              {lang === 'km' ? 'ដំឡើងលើអេក្រង់ទូរស័ព្ទ ឬកុំព្យូទ័រ' : 'Install to your Home Screen'}
            </p>
          </div>
        </div>

        {/* Content based on platform */}
        {isInstalled ? (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center space-y-2 mb-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-emerald-300 font-khmer">
              {lang === 'km' ? 'កម្មវិធីនេះត្រូវបានដំឡើងរួចរាល់ហើយ!' : 'App is already installed!'}
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-3 bg-[#13192b] border border-stone-800 rounded-2xl p-4 mb-4 text-xs font-khmer text-stone-300">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>{lang === 'km' ? 'របៀបដំឡើងលើ iPhone / iPad:' : 'How to install on iOS:'}</span>
            </p>
            <div className="space-y-2 text-stone-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 text-xs flex items-center justify-center font-bold shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1">
                  {lang === 'km' ? 'ចុចប៊ូតុងចែករំលែក' : 'Tap the Share icon'}
                  <Share className="w-3.5 h-3.5 text-emerald-400 inline" />
                  {lang === 'km' ? 'នៅខាងក្រោម Safari' : 'in Safari toolbar'}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 text-xs flex items-center justify-center font-bold shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1">
                  {lang === 'km' ? 'រំកិលចុះក្រោម រួចចុច' : 'Scroll down & tap'}
                  <span className="font-bold text-white flex items-center gap-1 bg-stone-800 px-1.5 py-0.5 rounded">
                    <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" />
                    {lang === 'km' ? 'បន្ថែមទៅទំព័រដើម (Add to Home Screen)' : 'Add to Home Screen'}
                  </span>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 text-xs flex items-center justify-center font-bold shrink-0">
                  3
                </span>
                <span>{lang === 'km' ? 'ចុច "Add" នៅជ្រុងខាងស្តាំខាងលើ ជាការស្រេច!' : 'Tap "Add" in top right corner!'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-[#13192b] border border-stone-800 rounded-2xl p-4 mb-4 text-xs font-khmer text-stone-300">
            <p className="text-stone-300 leading-relaxed">
              {lang === 'km'
                ? 'ដំឡើង JongUse លើ Home Screen ដើម្បីបើកប្រើប្រាស់បានលឿន ដូចកម្មវិធី Native App ពេញលេញ មិនបាច់ចាំវាយ link រាល់ដង។'
                : 'Install JongUse on your Home Screen for instant 1-tap access with full-screen native app experience.'}
            </p>
            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold font-khmer rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'km' ? 'ដំឡើងឥឡូវនេះ (Install Now)' : 'Install Now'}</span>
              </button>
            ) : (
              <div className="text-[11px] text-stone-400 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
                {lang === 'km'
                  ? '💡 ចុចលើ Menu (...) នៃកម្មវិធីរុករក Chrome រួចជ្រើសយក "Add to Home screen" ឬ "Install app"'
                  : '💡 Tap Chrome menu (...) and select "Add to Home screen" or "Install app"'}
              </div>
            )}
          </div>
        )}

        {/* Benefits list */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400 font-khmer">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{lang === 'km' ? 'ដំណើរការលឿន' : 'Fast Performance'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{lang === 'km' ? 'ពេញអេក្រង់ (Full screen)' : 'Full Screen UI'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{lang === 'km' ? 'រក្សាទិន្នន័យលើ Cloud' : 'Cloud Sync (Firebase)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{lang === 'km' ? 'ឥតគិតថ្លៃ 100%' : '100% Free'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
