import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Lock, User, Mail, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function EventCheckout({ event, tier, onPurchase, onBack }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const booking = {
      id: 'BK-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      event_id: event.id,
      event_name: event.name,
      venue_name: event.location,
      tier_id: tier.id,
      tier_name: tier.name,
      price: tier.price,
      date: event.date,
      time: event.time,
      image: event.image,
      customer: form,
      purchased_at: new Date().toISOString()
    };
    setSubmitted(true);
    setTimeout(() => onPurchase(booking), 600);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <h2 className="text-2xl font-black tracking-tight mb-2">{t('purchase_success') || 'Booking Confirmed!'}</h2>
        <p className="text-sm font-medium opacity-50 mb-8">{t('check_email') || 'Check your email for the ticket.'}</p>
      </motion.div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-6 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: 'var(--surface-bg, #fff)', color: 'var(--canvas-text, #000)' }}
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black">{t('checkout') || 'Checkout'}</h1>
      </header>

      <div className="px-6 pb-24 space-y-6">
        {/* Order Summary */}
        <div className="p-5 rounded-[32px] border space-y-4"
          style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
        >
          <div className="flex gap-4">
            <img src={event.image} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            <div className="flex-1">
              <h3 className="text-sm font-black leading-tight mb-1">{event.name}</h3>
              <p className="text-[10px] font-bold opacity-40">{tier.name}</p>
            </div>
          </div>
          <div className="pt-3 border-t flex justify-between items-center"
            style={{ borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            <span className="text-xs font-black uppercase tracking-wider opacity-50">{t('total') || 'Total'}</span>
            <span className="text-2xl font-black" style={{ color: 'var(--color-primary, #8B7355)' }}>${tier.price}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('full_name') || 'Full Name'}</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full pl-11 pr-4 py-4 rounded-[24px] border text-sm font-bold outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--surface-bg, #fff)',
                  borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))',
                  color: 'var(--canvas-text, #000)',
                  '--tw-ring-color': 'var(--color-primary, #8B7355)'
                }}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('email') || 'Email'}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full pl-11 pr-4 py-4 rounded-[24px] border text-sm font-bold outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--surface-bg, #fff)',
                  borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))',
                  color: 'var(--canvas-text, #000)'
                }}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="p-5 rounded-[24px] border space-y-3"
            style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock size={14} className="opacity-30" />
              <span className="text-[10px] font-black uppercase tracking-wider opacity-40">{t('secure_payment') || 'Secure Payment'}</span>
            </div>
            <p className="text-[10px] font-bold opacity-30 leading-relaxed">
              {t('payment_processed_securely') || 'Your payment is processed securely. We do not store your card details.'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-[24px] text-sm font-black uppercase tracking-widest text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--color-primary, #8B7355)' }}
          >
            <CreditCard size={18} />
            {t('pay_now') || 'Pay'} ${tier.price}
          </button>
        </form>
      </div>
    </div>
  );
}
