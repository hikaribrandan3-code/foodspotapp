/**
 * Placeholder data shape for the Burger/QSR SiteEngine template.
 * Same contract pattern as coffee-cafe/mockData.js — real Supabase-wired
 * version fills this shape in later, no restructuring needed.
 */
export const mockBurgerData = {
  business: {
    name: 'Burger District',
    heroEyebrow: 'Explore Our Menu',
    heroHeadline: 'Order Your Favorites in Minutes',
    heroSub: 'Juicy burgers, crispy sides, and ice-cold drinks — delivered fast across town.',
    heroImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80',
  },
  highlights: [
    { id: 'ordered',  title: 'Most Ordered',   subtitle: 'The crowd favorites',      image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80' },
    { id: 'cheese',   title: 'Extra Cheesy',   subtitle: 'For the cheese pull',      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80' },
    { id: 'bacon',    title: 'Loaded Bacon',   subtitle: 'Smoky, crispy, stacked',   image: 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=500&q=80' },
  ],
  categories: [
    { id: 'signature', label: 'Signature Burgers' },
    { id: 'chicken',   label: 'Chicken Burgers' },
    { id: 'beef',      label: 'Beef Burgers' },
    { id: 'sides',     label: 'Sides' },
    { id: 'drinks',    label: 'Drinks' },
  ],
  items: [
    { id: 1, name: 'Classic Beef Burger', desc: 'Juicy beef patty, lettuce, tomato, pickles, onion, burger sauce.', price: 24, category: 'signature', badge: 'Best Seller', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
    { id: 2, name: 'Spicy Chicken Burger', desc: 'Crispy chicken, spicy mayo, lettuce, pickles, jalapeños.', price: 27, category: 'chicken', badge: 'Spicy', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&q=80' },
    { id: 3, name: 'Double Cheese Burger', desc: 'Double beef patties, double cheese, pickles, onion.', price: 34, category: 'beef', badge: 'Hot Deal', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80' },
    { id: 4, name: 'Loaded Cheese Fries',  desc: 'Crispy fries loaded with cheese sauce and jalapeños.', price: 18, category: 'sides', badge: null, image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&q=80' },
    { id: 5, name: 'Smoky BBQ Burger',     desc: 'Beef patty, BBQ sauce, onion rings, cheddar, smoky mayo.', price: 28, category: 'signature', badge: null, image: 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=400&q=80' },
    { id: 6, name: 'Mushroom Swiss Burger',desc: 'Beef patty, sautéed mushrooms, swiss cheese, garlic mayo.', price: 28, category: 'beef', badge: 'Best Seller', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80' },
    { id: 7, name: 'Truffle Parmesan Fries', desc: 'Crispy fries tossed with truffle oil, parmesan, and herbs.', price: 20, category: 'sides', badge: 'Hot Deal', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80' },
    { id: 8, name: 'Classic Cola',         desc: 'Ice-cold cola, 500ml.', price: 6, category: 'drinks', badge: null, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80' },
  ],
  cart: {
    items: [
      { id: 1, name: 'Classic Beef Burger', qty: 1, price: 24 },
      { id: 4, name: 'Loaded Cheese Fries', qty: 1, price: 18 },
      { id: 8, name: 'Classic Cola', qty: 1, price: 6 },
    ],
    deliveryFee: 7,
    taxRate: 0.05,
  },
}
