import React, { useState } from 'react';
import { ChevronLeft, CreditCard, MessageCircle, Ticket } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useTenant } from '../../../../contexts/TenantContext';
import { supabase } from '../../../../lib/supabaseClient';

export default function EventCheckout({ event, tier, onConfirm, onBack }) {
  const { t } = useLanguage();
  const { tenantData } = useTenant();
  const [email, setEmail] = useState('');
  const [qty, setQty] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [promoError, setPromoError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Calculate max available quantity
  const maxQty = Math.max(1, (tier.qty || 0) - (tier.sold || 0));

  if (!event || !tier) return null;

  const total = tier.price * qty;
  const isFreeTicket = tier.price === 0;

  const handleClaimFreeTicket = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-event-preference', {
        body: {
          event_id: event.id,
          tier_id: tier.id,
          quantity: qty,
          customer: { name: '', email: email || '', phone: '' },
          promo_code: applied ? promoCode : null
        }
      });

      if (error || data?.error) {
        console.error('Claim error:', error || data?.error);
        setPaymentError('Failed to claim ticket. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (data.free_order) {
        onConfirm({
          id: data.ticket_code,
          email,
          event_id: event.id,
          event_name: event.name,
          tier_name: tier.name,
          tier_id: tier.id,
          quantity: qty,
          total: 0,
          purchase_date: new Date().toISOString(),
          venue_name: event.venue_name,
          date: event.date,
          image: event.image,
          description: event.description,
          category: event.category,
          payment_method: 'free',
          guest_token: data.guest_token
        });
      }
    } catch (err) {
      console.error('Claim exception:', err);
      setPaymentError('Network error. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-event-preference', {
        body: {
          event_id: event.id,
          tier_id: tier.id,
          quantity: qty,
          customer: { name: '', email: email || '', phone: '' },
          promo_code: applied ? promoCode : null
        }
      });

      if (error || data?.error) {
        console.error('Checkout error:', error || data?.error);
        const errorMsg = data?.error?.detail || error?.message || 'Payment failed. Please try again.';
        setPaymentError(errorMsg);
        setIsProcessing(false);
        return;
      }

      // Store guest token and order ID for reference
      if (data.guest_token) {
        localStorage.setItem('event_guest_token', data.guest_token);
      }
      if (data.order_id) {
        localStorage.setItem('event_pending_order_id', data.order_id);
      }

      // Free event — no MP redirect needed
      if (data.free_order) {
        onConfirm({
          id: data.ticket_code,
          email,
          event_id: event.id,
          event_name: event.name,
          tier_name: tier.name,
          tier_id: tier.id,
          quantity: qty,
          total: total,
          purchase_date: new Date().toISOString(),
          venue_name: event.venue_name,
          date: event.date,
          image: event.image,
          description: event.description,
          category: event.category,
          payment_method: 'free',
          guest_token: data.guest_token
        });
        return;
      }

      // Mercado Pago — redirect to payment
      if (data.init_point) {
        window.location.href = data.init_point;
        return;
      }

      setPaymentError('Unexpected response from payment server.');
    } catch (err) {
      console.error('Checkout exception:', err);
      setPaymentError('Network error. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentOptions = [
    { id: 'card', name: 'Credit Card', icon: <CreditCard size={16} />, color: 'slate' }
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
              {maxQty <= 3 && maxQty > 0 && (
                <div className="bg-orange-500/90 px-3 py-1 rounded-full">
                  <span className="text-[10px] font-black text-white">Only {maxQty} left!</span>
                </div>
              )}
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
                    onClick={() => setQty(Math.min(qty + 1, maxQty))}
                    disabled={qty >= maxQty}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-[var(--text-primary)] font-black active:scale-90 transition-all border border-[var(--border-color)] shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
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
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 px-2">{t('email_label') || 'Email (Optional)'}</h3>
           <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-[24px] border border-[var(--border-color)] transition-all shadow-sm">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email_placeholder') || 'your@email.com'}
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
                onClick={async () => {
                  if (!promoCode.trim()) return;
                  setIsApplying(true);
                  setPromoError(null);
                  try {
                    // Validation happens server-side in create-event-preference
                    // For now, mark as applied; edge function will reject if invalid
                    const isReferral = promoCode.toUpperCase().startsWith('FOOD-') || promoCode.toUpperCase().startsWith('REF-');
                    if (isReferral) setPromoCode(promoCode.toUpperCase());
                    setApplied(true);
                  } catch (err) {
                    console.error('Promo error:', err);
                    setPromoError(err.message || 'Invalid code');
                  } finally {
                    setIsApplying(false);
                  }
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
           {promoError && (
             <p className="text-[10px] font-bold text-rose-500 px-2 mt-1">{promoError}</p>
           )}
        </div>

        {/* Free Ticket Claim */}
        {isFreeTicket && (
          <div>
            <button
              onClick={handleClaimFreeTicket}
              disabled={isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-[24px] py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ticket size={18} />
              {isProcessing ? 'Claiming...' : 'Claim Ticket'}
            </button>
          </div>
        )}

      </main>

      {!isFreeTicket && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)] to-transparent max-w-lg mx-auto space-y-3">
          {paymentError && (
            <div className="mb-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{paymentError}</p>
            </div>
          )}
          {/* Primary: Mercado Pago */}
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full bg-[#009EE3] hover:bg-[#0082C3] text-white rounded-[24px] py-5 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <CreditCard size={18} />
                Pay with Mercado Pago
              </>
            )}
          </button>
          {/* Secondary: WhatsApp (only if enabled for this business) */}
          {tenantData?.app_config?.payment_methods?.whatsapp && (
            <button
              onClick={() => {
                const whatsappNumber = tenantData?.whatsapp_number || tenantData?.app_config?.businessInfo?.whatsapp || tenantData?.phone || '';
                if (!whatsappNumber) { setPaymentError('WhatsApp number not configured'); return; }
                const msg = `I want to confirm ${qty} ticket${qty > 1 ? 's' : ''} for ${event.name} - ${tier.name}. Total: $${total.toFixed(2)}${applied ? ` (Promo: ${promoCode})` : ''}`;
                window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-[24px] py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-green-500/20"
            >
              <MessageCircle size={18} />
              Checkout via WhatsApp
            </button>
          )}
        </div>
      )}
    </div>
  );
}
