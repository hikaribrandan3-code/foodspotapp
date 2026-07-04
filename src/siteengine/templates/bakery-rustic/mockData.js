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
    { id: 'bakers',    icon: '🍞', title: 'True Bakers',      desc: 'Certified bakers' },
    { id: 'oven',      icon: '🔥', title: 'Good Baked Oven',  desc: 'Premium ovens' },
    { id: 'delivery',  icon: '🚚', title: 'Free Delivery',    desc: 'Doorstep delivery' },
    { id: 'freshness', icon: '⏰', title: 'Hottest #ths time', desc: 'Always fresh' },
  ],
  specialOffers: [
    { id: 1, name: 'Happiness Starts Here', subtitle: 'Combo Offer - 3x', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', badge: null },
    { id: 2, name: 'Sweet Basket Set Taste', subtitle: 'Combo Offer - 5x', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', badge: null },
  ],
  tagline: 'Made Fresh For You!',
}
