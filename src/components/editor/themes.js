/**
 * FoodSpot Editor — Theme Engine V2
 * 5 Light, print-optimized presets. Zero ink waste.
 */

export const FONT_PAIRINGS = [
    { id: 'oswald', heading: "'Oswald', sans-serif", body: "'Montserrat', sans-serif", label: 'Oswald Bold & Montserrat' },
    { id: 'playfair', heading: "'Playfair Display', serif", body: "'Lato', sans-serif", label: 'Playfair & Lato' },
    { id: 'poppins', heading: "'Poppins', sans-serif", body: "'Open Sans', sans-serif", label: 'Poppins & Open Sans' }
]

export const THEMES = [
    {
        id: 'cafe',
        name: 'Cafe',
        icon: '☕',
        bg: '#FDF8F3',
        accent: '#8B6F47',
        text: '#3D2B1F',
        categoryColor: '#8B6F47',
        fontPairing: 'playfair'
    },
    {
        id: 'burger',
        name: 'Burger',
        icon: '🍔',
        bg: '#FFFFFF',
        accent: '#E74C3C',
        text: '#1A1A1A',
        categoryColor: '#E74C3C',
        fontPairing: 'oswald'
    },
    {
        id: 'asian',
        name: 'Asian',
        icon: '🍜',
        bg: '#FFF9F0',
        accent: '#D4A017',
        text: '#2C2C2C',
        categoryColor: '#D4A017',
        fontPairing: 'poppins'
    },
    {
        id: 'street',
        name: 'Street',
        icon: '🌮',
        bg: '#F5FFF5',
        accent: '#2E7D32',
        text: '#1B1B1B',
        categoryColor: '#2E7D32',
        fontPairing: 'oswald'
    },
    {
        id: 'bistro',
        name: 'Bistro',
        icon: '🍷',
        bg: '#F8F4EF',
        accent: '#8B4513',
        text: '#2C1810',
        categoryColor: '#8B4513',
        fontPairing: 'playfair'
    }
]

export function getThemeById(id) {
    return THEMES.find(t => t.id === id) || THEMES[1] // Default: Burger
}

export function getFontPairing(id) {
    return FONT_PAIRINGS.find(f => f.id === id) || FONT_PAIRINGS[0]
}
