import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EventDiscovery from './views/EventDiscovery';
import EventDetail from './views/EventDetail';
import EventCheckout from './views/EventCheckout';
import EventTicket from './views/EventTicket';

// Mock Event Data as per spec
const mockEvents = [
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
    business_id: 'foodspot_hq_001'
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
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_003',
    name: 'Summer Garden Acoustics',
    date: '2026-07-04',
    time: '16:00',
    description: 'Relaxed acoustic performances in our open-air garden. Perfect for families and weekend relaxation.',
    location: 'Botanical Bistro Terrace',
    venue_name: 'Bistro Terrace',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_free', name: 'General Admission', price: 0, qty: 500 }
    ],
    category: 'Free',
    business_id: 'foodspot_hq_001'
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
      { id: 'tier_vip_table', name: 'VIP Deck Table', price: 1500.00, qty: 5 },
      { id: 'tier_vip', name: 'VIP Pass', price: 350.00, qty: 100 },
      { id: 'tier_early', name: 'Early Bird', price: 85.00, qty: 500 },
      { id: 'tier_regular', name: 'General Admission', price: 120.00, qty: 1000 }
    ],
    category: 'Festivals',
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_005',
    name: 'Secret Sneaker Pop-Up',
    date: '2026-05-30',
    time: '10:00',
    description: 'Limited edition drops and exclusive collaborations. First come, first served. Location revealed 24h before.',
    location: 'Secret Location, DT',
    venue_name: 'The Vault',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_free', name: 'General Admission', price: 0, qty: 200 }
    ],
    category: 'Pop-ups',
    business_id: 'foodspot_hq_001'
  }
];

export default function EventsView() {
  const [stage, setStage] = useState('discovery'); // 'discovery' | 'detail' | 'checkout' | 'ticket'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingData, setBookingData] = useState(null);

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
    setStage('ticket');
  };

  const handleBack = () => {
    if (stage === 'detail') setStage('discovery');
    if (stage === 'checkout') setStage('detail');
    if (stage === 'ticket') {
      setStage('discovery');
      setBookingData(null);
      setSelectedEvent(null);
      setSelectedTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] font-sans transition-colors duration-300">
      <div className="h-full w-full max-w-lg mx-auto">
          {stage === 'discovery' && (
            <EventDiscovery 
              events={mockEvents} 
              onSelectEvent={handleSelectEvent} 
            />
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
