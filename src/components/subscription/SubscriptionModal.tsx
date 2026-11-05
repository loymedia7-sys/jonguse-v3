import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Coins,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Language, SubscriptionPlanId } from '../../types';
import { SUBSCRIPTION_PLANS, TOKEN_TOPUP_PACKS } from '../../data/plans';
import { User } from 'firebase/auth';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  user: User | null;
  currentPlan: SubscriptionPlanId;
  currentTokens: number;
  onSubscribe: (planId: SubscriptionPlanId, billingCycle: 'monthly' | 'yearly', paymentMethod: string) => Promise<void>;
  onTopup: (tokens: number, amountUSD: number, paymentMethod: string) => Promise<void>;
  onOpenLogin: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  lang,
  user,
  currentPlan,
  currentTokens,
  onSubscribe,
  onTopup,
  onOpenLogin,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'topup'>('plans');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('creator_pro');
  const [selectedPackId, setSelectedPackId] = useState<string>('pack_1200');
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'payment'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'aba_khqr' | 'wing' | 'card'>('aba_khqr');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];
  const selectedPack = TOKEN_TOPUP_PACKS.find((p) => p.id === selectedPackId) || TOKEN_TOPUP_PACKS[1];

  const planPriceUSD =
    billingCycle === 'yearly'
      ? selectedPlan.priceYearlyUSD
      : selectedPlan.priceMonthlyUSD;

  const planPriceKHR =
    billingCycle === 'yearly'
      ? Math.round(selectedPlan.priceMonthlyKHR * 0.8)
      : selectedPlan.priceMonthlyKHR;

  const totalBillUSD =
    activeTab === 'plans'
      ? billingCycle === 'yearly'
        ? Number((selectedPlan.priceYearlyUSD * 12).toFixed(2))
        : selectedPlan.priceMonthlyUSD
      : selectedPack.priceUSD;

  const totalBillKHR =
    activeTab === 'plans'
      ? billingCycle === 'yearly'
        ? planPriceKHR * 12
        : planPriceKHR
      : selectedPack.priceKHR;

  const handleProceedToPayment = () => {
    if (!user || user.isAnonymous) {
      showToast(
        lang === 'km'
          ? 'សូមចូលគណនី Google ជាមុនសិន ដើម្បីភ្ជាប់គម្រោងជាមួយ Email របស់អ្នក'
          : 'Please sign in with Google first to link your subscription',
        'error'
      );
      onOpenLogin();
      return;
    }
    setCheckoutStep('payment');
  };

  const handleConfirmCheckout = async () => {
    setIsProcessing(true);
    try {
      if (activeTab === 'plans') {
        await onSubscribe(selectedPlanId, billingCycle, paymentMethod);
        showToast(
          lang === 'km'
            ? `ជោគជ័យ! អ្នកបានជាវ ${selectedPlan.nameKm} រួចរាល់ (+${selectedPlan.tokensPerMonth} Tokens)`
            : `Success! Subscribed to ${selectedPlan.name} (+${selectedPlan.tokensPerMonth} Tokens added)`,
          'success'
        );
      } else {
        await onTopup(selectedPack.tokens, selectedPack.priceUSD, paymentMethod);
        showToast(
          lang === 'km'
            ? `ជោគជ័យ! បានបញ្ចូល +${selectedPack.tokens} Tokens រួចរាល់`
            : `Success! Added +${selectedPack.tokens} Tokens to your account`,
          'success'
        );
      }
      setCheckoutStep('select');
      onClose();
    } catch (e: any) {
      showToast(e?.message || 'Payment processing failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header Ribbon */}
        <div className="bg-stone-900 text-white px-6 py-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-khmer text-white">
                  {lang === 'km' ? 'ជាវគម្រោង & បន្ថែម Token ប្រើប្រាស់' : 'Subscription Plans & Tokens'}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  JongUse Pro
                </span>
              </div>
              <p className="text-xs text-stone-400 font-khmer mt-0.5">
                {lang === 'km'
                  ? `គណនី: ${user?.email || 'ភ្ញៀវ (Guest)'} • Token បច្ចុប្បន្ន: ${currentTokens} Tokens`
                  : `Account: ${user?.email || 'Guest'} • Current Balance: ${currentTokens} Tokens`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[78vh] overflow-y-auto">
          {checkoutStep === 'select' ? (
            <div className="space-y-6">
              {/* Tabs: Subscription vs Refill */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-khmer transition-all cursor-pointer ${
                      activeTab === 'plans'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {lang === 'km' ? 'គម្រោងជាវប្រចាំខែ (Plans)' : 'Monthly Plans'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('topup')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-khmer transition-all cursor-pointer ${
                      activeTab === 'topup'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {lang === 'km' ? 'ទិញ Token ម្ដងៗ (Refill Pack)' : 'Top-Up Packs'}
                  </button>
                </div>

                {/* Monthly vs Yearly Toggle for Plans */}
                {activeTab === 'plans' && (
                  <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs">
                    <span className="font-khmer text-emerald-900 font-semibold text-[11px]">
                      {lang === 'km' ? 'គិតជាខែ' : 'Monthly'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBillingCycle((prev) => (prev === 'monthly' ? 'yearly' : 'monthly'))
                      }
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        billingCycle === 'yearly' ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                    <span className="font-khmer text-emerald-900 font-semibold text-[11px] flex items-center gap-1">
                      {lang === 'km' ? 'គិតជាឆ្នាំ' : 'Yearly'}
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded-md">
                        -20%
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* View 1: Subscription Plans */}
              {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isCurrent = currentPlan === plan.id;
                    const price = billingCycle === 'yearly' ? plan.priceYearlyUSD : plan.priceMonthlyUSD;
                    const priceKHR =
                      billingCycle === 'yearly'
                        ? Math.round(plan.priceMonthlyKHR * 0.8)
                        : plan.priceMonthlyKHR;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative rounded-2xl p-5 border transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-300 shadow-md'
                            : 'border-stone-200 bg-white hover:border-stone-300 shadow-xs'
                        }`}
                      >
                        {/* Most Popular Badge */}
                        {plan.badge && plan.id === 'creator_pro' && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs whitespace-nowrap">
                            {plan.badge}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold font-khmer text-stone-900 text-base">
                              {lang === 'km' ? plan.nameKm : plan.name}
                            </h4>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                                {lang === 'km' ? 'កំពុងប្រើ' : 'Active'}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-stone-500 font-khmer mt-1 min-h-[32px]">
                            {lang === 'km' ? plan.descriptionKm : plan.descriptionEn}
                          </p>

                          {/* Pricing block */}
                          <div className="my-4 pb-3 border-b border-stone-100">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                                ${price}
                              </span>
                              <span className="text-xs text-stone-500">
                                /{lang === 'km' ? 'ខែ' : 'mo'}
                              </span>
                            </div>
                            {price > 0 && (
                              <div className="text-xs text-emerald-700 font-semibold font-khmer mt-0.5">
                                ≈ {priceKHR.toLocaleString()} ៛ / {lang === 'km' ? 'ខែ' : 'mo'}
                              </div>
                            )}
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-900 text-xs font-bold font-khmer">
                              <Coins className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{plan.tokensPerMonth.toLocaleString()} Tokens / {lang === 'km' ? 'ខែ' : 'mo'}</span>
                            </div>
                          </div>

                          {/* Features list */}
                          <div className="space-y-2 text-xs font-khmer text-stone-700">
                            {plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Check
                                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                                    feat.included ? 'text-emerald-600' : 'text-stone-300'
                                  }`}
                                />
                                <span className={feat.included ? 'text-stone-700' : 'text-stone-400 line-through'}>
                                  {lang === 'km' ? feat.textKm : feat.textEn}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-stone-100">
                          {isCurrent ? (
                            <div className="w-full py-2 text-center text-xs font-bold font-khmer text-stone-500 bg-stone-100 rounded-xl">
                              {lang === 'km' ? 'គម្រោងបច្ចុប្បន្នរបស់អ្នក' : 'Current Active Plan'}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlanId(plan.id);
                                handleProceedToPayment();
                              }}
                              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold font-khmer transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : 'bg-stone-900 hover:bg-stone-800 text-white'
                              }`}
                            >
                              <span>{lang === 'km' ? 'ជ្រើសរើសគម្រោងនេះ' : 'Choose Plan'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View 2: Top-Up Packs */}
              {activeTab === 'topup' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <Coins className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-900 font-khmer">
                      {lang === 'km'
                        ? 'Token បន្ថែមមិនមានថ្ងៃផុតកំណត់ឡើយ (Never expires)។ អាចបញ្ចូលប្រើប្រាស់បានគ្រប់ពេលជាមួយគ្រប់ឧបករណ៍ AI។'
                        : 'Top-up tokens never expire. Use them anytime across all AI subtitle, OCR, and voice tools.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {TOKEN_TOPUP_PACKS.map((pack) => {
                      const isSelected = selectedPackId === pack.id;
                      return (
                        <div
                          key={pack.id}
                          onClick={() => setSelectedPackId(pack.id)}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-300 shadow-md'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                                {pack.badge}
                              </span>
                              {pack.bonus && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  {pack.bonus}
                                </span>
                              )}
                            </div>

                            <div className="my-4 text-center">
                              <div className="text-3xl font-extrabold text-stone-900 flex items-center justify-center gap-1.5">
                                <Coins className="w-6 h-6 text-emerald-600" />
                                <span>+{pack.tokens.toLocaleString()}</span>
                              </div>
                              <span className="text-xs text-stone-500 font-khmer">Tokens</span>
                            </div>

                            <div className="text-center pb-3 border-b border-stone-100">
                              <div className="text-xl font-bold text-stone-900">${pack.priceUSD}</div>
                              <div className="text-xs text-stone-500 font-khmer">
                                ≈ {pack.priceKHR.toLocaleString()} ៛
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPackId(pack.id);
                              handleProceedToPayment();
                            }}
                            className={`w-full mt-4 py-2.5 rounded-xl text-xs font-bold font-khmer transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-stone-900 hover:bg-stone-800 text-white'
                            }`}
                          >
                            {lang === 'km' ? 'ទិញកញ្ចប់នេះ' : 'Buy Pack'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Checkout & Payment Simulation View */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('select')}
                  className="text-xs font-bold font-khmer text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                >
                  ← {lang === 'km' ? 'ត្រឡប់ទៅជ្រើសរើសគម្រោង' : 'Back to plan selection'}
                </button>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {lang === 'km' ? 'ការទូទាត់ប្រកបដោយសុវត្ថិភាព' : 'Secure 256-bit Checkout'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Order Summary */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-khmer">
                    {lang === 'km' ? 'សេចក្ដីសង្ខេបនៃការបញ្ជាទិញ' : 'Order Summary'}
                  </h4>

                  <div className="flex items-center justify-between pb-3 border-b border-stone-200 text-sm">
                    <div>
                      <div className="font-bold text-stone-900 font-khmer">
                        {activeTab === 'plans'
                          ? lang === 'km'
                            ? selectedPlan.nameKm
                            : selectedPlan.name
                          : `+${selectedPack.tokens} Tokens Pack`}
                      </div>
                      <div className="text-xs text-stone-500 font-khmer">
                        {activeTab === 'plans'
                          ? `${selectedPlan.tokensPerMonth} Tokens • ${
                              billingCycle === 'yearly' ? 'គិតជាឆ្នាំ (Billed Yearly)' : 'គិតជាខែ (Monthly)'
                            }`
                          : 'មិនមានថ្ងៃផុតកំណត់ (No expiration)'}
                      </div>
                    </div>
                    <div className="text-right font-bold text-stone-900 text-base">
                      ${totalBillUSD}
                    </div>
                  </div>

                  {/* Quick Toggle for Billing Cycle on Checkout */}
                  {activeTab === 'plans' && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 shadow-xs">
                      <span className="text-xs font-bold text-stone-700 font-khmer">
                        {lang === 'km' ? 'វដ្តនៃការគិតប្រាក់:' : 'Billing Cycle:'}
                      </span>
                      <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-xs font-khmer">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            billingCycle === 'monthly'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {lang === 'km' ? 'ប្រចាំខែ' : 'Monthly'} (${selectedPlan.priceMonthlyUSD})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            billingCycle === 'yearly'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <span>{lang === 'km' ? 'ប្រចាំឆ្នាំ' : 'Yearly'}</span>
                          <span className={`text-[10px] px-1 py-0.2 rounded font-extrabold ${
                            billingCycle === 'yearly' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            -20%
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-stone-600 font-khmer">
                    <div className="flex justify-between">
                      <span>{lang === 'km' ? 'គណនី Email ទទួល Token:' : 'Account Email:'}</span>
                      <span className="font-bold text-stone-900 truncate max-w-[180px]">
                        {user?.email || 'user@jonguse.app'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{lang === 'km' ? 'Token ទទួលបាន:' : 'Tokens to Add:'}</span>
                      <span className="font-bold text-emerald-700">
                        +{activeTab === 'plans' ? selectedPlan.tokensPerMonth : selectedPack.tokens} Tokens
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-stone-200 text-stone-900 font-bold text-sm">
                      <span>{lang === 'km' ? 'សរុបត្រូវបង់:' : 'Total Due:'}</span>
                      <div className="text-right">
                        <div>${totalBillUSD} USD</div>
                        <div className="text-xs text-stone-500 font-normal">
                          ≈ {totalBillKHR.toLocaleString()} ៛
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs font-khmer">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {lang === 'km'
                        ? 'Token នឹងបញ្ចូលទៅកាន់គណនីភ្លាមៗបន្ទាប់ពីទូទាត់ជោគជ័យ'
                        : 'Tokens will be instantly credited to your account upon confirmation'}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector & Interactive QR */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-khmer">
                    {lang === 'km' ? 'ជ្រើសរើសវិធីសាស្ត្រទូទាត់' : 'Payment Method'}
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('aba_khqr')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === 'aba_khqr'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200 font-bold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <QrCode className="w-5 h-5 mx-auto mb-1 text-red-600" />
                      <div className="text-[11px] font-bold">KHQR / ABA</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wing')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === 'wing'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200 font-bold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Zap className="w-5 h-5 mx-auto mb-1 text-lime-600" />
                      <div className="text-[11px] font-bold">Wing Bank</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200 font-bold'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                      <div className="text-[11px] font-bold">Visa / Card</div>
                    </button>
                  </div>

                  {/* KHQR Graphic Display */}
                  {paymentMethod === 'aba_khqr' && (
                    <div className="p-4 bg-white rounded-2xl border border-red-200 shadow-xs text-center space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">
                        <span>KHQR</span>
                        <span className="text-[10px] opacity-80">ស្កេនពីគ្រប់ធនាគារ</span>
                      </div>

                      <div className="w-48 h-48 mx-auto bg-stone-50 border-2 border-red-500 rounded-2xl p-2.5 flex flex-col items-center justify-center relative shadow-sm">
                        {/* Realistic Mock KHQR Visual */}
                        <div className="w-full h-full bg-white rounded-xl border border-stone-200 flex flex-col items-center justify-center p-2 relative">
                          <QrCode className="w-32 h-32 text-stone-900" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-red-600 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                              ABA
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-stone-600 font-khmer">
                        <span>ចំនួនទឹកប្រាក់: </span>
                        <strong className="text-stone-900 font-bold">${totalBillUSD} USD</strong>
                        <span> ({totalBillKHR.toLocaleString()} KHR)</span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value="•••• •••• •••• 4242 (Instant Sim)"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-mono text-stone-700"
                          />
                          <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-stone-600 font-medium mb-1">Expiry</label>
                          <input
                            type="text"
                            readOnly
                            value="12/28"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-mono text-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-600 font-medium mb-1">CVC</label>
                          <input
                            type="text"
                            readOnly
                            value="•••"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 font-mono text-stone-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirm Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmCheckout}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold font-khmer text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span>{lang === 'km' ? 'កំពុងដំណើរការ...' : 'Processing activation...'}</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {lang === 'km'
                            ? `បញ្ជាក់ការទូទាត់ $${totalBillUSD} & បើកដំណើរការ`
                            : `Confirm $${totalBillUSD} & Activate Now`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
