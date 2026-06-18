import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useTenant } from '../../../contexts/TenantContext';
import { useEvents } from '../../../hooks/useEvents';
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
      { id: 'tier_ga', name: 'General Admission', price: 20.00, qty: 300, sold: 0 },
      { id: 'tier_table', name: 'Reserved Table + Choripán', price: 45.00, qty: 20, sold: 0 }
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
      { id: 'tier_player', name: 'Competitor Entry', price: 30.00, qty: 256, sold: 0 },
      { id: 'tier_spectator', name: 'Spectator Pass', price: 10.00, qty: 500, sold: 0 }
    ],
    category: 'Gaming',
    business_id: 'foodspot_hq_001'
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
      { id: 'tier_vip_table', name: 'VIP Table for 4', price: 1200.00, qty: 10, sold: 0 },
      { id: 'tier_vip', name: 'VIP Pass', price: 250.00, qty: 50, sold: 0 },
      { id: 'tier_regular', name: 'General Admission', price: 95.00, qty: 200, sold: 0 }
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
      { id: 'tier_vip', name: 'VIP Pass', price: 75.00, qty: 30, sold: 0 },
      { id: 'tier_regular', name: 'General Admission', price: 30.00, qty: 100, sold: 0 }
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
      { id: 'tier_entry', name: 'Single Entry', price: 25.00, qty: 100, sold: 0 },
      { id: 'tier_friend', name: 'Duo Pack (Bring a wingman)', price: 40.00, qty: 50, sold: 0 }
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
      { id: 'tier_vip_l', name: 'VIP Lounge North', price: 450.00, qty: 50, sold: 0 },
      { id: 'tier_vip_r', name: 'VIP Lounge South', price: 450.00, qty: 50, sold: 0 },
      { id: 'tier_tables', name: 'Front Row Tables', price: 1800.00, qty: 12, sold: 0 },
      { id: 'tier_general', name: 'GA Field Access', price: 150.00, qty: 5000, sold: 0 }
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
      { id: 'tier_entry', name: 'Entry Pass', price: 15.00, qty: 1000, sold: 0 },
      { id: 'tier_tasting', name: 'Tasting Ticket (Inc 5 Tokens)', price: 45.00, qty: 500, sold: 0 }
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
      { id: 'tier_entry', name: 'General Admission', price: 0, qty: 500, sold: 0 }
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
      { id: 'tier_entry', name: 'Tasting Pass', price: 40.00, qty: 40, sold: 0 }
    ],
    category: 'Music',
    business_id: 'foodspot_hq_001'
  }
];

// Transform Supabase event shape to frontend mock shape
function normalizeEvent(event) {
  const startDate = new Date(event.start_date);
  return {
    id: event.id,
    name: event.name,
    date: event.start_date,
    end_date: event.end_date || null,
    time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    end_time: event.end_date
      ? new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null,
    description: event.description || '',
    location: event.address || event.venue_name || '',
    venue_name: event.venue_name || '',
    image: event.image_url || '',
    share_image_url: event.share_image_url || null,
    category: event.category || 'All',
    business_id: event.business_id,
    referrable: true,
    tiers: (event.ticket_tiers || []).map(t => ({
      id: t.id,
      name: t.name,
      price: (t.price_cents || 0) / 100,
      qty: t.capacity || 0,
      sold: t.sold || 0
    })),
    lineup: event.lineup || undefined,
    daily_schedule: event.daily_schedule || null,
    status: event.status || 'live'
  };
}

// Demo events to seed on first view (skip evt_004 - festival with complex stages)
const DEMO_SEEDS = mockEvents.filter(e => e.id !== 'evt_004').map(e => ({
  id: `demo_${e.id}`,
  name: e.name,
  description: e.description,
  image_url: e.image,
  venue_name: e.venue_name,
  start_date: new Date(`${e.date}T${e.time}`).toISOString(),
  category: e.category,
  status: 'live',
  ticket_tiers: e.tiers.map(t => ({
    id: t.id,
    name: t.name,
    price_cents: Math.round(t.price * 100),
    capacity: t.qty,
    sold: t.sold
  }))
}));

async function seedDemoEvents(businessId) {
  if (!businessId) return;

  try {
    // Check if any demos exist (check for demo_ prefix in IDs)
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('business_id', businessId)
      .like('id', 'demo_%')
      .limit(1);

    if (existing && existing.length > 0) return; // Already seeded

    // Create demos
    const demosWithBusiness = DEMO_SEEDS.map(e => ({ ...e, business_id: businessId }));
    await supabase.from('events').insert(demosWithBusiness);
  } catch (err) {
    console.warn('Demo seeding skipped:', err.message);
  }
}

