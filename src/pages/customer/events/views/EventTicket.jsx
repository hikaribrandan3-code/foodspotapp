import React, { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Share2, X, MapPin, Calendar, Ticket, CheckCircle2, FileText,
  ChevronLeft, Copy, Check, Mail, MessageCircle, Twitter
} from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { VenueMap } from '../../../../components/VenueMap';

/* ─── Calendar helpers ─── */
function toGCalDate(isoDate, timeStr) {
  const d = new Date(`${isoDate}T${timeStr || '00:00'}`);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGCalUrl(booking) {
  const start = toGCalDate(booking.date, booking.time);
  const s = new Date(`${booking.date}T${booking.time || '00:00'}`);
  const e = new Date(s.getTime() + 4 * 60 * 60 * 1000);
  const end = e.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: booking.event_name,
    dates: `${start}/${end}`,
    location: booking.venue_name || '',
    details: booking.description || 'Foodspot Event',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildICSDataUri(booking) {
  const date = booking.date.replace(/-/g, '');
  const time = (booking.time || '00:00').replace(':', '');
  const dtStart = `${date}T${time}00`;
  const s = new Date(`${booking.date}T${booking.time || '00:00'}`);
  const e = new Date(s.getTime() + 4 * 60 * 60 * 1000);
  const dtEnd = e.toISOString().replace(/[-:]/g, '').slice(0, 15);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Foodspot//Event//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${booking.event_name}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `LOCATION:${booking.venue_name || ''}`,
    `DESCRIPTION:${(booking.description || 'Foodspot Event').replace(/\n/g, '\\n')}`,
    `UID:ticket-${booking.id}@foodspot.app`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}

/* ─── Share helpers ─── */
function buildShareText(booking, url) {
  return `I'm going to ${booking.event_name} on ${booking.date} at ${booking.venue_name}! 🎟️ ${url}`;
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/* ─── Toast ─── */
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
    >
      {message}
    </motion.div>
  );
}

/* ─── Share Sheet Modal ─── */
function ShareSheet({ booking, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = buildShareText(booking, url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: booking.event_name, text, url });
        onClose();
      } catch (err) {
        if (err.name !== 'AbortError') {
          // stay open, let user pick another option
        }
      }
    }
  };

  const links = [
    {
      label: 'Copy Link',
      icon: copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />,
      onClick: copy,
      active: copied,
    },
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={18} className="text-emerald-500" />,
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'),
    },
    {
      label: 'X / Twitter',
      icon: <Twitter size={18} className="text-sky-500" />,
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank'),
    },
    {
      label: 'Email',
      icon: <Mail size={18} className="text-rose-500" />,
      onClick: () => window.open(`mailto:?subject=${encodeURIComponent(`Join me at ${booking.event_name}!`)}&body=${encodeURIComponent(text)}`, '_blank'),
    },
  ];

  if (navigator.share && isMobile()) {
    links.unshift({
      label: 'Native Share',
      icon: <Share2 size={18} className="text-[var(--color-primary)]" />,
      onClick: shareNative,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm flex items-end justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 shadow-2xl"
      >
        <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-6" />
        <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-1">Share Event</h3>
        <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 mb-6">{booking.event_name}</p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={link.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--canvas-bg)] dark:bg-slate-800 border border-[var(--border-color)] active:scale-95 transition-all"
            >
              <div className="text-[var(--text-primary)]">{link.icon}</div>
              <span className={`text-[8px] font-black uppercase tracking-wider ${link.active ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}`}>
                {link.label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-[var(--canvas-bg)] dark:bg-slate-800 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all border border-[var(--border-color)]"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Calendar Sheet Modal ─── */
function CalendarSheet({ booking, onClose }) {
  const gcalUrl = buildGCalUrl(booking);
  const icsUri = buildICSDataUri(booking);

  const options = [
    {
      label: 'Google Calendar',
      sub: 'Opens in new tab',
      onClick: () => window.open(gcalUrl, '_blank'),
    },
    {
      label: 'Apple / Outlook',
      sub: 'Download .ics file',
      onClick: () => {
        window.location.href = icsUri;
        onClose();
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm flex items-end justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 shadow-2xl"
      >
        <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-6" />
        <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-1">Add to Calendar</h3>
        <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 mb-6">{booking.event_name}</p>

        <div className="space-y-3 mb-6">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--canvas-bg)] dark:bg-slate-800 border border-[var(--border-color)] active:scale-[0.98] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-[var(--color-primary)] shadow-sm">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-[9px] font-bold text-[var(--text-secondary)] opacity-50">{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-[var(--canvas-bg)] dark:bg-slate-800 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all border border-[var(--border-color)]"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Ticket Component ─── */
export default function EventTicket({ booking, onClose }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const ticketRef = useRef(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [toast, setToast] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const showToastMsg = useCallback((msg) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 40 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  /* Capture ticket as clean PNG */
  const captureTicket = async (scale = 2) => {
    if (!ticketRef.current) return null;
    const canvas = await html2canvas(ticketRef.current, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    });
    return canvas;
  };

  const handleDownloadTicket = async () => {
    try {
      const canvas = await captureTicket(2);
      const link = document.createElement('a');
      link.download = `Ticket_${booking.event_name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToastMsg('Ticket saved!');
    } catch (error) {
      console.error('Error saving ticket:', error);
      showToastMsg('Failed to save ticket');
    }
  };

  const handleAddToWallet = async () => {
    try {
      const canvas = await captureTicket(2);
      const link = document.createElement('a');
      link.download = `Wallet_Ticket_${booking.event_name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToastMsg('Save the image to your wallet app');
    } catch (error) {
      console.error('Error saving ticket:', error);
      showToastMsg('Failed to save ticket');
    }
  };

  if (!booking) return null;

  return (
    <div className="flex flex-col h-screen bg-[var(--canvas-bg)] overflow-y-auto hide-scrollbar">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

      {/* Share Sheet */}
      <AnimatePresence>
        {shareOpen && <ShareSheet booking={booking} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>

      {/* Calendar Sheet */}
      <AnimatePresence>
        {calendarOpen && <CalendarSheet booking={booking} onClose={() => setCalendarOpen(false)} />}
      </AnimatePresence>

      {/* Venue Map Modal */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-[var(--canvas-bg)] flex flex-col"
          >
            <header className="px-6 pt-12 pb-4 flex items-center gap-4 bg-white dark:bg-slate-950 border-b border-[var(--border-color)]">
              <button
                onClick={() => setShowMap(false)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--canvas-bg)] text-[var(--text-primary)] active:scale-90 transition-all border border-[var(--border-color)]"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">Grounds Map</h1>
                <p className="text-[9px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">{booking.venue_name}</p>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto px-4 py-6">
              <VenueMap selectedZone={selectedZone} onSelectZone={setSelectedZone} />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

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
              <span className="flex items-center gap-1"><Calendar size={9} /> {booking.date}{booking.time ? ` • ${booking.time}` : ''}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin size={9} /> {booking.venue_name}</span>
            </div>

            {booking.description && (
              <p className="text-[9px] text-[var(--text-secondary)] italic leading-relaxed px-4 opacity-75">
                &ldquo;{booking.description}&rdquo;
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
                <button
                  onClick={() => setShowMap(true)}
                  className="text-[9px] font-black text-[var(--color-primary)] underline underline-offset-4 decoration-2 active:opacity-70 transition-opacity"
                >
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
            onClick={handleDownloadTicket}
            className="col-span-2 bg-[var(--color-primary)] text-white rounded-[20px] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest shadow-xl"
          >
            <FileText size={16} /> {t('download_pdf_ticket')}
          </button>

          <button
            onClick={() => setCalendarOpen(true)}
            className="bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[20px] py-3 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all"
          >
            <div className="text-[var(--color-primary)]">
              <Calendar size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{t('add_to_calendar')}</span>
          </button>

          <button
            onClick={handleAddToWallet}
            className="bg-black text-white rounded-[20px] py-3 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all shadow-lg"
          >
            <div className="text-white">
              <Ticket size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{t('add_to_wallet')}</span>
          </button>

          <button
            onClick={() => setShareOpen(true)}
            className="col-span-2 bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] rounded-[20px] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest"
          >
            <Share2 size={16} /> {t('share')}
          </button>
        </div>
      </main>
    </div>
  );
}
