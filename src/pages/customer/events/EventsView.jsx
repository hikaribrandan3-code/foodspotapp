import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, ClipboardList, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import EventDiscovery from './views/EventDiscovery';
import EventDetail from './views/EventDetail';
import EventCheckout from './views/EventCheckout';
import EventTicket from './views/EventTicket';
import MyTickets from './views/MyTickets';

// 🎨 MOCKS - Real data comes from Supabase later
const MOCK_EVENTS = [
  {
    id: 'evt-001',
    name: 'Midnight Market Sessions',
    category: 'Pop-ups',
    date: '2026-05-15T20:00:00',
    time: '20:00 - 02:00',
    location: 'Secret Warehouse • Downtown',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&fit=crop',
    description: 'An immersive culinary experience featuring underground chefs, live music, and exclusive pop-up installations. Each session is a one-night-only event.',
    tiers: [
      { id: 'general', name: 'General Admission', price: 25 },
      { id: 'vip', name: 'VIP Access', price: 75 },
      { id: 'table', name: 'Table Service (4 ppl)', price: 200 }
    ],
    weather: { temp: 72, condition: 'Clear Night' }
  },
  {
    id: 'evt-002',
    name: 'Neon Nights Festival',
    category: 'Festivals',
    date: '2026-06-20T16:00:00',
    time: '16:00 - 23:00',
    location: 'Riverside Park • Main Stage',
    image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=800&fit=crop',
    description: 'A massive outdoor food and music festival bringing together the best street food vendors and local artists.',
    tiers: [
      { id: 'ga', name: 'GA Field Pass', price: 45 },
      { id: 'vip-l', name: 'VIP Lounge North', price: 120 },
      { id: 'vip-r', name: 'VIP Lounge South', price: 120 },
      { id: 'table-pit', name: 'Premium Table (Pit)', price: 350 }
    ],
    lineup: [
      { time: '16:00', artist: 'DJ Solar', genre: 'House', stage: 'Main', live: false },
      { time: '18:00', artist: 'The Midnight', genre: 'Synthwave', stage: 'Main', live: false },
      { time: '20:00', artist: 'Neon Dreams', genre: 'Indie Pop', stage: 'Main', live: true },
      { time: '22:00', artist: 'Future Funk Collective', genre: 'Funk', stage: 'Main', live: false }
    ],
    weather: { temp: 68, condition: 'Breezy' }
  },
  {
    id: 'evt-003',
    name: 'Chef\'s Table Underground',
    category: 'Pop-ups',
    date: '2026-05-22T19:00:00',
    time: '19:00 - 22:00',
    location: 'The Velvet Lounge • Back Room',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&fit=crop',
    description: 'An intimate 20-seat dining experience with a mystery chef. The menu is revealed only upon arrival.',
    tiers: [
      { id: 'seat', name: 'Chef\'s Seat', price: 150 }
    ],
    weather: { temp: 70, condition: 'Mild' }
  },
  {
    id: 'evt-004',
    name: 'Sunset Rooftop Sessions',
    category: 'Nightlife',
    date: '2026-05-10T17:00:00',
    time: '17:00 - 22:00',
    location: 'Skybar 42 • Downtown',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&fit=crop',
    description: 'Cocktails, small plates, and panoramic city views as the sun goes down.',
    tiers: [
      { id: 'general', name: 'Rooftop Access', price: 35 },
      { id: 'bottle', name: 'Bottle Service', price: 250 }
    ],
    weather: { temp: 75, condition: 'Golden Hour' }
  },
  {
    id: 'evt-005',
    name: 'Street Food Championships',
    category: 'Festivals',
    date: '2026-07-04T12:00:00',
    time: '12:00 - 20:00',
    location: 'Central Plaza • Arena',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&fit=crop',
    description: 'The ultimate street food competition. 50 vendors, 1 champion. Vote with your stomach.',
    tiers: [
      { id: 'entry', name: 'Entry Pass', price: 15 },
      { id: 'tasting', name: 'Tasting Passport', price: 55 }
    ],
    weather: { temp: 85, condition: 'Sunny' }
  }
];