export default function EventsView({ onViewTickets, onStageChange }) {
  const { tenantSlug } = useParams();
  const { businessId } = useTenant();
  const [searchParams] = useSearchParams();
  const { events: dbEvents, loading: eventsLoading, error: eventsError, refetch } = useEvents(tenantSlug);

  // Seed demos on mount (idempotent check inside seedDemoEvents prevents duplicates)
  useEffect(() => {
    const seedIfNeeded = async () => {
      if (businessId) {
        await seedDemoEvents(businessId);
        refetch(); // Refetch to show seeded demos
      }
    };
    seedIfNeeded();
  }, [businessId, refetch]);

  // Show all DB events (includes real events + seeded demos)
  const events = dbEvents.map(normalizeEvent);

  const [stage, setStage] = useState('discovery'); // 'discovery' | 'detail' | 'checkout' | 'ticket' | 'my-tickets'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [allBookings, setAllBookings] = useState([]);

  // Load ticket if returning from MP payment
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const guestToken = searchParams.get('guest_token');
    const mpReturnStatus = searchParams.get('payment');

    console.log('[EventsView] MP Return detected - orderId:', orderId, 'guestToken:', guestToken, 'payment:', mpReturnStatus);

    if (!orderId || !guestToken) {
      console.log('[EventsView] Missing orderId or guestToken, returning');
      return;
    }

    localStorage.setItem(tenantSlug ? `fs_guest_token_${tenantSlug}` : 'fs_guest_token', guestToken);

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_event_order_for_ticket', {
            p_order_id: orderId,
            p_guest_token: guestToken
          });

        console.log('[EventsView] RPC get_event_order_for_ticket result:', { data, error });

        if (error) {
          console.error('[EventsView] RPC error:', error.message);
          return;
        }

        if (!data) {
          console.warn('[EventsView] No order found for', orderId);
          return;
        }

        console.log('[EventsView] Order loaded successfully, setting stage to ticket with ticket_code:', data.ticket_code);

        const booking = {
          id: data.ticket_code,
          ticket_code: data.ticket_code,
          order_id: data.id,
          event_id: data.event_id,
          event_name: data.events?.name || 'Event',
          tier_name: data.tier_snapshot?.name || '',
          quantity: data.quantity,
          total: data.total_cents / 100,
          purchase_date: data.created_at,
          venue_name: data.events?.venue_name || '',
          date: data.events?.start_date || '',
          image: data.events?.image_url || '',
          description: data.events?.description || '',
          category: data.events?.category || '',
          payment_method: data.payment_method || '',
          guest_token: guestToken
        };
        // Save to My Tickets
        const existing = JSON.parse(localStorage.getItem('event_bookings') || '[]');
        localStorage.setItem('event_bookings', JSON.stringify([booking, ...existing].slice(0, 20)));

        // Clean URL so refresh doesn't re-trigger this flow
        window.history.replaceState({}, '', window.location.pathname);

        setBookingData(booking);
        setStage('ticket');

        // Mark paid + increment tier sold
        if (mpReturnStatus === 'success') {
          const { error: paidErr } = await supabase.rpc('mark_event_order_paid', {
            p_order_id: orderId,
            p_guest_token: guestToken
          });
          if (paidErr) console.error('[EventsView] mark_event_order_paid failed:', paidErr.message);

          if (data.tier_snapshot?.id && data.quantity) {
            await supabase.rpc('increment_event_tier_sold', {
              p_event_id: data.event_id,
              p_tier_id: data.tier_snapshot.id,
              p_quantity: data.quantity
            });
          }
        }
      } catch (err) {
        console.error('[EventsView] fetchOrder exception:', err);
      }
    };

    fetchOrder();
  }, [searchParams, tenantSlug]);

  const goToStage = (s) => {
    setStage(s);
    onStageChange?.(s);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    goToStage('detail');
  };

  const handleBook = (tier) => {
    setSelectedTier(tier);
    goToStage('checkout');
  };

  const handleConfirm = (booking) => {
    setBookingData(booking);
    setAllBookings(prev => [booking, ...prev]);
    goToStage('ticket');
  };

  const handleBack = () => {
    if (stage === 'detail') goToStage('discovery');
    if (stage === 'checkout') goToStage('detail');
    if (stage === 'my-tickets') goToStage('discovery');
    if (stage === 'ticket') {
      setBookingData(null);
      setSelectedEvent(null);
      setSelectedTier(null);
      goToStage('discovery');
    }
  };

  return (
    <div className="h-full bg-[var(--canvas-bg)] text-[var(--text-primary)] font-sans transition-colors duration-300">
      <div className="h-full w-full max-w-lg mx-auto">
          {stage === 'discovery' && (
            <EventDiscovery 
              events={events} 
              loading={eventsLoading}
              error={eventsError}
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
