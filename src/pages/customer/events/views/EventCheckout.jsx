import React, { useState } from 'react';
import { ChevronLeft, CreditCard, MessageCircle, Ticket, Ban } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useTenant } from '../../../../contexts/TenantContext';
import { supabase } from '../../../../lib/supabaseClient';

export default function EventCheckout({ event, tier, onConfirm, onBack }) {
  const { t } = useLanguage();
  const { tenantData } = useTenant();
  const tenantSlug = tenantData?.slug;
  const [qty, setQty] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState(null);
  const [email, setEmail] = useState('');

  // Calculate max available quantity
  const maxQty = Math.max(1, (tier.qty || 0) - (tier.sold || 0));

  if (!event || !tier) return null;

  const isExpired = new Date(event.date) < new Date();
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
          customer: { name: '', email: '', phone: '' },
          promo_code: promoCode.trim() || null
        }
      });

      if (error || data?.error) {
        if (data?.error === 'INVALID_PROMO') {
          setPromoError(t('invalid_promo'));
          setIsProcessing(false);
          return;
        }
        console.error('Claim error:', error || data?.error);
        setPaymentError('Failed to claim ticket. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (data.free_order) {
        // Save server-issued guest token so RLS headers match the DB record
        if (data.guest_token) {
          localStorage.setItem(tenantSlug ? `fs_guest_token_${tenantSlug}` : 'fs_guest_token', data.guest_token);
        }
        const booking = {
          id: data.ticket_code,
          ticket_code: data.ticket_code,
          order_id: data.order_id,
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
        };
        const existing = JSON.parse(localStorage.getItem('event_bookings') || '[]');
        localStorage.setItem('event_bookings', JSON.stringify([booking, ...existing].slice(0, 20)));
        onConfirm(booking);
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
    if (!email.trim()) {
      setPaymentError('Please enter your email');
      return;
    }
    setIsProcessing(true);
    setPaymentError(null);

    try {
      console.log('[EventCheckout] About to call create-event-preference for event:', event.id, 'tier:', tier.id);
      const { data, error } = await supabase.functions.invoke('create-event-preference', {
        body: {
          event_id: event.id,
          tier_id: tier.id,
          quantity: qty,
          customer: { name: '', email: email.trim(), phone: '' },
          promo_code: promoCode.trim() || null
        }
      });

      if (error || data?.error) {
        if (data?.error === 'INVALID_PROMO') {
          setPromoError(t('invalid_promo'));
          setIsProcessing(false);
          return;
        }
        console.error('Checkout error:', error || data?.error);
        let errorMsg = 'Payment processing failed. ';

        if (data?.error === 'MP_ERROR') {
          errorMsg += 'Unable to connect with Mercado Pago. Please try again.';
        } else if (data?.error === 'SOLD_OUT') {
          errorMsg += 'This tier is now sold out. Please choose another.';
        } else if (data?.error === 'INSUFFICIENT_CAPACITY') {
          errorMsg += `Not enough tickets available. ${data?.detail || ''}`;
        } else {
          errorMsg += data?.error?.detail || error?.message || 'Please try again.';
        }

        setPaymentError(errorMsg);
        setIsProcessing(false);
        return;
      }

      console.log('[EventCheckout] Edge function response:', { order_id: data.order_id, guest_token: data.guest_token, ticket_code: data.ticket_code, init_point: data.init_point });

      // Store guest token and order ID for reference
      if (data.guest_token) {
        localStorage.setItem(tenantSlug ? `fs_guest_token_${tenantSlug}` : 'fs_guest_token', data.guest_token);
      }
      if (data.order_id) {
        localStorage.setItem('event_pending_order_id', data.order_id);
      }

      // Free event — no MP redirect needed
      if (data.free_order) {
        const booking = {
          id: data.ticket_code,
          ticket_code: data.ticket_code,
          order_id: data.order_id,
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
        };
        const existing = JSON.parse(localStorage.getItem('event_bookings') || '[]');
        localStorage.setItem('event_bookings', JSON.stringify([booking, ...existing].slice(0, 20)));
        onConfirm(booking);
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

  if (isExpired) {
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
        <main className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {/* Greyed out event card */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-[32px] border border-[var(--border-color)] overflow-hidden shadow-sm opacity-50">
            <div className="relative h-32 w-full">
              <img src={event.image && !event.image.startsWith('blob:') ? `${event.image}${event.image.includes('?') ? '&' : '?'}w=600&q=75&format=webp` : event.image} alt={event.name} loading="lazy" className="w-full h-full object-cover grayscale" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6">
                <h3 className="font-black text-lg text-white leading-tight">{event.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-0.5">{tier.name}</p>
              </div>
            </div>
          </div>
          {/* Event ended message */}
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-500">
              <Ban size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest mb-3">
                Event Ended
              </div>
              <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">This event has ended</h2>
              <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60 leading-relaxed">
                No tickets are available for this event anymore. Check out upcoming events.
              </p>
            </div>
            <button
              onClick={onBack}
              className="mt-2 px-8 py-3 rounded-2xl bg-[var(--canvas-bg)] border border-[var(--border-color)] text-[var(--text-primary)] font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Back to Events
            </button>
          </div>
        </main>
      </div>
    );
  }

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
            <img src={event.image && !event.image.startsWith('blob:') ? `${event.image}${event.image.includes('?') ? '&' : '?'}w=600&q=75&format=webp` : event.image} alt={event.name} fetchPriority="high" loading="eager" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/40 dark:via-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div>
                <h3 className="font-black text-lg text-white leading-tight">{event.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-0.5">{tier.name}</p>
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

             {/* Promo Code */}
             <div className="flex items-center gap-2">
               <input
                 type="text"
                 value={promoCode}
                 onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                 placeholder={t('enter_promo')}
                 maxLength={20}
                 className="flex-1 bg-[var(--canvas-bg)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[var(--text-primary)] placeholder:opacity-30 placeholder:normal-case placeholder:tracking-normal outline-none focus:border-[var(--color-primary)] transition-colors"
               />
               {promoCode && (
                 <button
                   onClick={() => { setPromoCode(''); setPromoError(null); }}
                   className="text-[var(--text-secondary)] opacity-40 hover:opacity-70 text-xs font-black transition-opacity px-1"
                 >✕</button>
               )}
             </div>
             {promoError && (
               <p className="text-xs font-bold text-red-500 -mt-1">{promoError}</p>
             )}

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
        <div className="fixed bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)] to-transparent max-w-lg mx-auto space-y-3">
          {paymentError && (
            <div className="mb-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{paymentError}</p>
            </div>
          )}
          {/* Email Input */}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full bg-[var(--canvas-bg)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] placeholder:opacity-30 outline-none focus:border-[var(--color-primary)] transition-colors"
          />
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
                const msg = `I want to confirm ${qty} ticket${qty > 1 ? 's' : ''} for ${event.name} - ${tier.name}. Total: $${total.toFixed(2)}${promoCode.trim() ? ` (Promo: ${promoCode.trim()})` : ''}`;
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
