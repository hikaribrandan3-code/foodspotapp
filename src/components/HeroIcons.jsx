/**
 * HeroIcons.jsx - SINGLE SOURCE OF TRUTH
 * 
 * These are the ONLY valid hero icons for the entire app.
 * Used by: Home.jsx, HeroIconPicker.jsx
 * 
 * Rules:
 * - All icons render at 36x36
 * - All use fill="currentColor" (inherits from parent)
 * - No hardcoded colors
 * - No inline styles
 */

// --- MENU: Fork/Knife/Spoon ---
export const MenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40Zm-96.11-1.31a8,8,0,1,0-15.78,2.63L111.89,88H88V40a8,8,0,0,0-16,0V88H48.11l7.78-46.68a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z"></path>
    </svg>
)

// --- ENVÍOS: Moped Delivery (CANONICAL - LOCKED) ---
export const DeliveryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M208,40H167.2a40,40,0,0,0-78.4,0H48a8,8,0,0,0,0,16H88.8a40,40,0,0,0,12.58,21.82A64.08,64.08,0,0,0,64,136v64a16,16,0,0,0,16,16H96a32,32,0,0,0,64,0h16a16,16,0,0,0,16-16V136a64.08,64.08,0,0,0-37.38-58.18A40,40,0,0,0,167.2,56H208a8,8,0,0,0,0-16ZM144,216a16,16,0,0,1-32,0V168a16,16,0,0,1,32,0ZM128,72a24,24,0,1,1,24-24A24,24,0,0,1,128,72Z" />
    </svg>
)

// --- PROMOS: Sale Tag Icon ---
export const PromosIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208Zm-64-76a12,12,0,1,1-12,12A12,12,0,0,1,144,132Zm-32,0a12,12,0,1,1-12,12A12,12,0,0,1,112,132Zm0,40a12,12,0,1,1-12,12A12,12,0,0,1,112,172Zm32,0a12,12,0,1,1-12,12A12,12,0,0,1,144,172Z"></path>
    </svg>
)

// --- GAME: Controller ---
export const GameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M247.44,173.75a.68.68,0,0,0,0-.14L231.05,89.44c0-.06,0-.12,0-.18A60.08,60.08,0,0,0,172,40H83.89a59.88,59.88,0,0,0-59,49.52L8.58,173.61a.68.68,0,0,0,0,.14,36,36,0,0,0,60.9,31.71l.35-.37L109.52,160h37l39.71,45.09c.11.13.23.25.35.37A36.08,36.08,0,0,0,212,216a36,36,0,0,0,35.43-42.25ZM104,112H96v8a8,8,0,0,1-16,0v-8H72a8,8,0,0,1,0-16h8V88a8,8,0,0,1,16,0v8h8a8,8,0,0,1,0,16Zm40-8a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H152A8,8,0,0,1,144,104Zm84.37,87.47a19.84,19.84,0,0,1-12.9,8.23A20.09,20.09,0,0,1,198,194.31L167.8,160H172a60,60,0,0,0,51-28.38l8.74,45A19.82,19.82,0,0,1,228.37,191.47Z"></path>
    </svg>
)

// --- EVENTS: Calendar / Ticket ---
export const EventsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208Zm-64-76a12,12,0,1,1-12,12A12,12,0,0,1,144,132Zm-32,0a12,12,0,1,1-12,12A12,12,0,0,1,112,132Zm0,40a12,12,0,1,1-12,12A12,12,0,0,1,112,172Zm32,0a12,12,0,1,1-12,12A12,12,0,0,1,144,172Z"></path>
    </svg>
)

// Icon map for dynamic lookup
export const HERO_ICONS = {
    menu: MenuIcon,
    delivery: DeliveryIcon,
    promos: PromosIcon,
    game: GameIcon,
    rewards: PromosIcon, // Alias for backward compatibility
    events: EventsIcon
}

// Labels for display
export const HERO_LABELS = {
    menu: 'Menú',
    delivery: 'Envíos',
    promos: 'Promos',
    game: 'Juego',
    rewards: 'Promos', // Alias for backward compatibility
    events: 'Eventos'
}
