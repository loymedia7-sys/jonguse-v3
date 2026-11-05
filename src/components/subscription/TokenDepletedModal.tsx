import React from 'react';
import { AlertCircle, Coins, Zap, X, ArrowRight } from 'lucide-react';
import { Language } from '../../types';

interface TokenDepletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  requiredTokens: number;
  currentTokens: number;
  toolName?: string;
  onOpenSubscription: () => void;
}

export const TokenDepletedModal: React.FC<TokenDepletedModalProps> = ({
  isOpen,
  onClose,
  lang,
  requiredTokens,
  currentTokens,
  toolName,
  onOpenSubscription,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-5 text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
          <Coins className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold font-khmer text-stone-900">
            {lang === 'km' ? 'Token មិនគ្រប់គ្រាន់ឡើយ' : 'Insufficient Tokens'}
          </h3>
          <p className="text-xs text-stone-600 font-khmer mt-2 leading-relaxed">
            {lang === 'km' ? (
              <>
                មុខងារ {toolName ? `«${toolName}»` : ''} ត្រូវការចំនួន{' '}
                <strong className="text-emerald-700 font-extrabold">{requiredTokens} Tokens</strong>{' '}
                ប៉ុន្តែគណនីរបស់អ្នកនៅសល់ត្រឹម{' '}
                <span className="text-stone-800 font-bold">{currentTokens} Tokens</span> ប៉ុណ្ណោះ។
              </>
            ) : (
              <>
                This operation requires{' '}
                <strong className="text-emerald-700">{requiredTokens} Tokens</strong>, but your
                balance is currently{' '}
                <span className="text-stone-800 font-bold">{currentTokens} Tokens</span>.
              </>
            )}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-khmer text-stone-700 flex items-center justify-between">
          <span>{lang === 'km' ? 'Token ត្រូវការ:' : 'Required:'}</span>
          <span className="font-extrabold text-stone-900">{requiredTokens} Tokens</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold font-khmer text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            {lang === 'km' ? 'ពេលក្រោយ' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSubscription();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-khmer shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ជាវគម្រោងបន្ថែម' : 'Get More Tokens'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
