export const getMockEvents = (businessId = 'demo') => [
  {
    id: 'evt_001',
    name: 'Neon Tech Summit 2026',
    start_date: '2026-06-15',
    time: '14:00',
    description: 'An exclusive deep dive into the future of food technology and sustainable automation. Join industry leaders for a day of innovation.',
    location: 'Cyber Park Convention Center',
    venue_name: 'Main Hall A',
    image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_vip_table', name: 'VIP Table for 4', price: 120000, qty: 10 },
      { id: 'tier_vip', name: 'VIP Pass', price: 25000, qty: 50 },
      { id: 'tier_regular', name: 'General Admission', price: 9500, qty: 200 }
    ],
    category: 'Exclusives',
    business_id: businessId
  },
  {
    id: 'evt_002',
    name: 'Midnight Market Sessions',
    start_date: '2026-05-28',
    time: '21:00',
    description: 'Live jazz, craft cocktails, and the best night vibes in the city. A recurring session for those who appreciate the finer things.',
    location: 'The Velvet Lounge',
    venue_name: 'The Velvet Lounge',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_vip', name: 'VIP Pass', price: 7500, qty: 30 },
      { id: 'tier_regular', name: 'General Admission', price: 3000, qty: 100 }
    ],
    category: 'Music',
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_003',
    name: 'Summer Garden Acoustics',
    start_date: '2026-07-04',
    time: '16:00',
    description: 'Relaxed acoustic performances in our open-air garden. Perfect for families and weekend relaxation.',
    location: 'Botanical Bistro Terrace',
    venue_name: 'Bistro Terrace',
    image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_free', name: 'General Admission', price: 0, qty: 500 }
    ],
    category: 'Free',
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_004',
    name: 'Electronic Echoes Festival',
    start_date: '2026-08-12',
    time: '18:00',
    description: 'A massive celebration of electronic music featuring international DJs and immersive light shows.',
    location: 'Starlight Stadium',
    venue_name: 'Stadium Ground',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_vip_table', name: 'VIP Deck Table', price: 150000, qty: 5 },
      { id: 'tier_vip', name: 'VIP Pass', price: 35000, qty: 100 },
      { id: 'tier_early', name: 'Early Bird', price: 8500, qty: 500 },
      { id: 'tier_regular', name: 'General Admission', price: 12000, qty: 1000 }
    ],
    category: 'Festivals',
    business_id: 'foodspot_hq_001'
  },
  {
    id: 'evt_005',
    name: 'Secret Sneaker Pop-Up',
    start_date: '2026-05-30',
    time: '10:00',
    description: 'Limited edition drops and exclusive collaborations. First come, first served. Location revealed 24h before.',
    location: 'Secret Location, DT',
    venue_name: 'The Vault',
    image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop',
    tiers: [
      { id: 'tier_free', name: 'General Admission', price: 0, qty: 200 }
    ],
    category: 'Pop-ups',
    business_id: 'foodspot_hq_001'
  }
];
