import React, { useState } from 'react';
import { ShieldCheck, Cloud, Zap, X, AlertCircle, Copy, Check, Mail } from 'lucide-react';
import { loginWithGoogle, loginWithLocalCreator } from '../../firebase';
import { Language } from '../../types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
  targetFeatureName?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : 'jong-use-test-beta.vercel.app';

  const handleCopyDomain = async () => {
    const domainToCopy = unauthorizedDomain || currentHostname;
    try {
      await navigator.clipboard.writeText(domainToCopy);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setUnauthorizedDomain(null);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        const domain = err.unauthorizedDomain || currentHostname;
        setUnauthorizedDomain(domain);
        setShowEmailForm(true);
        setError(
          lang === 'km'
            ? `ដែន "${domain}" មិនទាន់បានអនុញ្ញាតក្នុង Firebase Auth ទេ។ អ្នកអាចចូលប្រើភ្លាមៗតាម Email ខាងក្រោម ឬបន្ថែមដែននេះក្នុង Firebase Console។`
            : `Domain "${domain}" is not yet authorized in Firebase Auth. You can sign in immediately with your email below, or add this domain in Firebase Console.`
        );
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError(
          lang === 'km'
            ? 'អ្នកបានបិទផ្ទាំង Login។ សូមព្យាយាមម្តងទៀត ឬចូលតាម Email។'
            : 'Popup closed. Please try again or continue with email.'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setShowEmailForm(true);
        setError(
          lang === 'km'
            ? 'កម្មវិធីរុករកបានរារាំង Popup។ សូមចូលប្រើតាម Email ខាងក្រោម។'
            : 'Popup blocked by browser. Please sign in with your email below.'
        );
      } else {
        setShowEmailForm(true);
        setError(
          lang === 'km'
            ? 'មិនអាចចូល Google Popup បានទេ។ សូមចូលប្រើតាម Email ខាងក្រោម។'
            : 'Google popup unavailable. Please sign in with your email below.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailCreatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(
        lang === 'km'
          ? 'សូមបញ្ចូលអ៊ីមែលឱ្យបានត្រឹមត្រូវ (ឧ. name@gmail.com)'
          : 'Please enter a valid email address (e.g. name@gmail.com)'
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await loginWithLocalCreator(trimmedEmail, nameInput.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b0f19] border border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-stone-100 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Logo Header */}
        <div className="text-center mb-5">
          <div className="inline-block relative mb-3">
            <img
              src="/logo.png"
              alt="JongUse Logo"
              className="w-16 h-16 rounded-2xl border border-stone-700 shadow-xl object-cover mx-auto"
            />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0b0f19] flex items-center justify-center text-stone-950 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <h3 className="text-xl font-bold font-khmer text-white tracking-tight">
            {lang === 'km' ? 'ចូលគណនីដើម្បីប្រើប្រាស់ Token' : 'Sign in to Your Creator Account'}
          </h3>
          <p className="text-xs text-stone-400 font-khmer mt-1.5 max-w-xs mx-auto leading-relaxed">
            {lang === 'km'
              ? 'ទទួលបាន 100 Token ឥតគិតថ្លៃភ្លាមៗ និងតាមដានការប្រើប្រាស់ Token តាម Email របស់អ្នក'
              : 'Get 100 free starter tokens immediately and track token usage with your account email'}
          </p>
        </div>

        {/* Value Highlights */}
        <div className="space-y-2 bg-[#101524] border border-stone-800/90 rounded-2xl p-3.5 mb-5 text-xs font-khmer text-stone-300">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'km' ? 'ទទួលបាន 100 Starter Tokens ឥតគិតថ្លៃភ្លាមៗ' : '100 Free Starter Tokens on sign in'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'km' ? 'តាមដានប្រវត្តិ និងកំណត់ត្រា Token តាម Email ផ្ទាល់ខ្លួន' : 'Track usage & tokens per your email address'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'km' ? 'ជាវគម្រោង Creator Pro ឬ Ultra ដើម្បីទទួលបាន Token បន្ថែម' : 'Subscribe to plans for unlimited creation tokens'}</span>
          </div>
        </div>

        {/* Error / Domain Authorization Notice */}
        {error && (
          <div className="mb-4 p-3.5 bg-amber-950/60 border border-amber-700/80 rounded-2xl text-xs text-amber-200 font-khmer space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>

            {unauthorizedDomain && (
              <div className="bg-black/40 border border-amber-800/60 rounded-xl p-2.5 space-y-2">
                <div className="text-[11px] text-stone-300">
                  {lang === 'km'
                    ? 'សម្រាប់អ្នកគ្រប់គ្រង (Firebase Console → Authentication → Settings → Authorized domains):'
                    : 'For Firebase Admin (Firebase Console → Authentication → Settings → Authorized domains):'}
                </div>
                <div className="flex items-center justify-between gap-2 bg-stone-900/90 px-2.5 py-1.5 rounded-lg border border-stone-700">
                  <code className="text-[11px] text-emerald-400 font-mono truncate">
                    {unauthorizedDomain}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-white hover:bg-stone-100 text-stone-900 font-bold font-khmer text-sm rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{lang === 'km' ? 'ចូលប្រើប្រាស់ជាមួយ Google' : 'Continue with Google'}</span>
          </button>

          {/* Toggle or Show Instant Email Sign-In */}
          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold font-khmer text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>
                {lang === 'km'
                  ? 'ចូលប្រើភ្លាមៗជាមួយ Email (មិនបាច់រង់ចាំ Popup)'
                  : 'Sign in directly with Email'}
              </span>
            </button>
          ) : (
            <form
              onSubmit={handleEmailCreatorLogin}
              className="p-3.5 bg-[#101524] border border-stone-700/90 rounded-2xl space-y-2.5 animate-fade-in"
            >
              <div className="text-xs font-bold text-emerald-400 font-khmer flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>
                  {lang === 'km' ? 'ចូលគណនីរហ័សតាម Email' : 'Instant Email Sign-In'}
                </span>
              </div>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={lang === 'km' ? 'បញ្ចូល Email របស់អ្នក (ឧ. name@gmail.com)' : 'Enter your email (e.g. name@gmail.com)'}
                className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={lang === 'km' ? 'ឈ្មោះគណនី (មិនបាច់បំពេញក៏បាន)' : 'Display name (optional)'}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-khmer text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-60"
              >
                {lang === 'km' ? 'ចូលគណនីឥឡូវនេះ (ទទួលបាន 100 Tokens)' : 'Sign In Now (Get 100 Starter Tokens)'}
              </button>
            </form>
          )}

          {/* Quick Guest Continue Option */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGuestContinue}
            className="w-full py-2 px-3 text-xs text-stone-400 hover:text-stone-200 font-khmer text-center rounded-xl hover:bg-stone-900/60 transition-colors cursor-pointer"
          >
            {lang === 'km' ? 'ឬបន្តប្រើប្រាស់ជាភ្ញៀវ (Guest Mode)' : 'Or continue as Guest'}
          </button>
        </div>
      </div>
    </div>
  );
};
