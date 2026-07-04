/**
 * Placeholder data shape for the Coffee/Cafe SiteEngine template.
 *
 * This is the CONTRACT the real Supabase-wired version will fill in later —
 * business info, categories, and items map 1:1 to what a tenant's menu
 * table + app_config would provide. Keeping the shape realistic now means
 * swapping this file for a live data hook is a drop-in change, not a rewrite.
 */
export const mockCafeData = {
  business: {
    name: 'Drinko',
    tagline: 'Welcome',
    heroHeadline: { left: 'ORDER', right: 'COFFEE' },
    heroImage: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1200&q=80',
  },
  categories: [
    { id: 'iced',      label: 'Iced Coffee' },
    { id: 'milk',      label: 'Milk-Based Coffee' },
    { id: 'classic',   label: 'Classic Coffee' },
    { id: 'specialty', label: 'Specialty Coffee' },
    { id: 'sweet',     label: 'Sweet Coffee' },
  ],
  items: [
    { id: 1, name: 'Espresso',     desc: 'Pure strong coffee',            price: 5.70, category: 'classic',   image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80' },
    { id: 2, name: 'Americano',    desc: 'Espresso + hot water',          price: 4.50, category: 'classic',   image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80' },
    { id: 3, name: 'Latte',        desc: 'Espresso + lots of milk + little foam', price: 4.30, category: 'milk', image: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&q=80' },
    { id: 4, name: 'Macchiato',    desc: 'Espresso + small milk foam',    price: 5.50, category: 'milk',      image: 'https://images.unsplash.com/photo-1608649571417-a5da51e6f0e9?w=400&q=80' },
    { id: 5, name: 'Irish Coffee', desc: 'Coffee + whiskey + cream',      price: 5.40, category: 'specialty', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80' },
    { id: 6, name: 'Flat White',   desc: 'Espresso + thin layer of milk foam', price: 4.20, category: 'milk',  image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80' },
    { id: 7, name: 'Lungo',        desc: 'Long espresso, more water',     price: 4.80, category: 'classic',   image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80' },
    { id: 8, name: 'Vienna Coffee',desc: 'Espresso + whipped cream',      price: 5.20, category: 'sweet',     image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80' },
  ],
  featuredDrink: {
    label: 'New drink',
    name: 'Iced Latte',
    description: 'A refreshing coffee drink made with espresso, cold milk, and ice. It has a smooth, light flavor, balancing the strength of espresso with the creaminess of milk. Perfect for hot days or when you want a cool, energizing coffee without being too strong.',
    price: 6.50,
    originalPrice: 7.80,
    tags: [
      { label: '3', sub: 'Syrups', detail: 'vanilla, caramel, hazelnut' },
      { label: 'With', sub: 'espresso + cold milk + ice' },
      { label: '20%', sub: 'Sale' },
    ],
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80',
  },
}
