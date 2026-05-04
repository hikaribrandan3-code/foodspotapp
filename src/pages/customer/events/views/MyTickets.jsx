import React, { useState } from 'react';
import { Ticket, Calendar, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import EventTicket from './EventTicket';

const TicketCard = ({ ticket, isPast = false, onClick }) => {
  const { t } = useLanguage();
  return (
    <div 
      onClick={!isPast ? onClick : undefined}
      className={`relative overflow-hidden rounded-[32px] border group transition-all cursor-pointer bg-white dark:bg-slate-900 ${isPast ? 'border-slate-100 dark:border-slate-800 opacity-60 grayscale' : 'border-[var(--border-color)] shadow-sm active:scale-[0.98]'}`}
    >
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
         <img src={ticket.image} alt="" className="w-full h-full object-cover blur-xl" />
      </div>

      <div className="relative z-10 p-5 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/20 shadow-lg relative">
          <img src={ticket.image} alt={ticket.name} className="w-full h-full object-cover" />
          {!isPast && (
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live Flyer</span>
             </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-[var(--text-primary)] text-sm truncate uppercase tracking-tight">{ticket.name}</h4>
          <div className="flex flex-col gap-1.5 mt-2">
             <div className="flex items-center gap-2 text-[var(--text-secondary)] opacity-80">
                <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                   <Calendar size={10} className="text-[var(--color-primary)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {new Date(ticket.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
             </div>
             {!isPast && (
               <div className="flex items-center gap-2 text-[var(--text-secondary)] opacity-80">
                  <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                     <MapPin size={10} className="text-[var(--color-primary)]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate">{ticket.venue}</span>
               </div>
             )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           {isPast ? (
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">Past</span>
           ) : (
             <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 group-hover:translate-x-1 transition-transform">
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

  const upcomingTickets = [
    {
      id: 'TKT-1',
      event_name: 'Neon Tech Summit 2026',
      date: '2026-06-15',
      venue_name: 'Cyber Park Convention Center',
      image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop',
      tier_name: 'VIP Pass',
      quantity: 1
    }
  ];

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
        <div className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('upcoming')}</h3>
             <span className="text-[10px] font-black text-[var(--color-primary)]">{upcomingTickets.length} active</span>
           </div>
           {upcomingTickets.map(ticket => (
             <TicketCard 
              key={ticket.id} 
              ticket={{...ticket, name: ticket.event_name, venue: ticket.venue_name}} 
              onClick={() => setSelectedBooking(ticket)}
             />
           ))}
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('past')}</h3>
           </div>
           {pastTickets.map(ticket => (
             <TicketCard key={ticket.id} ticket={ticket} isPast />
           ))}
        </div>

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
           {/* Decorative elements */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
      </main>
    </div>
  );
}
