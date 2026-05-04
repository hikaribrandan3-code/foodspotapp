import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, X, MapPin, Calendar, Ticket, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
// import { motion } from 'motion/react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function EventTicket({ booking, onClose }) {
  const { t } = useLanguage();

  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      // since particles fall down, start them a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!booking) return null;

  return (
    <div className="flex flex-col h-screen bg-[var(--canvas-bg)] overflow-y-auto hide-scrollbar">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-white dark:bg-slate-950 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"
          >
            <CheckCircle2 size={22} />
          </motion.div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
              {t('booking_confirmed')}
            </h1>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">{t('my_tickets')}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--canvas-bg)] text-[var(--text-primary)] active:scale-90 transition-all border border-[var(--border-color)]"
        >
          <X size={20} />
        </button>
      </header>

      <main className="flex-1 px-8 py-10 flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl shadow-slate-900/5 relative flex flex-col items-center overflow-hidden border border-[var(--border-color)]"
        >
          {/* Ticket Flyer / Header Decor */}
          <div className="relative w-full h-40">
            <img 
              src={booking.image} 
              alt={booking.event_name} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent"></div>
            <div className="absolute top-0 left-0 w-full h-1 flex gap-1">
               {[...Array(20)].map((_, i) => (
                  <div key={i} className="flex-1 bg-white/20 h-full"></div>
               ))}
            </div>
          </div>

          <div className="pt-6 pb-8 px-6 text-center">
             <h2 className="text-2xl font-black text-[var(--text-primary)] leading-tight mb-2">
               {booking.event_name}
             </h2>
             <div className="flex items-center justify-center gap-3 text-[var(--text-secondary)] font-bold text-xs opacity-70">
                <span className="flex items-center gap-1"><Calendar size={12} /> {booking.date}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {booking.venue_name}</span>
             </div>
          </div>

          {/* Perforation Line with Stub Cutouts */}
          <div className="w-full relative flex items-center justify-center bg-white dark:bg-slate-900 py-4">
             {/* Left Cutout */}
             <div className="absolute -left-4 w-8 h-8 rounded-full bg-[var(--canvas-bg)] border border-[var(--border-color)]"></div>
             
             <div className="w-full border-t border-dashed border-[var(--border-color)] mx-4 opacity-50"></div>
             
             {/* Right Cutout */}
             <div className="absolute -right-4 w-8 h-8 rounded-full bg-[var(--canvas-bg)] border border-[var(--border-color)]"></div>
          </div>

          <div className="p-10 flex flex-col items-center gap-8">
             <div className="p-6 bg-white rounded-3xl shadow-inner border border-slate-100">
                <QRCodeSVG 
                  value={booking.id}
                  size={180}
                  level="H"
                  includeMargin={false}
                  fgColor="#0f172a"
                />
             </div>

             <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 mb-1">
                  {t('ticket_id')}
                </p>
                <p className="text-sm font-black tracking-widest text-[var(--text-primary)]">
                  {booking.id}
                </p>
             </div>

             <div className="grid grid-cols-2 gap-12 w-full border-t border-[var(--border-color)] pt-8 mt-2">
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">{t('tier')}</p>
                   <p className="text-xs font-black text-[var(--text-primary)] uppercase">{booking.tier_name}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">{t('quantity')}</p>
                   <p className="text-xs font-black text-[var(--text-primary)]">{booking.quantity}x Tickets</p>
                </div>
             </div>
          </div>
        </motion.div>

        <div className="w-full grid grid-cols-2 gap-3 mt-10 pb-10">
          <button className="col-span-2 bg-[var(--color-primary)] text-white rounded-[24px] py-5 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--color-primary)]/10">
            <Download size={18} /> {t('save_photos')}
          </button>
          
          <button className="bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[24px] py-4 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all">
             <div className="text-[var(--color-primary)] mb-1">
                <Calendar size={20} />
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest">{t('add_to_calendar')}</span>
          </button>

          <button className="bg-black text-white rounded-[24px] py-4 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-lg">
             <div className="text-white mb-1">
                <Ticket size={20} />
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest">{t('add_to_wallet')}</span>
          </button>

          <button className="col-span-2 bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[24px] py-5 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest mt-2">
            <Share2 size={18} /> {t('share')}
          </button>
        </div>
      </main>
    </div>
  );
}
