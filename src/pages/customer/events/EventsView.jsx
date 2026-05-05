import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EventDiscovery from './views/EventDiscovery';
import EventDetail from './views/EventDetail';
import EventCheckout from './views/EventCheckout';
import EventTicket from './views/EventTicket';
import MyTickets from './views/MyTickets';

// Mock Event Data as per spec
const mockEvents = [
  {
    id: 'evt_009',
    name: 'Mundial: Argentina vs Brazil Game Night',
    date: '2026-06-18',
    time: '16:00',
    description: 'The biggest rivalry in football. Watch the game on our giant screens with live commentary, fresh choripanes, and ice-cold drinks. VAMOS ARGENTINA!',
    location: 'El Club de la Birra',
    venue_name: 'Main Screen Arena',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_ga', name: 'General Admission', price: 20.00, qty: 300 },
      { id: 'tier_table', name: 'Reserved Table + Choripán', price: 45.00, qty: 20 }
    ],
    category: 'Sports',
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_011',
    name: 'Pokemon TCG: Regional Qualifier BA',
    date: '2026-07-04',
    time: '10:00',
    description: 'The road to the World Championships starts here. Competitive Swiss rounds, top-cut playoffs, and a dedicated trading area for collectors.',
    location: 'Centro Costa Salguero',
    venue_name: 'Pavilion 4',
    image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_player', name: 'Competitor Entry', price: 30.00, qty: 256 },
      { id: 'tier_spectator', name: 'Spectator Pass', price: 10.00, qty: 500 }
    ],
    category: 'Gaming',
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_012',
    name: 'Anime Expo & Cosplay Cup BA',
    date: '2026-08-20',
    time: '12:00',
    description: 'The biggest celebration of Japanese culture in South America. Massive cosplay contest, international guests, and the legendary Artist Alley.',
    location: 'La Rural',
    venue_name: 'Ocre Pavilion',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_day', name: 'Day Pass', price: 20.00, qty: 5000 },
      { id: 'tier_vip', name: 'VIP Meet & Greet', price: 85.00, qty: 200 }
    ],
    category: 'Exclusives',
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_001',
    name: 'Neon Tech Summit 2026',
    date: '2026-06-15',
    time: '14:00',
    description: 'An exclusive deep dive into the future of food technology and sustainable automation. Join industry leaders for a day of innovation.',
    location: 'Cyber Park Convention Center',
    venue_name: 'Main Hall A',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_vip_table', name: 'VIP Table for 4', price: 1200.00, qty: 10 },
      { id: 'tier_vip', name: 'VIP Pass', price: 250.00, qty: 50 },
      { id: 'tier_regular', name: 'General Admission', price: 95.00, qty: 200 }
    ],
    category: 'Exclusives',
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_002',
    name: 'Midnight Market Sessions',
    date: '2026-05-28',
    time: '21:00',
    description: 'Live jazz, craft cocktails, and the best night vibes in the city. A recurring session for those who appreciate the finer things.',
    location: 'The Velvet Lounge',
    venue_name: 'The Velvet Lounge',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_vip', name: 'VIP Pass', price: 75.00, qty: 30 },
      { id: 'tier_regular', name: 'General Admission', price: 30.00, qty: 100 }
    ],
    category: 'Music',
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_007',
    name: 'Night with Amigos & Singles Speed Dating',
    date: '2026-05-20',
    time: '20:00',
    description: 'Tired of apps? Meet real people in a relaxed environment. Speed dating in the first hour, party with amigos after. Your first drink is on us.',
    location: 'The Roxy Bar',
    venue_name: 'Live Stage Room',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_entry', name: 'Single Entry', price: 25.00, qty: 100 },
      { id: 'tier_friend', name: 'Duo Pack (Bring a wingman)', price: 40.00, qty: 50 }
    ],
    category: 'Social',
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_004',
    name: 'Electronic Echoes Festival',
    date: '2026-08-12',
    time: '18:00',
    description: 'A massive celebration of electronic music featuring international DJs and immersive light shows.',
    location: 'Starlight Stadium',
    venue_name: 'Stadium Ground',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_vip_l', name: 'VIP Lounge North', price: 450.00, qty: 50 },
      { id: 'tier_vip_r', name: 'VIP Lounge South', price: 450.00, qty: 50 },
      { id: 'tier_tables', name: 'Front Row Tables', price: 1800.00, qty: 12 },
      { id: 'tier_general', name: 'GA Field Access', price: 150.00, qty: 5000 }
    ],
    category: 'Festivals',
    lineup: [
      { time: '14:00', artist: 'Neon Horizon', genre: 'Electronic', stage: 'Main Stage' },
      { time: '16:30', artist: 'The Midnight City', genre: 'Dream Pop', stage: 'Main Stage' },
      { time: '19:00', artist: 'Solar Flare', genre: 'House', stage: 'Main Stage', live: true },
      { time: '21:30', artist: 'Cosmic Echo', genre: 'Techno', stage: 'Main Stage' }
    ],
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_006',
    name: 'Gourmet Food Truck Rally',
    date: '2026-06-05',
    time: '11:00',
    description: 'Over 50 premium food trucks gathered for a weekend of epicurean delight. Live music and local brews.',
    location: 'Riverside Park',
    venue_name: 'The Great Lawn',
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_entry', name: 'Entry Pass', price: 15.00, qty: 1000 },
      { id: 'tier_tasting', name: 'Tasting Ticket (Inc 5 Tokens)', price: 45.00, qty: 500 }
    ],
    category: 'Festivals',
    business_id: 'foodspot_hq_001',
    referrable: true
  },
  {
    id: 'evt_008',
    name: 'Mundo Lingo: Buenos Aires Intercambio',
    date: '2026-05-15',
    time: '20:30',
    description: 'The legendary language exchange event. Grab your flags, find your language, and make friends from all over the world. No pressure, just good vibes.',
    location: 'Milion Bar',
    venue_name: 'The Garden',
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_entry', name: 'General Admission', price: 0, qty: 500 }
    ],
    category: 'Exclusives',
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_010',
    name: 'Vinyl & Wine Evening',
    date: '2026-05-22',
    time: '19:00',
    description: 'Listen to classic records while tasting hand-picked natural wines from around the world.',
    location: 'Vintage Cellar',
    venue_name: 'The Listening Room',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_entry', name: 'Tasting Pass', price: 40.00, qty: 40 }
    ],
    category: 'Music',
    business_id: 'foodspot_hq_001'
  }
];

