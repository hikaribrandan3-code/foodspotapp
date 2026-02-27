/**
 * FoodSpot Editor — Theme Engine
 * 5 Deterministic presets with color, font, and layout definitions.
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
        bg: '#1A1512',
        accent: '#C8956C',
        text: '#F5F0EB',
        categoryColor: '#C8956C',
        fontPairing: 'playfair',
        bgTexture: 'radial-gradient(circle at 20% 80%, rgba(200,149,108,0.06) 0%, transparent 50%)'
    },
    {
        id: 'burger',
        name: 'Burger',
        icon: '🍔',
        bg: '#212121',
        accent: '#E74C3C',
        text: '#FFFFFF',
        categoryColor: '#E74C3C',
        fontPairing: 'oswald',
        bgTexture: 'radial-gradient(circle at 80% 20%, rgba(231,76,60,0.05) 0%, transparent 50%)'
    },
    {
        id: 'asian',
        name: 'Asian',
        icon: '🍜',
        bg: '#1C1C2E',
        accent: '#F0C040',
        text: '#F5F5F5',
        categoryColor: '#F0C040',
        fontPairing: 'poppins',
        bgTexture: 'radial-gradient(circle at 50% 50%, rgba(240,192,64,0.04) 0%, transparent 60%)'
    },
    {
        id: 'street',
        name: 'Street',
        icon: '🌮',
        bg: '#2D2D2D',
        accent: '#4CAF50',
        text: '#FAFAFA',
        categoryColor: '#4CAF50',
        fontPairing: 'oswald',
        bgTexture: 'linear-gradient(135deg, rgba(76,175,80,0.03) 0%, transparent 100%)'
    },
    {
        id: 'bistro',
        name: 'Bistro',
        icon: '🍷',
        bg: '#F8F4EF',
        accent: '#8B4513',
        text: '#2C1810',
        categoryColor: '#8B4513',
        fontPairing: 'playfair',
        bgTexture: 'none'
    }
]

export function getThemeById(id) {
    return THEMES.find(t => t.id === id) || THEMES[1] // Default: Burger
}

export function getFontPairing(id) {
    return FONT_PAIRINGS.find(f => f.id === id) || FONT_PAIRINGS[0]
}
