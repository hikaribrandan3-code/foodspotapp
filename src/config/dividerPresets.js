// Menu/Pedido Header Divider Presets
// FOOD-RELATED ONLY - v1 cleanup
// Owner selects from presets, NO uploads for v1

export const DIVIDER_PRESETS = [
    {
        id: 'coffee-beans',
        name: 'Granos de café',
        url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&h=200&fit=crop&q=80',
        category: 'cafe'
    },
    {
        id: 'latte-art',
        name: 'Latte Art',
        url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&h=200&fit=crop&q=80',
        category: 'cafe'
    },
    {
        id: 'bakery-bread',
        name: 'Pan artesanal',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=200&fit=crop&q=80',
        category: 'bakery'
    },
    {
        id: 'pastries',
        name: 'Facturas y dulces',
        url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=200&fit=crop&q=80',
        category: 'bakery'
    },
    {
        id: 'fresh-ingredients',
        name: 'Ingredientes frescos',
        url: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'sandwich-closeup',
        name: 'Sándwich artesanal',
        url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'tropical-juice',
        name: 'Bebidas tropicales',
        url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&h=200&fit=crop&q=80',
        category: 'drinks'
    },
    {
        id: 'smoothie-bowl',
        name: 'Bowl de frutas',
        url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'cafe-interior',
        name: 'Interior de café',
        url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&h=200&fit=crop&q=80',
        category: 'cafe'
    },
    {
        id: 'avocado-toast',
        name: 'Tostada de palta',
        url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'espresso-machine',
        name: 'Máquina de espresso',
        url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=200&fit=crop&q=80',
        category: 'cafe'
    },
    {
        id: 'pizza-slice',
        name: 'Pizza artesanal',
        url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'burger-closeup',
        name: 'Hamburgesa gourmet',
        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'empanadas',
        name: 'Empanadas doradas',
        url: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'fresh-dough',
        name: 'Masa fresca',
        url: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=800&h=200&fit=crop&q=80',
        category: 'bakery'
    }
]

// Get preset by ID
export function getDividerPreset(id) {
    return DIVIDER_PRESETS.find(p => p.id === id) || null
}

// Get presets by category
export function getDividersByCategory(category) {
    if (!category) return DIVIDER_PRESETS
    return DIVIDER_PRESETS.filter(p => p.category === category)
}
