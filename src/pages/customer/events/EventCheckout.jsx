import { ArrowLeft, CreditCard, Lock, Smile, Tag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { eventTranslations } from '../../../lib/eventTranslations.js';
import { FoodspotFooter } from '../../../components/events/FoodspotFooter.jsx';

export default function EventCheckout({ event, ticketQuantities, onBack, onComplete }) {
  const { lang } = useLanguage();
  const t = (key) => eventTranslations[key][lang] || key;

  const selectedTiers = event.ticket_tiers.filter(tier => ticketQuantities[tier.id] > 0);
  const subtotal = selectedTiers.reduce((acc, tier) => acc + (tier.price * ticketQuantities[tier.id]), 0);

  const [isSuccess, setIsSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [appliedReferral, setAppliedReferral] = useState(false);

  const discountRate = appliedReferral ? 0.025 : 0;
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;

  const totalQty = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);

  const handleApplyReferral = () => {
    if (referralCode.trim().length > 5) {
      setAppliedReferral(true);
    }
  };

  // Trigger confetti when success starts
  useEffect(() => {
    if (isSuccess) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 300 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isSuccess]);

  const handleConfirm = () => {
    setIsSuccess(true);

    // Show animation for 2 seconds before completing
    setTimeout(() => {
      const primaryTier = selectedTiers[0] || event.ticket_tiers[0];
      const mockTicket = {
        id: `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        event_name: event.name,
        venue_name: event.venue_name,
        date: event.start_date,
        tier_name: primaryTier.name,
        image_url: event.image_url,
        qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=FOODSPOT-${Math.random()}`,
        table_number: primaryTier.name.toLowerCase().includes('table') ? `VIP-T${Math.floor(Math.random() * 20) + 1}` : undefined
      };
      onComplete(mockTicket);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-[#faf9ff] dark:bg-slate-950 z-[200] flex flex-col items-center justify-center p-6 text-center transition-colors">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="relative"
        >
          {/* Animated Canvas-style Success Smile */}
          <div className="w-48 h-48 bg-orange-100/50 dark:bg-orange-500/10 rounded-full flex items-center justify-center text-[#ff6b35] mb-10 relative">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            >
              <Smile size={100} strokeWidth={1.5} />
            </motion.div>

            {/* Animated Glow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[#ff6b35] rounded-full blur-3xl -z-10 opacity-20"
            />
          </div>

          <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Boom! You're in.</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
              We've processed your payment. Your tickets are being added to your wallet...
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#faf9ff] dark:bg-slate-950 z-[100] flex flex-col transition-colors duration-300">
      {/* Transactional Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl w-full h-16 flex items-center px-6 justify-between border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-900 dark:text-slate-100" />
        </button>
        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg absolute left-1/2 -translate-x-1/2">Checkout</h1>
        <div className="w-10"></div>
      </header>

      {/* Main Checkout Canvas */}
      <main className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full pb-[140px] overflow-y-auto">
        {/* Order Summary Section */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Order Summary</h2>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-[24px] flex gap-4 items-start shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800">
            <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800">
              <img
                alt={event.name}
                className="w-full h-full object-cover"
                src={event.image_url}
              />
            </div>
            <div className="flex flex-col flex-1 h-24 justify-between py-1">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg line-clamp-1">{event.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTiers.map(tier => (
                    <span
                      key={tier.id}
                      className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[9px] font-bold uppercase tracking-tight"
                    >
                      {tier.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-end justify-between mt-auto">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Qty: {totalQty}</span>
                <span className="font-bold text-xl text-slate-900 dark:text-slate-100">${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method Section */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Payment Method</h2>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 border border-slate-200 dark:border-slate-700">
                <CreditCard size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">•••• 4242</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">Expires 12/25</span>
              </div>
            </div>
            <button className="text-xs font-bold text-emerald-600 hover:underline">Edit</button>
          </div>
        </section>

        {/* Referral Section */}
        <section className="mb-8">
           <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Referral Code</h2>
           <div className="flex gap-3">
              <div className="relative flex-1">
                 <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter friend's code"
                    disabled={appliedReferral}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                 />
                 {appliedReferral && (
                    <button
                       onClick={() => setAppliedReferral(false)}
                       className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
                    >
                       <X size={16} />
                    </button>
                 )}
              </div>
              <button
                 onClick={handleApplyReferral}
                 disabled={appliedReferral || !referralCode.trim()}
                 className={`px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    appliedReferral
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-900 dark:bg-slate-800 text-white'
                 }`}
              >
                 {appliedReferral ? 'Applied' : 'Apply'}
              </button>
           </div>
           {appliedReferral && (
              <motion.p
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-bold text-green-500 mt-2 uppercase tracking-tight flex items-center gap-1"
              >
                <Tag size={12} /> Referral discount applied (2.5% off)
              </motion.p>
           )}
        </section>

        {/* Price Breakdown Section */}
        <section>
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Price Details</h2>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">${subtotal.toFixed(2)}</span>
            </div>
            {appliedReferral && (
               <div className="flex justify-between items-center text-sm text-green-500 font-bold italic">
                  <span>Referral Discount (-2.5%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
               </div>
            )}
            <div className="flex justify-between items-center text-sm text-green-500 font-bold">
              <span>Service Fee</span>
              <span>$0.00 (Free)</span>
            </div>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-800/50"></div>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-widest leading-none uppercase">Total</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Marketing Footer */}
        <div className="pb-8">
           <FoodspotFooter />
        </div>

      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="fixed bottom-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 px-6 py-5 pb-8 z-[110] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] transition-colors">
        <div className="max-w-2xl mx-auto flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">${total.toFixed(2)}</span>
          </div>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 px-4"
          >
            <Lock size={18} fill="currentColor" />
            <span className="whitespace-nowrap uppercase tracking-widest text-xs">Confirm Purchase</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
