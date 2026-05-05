import React, { useState, useMemo, useEffect } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import EventDiscovery from './views/EventDiscovery';
import EventDetail from './views/EventDetail';
import EventCheckout from './views/EventCheckout';
import EventTicket from './views/EventTicket';

// 🎨 MOCKS - Real data comes from Supabase later
const BASE_MOCK_EVENTS = [
  {
    id: 'evt_009',
    name: 'Mundial: Argentina vs Brazil Game Night',
    category: 'Sports',
    date: '2026-06-18',
    time: '16:00',
    location: 'El Club de la Birra',
    venue_name: 'Main Screen Arena',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    description: 'The biggest rivalry in football. Watch the game on our giant screens with live commentary, fresh choripanes, and ice-cold drinks. VAMOS ARGENTINA!',
    tiers: [
      { id: 'tier_ga', name: 'General Admission', price: 20.00, qty: 300 },
      { id: 'tier_table', name: 'Reserved Table + Choripán', price: 45.00, qty: 20 }
    ],
    referrable: true
  },
  {
    id: 'evt_011',
    name: 'Pokemon TCG: Regional Qualifier BA',
    category: 'Gaming',
    date: '2026-07-04',
    time: '10:00',
    location: 'Centro Costa Salguero',
    venue_name: 'Pavilion 4',
    image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=800&auto=format&fit=crop',
    description: 'The road to the World Championships starts here. Competitive Swiss rounds, top-cut playoffs, and a dedicated trading area for collectors.',
    tiers: [
      { id: 'tier_player', name: 'Competitor Entry', price: 30.00, qty: 256 },
      { id: 'tier_spectator', name: 'Spectator Pass', price: 10.00, qty: 500 }
    ]
  },
  {
    id: 'evt_012',
    name: 'Anime Expo & Cosplay Cup BA',
    category: 'Exclusives',
    date: '2026-08-20',
    time: '12:00',
    location: 'La Rural',
    venue_name: 'Ocre Pavilion',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    description: 'The biggest celebration of Japanese culture in South America. Massive cosplay contest, international guests, and the legendary Artist Alley.',
    tiers: [
      { id: 'tier_day', name: 'Day Pass', price: 20.00, qty: 5000 },
      { id: 'tier_vip', name: 'VIP Meet & Greet', price: 85.00, qty: 200 }
    ],
    referrable: true
  },
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
    referrable: true
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
    referrable: true
  },
  {
    id: 'evt_007',
    name: 'Night with Amigos & Singles Speed Dating',
    category: 'Social',
    date: '2026-05-20',
    time: '20:00',
    location: 'The Roxy Bar',
    venue_name: 'Live Stage Room',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    description: 'Tired of apps? Meet real people in a relaxed environment. Speed dating in the first hour, party with amigos after. Your first drink is on us.',
    tiers: [
      { id: 'tier_entry', name: 'Single Entry', price: 25.00, qty: 100 },
      { id: 'tier_friend', name: 'Duo Pack (Bring a wingman)', price: 40.00, qty: 50 }
    ],
    referrable: true
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
    referrable: true
  },
  {
    id: 'evt_006',
    name: 'Gourmet Food Truck Rally',
    category: 'Festivals',
    date: '2026-06-05',
    time: '11:00',
    location: 'Riverside Park',
    venue_name: 'The Great Lawn',
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?q=80&w=800&auto=format&fit=crop',
    description: 'Over 50 premium food trucks gathered for a weekend of epicurean delight. Live music and local brews.',
    tiers: [
      { id: 'tier_entry', name: 'Entry Pass', price: 15.00, qty: 1000 },
      { id: 'tier_tasting', name: 'Tasting Ticket (Inc 5 Tokens)', price: 45.00, qty: 500 }
    ],
    referrable: true
  },
  {
    id: 'evt_008',
    name: 'Mundo Lingo: Buenos Aires Intercambio',
    category: 'Exclusives',
    date: '2026-05-15',
    time: '20:30',
    location: 'Milion Bar',
    venue_name: 'The Garden',
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=800&auto=format&fit=crop',
    description: 'The legendary language exchange event. Grab your flags, find your language, and make friends from all over the world. No pressure, just good vibes.',
    tiers: [
      { id: 'tier_entry', name: 'General Admission', price: 0, qty: 500 }
    ]
  },
  {
    id: 'evt_010',
    name: 'Vinyl & Wine Evening',
    category: 'Music',
    date: '2026-05-22',
    time: '19:00',
    location: 'Vintage Cellar',
    venue_name: 'The Listening Room',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop',
    description: 'Listen to classic records while tasting hand-picked natural wines from around the world.',
    tiers: [
      { id: 'tier_entry', name: 'Tasting Pass', price: 40.00, qty: 40 }
    ]
  }
];

const CATEGORIES = ['All', 'Music', 'Exclusives', 'Free', 'Festivals', 'Pop-ups'];

const STAGES = {
  DISCOVERY: 'discovery',
  DETAIL: 'detail',
  CHECKOUT: 'checkout',
  TICKET: 'ticket',
};

// Demo booking seed for MyTickets
const DEMO_BOOKING = {
  id: 'TKT-DEMO-99',
  event_id: 'evt_006',
  event_name: 'Gourmet Food Truck Rally',
  date: '2026-06-05',
  time: '11:00',
  venue_name: 'The Great Lawn',
  image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?q=80&w=800&auto=format&fit=crop',
  tier_name: 'Entry Pass',
  tier_id: 'tier_entry',
  quantity: 2,
  addons: [
    { id: 'drink', name: 'Drink Tokens', price: 15, icon: '🍺' },
    { id: 'food', name: 'VIP Tasting Platter', price: 45, icon: '🍱' }
  ],
  total: 75,
  purchase_date: new Date().toISOString(),
  email: 'demo@foodspot.com',
  category: 'Festivals',
  payment_method: 'card'
};

export default function EventsView({ onViewTickets }) {
  const { businessId } = useTenant();
  const [stage, setStage] = useState(STAGES.DISCOVERY);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [booking, setBooking] = useState(null);
  const [filter, setFilter] = useState('All');
  const [allBookings, setAllBookings] = useState(() => {
    const saved = localStorage.getItem('event_bookings');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return [DEMO_BOOKING];
  });

  useEffect(() => {
    localStorage.setItem('event_bookings', JSON.stringify(allBookings));
  }, [allBookings]);

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
    setAllBookings(prev => [bookingData, ...prev]);
    setStage(STAGES.TICKET);
  };

  const handleBack = () => {
    if (stage === STAGES.TICKET) {
      setStage(STAGES.DISCOVERY);
      setBooking(null);
      setSelectedEvent(null);
      setSelectedTier(null);
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
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="h-full w-full max-w-lg mx-auto">
        {stage === STAGES.DISCOVERY && (
          <EventDiscovery
            events={filteredEvents}
            categories={CATEGORIES}
            activeFilter={filter}
            onFilterChange={setFilter}
            onSelectEvent={handleEventSelect}
            onViewTickets={onViewTickets}
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
            onConfirm={handlePurchase}
            onBack={handleBack}
          />
        )}
        {stage === STAGES.TICKET && booking && (
          <EventTicket
            booking={booking}
            onClose={handleBack}
          />
        )}
      </div>
    </div>
  );
}
