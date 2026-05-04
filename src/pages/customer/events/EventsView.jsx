
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EventDiscovery from './EventDiscovery.jsx';
import EventDetail from './EventDetail.jsx';
import EventCheckout from './EventCheckout.jsx';
import EventTicket from './EventTicket.jsx';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { supabase } from '../../../lib/supabaseClient.js';

export default function EventsView() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { businessId } = useTenant();

  const [stage, setStage] = useState('discovery');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [lastTicket, setLastTicket] = useState(null);

  // Handle URL params for payment success
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('order_id');

    if (payment === 'success' && orderId) {
      // TODO: event_orders table needs to be created in Supabase
      const fetchOrder = async () => {
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
    <div className="min-h-screen bg-background">
      {/* Back button to home */}
      <button
        onClick={() => navigate(`/${tenantSlug}`)}
        className="fixed top-4 left-4 z-[70] w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white"
        aria-label="Go Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <AnimatePresence mode="wait">
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
      </AnimatePresence>
    </div>
  );
}
