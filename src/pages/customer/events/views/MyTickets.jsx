import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, MapPin, ChevronRight, Sparkles, Award, Users, Copy, CheckCircle2, Wallet, Zap, Fingerprint, CreditCard, X } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useEventOrders } from '../../../../hooks/useEventOrders';
import { supabase } from '../../../../lib/supabaseClient';
import EventTicket from './EventTicket';

const TicketCard = ({ ticket, isPast = false, onClick, onDelete }) => {
  const { t } = useLanguage();
  const isCanceled = ticket.status === 'canceled';
  const isDisabled = isPast || isCanceled;

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      className={`relative overflow-hidden rounded-[32px] border group transition-all cursor-pointer bg-white dark:bg-slate-900 h-28 ${isDisabled ? 'border-slate-100 dark:border-slate-800 opacity-60 grayscale' : 'border-[var(--border-color)] shadow-sm active:scale-[0.98]'}`}
    >
      {/* Full Background Flyer */}
      <div className="absolute inset-0 z-0">
         <img src={ticket.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
         <div className={`absolute inset-0 bg-gradient-to-r ${isDisabled ? 'from-slate-900/90' : 'from-slate-900/95 via-slate-900/60'} to-transparent`} />
      </div>

      {/* Delete Button (Top-Right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(ticket.id, ticket.event_id);
        }}
        className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-gray-600/50 hover:bg-red-500/70 text-white flex items-center justify-center transition-colors"
        title="Delete ticket"
      >
        <span className="text-lg leading-none">×</span>
      </button>

      <div className="relative z-10 p-5 flex items-center h-full gap-5">
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-white text-base truncate uppercase tracking-tight mb-1">{ticket.name}</h4>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 text-white/70">
                <Calendar size={10} className={isCanceled ? 'text-red-400' : 'text-[var(--color-primary)]'} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {new Date(ticket.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
             </div>
             {!isDisabled && (
               <div className="flex items-center gap-1.5 text-white/70">
                  <MapPin size={10} className="text-[var(--color-primary)]" />
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[120px]">{ticket.venue}</span>
               </div>
             )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           {isCanceled ? (
             <span className="text-[8px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-md border border-red-400/20 backdrop-blur-sm">{t('event_canceled')}</span>
           ) : isPast ? (
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
  const [showBadges, setShowBadges] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletBalance, setWalletBalance] = useState(125.50);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { ticketId, ticketCode } or null
  const [isDeleting, setIsDeleting] = useState(false);

  const guestToken = localStorage.getItem('event_guest_token');

  useEffect(() => {
    console.log('MyTickets mounted - guestToken:', guestToken);
    if (!guestToken) {
      console.warn('No guestToken in localStorage! Keys:', Object.keys(localStorage));
    }
  }, []);

  const { orders: dbOrders, loading: ordersLoading, refetch } = useEventOrders(guestToken);

  useEffect(() => {
    if (showBadges) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showBadges]);

  const handleTopUp = () => {
    setIsToppingUp(true);
    setTimeout(() => {
      setWalletBalance(prev => prev + 50);
      setIsToppingUp(false);
    }, 1500);
  };

  const handleDeleteTicket = async () => {
    if (!deleteConfirm) {
      alert('Error: No ticket selected.');
      return;
    }

    // Read guestToken fresh at delete time
    const freshGuestToken = localStorage.getItem('event_guest_token');
    if (!freshGuestToken) {
      console.error('No guestToken found. localStorage keys:', Object.keys(localStorage).filter(k => k.includes('event') || k.includes('guest')));
      alert('Error: Session data missing. Please refresh the page and try again.');
      setIsDeleting(false);
      return;
    }

    setIsDeleting(true);
    try {
      // Soft delete: SET deleted_at = NOW() using the actual row ID
      console.log('Deleting ticket:', { ticketId: deleteConfirm.ticketId, guestToken: freshGuestToken });
      const { error } = await supabase
        .from('event_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteConfirm.ticketId)
        .eq('guest_token', freshGuestToken);

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      // Clear from localStorage immediately
      const current = JSON.parse(localStorage.getItem('event_bookings') || '[]');
      localStorage.setItem('event_bookings',
        JSON.stringify(current.filter(b => b.id !== deleteConfirm.ticketId))
      );

      // Refetch orders from DB
      refetch();
      setDeleteConfirm(null);

      // Show success feedback
      alert(t('ticket_deleted') || 'Ticket deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      alert(t('delete_failed') || 'Could not delete ticket. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Transform DB orders to frontend booking shape
  const savedBookings = dbOrders.length > 0
    ? dbOrders.map(order => {
        const event = order.events || {};
        const tier = order.tier_snapshot || {};
        const startDate = event.start_date ? new Date(event.start_date) : new Date();
        return {
          id: order.id,
          ticket_code: order.ticket_code,
          event_id: order.event_id,
          event_name: event.name || 'Unknown Event',
          date: startDate.toISOString().split('T')[0],
          time: startDate.toTimeString().slice(0, 5),
          venue_name: event.venue_name || '',
          image: event.image_url || '',
          tier_name: tier.name || 'General',
          tier_id: tier.id || '',
          quantity: order.quantity || 1,
          addons: (order.addons_snapshot || []).map(a => ({
            id: a.id,
            name: a.name,
            price: (a.price_cents || 0) / 100,
            qty: a.qty || 1
          })),
          total: (order.total_cents || 0) / 100,
          purchase_date: order.created_at,
          email: order.customer_email || '',
          category: 'Events',
          guest_token: order.guest_token,
          status: event.status || 'live'
        };
      })
    : JSON.parse(localStorage.getItem('event_bookings') || '[]');

  const upcomingTickets = savedBookings;

  // Mock Referral Data
  const referralCode = "FOOD-" + (savedBookings[0]?.id?.split('-')[1] || "PLAY").substring(0, 4).toUpperCase();
  const referralStats = {
    friends: 3,
    credits: 30.00
  };

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
    <div className="flex flex-col h-full bg-[var(--canvas-bg)]">
      <header className="px-6 pt-12 pb-6 flex items-end justify-between">
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          {t('my_tickets')}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 space-y-8 pb-32">
        {/* Futuristic Digital Wallet Card */}
        <section className="hidden">
          <div className="bg-slate-900 rounded-[32px] p-5 text-white relative overflow-hidden shadow-2xl group active:scale-[0.98] transition-all cursor-pointer">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
             
             <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                      <Wallet size={20} className="text-emerald-400" />
                   </div>
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 scale-90 origin-right">
                         <Fingerprint size={10} className="text-emerald-400" />
                         <span className="text-[8px] font-black uppercase tracking-widest">Active Wristband</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-30 mt-0.5">
                         <CreditCard size={8} />
                         <span className="text-[6px] font-bold uppercase tracking-widest">Linked: Visa •••• 4242</span>
                      </div>
                   </div>
                </div>
                
                <div className="-mt-1">
                   <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-0">Digital Balance</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black tracking-tighter">${walletBalance.toFixed(2)}</span>
                      <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest ml-1">Credits</span>
                   </div>
                </div>
 
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                   <div className="flex flex-col items-start">
                      <div className="bg-[#FFF059] px-2.5 py-1 rounded-lg border border-yellow-400 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(255,240,89,0.15)] scale-90 origin-left">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#009EE3] animate-pulse" />
                         <span className="text-[8px] font-black uppercase tracking-widest text-[#009EE3]">MP Linked</span>
                      </div>
                   </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleTopUp(); }}
                    className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 px-4 py-2 rounded-xl border transition-all ${
                      isToppingUp 
                      ? 'bg-white text-slate-900 border-white' 
                      : 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10 hover:bg-emerald-400/20'
                    }`}
                   >
                      {isToppingUp ? 'SYNCING' : 'Top-Up'} <Zap size={10} className={isToppingUp ? 'animate-spin' : ''} />
                   </button>
                </div>
             </div>
          </div>
        </section>

        {/* Referral Dashboard Section */}
        <section>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Award size={12} />
                  <h2 className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80">{t('refer_earn')}</h2>
                </div>
                <p className="text-[11px] font-bold leading-tight opacity-95">{t('refer_desc')}</p>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            </div>

            <div className="p-4 space-y-3">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                     <p className="text-[6px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">{t('your_code')}</p>
                     <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-2.5 py-2 rounded-xl border border-[var(--border-color)] group active:scale-[0.98] transition-all cursor-pointer" onClick={handleCopy}>
                        <span className="font-black tracking-widest text-[var(--text-primary)] text-[10px]">{referralCode}</span>
                        {copied ? (
                          <div className="flex items-center gap-1 text-emerald-500">
                            <span className="text-[6px] font-black uppercase">{t('code_copied')}</span>
                            <CheckCircle2 size={10} />
                          </div>
                        ) : (
                          <Copy size={10} className="text-[var(--text-secondary)] opacity-30 group-hover:opacity-100 transition-opacity" />
                        )}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-[var(--border-color)]">
                     <div className="flex items-center gap-1.5 mb-0.5">
                        <Users size={9} className="text-[var(--color-primary)]" />
                        <p className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40">{t('friends_referred')}</p>
                     </div>
                     <p className="text-sm font-black text-[var(--text-primary)]">{referralStats.friends}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-[var(--border-color)]">
                     <div className="flex items-center gap-1.5 mb-0.5">
                        <Award size={9} className="text-amber-500" />
                        <p className="text-[7px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40">{t('credits_earned')}</p>
                     </div>
                     <p className="text-sm font-black text-[var(--text-primary)]">${referralStats.credits.toFixed(2)}</p>
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
              ticket={{...ticket, name: ticket.event_name, venue: ticket.venue_name}}
              onClick={() => setSelectedBooking(ticket)}
              onDelete={(ticketId, eventId) => setDeleteConfirm({ ticketId })}
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
              <button 
                onClick={() => setShowBadges(true)}
                className="bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-primary)] px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
              >
                 {t('view_badges')}
              </button>
           </div>
           {/* Decorative elements */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
      </main>

      {/* Badges Modal Overlay */}
      {showBadges && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowBadges(false)}
           />
           <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[95vh] overflow-y-auto">
              <div className="p-8 pb-12">
                 <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8 sm:hidden" />
                 
                 <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-[30px] bg-gradient-to-tr from-[var(--color-primary)] to-indigo-600 flex items-center justify-center text-white shadow-2xl mb-6 transform -rotate-6">
                       <Sparkles size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-primary)] mb-4 uppercase tracking-tighter">Coming Soon</h3>
                    <p className="text-sm font-medium text-[var(--text-secondary)] opacity-70 leading-relaxed">
                       Member Rewards & Badges are rolling out soon. Stay tuned for exclusive perks and recognition! 🎉
                    </p>
                 </div>

                 <button 
                  onClick={() => setShowBadges(false)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                 >
                    Close Rewards
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Ticket Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 mx-auto">
              <X size={24} className="text-red-500" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">
                {t('delete_ticket_confirm') || 'Delete this ticket?'}
              </h3>
              <p className="text-sm font-medium text-[var(--text-secondary)] opacity-70">
                {t('delete_confirm_warning') || 'This action cannot be undone.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => !isDeleting && setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)] py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTicket}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
