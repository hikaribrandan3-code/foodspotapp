import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, ClipboardList as Assignment, Sun, Moon, ArrowLeft } from 'lucide-react';
import EventDiscovery from './EventDiscovery.jsx';
import EventDetail from './EventDetail.jsx';
import EventCheckout from './EventCheckout.jsx';
import EventTicket from './EventTicket.jsx';
import StatusView from './StatusView.jsx';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { supabase } from '../../../lib/supabaseClient.js';

export default function EventsView() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { businessId } = useTenant();

  const [mainTab, setMainTab] = useState('events');
  const [stage, setStage] = useState('discovery');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [lastTicket, setLastTicket] = useState(null);

  // Dark mode toggle (persisted to localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fs_events_theme') || 'light';
  });
  useEffect(() => {
    localStorage.setItem('fs_events_theme', theme);
  }, [theme]);

  // Handle URL params for payment success
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('order_id');

    if (payment === 'success' && orderId) {
      const fetchOrder = async () => {
        // TODO: event_orders table needs to be created in Supabase
        const { data, error } = await supabase
          .from('event_orders')
          .select('*, events(*)')
          .eq('id', orderId)
          .eq('business_id', businessId)
          .single();

        if (data && !error) {
          const ticket = {
            id: data.id,
            event_name: data.events?.name || 'Event',
            venue_name: data.events?.venue_name || '',
            date: data.events?.start_date || new Date().toISOString(),
            tier_name: data.ticket_tiers?.[0]?.name || 'General',
            image_url: data.events?.image_url || '',
            qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=FOODSPOT-${data.id}`,
          };
          setLastTicket(ticket);
          setStage('ticket');
          setMainTab('events');
        }
      };
      if (businessId) fetchOrder();
    }
  }, [location.search, businessId]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setStage('detail');
  };

  const handleGoToCheckout = (event, quantities) => {
    setSelectedEvent(event);
    setTicketQuantities(quantities);
    setStage('checkout');
  };

  const handleCompletePurchase = (ticket) => {
    setLastTicket(ticket);
    setStage('ticket');
  };

  const handleBack = () => {
    if (stage === 'detail') setStage('discovery');
    else if (stage === 'checkout') setStage('detail');
    else if (stage === 'ticket') setStage('discovery');
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#f0f4f8] dark:bg-slate-950 relative selection:bg-orange-100 dark:selection:bg-orange-500/30 transition-colors duration-300">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="fixed bottom-24 left-4 z-[160] w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-all"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <Sun size={18} className="text-orange-500" />
          ) : (
            <Moon size={18} className="text-blue-400" />
          )}
        </button>

        {/* Back to Home */}
        <button
          onClick={() => navigate(`/${tenantSlug}`)}
          className="fixed top-4 left-4 z-[70] w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white"
          aria-label="Go Back"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Main Content */}
        <div className="pb-24">
          <AnimatePresence mode="wait">
            {mainTab === 'events' && (
              <motion.div
                key={stage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {stage === 'discovery' && (
                  <EventDiscovery onSelectEvent={handleSelectEvent} businessId={businessId} />
                )}
                {stage === 'detail' && selectedEvent && (
                  <EventDetail
                    event={selectedEvent}
                    onBack={handleBack}
                    onBooking={handleGoToCheckout}
                    businessId={businessId}
                  />
                )}
                {stage === 'checkout' && selectedEvent && (
                  <EventCheckout
                    event={selectedEvent}
                    ticketQuantities={ticketQuantities}
                    onBack={handleBack}
                    onComplete={handleCompletePurchase}
                    businessId={businessId}
                  />
                )}
                {stage === 'ticket' && lastTicket && (
                  <EventTicket
                    ticket={lastTicket}
                    onClose={() => setStage('discovery')}
                    businessId={businessId}
                  />
                )}
              </motion.div>
            )}

            {mainTab === 'status' && (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <StatusView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center h-20 pb-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setMainTab('events')}
            className={`flex flex-col items-center gap-1 transition-all ${mainTab === 'events' ? 'text-[#ff6b35] scale-110' : 'text-slate-300 dark:text-slate-600'}`}
          >
            <Ticket size={24} strokeWidth={mainTab === 'events' ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Events</span>
          </button>
          <button
            onClick={() => setMainTab('status')}
            className={`flex flex-col items-center gap-1 transition-all ${mainTab === 'status' ? 'text-[#ff6b35] scale-110' : 'text-slate-300 dark:text-slate-600'}`}
          >
            <Assignment size={24} strokeWidth={mainTab === 'status' ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">My Tickets</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
