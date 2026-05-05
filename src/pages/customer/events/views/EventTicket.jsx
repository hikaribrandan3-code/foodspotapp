import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, X, MapPin, Calendar, Ticket, CheckCircle2, FileText } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function EventTicket({ booking, onClose }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const ticketRef = useRef(null);

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
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Ticket_${booking.event_name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

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

      <main className="flex-1 px-8 py-4 flex flex-col items-center">
        <motion.div
          ref={ticketRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl shadow-slate-900/5 relative flex flex-col items-center overflow-hidden border border-[var(--border-color)]"
        >
          {/* Ticket Flyer / Header Decor */}
          <div className="relative w-full h-28">
            <img
              src={booking.image}
              alt={booking.event_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent"></div>
          </div>

          <div className="pt-3 pb-4 px-6 text-center">
             <div className="w-full bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 mb-3">
               <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                 <CheckCircle2 size={14} />
               </div>
               <div className="text-left">
                  <h4 className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400">Magic Link Sent</h4>
                  <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500/70">Sent to {booking.email || 'your email'}</p>
               </div>
             </div>

             <h2 className="text-lg font-black text-[var(--text-primary)] leading-tight mb-1">
               {booking.event_name}
             </h2>
             <div className="flex items-center justify-center gap-3 text-[var(--text-secondary)] font-bold text-[9px] opacity-70 mb-1.5">
                <span className="flex items-center gap-1"><Calendar size={9} /> {booking.date}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin size={9} /> {booking.venue_name}</span>
             </div>

             {booking.description && (
               <p className="text-[9px] text-[var(--text-secondary)] italic leading-relaxed px-4 opacity-75">
                 "{booking.description}"
               </p>
             )}
          </div>

          {/* Perforation Line with Stub Cutouts */}
          <div className="w-full relative flex items-center justify-center bg-white dark:bg-slate-900 py-1.5">
             {/* Left Cutout */}
             <div className="absolute -left-4 w-7 h-7 rounded-full bg-[var(--canvas-bg)] border border-[var(--border-color)]"></div>
             <div className="w-full border-t border-dashed border-[var(--border-color)] mx-4 opacity-50"></div>
             {/* Right Cutout */}
             <div className="absolute -right-4 w-7 h-7 rounded-full bg-[var(--canvas-bg)] border border-[var(--border-color)]"></div>
          </div>

          <div className="p-4 flex flex-col items-center gap-4">
             <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-50">
                <QRCodeSVG
                   value={booking.id}
                   size={140}
                   level="H"
                   includeMargin={false}
                   fgColor="#0f172a"
                />
             </div>

             <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">
                  {t('ticket_id')}
                </p>
                <p className="text-[10px] font-black tracking-widest text-[var(--text-primary)]">
                  {booking.id}
                </p>
             </div>

             {booking.category === 'Festivals' && (
               <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-dashed border-[var(--border-color)] flex flex-col items-center gap-1.5">
                 <div className="flex items-center gap-1.5">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Site Map Ready</span>
                 </div>
                 <button className="text-[9px] font-black text-[var(--color-primary)] underline underline-offset-4 decoration-2">
                   Open Grounds Map
                 </button>
               </div>
             )}

             <div className="grid grid-cols-2 gap-6 w-full border-t border-[var(--border-color)] pt-4 mt-0">
                <div>
                   <p className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-0.5">{t('tier')}</p>
                   <p className="text-[9px] font-black text-[var(--text-primary)] uppercase">{booking.tier_name}</p>
                </div>
                <div className="text-right">
                   <p className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-0.5">{t('quantity')}</p>
                   <p className="text-[9px] font-black text-[var(--text-primary)]">{booking.quantity}x Tickets</p>
                </div>
             </div>
          </div>
        </motion.div>

        <div className="w-full grid grid-cols-2 gap-2 mt-4 pb-10">
          <button
            onClick={handleDownloadPDF}
            className="col-span-2 bg-[var(--color-primary)] text-white rounded-[20px] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--color-primary)]/10"
          >
            <FileText size={16} /> {t('download_pdf_ticket')}
          </button>

          <button className="bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[20px] py-3 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all">
             <div className="text-[var(--color-primary)]">
                <Calendar size={16} />
             </div>
             <span className="text-[8px] font-black uppercase tracking-widest">{t('add_to_calendar')}</span>
          </button>

          <button className="bg-black text-white rounded-[20px] py-3 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all shadow-lg">
             <div className="text-white">
                <Ticket size={16} />
             </div>
             <span className="text-[8px] font-black uppercase tracking-widest">{t('add_to_wallet')}</span>
          </button>

          <button className="col-span-2 bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[20px] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest">
            <Share2 size={16} /> {t('share')}
          </button>
        </div>
      </main>
    </div>
  );
}
