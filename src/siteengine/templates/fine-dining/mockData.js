/**
 * Placeholder data shape for the Fine Dining SiteEngine template.
 * Same contract pattern as other templates — real Supabase-wired version
 * fills this shape in later, no restructuring needed.
 *
 * This is an ONLINE ORDERING site (not a brochure) — menu items carry real
 * prices and an "Add to Order" action, same as every other template.
 */
export const mockFineDiningData = {
  business: {
    name: 'Gourmet',
    tagline: 'Fine Dining Since 2010',
    heroEyebrow: 'A Taste Of Excellence',
    heroHeadline: 'Exquisite Flavor',
    heroSub: 'Chef-crafted dishes made with the finest seasonal ingredients, plated to perfection and delivered to your door.',
    heroImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=90',
  },
  process: [
    { id: 1, number: '01', title: 'Handpicked Ingredients', desc: 'Sourced daily from trusted local farms and purveyors.' },
    { id: 2, number: '02', title: 'Crafted By Our Chefs', desc: 'Every plate prepared by hand, never rushed.' },
    { id: 3, number: '03', title: 'Delivered With Care', desc: 'Packaged to arrive exactly as it left the kitchen.' },
  ],
  categories: [
    { id: 'starters', label: 'Starters' },
    { id: 'mains',    label: 'Main Course' },
    { id: 'desserts', label: 'Desserts' },
  ],
  items: [
    { id: 1, name: 'Seared Salmon',        desc: 'Pan-seared salmon, herb butter glaze, roasted rosemary.', price: 32, category: 'mains',    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&q=85' },
    { id: 2, name: 'Truffle Risotto',       desc: 'Slow-cooked arborio rice, black truffle, aged parmesan.', price: 28, category: 'mains',    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=500&q=85' },
    { id: 3, name: 'Wagyu Tartare',         desc: 'Hand-cut wagyu beef, quail egg, capers, crostini.',       price: 24, category: 'starters', image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=500&q=85' },
    { id: 4, name: 'Roasted Duck Breast',   desc: 'Five-spice duck, cherry reduction, charred endive.',      price: 36, category: 'mains',    image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=500&q=85' },
    { id: 5, name: 'Burrata & Heirloom',    desc: 'Creamy burrata, heirloom tomato, basil oil, sea salt.',   price: 18, category: 'starters', image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=500&q=85' },
    { id: 6, name: 'Chocolate Fondant',     desc: 'Warm molten chocolate cake, vanilla bean gelato.',        price: 14, category: 'desserts', image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&q=85' },
  ],
  featured: {
    title: "Chef's Table",
    dishes: [
      { id: 'f1', name: 'Herb-Crusted Lamb', price: 38, image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=500&q=85' },
      { id: 'f2', name: 'Garden Fresh Salad', price: 16, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&q=85' },
    ],
    aboutTitle: 'Our Story',
    aboutText: 'For over a decade we have brought fine dining directly to your table — the same care, plating, and ingredients as our dining room, delivered fresh to your door.',
  },
  info: {
    hours: 'Tue–Sun: 5:00 PM – 11:00 PM',
    address: '901 Vine Street, Uptown',
    phone: '+1 (555) 091-6650',
  },
}
