
import { useState, useEffect } from 'react';
import MyTickets from '../../../components/events/MyTickets.jsx';
import EventTicket from './EventTicket.jsx';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { eventTranslations } from '../../../lib/eventTranslations.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { supabase } from '../../../lib/supabaseClient.js';

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

export default function StatusView() {
  const { lang } = useLanguage();
  const t = (key) => eventTranslations[key][lang] || key;
  const { businessId } = useTenant();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState(MOCK_TICKETS);

  useEffect(() => {
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
  }, [businessId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 px-6 pt-10 pb-4 border-b border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-40 flex justify-between items-center transition-colors">
        <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-widest uppercase">My Ticket</h1>
        <div className="flex items-center gap-3">
          <button
            className="bg-[#ff6b35] text-white text-[10px] px-3 py-1.5 rounded-[20px] font-semibold hover:bg-orange-600 transition-colors shadow-sm"
            onClick={() => console.log('Link to menu')}
          >
            Ver Menú
          </button>
          <button className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-tighter">Send to Friend</button>
        </div>
      </header>

      <main className="px-6 py-8">
        <MyTickets onViewTicket={(ticket) => setSelectedTicket(ticket)} tickets={tickets} businessId={businessId} />
      </main>

      {selectedTicket && (
        <EventTicket
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          businessId={businessId}
        />
      )}
    </div>
  );
}
