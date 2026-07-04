/**
 * Placeholder data shape for the Burger Fun SiteEngine template.
 * Same contract pattern as other templates — real Supabase-wired version
 * fills this shape in later, no restructuring needed.
 */
export const mockBurgerFunData = {
  business: {
    name: 'Marco Good',
    heroIcon: '🍔',
    heroHeadline: 'THE BEST',
    heroHeadline2: 'BURGER',
    heroSub: 'Chickpeas. Pizza. Together at last. Just like our pasta, each one of our new crispy, doughy burgers is hand-crafted.',
    heroImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&q=85',
    heroBubble: 'YUMMY',
    heroBadge: 'BURGER IS MY PASSION',
  },
  featured: [
    { id: 1, name: 'BEEF BURGER', subtitle: 'Original', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
    { id: 2, name: 'CHICKEN BURGER', subtitle: 'Original', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&q=80' },
    { id: 3, name: 'TASTE OF MEXICO', subtitle: 'El Supremo', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80' },
  ],
  menu: [
    { id: 1, name: 'Beef Burger Original', desc: 'Beef patty, cheddar, lettuce, tomato, house sauce.', price: 12.50, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
    { id: 2, name: 'Chicken Burger Original', desc: 'Crispy chicken, pickles, mayo, shredded lettuce.', price: 11.90, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&q=80' },
    { id: 3, name: 'Taste Of Mexico El Supremo', desc: 'Spicy beef, jalapeños, pepper jack, chipotle mayo.', price: 13.90, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80' },
    { id: 4, name: 'Double Bacon Burger', desc: 'Double beef, double bacon, double cheddar.', price: 15.50, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80' },
  ],
  testimonials: [
    { quote: "I don't remember a single mouthful I didn't enjoy!", author: 'Sarah Johnson', source: 'Chowhound' },
    { quote: 'The most delicious burger I have ever tasted!', author: 'Michael Chen', source: 'BuzzFeed' },
    { quote: 'Simply incredible. A must-try for burger lovers.', author: 'Emma Davis', source: 'Los Angeles Times' },
  ],
  mentions: [
    { name: 'Chowhound', logo: '🍽️' },
    { name: 'BuzzFeed', logo: '📱' },
    { name: 'Los Angeles Times', logo: '📰' },
    { name: 'Forbes', logo: '💼' },
    { name: 'Muscle & Fitness', logo: '💪' },
    { name: 'Elite Daily', logo: '⭐' },
  ],
  info: {
    hours: 'Mon–Sun: 10:00 AM – 10:00 PM',
    address: '212 Sunset Blvd, Los Angeles',
    phone: '+1 (555) 077-3312',
  },
}
