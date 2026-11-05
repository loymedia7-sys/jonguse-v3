import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  BellRing,
  FileCode,
  Video,
  FileText,
  Volume2,
  QrCode,
  X,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { AppNotification } from '../../hooks/useNotifications';
import { Language } from '../../types';

interface MobileNotificationBannerProps {
  notification: AppNotification | null;
  lang: Language;
  onDismiss: () => void;
  onOpenTool?: (tool: string) => void;
}

export const MobileNotificationBanner: React.FC<MobileNotificationBannerProps> = ({
  notification,
  lang,
  onDismiss,
  onOpenTool,
}) => {
  const getToolMeta = (tool: string) => {
    switch (tool) {
      case 'srt':
        return {
          icon: FileCode,
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          badgeKm: 'Subtitle .SRT',
          badgeEn: 'Subtitle .SRT',
        };
      case 'videostyle':
        return {
          icon: Video,
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          badgeKm: 'Video Styler',
          badgeEn: 'Video Styler',
        };
      case 'ocr':
        return {
          icon: FileText,
          bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          badgeKm: 'OCR អានអក្សរ',
          badgeEn: 'Document OCR',
        };
      case 'tts':
        return {
          icon: Volume2,
          bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          badgeKm: 'Khmer TTS',
          badgeEn: 'Khmer TTS',
        };
      case 'qr':
        return {
          icon: QrCode,
          bg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
          badgeKm: 'QR Code',
          badgeEn: 'QR Code',
        };
      default:
        return {
          icon: Sparkles,
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          badgeKm: 'ចង់ប្រើ AI',
          badgeEn: 'JongUse AI',
        };
    }
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, y: -90, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[100] w-[95vw] max-w-md pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-3xl bg-stone-950/95 backdrop-blur-xl text-white border border-stone-700/80 shadow-2xl shadow-black/40 p-3.5 sm:p-4">
            {/* Subtle top emerald glow bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                notification.type === 'away_alert'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500'
              }`}
            />

            {/* Header Row: App Identity + Status Pill + Close */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/logo.png"
                  alt="JongUse"
                  className="w-5 h-5 rounded-md object-cover border border-stone-700 shrink-0"
                />
                <span className="text-[11px] font-bold tracking-wider uppercase text-stone-300 font-sans truncate">
                  ចង់ប្រើ • JONGUSE
                </span>
                <span className="text-[10px] text-stone-500">•</span>
                <span className="text-[10px] text-emerald-400 font-khmer font-semibold shrink-0">
                  {lang === 'km' ? 'ឥឡូវនេះ' : 'Just now'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {notification.wasAway ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-khmer">
                    <BellRing className="w-2.5 h-2.5 animate-bounce" />
                    {lang === 'km' ? 'ពេលអ្នកមិននៅលើទំព័រ' : 'While Away'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-khmer">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {lang === 'km' ? 'រួចរាល់ ១០០%' : 'Done'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-1 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                  aria-label="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body Row: Tool Icon + Title + Summary */}
            {(() => {
              const meta = getToolMeta(notification.tool);
              const ToolIcon = meta.icon;
              return (
                <div
                  onClick={() => {
                    if (notification.tool && notification.tool !== 'system' && onOpenTool) {
                      onOpenTool(notification.tool);
                    }
                    onDismiss();
                  }}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}
                  >
                    <ToolIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white font-khmer leading-snug group-hover:text-emerald-300 transition-colors">
                      {lang === 'km' ? notification.titleKm : notification.title}
                    </div>
                    <p className="text-[11px] sm:text-xs text-stone-300 font-khmer line-clamp-2 mt-0.5 leading-relaxed">
                      {lang === 'km' ? notification.messageKm : notification.message}
                    </p>

                    {/* Action Footer */}
                    {notification.tool && notification.tool !== 'system' && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 font-khmer">
                          <span>
                            {lang === 'km' ? 'ចុចបើកមើលលទ្ធផលឥឡូវនេះ' : 'Tap to view result'}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Mobile Pull Bar Indicator */}
            <div className="mt-2.5 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-stone-700/80" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