const CATEGORIES = ['All', 'Pop-ups', 'Festivals', 'Nightlife'];

const STAGES = {
  DISCOVERY: 'discovery',
  DETAIL: 'detail',
  CHECKOUT: 'checkout',
  TICKET: 'ticket',
  TICKETS: 'tickets'
};

export default function EventsView() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stage, setStage] = useState(STAGES.DISCOVERY);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [booking, setBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('events');
  const [filter, setFilter] = useState('All');

  // ─── HANDLERS ───
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setStage(STAGES.DETAIL);
  };

  const handleBook = (tier) => {
    setSelectedTier(tier);
    setStage(STAGES.CHECKOUT);
  };

  const handlePurchase = (bookingData) => {
    setBooking(bookingData);
    // Persist to localStorage for MyTickets
    const existing = JSON.parse(localStorage.getItem('event_bookings') || '[]');
    existing.push(bookingData);
    localStorage.setItem('event_bookings', JSON.stringify(existing));
    setStage(STAGES.TICKET);
  };

  const handleBack = () => {
    if (stage === STAGES.TICKET) {
      setStage(STAGES.TICKETS);
      setActiveTab('tickets');
    } else if (stage === STAGES.CHECKOUT) {
      setStage(STAGES.DETAIL);
    } else if (stage === STAGES.DETAIL) {
      setStage(STAGES.DISCOVERY);
      setSelectedEvent(null);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filter === 'All') return MOCK_EVENTS;
    return MOCK_EVENTS.filter(e => e.category === filter);
  }, [filter]);

  // ─── RENDER ───
  return (
    <div className="flex flex-col h-screen bg-[var(--canvas-bg)] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {stage === STAGES.DISCOVERY && activeTab === 'events' && (
          <EventDiscovery
            events={filteredEvents}
            categories={CATEGORIES}
            activeFilter={filter}
            onFilterChange={setFilter}
            onEventSelect={handleEventSelect}
          />
        )}
        {stage === STAGES.DETAIL && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onBook={handleBook}
            onBack={handleBack}
          />
        )}
        {stage === STAGES.CHECKOUT && selectedEvent && selectedTier && (
          <EventCheckout
            event={selectedEvent}
            tier={selectedTier}
            onPurchase={handlePurchase}
            onBack={handleBack}
          />
        )}
        {stage === STAGES.TICKET && booking && (
          <EventTicket
            booking={booking}
            onClose={handleBack}
          />
        )}
        {activeTab === 'tickets' && stage === STAGES.DISCOVERY && (
          <MyTickets onViewTicket={(b) => { setBooking(b); setStage(STAGES.TICKET); }} />
        )}
      </div>

      {/* Custom Bottom Nav: Events / My Tickets */}
      <nav
        className="shrink-0 w-full flex justify-around items-center h-20 pb-4 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.05)]"
        style={{
          backgroundColor: 'var(--canvas-bg)',
          borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))'
        }}
      >
        <button
          onClick={() => { setActiveTab('events'); setStage(STAGES.DISCOVERY); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'events' ? 'scale-110' : 'opacity-40'}`}
          style={{ color: activeTab === 'events' ? 'var(--color-primary, #8B7355)' : 'var(--icon-muted, #9CA3AF)' }}
        >
          <Ticket size={24} strokeWidth={activeTab === 'events' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t('events') || 'Events'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('tickets'); setStage(STAGES.DISCOVERY); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tickets' ? 'scale-110' : 'opacity-40'}`}
          style={{ color: activeTab === 'tickets' ? 'var(--color-primary, #8B7355)' : 'var(--icon-muted, #9CA3AF)' }}
        >
          <ClipboardList size={24} strokeWidth={activeTab === 'tickets' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t('my_tickets') || 'My Tickets'}</span>
        </button>
      </nav>
    </div>
  );
}
