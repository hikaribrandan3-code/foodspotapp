import React, { useState } from 'react';
import { Ticket, Calendar, MapPin, ChevronRight, Sparkles, Award, Users, Copy, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../../../contexts/LanguageContext';
import EventTicket from './EventTicket';

const TicketCard = ({ ticket, isPast = false, onClick }) => {
  return (
    <div
      onClick={!isPast ? onClick : undefined}
      className={`relative overflow-hidden rounded-[32px] border group transition-all cursor-pointer bg-white dark:bg-slate-900 h-28 ${isPast ? 'border-slate-100 dark:border-slate-800 opacity-60 grayscale' : 'border-[var(--border-color)] shadow-sm active:scale-[0.98]'}`}
    >
      <div className="absolute inset-0 z-0">
        <img src={ticket.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className={`absolute inset-0 bg-gradient-to-r ${isPast ? 'from-slate-900/90' : 'from-slate-900/95 via-slate-900/60'} to-transparent`} />
      </div>

      <div className="relative z-10 p-5 flex items-center h-full gap-5">
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-white text-base truncate uppercase tracking-tight mb-1">{ticket.name}</h4>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/70">
              <Calendar size={10} className="text-[var(--color-primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {new Date(ticket.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {!isPast && (
              <div className="flex items-center gap-1.5 text-white/70">
                <MapPin size={10} className="text-[var(--color-primary)]" />
                <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[120px]">{ticket.venue}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isPast ? (
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10 backdrop-blur-sm">Past</span>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg shadow-black/20 group-hover:translate-x-1 transition-transform border border-white/20">
              <ChevronRight size={18} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function MyTickets() {
  const { t } = useLanguage();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [copied, setCopied] = useState(false);

  const savedBookings = JSON.parse(localStorage.getItem('event_bookings') || '[]');
  const upcomingTickets = savedBookings;

  const referralCode = 'FOOD-' + (savedBookings[0]?.id?.split('-')[1] || 'PLAY').substring(0, 4).toUpperCase();
  const referralStats = { friends: 3, credits: 30.00 };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pastTickets = [
    {
      id: 'TKT-OLD',
      name: 'Midnight Market Sessions',
      date: 'April 20, 2026',
      venue: 'The Velvet Lounge',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&h=200&fit=crop'
    }
  ];

  if (selectedBooking) {
    return (
      <EventTicket
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--canvas-bg)]">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          {t('my_tickets')}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 space-y-8 pb-32">
        {/* Referral Dashboard */}
        <section>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="p-5 bg-gradient-to-br from-[var(--color-primary)] to-slate-900 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Award size={14} />
                  <h2 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-90">{t('refer_earn')}</h2>
                </div>
                <p className="text-[13px] font-bold leading-relaxed opacity-95">{t('refer_desc')}</p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1.5">{t('your_code')}</p>
                  <div
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-[var(--border-color)] group active:scale-[0.98] transition-all cursor-pointer"
                    onClick={handleCopy}
                  >
                    <span className="font-black tracking-widest text-[var(--text-primary)] text-sm">{referralCode}</span>
                    {copied ? (
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <span className="text-[8px] font-black uppercase">{t('code_copied')}</span>
                        <CheckCircle2 size={14} />
                      </div>
                    ) : (
                      <Copy size={14} className="text-[var(--text-secondary)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Users size={10} className="text-[var(--color-primary)]" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">{t('friends_referred')}</p>
                  </div>
                  <p className="text-base font-black text-[var(--text-primary)]">{referralStats.friends}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Award size={10} className="text-amber-500" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">{t('credits_earned')}</p>
                  </div>
                  <p className="text-base font-black text-[var(--text-primary)]">${referralStats.credits.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('upcoming')}</h3>
            <span className="text-[10px] font-black text-[var(--color-primary)]">{upcomingTickets.length} active</span>
          </div>
          {upcomingTickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={{ ...ticket, name: ticket.event_name, venue: ticket.venue_name }}
              onClick={() => setSelectedBooking(ticket)}
            />
          ))}
          {upcomingTickets.length === 0 && (
            <div className="text-center py-8 text-[var(--text-secondary)] opacity-50">
              <Ticket size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-[11px] font-black uppercase tracking-widest">No upcoming tickets</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('past')}</h3>
          </div>
          {pastTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} isPast />
          ))}
        </div>

        {/* Member Rewards */}
        <div className="bg-[var(--color-primary)]/5 rounded-[40px] p-8 border border-[var(--color-primary)]/10 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-[24px] bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mx-auto mb-4">
              <Sparkles size={28} />
            </div>
            <h4 className="text-lg font-black text-[var(--text-primary)] mb-2">{t('member_rewards')}</h4>
            <p className="text-sm font-medium text-[var(--text-secondary)] opacity-70 leading-relaxed mb-6">
              Attend 3 more events to unlock your exclusive VIP collector badge.
            </p>
            <button className="bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm">
              {t('view_badges')}
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
      </main>
    </div>
  );
}
