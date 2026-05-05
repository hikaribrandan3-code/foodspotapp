import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, ClipboardList } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import EventDiscovery from './views/EventDiscovery';
import EventDetail from './views/EventDetail';
import EventCheckout from './views/EventCheckout';
import EventTicket from './views/EventTicket';
import MyTickets from './views/MyTickets';

// 🎨 MOCKS - Real data comes from Supabase later
const BASE_MOCK_EVENTS = [
  {
    id: 'evt_001',
    name: 'Neon Tech Summit 2026',
    category: 'Exclusives',
    date: '2026-06-15',
    time: '14:00',
    location: 'Cyber Park Convention Center',
    venue_name: 'Main Hall A',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop',
    description: 'An exclusive deep dive into the future of food technology and sustainable automation. Join industry leaders for a day of innovation.',
    tiers: [
      { id: 'tier_vip_table', name: 'VIP Table for 4', price: 1200.00, qty: 10 },
      { id: 'tier_vip', name: 'VIP Pass', price: 250.00, qty: 50 },
      { id: 'tier_regular', name: 'General Admission', price: 95.00, qty: 200 }
    ],
    weather: { temp: 72, condition: 'Clear Night' }
  },
  {
    id: 'evt_002',
    name: 'Midnight Market Sessions',
    category: 'Music',
    date: '2026-05-28',
    time: '21:00',
    location: 'The Velvet Lounge',
    venue_name: 'The Velvet Lounge',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    description: 'Live jazz, craft cocktails, and the best night vibes in the city. A recurring session for those who appreciate the finer things.',
    tiers: [
      { id: 'tier_vip', name: 'VIP Pass', price: 75.00, qty: 30 },
      { id: 'tier_regular', name: 'General Admission', price: 30.00, qty: 100 }
    ],
    weather: { temp: 68, condition: 'Breezy' }
  },
  {
    id: 'evt_003',
    name: 'Summer Garden Acoustics',
    category: 'Free',
    date: '2026-07-04',
    time: '16:00',
    location: 'Botanical Bistro Terrace',
    venue_name: 'Bistro Terrace',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop',
    description: 'Relaxed acoustic performances in our open-air garden. Perfect for families and weekend relaxation.',
    tiers: [
      { id: 'tier_free', name: 'General Admission', price: 0, qty: 500 }
    ],
    weather: { temp: 75, condition: 'Sunny' }
  },
  {
    id: 'evt_004',
    name: 'Electronic Echoes Festival',
    category: 'Festivals',
    date: '2026-08-12',
    time: '18:00',
    location: 'Starlight Stadium',
    venue_name: 'Stadium Ground',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    description: 'A massive celebration of electronic music featuring international DJs and immersive light shows.',
    tiers: [
      { id: 'tier_vip_l', name: 'VIP Lounge North', price: 450.00, qty: 50 },
      { id: 'tier_vip_r', name: 'VIP Lounge South', price: 450.00, qty: 50 },
      { id: 'tier_tables', name: 'Front Row Tables', price: 1800.00, qty: 12 },
      { id: 'tier_general', name: 'GA Field Access', price: 150.00, qty: 5000 }
    ],
    lineup: [
      { time: '14:00', artist: 'Neon Horizon', genre: 'Electronic', stage: 'Main Stage' },
      { time: '16:30', artist: 'The Midnight City', genre: 'Dream Pop', stage: 'Main Stage' },
      { time: '19:00', artist: 'Solar Flare', genre: 'House', stage: 'Main Stage', live: true },
      { time: '21:30', artist: 'Cosmic Echo', genre: 'Techno', stage: 'Main Stage' }
    ],
    weather: { temp: 80, condition: 'Clear' }
  },
  {
    id: 'evt_005',
    name: 'Secret Sneaker Pop-Up',
    category: 'Pop-ups',
    date: '2026-05-30',
    time: '10:00',
    location: 'Secret Location, DT',
    venue_name: 'The Vault',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop',
    description: 'Limited edition drops and exclusive collaborations. First come, first served. Location revealed 24h before.',
    tiers: [
      { id: 'tier_free', name: 'General Admission', price: 0, qty: 200 }
    ],
    weather: { temp: 70, condition: 'Mild' }
  }
];

const CATEGORIES = ['All', 'Music', 'Exclusives', 'Free', 'Festivals', 'Pop-ups'];

const STAGES = {
  DISCOVERY: 'discovery',
  DETAIL: 'detail',
  CHECKOUT: 'checkout',
  TICKET: 'ticket',
  TICKETS: 'tickets'
};

export default function EventsView() {
  const { businessId } = useTenant();
  const [stage, setStage] = useState(STAGES.DISCOVERY);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [booking, setBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('events');
  const [filter, setFilter] = useState('All');

  // Inject business_id into mock events so filtering works
  const mockEvents = useMemo(() => {
    return BASE_MOCK_EVENTS.map(e => ({ ...e, business_id: businessId || 'foodspot_hq_001' }));
  }, [businessId]);

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
      setStage(STAGES.DISCOVERY);
      setBooking(null);
      setSelectedEvent(null);
      setSelectedTier(null);
      setActiveTab('tickets');
    } else if (stage === STAGES.CHECKOUT) {
      setStage(STAGES.DETAIL);
    } else if (stage === STAGES.DETAIL) {
      setStage(STAGES.DISCOVERY);
      setSelectedEvent(null);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filter === 'All') return mockEvents;
    return mockEvents.filter(e => e.category === filter);
  }, [filter, mockEvents]);

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
      {stage === STAGES.DISCOVERY && (
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
            <span className="text-[10px] font-black uppercase tracking-tighter">Events</span>
          </button>

          <button
            onClick={() => { setActiveTab('tickets'); setStage(STAGES.DISCOVERY); }}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tickets' ? 'scale-110' : 'opacity-40'}`}
            style={{ color: activeTab === 'tickets' ? 'var(--color-primary, #8B7355)' : 'var(--icon-muted, #9CA3AF)' }}
          >
            <ClipboardList size={24} strokeWidth={activeTab === 'tickets' ? 2.5 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">My Tickets</span>
          </button>
        </nav>
      )}
    </div>
  );
}
