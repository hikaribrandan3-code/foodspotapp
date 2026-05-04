
import { useState, useEffect } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { eventTranslations } from '../../lib/eventTranslations.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { supabase } from '../../lib/supabaseClient.js';

const MOCK_TICKETS = [
  {
    id: 'TKT-8492-XCVB',
    event_name: 'Neon Nights: Skyline Edition',
    venue_name: 'Skyline Rooftop',
    date: '2026-10-24T21:00:00Z',
    tier_name: 'VIP PASS',
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop',
    qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=FOODSPOT-MOCK-1',
    status: 'upcoming'
  },
  {
    id: 'TKT-1122-PQRS',
    event_name: 'Midnight Market Tasting',
    venue_name: 'Downtown Plaza',
    date: '2026-10-20T19:00:00Z',
    tier_name: 'GA TICKET',
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400&auto=format&fit=crop',
    qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=FOODSPOT-MOCK-2',
    status: 'past'
  }
];

export default function MyTickets({ onViewTicket, tickets: ticketsProp, businessId: businessIdProp }) {
  const { lang } = useLanguage();
  const t = (key) => eventTranslations[key][lang] || key;
  const { businessId: tenantBusinessId } = useTenant();
  const businessId = businessIdProp || tenantBusinessId;
  const [tickets, setTickets] = useState(ticketsProp || MOCK_TICKETS);

  useEffect(() => {
    if (ticketsProp) {
      setTickets(ticketsProp);
      return;
    }
    if (!businessId) return;
    const customerPhone = localStorage.getItem('fs_customer_phone') || '';
    if (!customerPhone) return;

    const fetchTickets = async () => {
      // TODO: event_orders table needs to be created in Supabase
      const { data, error } = await supabase
        .from('event_orders')
        .select('*, events(*)')
        .eq('business_id', businessId)
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false });
      if (error || !data) {
        setTickets(MOCK_TICKETS);
        return;
      }
      setTickets(data);
    };

    fetchTickets();
  }, [businessId, ticketsProp]);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-1">{t('upcoming')}</h3>
        <div className="space-y-3">
          {tickets.filter(t => t.status === 'upcoming').map(ticket => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-slate-900 p-4 rounded-[24px] shadow-lg shadow-slate-200/50 dark:shadow-none flex items-center gap-4 border border-slate-50 dark:border-slate-800 transition-colors"
            >
              <img
                src={ticket.image_url}
                className="w-16 h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800"
                alt={ticket.event_name}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{ticket.event_name}</h4>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs font-semibold mt-1">
                  <Calendar size={12} />
                  <span>{new Date(ticket.date).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => onViewTicket(ticket)}
                className="bg-orange-50 dark:bg-orange-500/10 text-[#ff6b35] dark:text-orange-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
              >
                {t('view_ticket')}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-1">{t('past')}</h3>
        <div className="space-y-3">
          {tickets.filter(t => t.status === 'past').map(ticket => (
            <div
              key={ticket.id}
              className="bg-white/60 dark:bg-slate-900/40 p-4 rounded-[24px] shadow-sm flex items-center gap-4 opacity-70 dark:opacity-50 grayscale-[0.5]"
            >
              <img
                src={ticket.image_url}
                className="w-16 h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800"
                alt={ticket.event_name}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-slate-200 truncate">{ticket.event_name}</h4>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-1">
                  {new Date(ticket.date).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-700" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
