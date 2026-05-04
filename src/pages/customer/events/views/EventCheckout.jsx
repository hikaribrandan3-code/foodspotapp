import React, { useState } from 'react';
import { ChevronLeft, Ticket, CreditCard, Info } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function EventCheckout({ event, tier, onConfirm, onBack }) {
  const { t } = useLanguage();
  const [qty, setQty] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!event || !tier) return null;

  const total = tier.price * qty;

  const handleConfirm = () => {
    // TODO: call supabase.functions.invoke('create-preference-event')
    onConfirm({
      id: 'TKT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      event_id: event.id,
      event_name: event.name,
      tier_name: tier.name,
      tier_id: tier.id,
      quantity: qty,
      total: total,
      purchase_date: new Date().toISOString(),
      venue_name: event.venue_name,
      date: event.date,
      image: event.image
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--canvas-bg)]">
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

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6 flex flex-col">
        {/* Immersive Event Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-[var(--border-color)] overflow-hidden shadow-sm flex flex-col">
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

        <div className="space-y-3">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">Promo Code</h3>
             {applied && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Code Applied!</span>}
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
                    setIsApplying(false);
                    setApplied(true);
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

        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl p-5 border border-emerald-100 dark:border-emerald-900/30 flex gap-4">
           <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
              <Info size={18} />
           </div>
           <div>
              <h4 className="text-[11px] font-black uppercase tracking-tight text-emerald-700 dark:text-emerald-400 mb-1">Mercado Pago Integration</h4>
              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500/80 leading-relaxed">
                {t('mp_todo')}
              </p>
           </div>
        </div>

        <div className="mt-auto pb-4">
          <button 
            onClick={handleConfirm}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] py-5 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
          >
            <CreditCard size={18} />
            {t('confirm_payment')}
          </button>
        </div>
      </main>
    </div>
  );
}
