/**
 * Placeholder data shape for the Burger Dark SiteEngine template.
 * Same contract pattern as other templates — real Supabase-wired version
 * fills this shape in later, no restructuring needed.
 */
export const mockBurgerDarkData = {
  business: {
    name: 'Burger Spioszek',
    tagline: 'Premium Burgers',
    heroEyebrow: 'Crafted Fresh Daily',
    heroHeadline: 'Burger',
    heroHeadline2: 'Spioszek',
    heroSub: "200g of Wolfgang's special recipe beef, topped with caramelized onions, aged cheddar, and a secret sauce.",
    heroImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=90',
    heroCarouselIndex: '01',
    heroCarouselTotal: '04',
  },
  categories: [
    { id: 'burgers', label: 'Burgers' },
    { id: 'sides',   label: 'Sides' },
    { id: 'sauces',  label: 'Sauces' },
  ],
  burgers: [
    { id: 1, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=85' },
    { id: 2, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=85' },
    { id: 3, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&q=85' },
    { id: 4, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=85' },
    { id: 5, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=85' },
    { id: 6, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=85' },
    { id: 7, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&q=85' },
    { id: 8, name: 'Burger Czarnuszek', desc: 'Beef, aged cheddar, caramelized onions, secret sauce.', price: 26.90, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=85' },
  ],
  sides: {
    title: 'Wypasionych sałatek',
    subtitle: 'Our Salads',
    description: 'Fresh, crisp, seasonal vegetables dressed with house-made vinaigrette.',
    items: [
      { label: '180g mięsa', desc: 'Premium beef' },
      { label: 'Świeże składniki', desc: 'Fresh ingredients' },
    ],
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=85',
  },
  info: {
    hours: 'Pon–Ndz: 12:00 – 23:00',
    address: 'ul. Grillowa 12, Warszawa',
    phone: '+48 123 456 789',
  },
}
