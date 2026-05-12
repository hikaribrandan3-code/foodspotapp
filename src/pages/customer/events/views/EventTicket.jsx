import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, X, MapPin, Calendar, Ticket, CheckCircle2, FileText, Fingerprint, Zap, Scan } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../../../../lib/supabaseClient';
import TicketScanner from '../../../../components/TicketScanner';
import TicketCodeSlotMachine from '../../../../components/events/TicketCodeSlotMachine';

export default function EventTicket({ booking, onClose }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const ticketRef = useRef(null);
  const [activeTab, setActiveTab] = React.useState('ticket'); // 'ticket' or 'vouchers'
  const [showScanner, setShowScanner] = React.useState(false);
  const [slotRevealed, setSlotRevealed] = React.useState(false);
  const [isCheckedIn, setIsCheckedIn] = React.useState(false);

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

  // Reveal slot-machine code after 3s
  useEffect(() => {
    const revealTimer = setTimeout(() => {
      setSlotRevealed(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6', '#F59E0B'] });
    }, 3000);

    return () => clearTimeout(revealTimer);
  }, []);

  // Check if ticket has been scanned (checked in)
  useEffect(() => {
    const checkCheckinStatus = async () => {
      if (!booking?.event_id) return;

      // Get the order_id - it's stored in the local booking from MyTickets
      // The booking.id is the ticket_code, we need to find the order by ticket_code
      const { data: order } = await supabase
        .from('event_orders')
        .select('id')
        .eq('ticket_code', booking.id)
        .eq('event_id', booking.event_id)
        .maybeSingle();

      if (!order) return;

      // Now check if this order has been checked in
      const { data: checkin } = await supabase
        .from('event_checkins')
        .select('id')
        .eq('order_id', order.id)
        .eq('event_id', booking.event_id)
        .maybeSingle();

      if (checkin) {
        setIsCheckedIn(true);
      }
    };

    checkCheckinStatus();
  }, [booking]);

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

  const handleAddToCalendar = () => {
    const eventDate = new Date(booking.date);
    const [year, month, day] = booking.date.split('-');
    const startDate = `${year}${month}${day}`;

    // Google Calendar link
    const title = `${booking.event_name} - ${booking.tier_name}`;
    const description = `Ticket Code: ${booking.ticket_code}`;
    const location = booking.venue_name;
    const gcalUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(title)}&dates=${startDate}/${startDate}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    window.open(gcalUrl, '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: booking.event_name,
      text: `I have a ticket for ${booking.event_name} on ${booking.date}. Code: ${booking.ticket_code}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share error:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    }
  };

  if (!booking) return null;

  if (showScanner) {
    return <TicketScanner onClose={() => setShowScanner(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--canvas-bg)] overflow-y-auto hide-scrollbar">
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

      {/* Tab Switcher - Only shows if there are addons */}
      {booking.addons && booking.addons.length > 0 && (
        <div className="px-8 pt-4">
          <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl flex items-center gap-1 border border-[var(--border-color)]">
            <button 
              onClick={() => setActiveTab('ticket')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'ticket' 
                ? 'bg-white dark:bg-slate-800 text-[var(--color-primary)] shadow-sm' 
                : 'text-[var(--text-secondary)] opacity-50'
              }`}
            >
              {t('entry_ticket') || 'Entry Ticket'}
            </button>
            <button 
              onClick={() => setActiveTab('vouchers')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'vouchers' 
                ? 'bg-white dark:bg-slate-800 text-[var(--color-primary)] shadow-sm' 
                : 'text-[var(--text-secondary)] opacity-50'
              }`}
            >
              {t('vouchers') || 'Vouchers'}
              <span className="bg-[var(--color-primary)] text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                {booking.addons.length}
              </span>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-8 py-4 flex flex-col items-center">
        {activeTab === 'ticket' ? (
          <motion.div 
            key="ticket-view"
            ref={ticketRef}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
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
              
              {/* Futuristic Sync Badge */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                {isCheckedIn && (
                  <span className="bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                    <CheckCircle2 size={8} /> Scanned & Entered
                  </span>
                )}
                {booking.payment_method === 'wristband' && (
                  <span className="bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                    <Fingerprint size={8} /> Synced to Wristband
                  </span>
                )}
                {!isCheckedIn && (
                  <span className="bg-slate-900/40 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 border border-white/20">
                    <Zap size={8} className="text-amber-400" /> Instant Entry
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 pb-4 px-6 text-center">
               <div className="w-full bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 mb-3 text-left">
                 <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                   <CheckCircle2 size={14} />
                 </div>
                 {/* Email hidden for launch cleanup */}
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
               <TicketCodeSlotMachine
                 ticketCode={booking.ticket_code}
                 revealed={slotRevealed}
               />

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

               <div className="grid grid-cols-2 gap-6 w-full border-t border-[var(--border-color)] pt-4 mt-0 pb-2">
                  <div>
                     <p className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-0.5">{t('tier') || 'Tier'}</p>
                     <p className="text-[9px] font-black text-[var(--text-primary)] uppercase">{booking.tier_name}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-0.5">{t('quantity') || 'Qty'}</p>
                     <p className="text-[9px] font-black text-[var(--text-primary)]">{booking.quantity}x Tickets</p>
                  </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <div className="w-full space-y-4 pb-12">
            {booking.addons.map((addon, index) => (
              <motion.div 
                key={addon.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-full bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-[var(--border-color)] shadow-sm flex flex-col"
              >
                <div className="p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      {addon.icon}
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)]">{addon.name}</h3>
                      <p className="text-[8px] font-bold text-[var(--color-primary)] uppercase tracking-widest">Digital Voucher</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.2em] mb-0.5">Value</p>
                    <p className="text-sm font-black text-[var(--text-primary)]">${addon.price}</p>
                  </div>
                </div>

                <div className="p-6 flex flex-col items-center gap-5">
                   <div className="p-4 bg-white rounded-xl shadow-md border border-slate-100">
                      <QRCodeSVG 
                         value={`${booking.id}-addon-${addon.id}`}
                         size={120}
                         level="H"
                         includeMargin={false}
                         fgColor="#0f172a"
                      />
                   </div>
                   
                   <div className="text-center">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 mb-1">Voucher Security Code</p>
                      <p className="text-[10px] font-mono font-bold tracking-widest text-[var(--text-secondary)]">VCH-{booking.id.split('-')[1]}-{addon.id.toUpperCase()}</p>
                   </div>
                   
                   <div className="w-full bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">Present this QR at any participating stand to redeem your {addon.name.toLowerCase()}.</p>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-2 mt-4 pb-10">
          <button
            onClick={handleDownloadPDF}
            className="col-span-2 bg-[var(--color-primary)] text-white rounded-[20px] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--color-primary)]/10"
          >
            <FileText size={16} /> {t('download_pdf_ticket') || 'Download PDF'}
          </button>

          <button
            onClick={handleAddToCalendar}
            className="bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[20px] py-3 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
          >
             <div className="text-[var(--color-primary)]">
                <Calendar size={16} />
             </div>
             <span className="text-[8px] font-black uppercase tracking-widest">{t('add_to_calendar') || 'Add to Calendar'}</span>
          </button>

          <button
            onClick={handleShare}
            className="col-span-2 bg-emerald-500 text-white rounded-[20px] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-600"
          >
            <Share2 size={16} /> {t('share') || 'Share on Social'}
          </button>
        </div>
      </main>
    </div>
  );
}
