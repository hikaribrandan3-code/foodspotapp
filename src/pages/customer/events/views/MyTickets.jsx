import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Share2, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function MyTickets({ onViewTicket }) {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [showReferral, setShowReferral] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('event_bookings');
    if (raw) {
      try { setBookings(JSON.parse(raw)); } catch { }
    }
  }, []);

  if (bookings.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--surface-bg, #fff)' }}
        >
          <Ticket size={32} className="opacity-20" />
        </motion.div>
        <h2 className="text-xl font-black tracking-tight mb-2">{t('no_tickets') || 'No Tickets Yet'}</h2>
        <p className="text-sm font-medium opacity-40 mb-6">{t('browse_events') || 'Browse events and book your first experience.'}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 pt-14 pb-24">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">{t('my_tickets') || 'My Tickets'}</h1>
        <p className="text-sm font-medium opacity-40">{bookings.length} {t('active_booking') || 'active booking'}{bookings.length !== 1 ? 's' : ''}</p>
      </header>

      <div className="space-y-4">
        {bookings.map((booking, i) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onViewTicket(booking)}
            className="group relative overflow-hidden rounded-[32px] cursor-pointer active:scale-[0.98] transition-transform border"
            style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            <div className="flex gap-4 p-4">
              <img src={booking.image} alt="" className="w-24 h-24 rounded-2xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-black leading-tight truncate">{booking.event_name}</h3>
                    <p className="text-[10px] font-bold opacity-40 mt-1">{booking.venue_name}</p>
                  </div>
                  <ChevronRight size={16} className="opacity-20 shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
                  >
                    {booking.tier_name}
                  </span>
                  <span className="text-xs font-black opacity-50">
                    {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Referral Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-5 rounded-[32px] border cursor-pointer active:scale-[0.98] transition-transform"
        style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
        onClick={() => setShowReferral(!showReferral)}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black">{t('refer_friend') || 'Refer a Friend'}</h4>
            <p className="text-[10px] font-bold opacity-40">{t('earn_credit') || 'Earn $10 credit for each referral'}</p>
          </div>
        </div>
        {showReferral && (
          <div className="mt-3 pt-3 border-t"
            style={{ borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            <div className="flex items-center gap-2 p-3 rounded-2xl border"
              style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
            >
              <code className="text-xs font-mono font-bold flex-1 truncate">FOODSPOT-EVENTS-{Math.random().toString(36).substr(2, 6).toUpperCase()}</code>
              <button className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: 'var(--color-primary, #8B7355)' }}
              >
                {t('copy') || 'Copy'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