export default function EventsView({ onViewTickets }) {
  const [stage, setStage] = useState('discovery'); // 'discovery' | 'detail' | 'checkout' | 'ticket' | 'my-tickets'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [allBookings, setAllBookings] = useState(() => {
    const saved = localStorage.getItem('event_bookings');
    // If we have saved data, use it. If not, seed with the demo.
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    
    // Seed with a demo booking that has addons
    const demoBooking = {
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
      category: 'Festivals'
    };
    return [demoBooking];
  });

  useEffect(() => {
    localStorage.setItem('event_bookings', JSON.stringify(allBookings));
  }, [allBookings]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setStage('detail');
  };

  const handleBook = (tier) => {
    setSelectedTier(tier);
    setStage('checkout');
  };

  const handleConfirm = (booking) => {
    setBookingData(booking);
    setAllBookings(prev => [booking, ...prev]);
    setStage('ticket');
  };

  const handleBack = () => {
    if (stage === 'detail') setStage('discovery');
    if (stage === 'checkout') setStage('detail');
    if (stage === 'my-tickets') setStage('discovery');
    if (stage === 'ticket') {
      setStage('discovery');
      setBookingData(null);
      setSelectedEvent(null);
      setSelectedTier(null);
    }
  };

  return (
    <div className="h-full bg-[var(--canvas-bg)] text-[var(--text-primary)] font-sans transition-colors duration-300">
      <div className="h-full w-full max-w-lg mx-auto">
          {stage === 'discovery' && (
            <EventDiscovery 
              events={mockEvents} 
              onSelectEvent={handleSelectEvent} 
              onViewTickets={onViewTickets || (() => setStage('my-tickets'))}
            />
          )}
          {!onViewTickets && stage === 'my-tickets' && (
            <div className="relative h-full flex flex-col">
              <button 
                onClick={handleBack}
                className="absolute top-12 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-[var(--border-color)] shadow-sm text-[var(--text-primary)] active:scale-90 transition-all"
              >
                <span className="text-xl">×</span>
              </button>
              <MyTickets />
            </div>
          )}
          {stage === 'detail' && (
            <EventDetail 
              event={selectedEvent} 
              onBook={handleBook} 
              onBack={handleBack}
            />
          )}
          {stage === 'checkout' && (
            <EventCheckout 
              event={selectedEvent} 
              tier={selectedTier}
              onConfirm={handleConfirm} 
              onBack={handleBack}
            />
          )}
          {stage === 'ticket' && (
            <EventTicket 
              booking={bookingData} 
              onClose={handleBack}
            />
          )}
      </div>
    </div>
  );
}
