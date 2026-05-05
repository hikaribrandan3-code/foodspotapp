import React, { useState } from 'react';
import { ChevronLeft, Ticket, CreditCard, Info, Smartphone, Wallet, Zap, Coins, Fingerprint } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function EventCheckout({ event, tier, onConfirm, onBack }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [qty, setQty] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'crypto' | 'wristband' | 'wallet'

  if (!event || !tier) return null;

  const addons = [
    { id: 'drink', name: t('drink_tokens') || 'Drink Tokens', price: 15, icon: '🍺' },
    { id: 'food', name: t('tasting_platter') || 'Tasting Platter', price: 45, icon: '🍱' }
  ];

  const addonsTotal = selectedAddons.reduce((sum, id) => sum + addons.find(a => a.id === id).price, 0);
  const total = (tier.price * qty) + addonsTotal;

  const toggleAddon = (id) => {
    setSelectedAddons(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleConfirm = () => {
    if (!isValidEmail(email)) return;
    onConfirm({
      id: 'TKT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      email,
      event_id: event.id,
      event_name: event.name,
      tier_name: tier.name,
      tier_id: tier.id,
      quantity: qty,
      addons: selectedAddons.map(id => addons.find(a => a.id === id)),
      total: total,
      purchase_date: new Date().toISOString(),
      venue_name: event.venue_name,
      date: event.date,
      image: event.image,
      description: event.description,
      category: event.category,
      payment_method: paymentMethod
    });
  };

  const paymentOptions = [
    { id: 'card', name: 'Credit Card', icon: <CreditCard size={16} />, color: 'slate' },
    { id: 'mercado', name: 'Mercado Pago', icon: <Smartphone size={16} />, color: 'sky' },
    { id: 'crypto', name: 'Crypto Pay', icon: <Coins size={16} />, color: 'indigo' },
    { id: 'wristband', name: 'Sync Wristband', icon: <Fingerprint size={16} />, color: 'emerald' }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--canvas-bg)]">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white dark:bg-slate-950 border-b border-[var(--border-color)]">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--canvas-bg)] text-[var(--text-primary)] active:scale-90 transition-all border border-[var(--border-color)]"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
          {t('confirm_payment')}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-8 flex flex-col pb-32">
        {/* Immersive Event Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-[var(--border-color)] overflow-hidden shadow-sm flex flex-col shrink-0">
          <div className="relative h-32 w-full">
            <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/40 dark:via-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div>
                <h3 className="font-black text-lg text-[var(--text-primary)] leading-tight">{event.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] mt-0.5">{tier.name}</p>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <span className="text-[10px] font-black text-[var(--text-primary)]">${tier.price} <span className="opacity-40">ea</span></span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 pt-4">
             <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">{t('quantity')}</span>
                <div className="flex items-center gap-5 bg-[var(--canvas-bg)] px-4 py-2 rounded-2xl border border-[var(--border-color)]">
                   <button 
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-[var(--text-primary)] font-black active:scale-90 transition-all border border-[var(--border-color)] shadow-sm"
                   >-</button>
                   <span className="text-sm font-black w-4 text-center">{qty}</span>
                   <button 
                    onClick={() => setQty(qty + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-[var(--text-primary)] font-black active:scale-90 transition-all border border-[var(--border-color)] shadow-sm"
                   >+</button>
                </div>
             </div>

             <div className="h-px bg-[var(--border-color)] my-4 border-dashed opacity-50"></div>

             <div className="flex items-center justify-between">
                <span className="text-xl font-black text-[var(--text-primary)] tracking-tight">{t('total')}</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-[var(--color-primary)] tracking-tighter">${total.toFixed(2)}</span>
                  <p className="text-[9px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest mt-0.5">Admin fees included</p>
                </div>
             </div>
          </div>
        </div>
        
        {/* Experience Add-ons Section */}
        <div className="space-y-4">
           <div className="flex flex-col px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('addons_title')}</h3>
             <p className="text-[9px] font-bold text-[var(--text-secondary)] opacity-30 uppercase tracking-widest mt-1">{t('addons_desc')}</p>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              {addons.map((addon) => (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`flex flex-col items-start p-4 rounded-[28px] border transition-all text-left relative overflow-hidden ${
                    selectedAddons.includes(addon.id)
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 shadow-slate-900/20'
                    : 'bg-white dark:bg-slate-900 border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--color-primary)] shadow-sm'
                  }`}
                >
                  <span className="text-xl mb-2">{addon.icon}</span>
                  <p className="text-[10px] font-black uppercase tracking-tight leading-tight mb-1">{addon.name}</p>
                  <p className={`text-xs font-black ${selectedAddons.includes(addon.id) ? 'text-white/80' : 'text-[var(--color-primary)]'}`}>
                    ${addon.price}
                  </p>
                  
                  {selectedAddons.includes(addon.id) && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                    </div>
                  )}
                </button>
              ))}
           </div>
        </div>

        {/* Futuristic Payment Methods */}
        <div className="space-y-4">
           <div className="flex flex-col px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">Checkout Methods</h3>
             <p className="text-[9px] font-bold text-[var(--text-secondary)] opacity-30 uppercase tracking-widest mt-1">Select your preferred way to pay</p>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`flex items-center gap-3 p-4 rounded-[24px] border transition-all text-left relative ${
                    paymentMethod === opt.id
                    ? opt.id === 'mercado' 
                      ? 'bg-[#FFF059] border-[#FFF059] text-[#009EE3] shadow-lg shadow-yellow-500/20' 
                      : 'bg-slate-900 border-slate-900 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-900 border-[var(--border-color)] text-[var(--text-primary)] hover:border-slate-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    paymentMethod === opt.id 
                    ? opt.id === 'mercado' ? 'bg-[#009EE3]/10' : 'bg-white/10' 
                    : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {opt.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight">{opt.name}</span>
                </button>
              ))}
           </div>
        </div>

        <div className="space-y-3">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 px-2">{t('email_label')}</h3>
           <div className={`flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-[24px] border transition-all shadow-sm ${email && !isValidEmail(email) ? 'border-rose-500' : 'border-[var(--border-color)]'}`}>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email_placeholder')}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold px-4 text-[var(--text-primary)]"
              />
           </div>
        </div>

        <div className="space-y-3">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">Promo Code</h3>
             {applied && (
               <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                 {promoCode.startsWith('FOOD-') || promoCode.startsWith('REF-') ? (t('referral_bonus') || 'Referral Bonus Applied') : 'Code Applied!'}
               </span>
             )}
           </div>
           <div className={`flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-[24px] border transition-all shadow-sm ${applied ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-[var(--border-color)]'}`}>
              <input 
                type="text" 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter code"
                disabled={applied}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold px-4 text-[var(--text-primary)] placeholder:opacity-30 disabled:opacity-50"
              />
              <button 
                onClick={() => {
                  if (!promoCode) return;
                  setIsApplying(true);
                  setTimeout(() => {
                    const isReferral = promoCode.toUpperCase().startsWith('FOOD-') || promoCode.toUpperCase().startsWith('REF-');
                    setIsApplying(false);
                    setApplied(true);
                    if (isReferral) setPromoCode(promoCode.toUpperCase());
                  }, 800);
                }}
                disabled={applied || !promoCode || isApplying}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  applied 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-900 dark:bg-slate-700 text-white active:scale-95 disabled:opacity-50'
                }`}
              >
                {isApplying ? 'Applying...' : applied ? 'Applied' : 'Apply'}
              </button>
           </div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl p-5 border border-amber-100 dark:border-amber-900/30 flex gap-4">
           <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
              <Zap size={18} />
           </div>
           <div>
              <h4 className="text-[11px] font-black uppercase tracking-tight text-amber-700 dark:text-amber-400 mb-1">Futuristic Checkout</h4>
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-500/80 leading-relaxed">
                Syncing to your wristband allows you to leave your phone behind. Just scan and enjoy.
              </p>
           </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)] to-transparent max-w-lg mx-auto">
        <button 
          onClick={handleConfirm}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] py-5 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-2xl shadow-slate-900/20"
        >
          {paymentMethod === 'wristband' ? <Fingerprint size={18} /> : 
           paymentMethod === 'crypto' ? <Coins size={18} /> : 
           paymentMethod === 'mercado' ? <Smartphone size={18} /> : 
           <CreditCard size={18} />}
          {paymentMethod === 'wristband' ? 'Sync & Confirm' : 
           paymentMethod === 'mercado' ? 'Pay with Mercado Pago' : 
           t('confirm_payment')}
        </button>
      </div>
    </div>
  );
}
