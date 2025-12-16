// Menu/Pedido Header Divider Presets
// ~12-15 preset landscape slim banners (aspect ~4:1 or 5:1)
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
        id: 'wooden-table',
        name: 'Mesa de madera',
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=200&fit=crop&q=80',
        category: 'neutral'
    },
    {
        id: 'marble-surface',
        name: 'Mármol elegante',
        url: 'https://images.unsplash.com/photo-1558618047-f4b4e200e9b3?w=800&h=200&fit=crop&q=80',
        category: 'neutral'
    },
    {
        id: 'plants-minimal',
        name: 'Plantas minimalistas',
        url: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&h=200&fit=crop&q=80',
        category: 'neutral'
    },
    {
        id: 'sandwich-closeup',
        name: 'Sándwich artesanal',
        url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=200&fit=crop&q=80',
        category: 'food'
    },
    {
        id: 'juice-fruits',
        name: 'Jugos y frutas',
        url: 'https://images.unsplash.com/photo-1622597467836-f3e6707f8c9c?w=800&h=200&fit=crop&q=80',
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
        id: 'warm-tones',
        name: 'Tonos cálidos',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=200&fit=crop&q=80',
        category: 'neutral'
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
