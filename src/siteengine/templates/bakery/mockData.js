/**
 * Placeholder data shape for the Bakery SiteEngine template.
 * Same contract pattern as coffee-cafe/burger-qsr mockData.js — real
 * Supabase-wired version fills this shape in later, no restructuring needed.
 */
export const mockBakeryData = {
  business: {
    name: 'Bakery',
    tagline: 'Freshly Made, Daily',
    heroHeadline: 'Freshly Baked,',
    heroHeadline2: 'Just for You!',
    heroSub: 'Warm croissants, hand-shaped loaves, and cakes made from scratch — every single morning.',
    heroImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=85',
  },
  whyChooseUs: [
    { id: 'breads',   title: 'Artisan Breads',  desc: 'Slow-fermented sourdough and hand-shaped loaves, baked fresh every morning.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80' },
    { id: 'pastries', title: 'Sweet Pastries',  desc: 'Buttery croissants and laminated dough pastries, filled and finished by hand.', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80' },
    { id: 'cakes',    title: 'Custom Cakes',    desc: 'Made-to-order cakes for birthdays, weddings, and everything worth celebrating.', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80' },
  ],
  categories: [
    { id: 'croissants', label: 'Croissants' },
    { id: 'cakes',      label: 'Cakes' },
    { id: 'cupcakes',   label: 'Cupcakes' },
  ],
  items: [
    { id: 1, name: 'Butter Croissant',    desc: 'Hand-rolled layers of golden, flaky, buttery pastry.', price: 4.50, category: 'croissants', badge: 'Bestseller', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80' },
    { id: 2, name: 'Almond Croissant',    desc: 'Soaked in almond syrup, filled with frangipane, topped with sliced almonds.', price: 5.20, category: 'croissants', badge: null, image: 'https://images.unsplash.com/photo-1623334044303-241021148842?w=400&q=80' },
    { id: 3, name: 'Chocolate Croissant', desc: 'Two batons of dark chocolate wrapped in flaky laminated dough.', price: 4.90, category: 'croissants', badge: null, image: 'https://images.unsplash.com/photo-1623334044303-241021148842?w=400&q=80' },
    { id: 4, name: 'Strawberry Cake',     desc: 'Sponge layered with fresh strawberries and whipped cream frosting.', price: 6.80, category: 'cakes', badge: 'Bestseller', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80' },
    { id: 5, name: 'Red Velvet',          desc: 'Cocoa-tinted sponge with a silky cream cheese frosting.', price: 6.20, category: 'cakes', badge: null, image: 'https://images.unsplash.com/photo-1586985289906-406988974504?w=400&q=80' },
    { id: 6, name: 'Cheesecake',          desc: 'Baked slow over low heat, finished with a buttery biscuit base.', price: 6.40, category: 'cakes', badge: null, image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80' },
    { id: 7, name: 'Vanilla Cupcake',     desc: 'Classic vanilla bean sponge, swirled with vanilla buttercream.', price: 3.20, category: 'cupcakes', badge: null, image: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=400&q=80' },
    { id: 8, name: 'Chocolate Cupcake',   desc: 'Rich cocoa sponge topped with dark chocolate ganache.', price: 3.40, category: 'cupcakes', badge: 'Bestseller', image: 'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=400&q=80' },
    { id: 9, name: 'Strawberry Cupcake',  desc: 'Strawberry-filled sponge, topped with pink strawberry buttercream.', price: 3.40, category: 'cupcakes', badge: null, image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=400&q=80' },
  ],
  gallery: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80',
    'https://images.unsplash.com/photo-1623334044303-241021148842?w=500&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80',
    'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=500&q=80',
  ],
}
