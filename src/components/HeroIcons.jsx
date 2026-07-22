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

// --- PROMOS: Events Ticket Icon ---
export const PromosIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5713 14.5L9.46583 18.4141M18.9996 3.60975C17.4044 3.59505 16.6658 4.33233 16.4236 5.07743C16.2103 5.73354 16.4052 7.07735 15.896 8.0727C15.4091 9.02443 14.1204 9.5617 12.6571 9.60697M20 7.6104L20.01 7.61049M19 15.96L19.01 15.9601M7.00001 3.94926L7.01001 3.94936M19 11.1094C17.5 11.1094 16.5 11.6094 15.5949 12.5447M10.2377 7.18796C11 6.10991 11.5 5.10991 11.0082 3.52734M3.53577 20.4645L7.0713 9.85791L14.1424 16.929L3.53577 20.4645Z" />
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
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5713 14.5L9.46583 18.4141M18.9996 3.60975C17.4044 3.59505 16.6658 4.33233 16.4236 5.07743C16.2103 5.73354 16.4052 7.07735 15.896 8.0727C15.4091 9.02443 14.1204 9.5617 12.6571 9.60697M20 7.6104L20.01 7.61049M19 15.96L19.01 15.9601M7.00001 3.94926L7.01001 3.94936M19 11.1094C17.5 11.1094 16.5 11.6094 15.5949 12.5447M10.2377 7.18796C11 6.10991 11.5 5.10991 11.0082 3.52734M3.53577 20.4645L7.0713 9.85791L14.1424 16.929L3.53577 20.4645Z" />
    </svg>
)

// --- DEPORTES: Trophy (shown instead of Events when sports_settings.enabled) ---
export const SportsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M232,64H208V56a16,16,0,0,0-16-16H64A16,16,0,0,0,48,56v8H24A16,16,0,0,0,8,80v16a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.61A80.13,80.13,0,0,0,204.35,136H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4.05.34,8Zm160-16.53c0,32.36-26.28,58.8-58.61,59.53A56.34,56.34,0,0,1,64,120V56H192v47.36ZM232,96a24,24,0,0,1-24,24h-.34q.34-3.95.34-8V80h24Z"></path>
    </svg>
)

// Icon map for dynamic lookup
export const HERO_ICONS = {
    menu: MenuIcon,
    delivery: DeliveryIcon,
    events: EventsIcon,
    game: GameIcon,
    promos: EventsIcon, // Alias for backward compatibility
    rewards: EventsIcon, // Alias for backward compatibility
    deportes: SportsIcon
}

// Labels for display
export const HERO_LABELS = {
    menu: 'Menú',
    delivery: 'Envíos',
    events: 'Eventos',
    game: 'Juego',
    promos: 'Eventos', // Alias for backward compatibility
    rewards: 'Eventos', // Alias for backward compatibility
    deportes: 'Deportes'
}
