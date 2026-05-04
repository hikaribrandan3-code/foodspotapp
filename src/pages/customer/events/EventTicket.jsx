
import { X, Download, Share2, Calendar, MapPin, Wallet, Utensils, Music, Ticket as TicketIcon } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { eventTranslations } from '../../../lib/eventTranslations.js';
import { FoodspotFooter } from '../../../components/events/FoodspotFooter.jsx';

export default function EventTicket({ ticket, onClose, businessId }) {
  const { lang } = useLanguage();
  const t = (key) => eventTranslations[key][lang] || key;

  const date = new Date(ticket.date);

  return (
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 z-[100] flex flex-col items-center transition-colors duration-300 overflow-y-auto">
      <header className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        <button className="text-[11px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100/50 dark:border-emerald-900/30">
          Send to Friend
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24 w-full max-w-md mx-auto">
        <div className="relative w-full bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl flex flex-col overflow-hidden mb-8 border border-white dark:border-slate-800 transition-colors">
          <div className="h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <img
              src={ticket.image_url}
              alt={ticket.event_name}
              className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent"></div>
          </div>

          <div className="px-8 py-4 text-center">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1 leading-tight">{ticket.event_name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {ticket.venue_name} • {date.toLocaleString('default', { month: 'short', day: 'numeric' })}
            </p>

            <div className="bg-white dark:bg-black w-48 h-48 mx-auto my-6 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden">
              <img
                src={ticket.qr_code}
                alt="Entry QR Code"
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </div>

            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold">
              ID: {ticket.id}
            </p>
          </div>

          <div className="relative w-full h-12 flex items-center justify-center px-4">
            <div className="absolute -left-6 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner z-10 transition-colors"></div>
            <div className="absolute -right-6 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner z-10 transition-colors"></div>
            <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-800"></div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/30 p-6 flex justify-between items-center px-10 border-b border-white dark:border-slate-800 transition-colors">
            <div className="text-left flex flex-col gap-0.5">
              <p className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-widest">Ticket Tier</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{ticket.tier_name}</p>
            </div>
            {ticket.table_number && (
              <div className="text-right flex flex-col gap-0.5">
                <p className="text-[9px] uppercase text-emerald-600 font-bold tracking-widest">Table No.</p>
                <p className="text-sm font-black text-emerald-600">{ticket.table_number}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col w-full gap-2.5">
          <button className="w-full bg-emerald-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all font-black text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-500/10">
            <Download size={14} /> Save to Photos
          </button>
          <button className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all font-bold text-[11px] uppercase tracking-wider">
            <Share2 size={14} /> Share with Friend
          </button>
        </div>

        {/* Marketing Footer */}
        <FoodspotFooter />
      </main>

    </div>
  );
}
