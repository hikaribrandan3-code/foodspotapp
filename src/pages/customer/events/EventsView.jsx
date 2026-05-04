import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EventDiscovery from './EventDiscovery.jsx';
import EventDetail from './EventDetail.jsx';
import EventCheckout from './EventCheckout.jsx';
import EventTicket from './EventTicket.jsx';

export default function EventsView() {
  const [stage, setStage] = useState('discovery');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [lastTicket, setLastTicket] = useState(null);

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
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {stage === 'discovery' && (
            <EventDiscovery onSelectEvent={handleSelectEvent} />
          )}
          {stage === 'detail' && selectedEvent && (
            <EventDetail
              event={selectedEvent}
              onBack={handleBack}
              onBooking={handleGoToCheckout}
            />
          )}
          {stage === 'checkout' && selectedEvent && (
            <EventCheckout
              event={selectedEvent}
              ticketQuantities={ticketQuantities}
              onBack={handleBack}
              onComplete={handleCompletePurchase}
            />
          )}
          {stage === 'ticket' && lastTicket && (
            <EventTicket
              ticket={lastTicket}
              onClose={() => setStage('discovery')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
