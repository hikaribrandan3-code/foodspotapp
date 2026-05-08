// Event templates for quick creation — based on successful demo events
export const EVENT_TEMPLATES = [
  {
    id: 'evt_001',
    status: 'template',
    name: 'Neon Tech Summit 2026',
    description: 'An exclusive deep dive into the future of food technology and sustainable automation. Join industry leaders for a day of innovation.',
    category: 'Exclusives',
    venue_name: 'Main Hall A',
    address: 'Cyber Park Convention Center',
    image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-06-15T14:00:00',
    ticket_tiers: [
      { name: 'VIP Table for 4', price: 1200, capacity: 10 },
      { name: 'VIP Pass', price: 250, capacity: 50 },
      { name: 'General Admission', price: 95, capacity: 200 }
    ]
  },
  {
    id: 'evt_002',
    status: 'template',
    name: 'Midnight Market Sessions',
    description: 'Live jazz, craft cocktails, and the best night vibes in the city. A recurring session for those who appreciate the finer things.',
    category: 'Music',
    venue_name: 'The Velvet Lounge',
    address: 'The Velvet Lounge',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-05-28T21:00:00',
    ticket_tiers: [
      { name: 'VIP Pass', price: 75, capacity: 30 },
      { name: 'General Admission', price: 30, capacity: 100 }
    ]
  },
  {
    id: 'evt_004',
    status: 'template',
    name: 'Electronic Echoes Festival',
    description: 'A massive celebration of electronic music featuring international DJs and immersive light shows.',
    category: 'Festivals',
    venue_name: 'Stadium Ground',
    address: 'Starlight Stadium',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-08-12T18:00:00',
    ticket_tiers: [
      { name: 'VIP Lounge North', price: 450, capacity: 50 },
      { name: 'VIP Lounge South', price: 450, capacity: 50 },
      { name: 'Front Row Tables', price: 1800, capacity: 12 },
      { name: 'GA Field Access', price: 150, capacity: 5000 }
    ]
  },
  {
    id: 'evt_006',
    status: 'template',
    name: 'Gourmet Food Truck Rally',
    description: 'Over 50 premium food trucks gathered for a weekend of epicurean delight. Live music and local brews.',
    category: 'Festivals',
    venue_name: 'The Great Lawn',
    address: 'Riverside Park',
    image_url: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-06-05T11:00:00',
    ticket_tiers: [
      { name: 'Entry Pass', price: 15, capacity: 1000 },
      { name: 'Tasting Ticket (Inc 5 Tokens)', price: 45, capacity: 500 }
    ]
  },
  {
    id: 'evt_007',
    status: 'template',
    name: 'Night with Amigos & Singles Speed Dating',
    description: 'Tired of apps? Meet real people in a relaxed environment. Speed dating in the first hour, party with amigos after. Your first drink is on us.',
    category: 'Social',
    venue_name: 'Live Stage Room',
    address: 'The Roxy Bar',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-05-20T20:00:00',
    ticket_tiers: [
      { name: 'Single Entry', price: 25, capacity: 100 },
      { name: 'Duo Pack (Bring a wingman)', price: 40, capacity: 50 }
    ]
  },
  {
    id: 'evt_008',
    status: 'template',
    name: 'Mundo Lingo: Buenos Aires Intercambio',
    description: 'The legendary language exchange event. Grab your flags, find your language, and make friends from all over the world. No pressure, just good vibes.',
    category: 'Exclusives',
    venue_name: 'The Garden',
    address: 'Milion Bar',
    image_url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-05-15T20:30:00',
    ticket_tiers: [
      { name: 'General Admission (Free)', price: 0, capacity: 500 }
    ]
  },
  {
    id: 'evt_009',
    status: 'template',
    name: 'Mundial: Argentina vs Brazil Game Night',
    description: 'The biggest rivalry in football. Watch the game on our giant screens with live commentary, fresh choripanes, and ice-cold drinks. VAMOS ARGENTINA!',
    category: 'Sports',
    venue_name: 'Main Screen Arena',
    address: 'El Club de la Birra',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-06-18T16:00:00',
    ticket_tiers: [
      { name: 'General Admission', price: 20, capacity: 300 },
      { name: 'Reserved Table + Choripán', price: 45, capacity: 20 }
    ]
  },
  {
    id: 'evt_010',
    status: 'template',
    name: 'Vinyl & Wine Evening',
    description: 'Listen to classic records while tasting hand-picked natural wines from around the world.',
    category: 'Music',
    venue_name: 'The Listening Room',
    address: 'Vintage Cellar',
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-05-22T19:00:00',
    ticket_tiers: [
      { name: 'Tasting Pass', price: 40, capacity: 40 }
    ]
  },
  {
    id: 'evt_011',
    status: 'template',
    name: 'Pokemon TCG: Regional Qualifier BA',
    description: 'The road to the World Championships starts here. Competitive Swiss rounds, top-cut playoffs, and a dedicated trading area for collectors.',
    category: 'Gaming',
    venue_name: 'Pavilion 4',
    address: 'Centro Costa Salguero',
    image_url: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-07-04T10:00:00',
    ticket_tiers: [
      { name: 'Competitor Entry', price: 30, capacity: 256 },
      { name: 'Spectator Pass', price: 10, capacity: 500 }
    ]
  },
  {
    id: 'evt_012',
    status: 'template',
    name: 'Anime Expo & Cosplay Cup BA',
    description: 'The biggest celebration of Japanese culture in South America. Massive cosplay contest, international guests, and the legendary Artist Alley.',
    category: 'Exclusives',
    venue_name: 'Ocre Pavilion',
    address: 'La Rural',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    start_date: '2026-08-20T12:00:00',
    ticket_tiers: [
      { name: 'Day Pass', price: 20, capacity: 5000 },
      { name: 'VIP Meet & Greet', price: 85, capacity: 200 }
    ]
  }
];
