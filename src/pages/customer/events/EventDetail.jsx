
import { useState, useMemo } from 'react';
import { ArrowLeft, Heart, Calendar, Clock, MapPin, ChevronRight, Plus, Minus, LayoutGrid, Share2, Copy, Check, MessageCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { eventTranslations } from '../../../lib/eventTranslations.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import WeatherWidget from '../../../components/events/WeatherWidget.jsx';
import EventCountdown from '../../../components/events/EventCountdown.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { VenueMap } from '../../../components/events/VenueMap.jsx';
import { FoodspotFooter } from '../../../components/events/FoodspotFooter.jsx';

export default function EventDetail({ event, onBack, onBooking, businessId }) {
  const { lang } = useLanguage();
  const t = (key) => eventTranslations[key][lang] || key;
  const { tenantData } = useTenant();

  const [ticketQuantities, setTicketQuantities] = useState({});
  const [copied, setCopied] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  const referralCode = useMemo(() => `FSE-${event.id.substring(0, 3)}-${Math.random().toString(36).substring(7).toUpperCase()}`, [event.id]);

  const copyReferral = () => {
    const url = `${window.location.origin}${window.location.pathname}?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateQty = (tierId, delta) => {
    setTicketQuantities(prev => ({
      ...prev,
      [tierId]: Math.max(0, (prev[tierId] || 0) + delta)
    }));
  };

  const totalPrice = event.ticket_tiers.reduce((acc, tier) => {
    return acc + (tier.price * (ticketQuantities[tier.id] || 0));
  }, 0);

  const whatsapp = tenantData?.app_config?.businessInfo?.whatsapp || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 bg-[#faf9ff] dark:bg-slate-950 z-[100] overflow-y-auto pb-32 font-plus antialiased"
    >
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-5 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white">
          <Heart size={20} />
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[350px]">
        <img
          alt={event.name}
          className="w-full h-full object-cover"
          src={event.image_url}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#faf9ff] dark:from-slate-950 via-[#faf9ff]/40 dark:via-slate-950/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full px-6 pb-4">
          <div className="flex gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider">
              {event.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
              Exclusive
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-[#051a3e] dark:text-white mb-2 tracking-tight leading-tight">
            {event.name}
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
            {event.description}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="px-6 mt-4 space-y-6">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,61,155,0.02)]">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Date</p>
              <p className="text-xs font-black text-[#051a3e] dark:text-white mt-1">
                {new Date(event.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,61,155,0.02)]">
            <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Time</p>
              <p className="text-xs font-black text-[#051a3e] dark:text-white mt-1">
                {new Date(event.start_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,61,155,0.02)]">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Location</p>
              <p className="text-xs font-black text-[#051a3e] dark:text-white mt-1">{event.venue_name}</p>
            </div>
          </div>
        </div>

        {/* Venue Layout Map */}
        <div className="mt-2">
          <VenueMap selectedZone={selectedZone} onSelectZone={setSelectedZone} />
        </div>

        {/* Ticket Tiers */}
        <section className="space-y-2.5">
          <h2 className="text-[15px] font-black text-[#051a3e] dark:text-white mb-2 uppercase tracking-wide">Select Tickets</h2>
          <div className="space-y-2.5">
            {event.ticket_tiers.map((tier) => {
                const isVip = tier.name.toLowerCase().includes('vip');
                const isSelectedZone = (isVip && selectedZone === 'VIP') || (!isVip && selectedZone === 'General');

                return (
                  <motion.div
                    layout
                    key={tier.id}
                    className={`p-4 rounded-[22px] border transition-all flex items-center justify-between ${
                      isSelectedZone
                      ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-900/20 scale-[1.01] shadow-lg shadow-emerald-600/5'
                      : isVip
                        ? 'bg-white dark:bg-slate-900 border-orange-100 dark:border-orange-900/20 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[13px] font-black text-[#051a3e] dark:text-white">{tier.name}</h4>
                      {isVip && (
                        <span className="bg-orange-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">VIP</span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tight">
                       ${tier.price.toFixed(2)} • {isVip ? 'Includes wine pairing' : `${tier.remaining} spots left`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-full p-1 border border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => updateQty(tier.id, -1)}
                      disabled={!ticketQuantities[tier.id]}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-[11px] font-black w-3 text-center tabular-nums text-slate-900 dark:text-white">
                       {ticketQuantities[tier.id] || 0}
                    </span>
                    <button
                      onClick={() => updateQty(tier.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-black transition-all font-bold active:scale-90"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="bg-emerald-50/30 dark:bg-emerald-900/10 p-4 rounded-[28px] border border-emerald-100/50 dark:border-emerald-900/20">
          <div className="flex flex-col gap-0.5 mb-3">
             <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Invite friends & Reward</h3>
             <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Both get exclusive rewards on arrival.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[18px] p-1.5 pl-3 flex items-center justify-between border border-white dark:border-slate-700 shadow-sm">
             <code className="text-xs font-black text-emerald-600 tracking-widest uppercase">{referralCode}</code>
             <button
                onClick={copyReferral}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-2xl transition-all active:scale-95 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
             >
                {copied ? <Check size={12} /> : <Share2 size={12} />}
                {copied ? 'Copied' : 'Invite'}
             </button>
          </div>
        </section>

        <FoodspotFooter />
      </main>

      {/* Floating Action Button - WhatsApp */}
      <a
        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl z-[120] active:scale-95 transition-all hover:rotate-12"
      >
        <MessageCircle size={28} fill="white" />
      </a>

      {/* Sticky Bottom Bar */}
      <footer className="fixed bottom-0 left-0 w-full p-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-[110] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Price</p>
            <p className="text-xl font-black text-[#051a3e] dark:text-white leading-none">${totalPrice.toFixed(2)}</p>
          </div>
          <button
            onClick={() => onBooking(event, ticketQuantities)}
            disabled={totalPrice === 0 && !event.is_free}
            className="px-8 py-3.5 bg-emerald-600 text-white font-black text-[12px] uppercase tracking-widest rounded-2xl shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
          >
            Get Tickets
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
