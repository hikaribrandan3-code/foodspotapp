/**
 * Placeholder data shape for the Bakery Rustic SiteEngine template.
 * Same contract pattern as other templates — real Supabase-wired version
 * fills this shape in later, no restructuring needed.
 */
export const mockBakeryRusticData = {
  business: {
    name: 'Inside Insane Bakery',
    tagline: '100% Natural. Fresh Food Ever.',
    heroHeadline: 'We always care',
    heroHeadline2: 'about our product quality & service',
    heroSub: 'We are the bread factory that makes finest quality products available fresh, directly to your doorstep.',
    heroCTA1: 'About Us',
    heroCTA2: 'Our Delivery',
    heroImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=85',
    promoImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=85',
    promoDiscount: '25% Off',
  },
  features: [
    { id: 'bakers',    icon: 'bread',    title: 'True Bakers',      desc: 'Certified bakers' },
    { id: 'oven',      icon: 'oven',     title: 'Good Baked Oven',  desc: 'Premium ovens' },
    { id: 'delivery',  icon: 'delivery', title: 'Free Delivery',    desc: 'Doorstep delivery' },
    { id: 'freshness', icon: 'clock',    title: 'Always Fresh',     desc: 'Baked every morning' },
  ],
  categories: [
    { id: 'bread',   label: 'Bread' },
    { id: 'pastry',  label: 'Pastry' },
  ],
  items: [
    { id: 1, name: 'Sourdough Loaf',    desc: 'Slow-fermented, hand-shaped, baked fresh.', price: 6.50, category: 'bread',  image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80' },
    { id: 2, name: 'Multigrain Loaf',   desc: 'Seeded crust, dense crumb, whole grains.',   price: 5.90, category: 'bread',  image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80' },
    { id: 3, name: 'Sweet Basket Set',  desc: 'A rotating basket of daily sweet pastries.', price: 9.90, category: 'pastry', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80' },
    { id: 4, name: 'Cinnamon Roll',     desc: 'Warm, gooey, hand-rolled cinnamon swirl.',   price: 4.20, category: 'pastry', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80' },
  ],
  specialOffers: [
    { id: 1, name: 'Happiness Starts Here', subtitle: 'Combo Offer - 3x', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', badge: null },
    { id: 2, name: 'Sweet Basket Set Taste', subtitle: 'Combo Offer - 5x', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', badge: null },
  ],
  tagline: 'Made Fresh For You!',
  info: {
    hours: 'Mon–Sat: 6:00 AM – 7:00 PM',
    address: '19 Wheatfield Lane, Millbrook',
    phone: '+1 (555) 038-1190',
  },
}
