// App Configuration - Editable by Super Admin
// All business branding and feature toggles

export const defaultConfig = {
    // Business Identity
    businessName: "Grub Club",
    logo: null, // URL or base64 data URI

    // ============================================
    // ORDER MODE
    // ============================================
    // "A1" = Budoni / Pre-Made Food
    //        - Fast pickup, prep independent of payment
    //        - May prepare food before payment
    //        - Selfie prompt AFTER payment (future)
    //
    // "A2" = Café / Bakery / Vendor
    //        - MUST confirm payment before preparing
    //        - Selfie prompt 3-4s AFTER delivery (future)
    //
    // "B"  = Fine Dining
    //        - Food delivered first
    //        - Payment confirmed at the end
    // ============================================
    orderMode: "A1",

    // Color Theme (matches warm beige/brown palette)
    colors: {
        primary: "#8B7355",
        primaryDark: "#6B5A45",
        primaryLight: "#A89070",
        background: "#F5F0E8",
        card: "#E8DFD3",
        cardHover: "#DED4C6",
        text: "#4A3F35",
        textMuted: "#7A6F65",
        success: "#5A8B55",
        warning: "#B8860B",
        error: "#A85555",
        confirmation: "#22C55E", // Third color slot: confirmation/success actions
    },

    // Branding Customization (Owner-controlled)
    branding: {
        fontFamily: "Inter", // Selected from curated list
        fontWeight: "normal", // "light" | "normal" | "semibold" | "bold"
        poweredByColor: "#C4856A", // Separate color for "Powered by @foodspotapp"
    },

    // Feature Toggles
    features: {
        ordersEnabled: true,
        rewardsEnabled: true,
        gameEnabled: true,
        instagramSharingEnabled: true,
    },

    // System States
    demoMode: false, // Only Super Admin can toggle
    maintenanceMode: false,
    maintenanceMessage: "Estamos en mantenimiento. ¡Volvemos pronto!",
    pauseOrders: false,
    pauseOrdersMessage: "Estamos preparando pedidos. Volvé en unos minutos.",

    // Opening Hours (24h format)
    openingHours: {
        monday: { open: "08:00", close: "20:00", closed: false },
        tuesday: { open: "08:00", close: "20:00", closed: false },
        wednesday: { open: "08:00", close: "20:00", closed: false },
        thursday: { open: "08:00", close: "20:00", closed: false },
        friday: { open: "08:00", close: "21:00", closed: false },
        saturday: { open: "09:00", close: "21:00", closed: false },
        sunday: { open: "09:00", close: "18:00", closed: false },
    },

    // Rewards Configuration
    rewards: {
        stampsRequired: 10, // Stamps needed for reward
        rewardDescription: "¡Café gratis!",
    },

    // Business Info
    businessInfo: {
        address: "Av. Corrientes 1234, CABA",
        phone: "+54 11 1234-5678",
        whatsapp: "+5491112345678", // For wa.me link
        instagram: "@grubclub.ar",
        googleMapsLink: "https://maps.google.com/?q=Av.+Corrientes+1234,+CABA",
        description: "Tu café de barrio favorito ☕",
    },

    // Info Display Toggles (Owner/Super can toggle)
    infoDisplay: {
        showWhatsApp: true,
        showHours: true,
        showAddress: true,
        showMapLink: true,
    },

    // External Ordering Links (Owner/Super can configure)
    externalOrdering: {
        rappiEnabled: false,
        rappiUrl: '',
        pedidosYaEnabled: false,
        pedidosYaUrl: '',
    },

    // Payment Methods (Owner/Super can configure)
    payments: {
        mercadoPagoAlias: '', // If set, shows "Pagar con Mercado Pago" button in Info
    },

    // Featured Photos (EXACTLY 4 slots - Owner/Super can upload custom images)
    featuredPhotos: [
        { slot: 1, image: null, menuItemId: 'flat-white' },
        { slot: 2, image: null, menuItemId: 'cappuccino' },
        { slot: 3, image: null, menuItemId: 'brownie-nuez' },
        { slot: 4, image: null, menuItemId: 'medialuna-manteca' },
    ],

    // Menu/Pedido Header Divider (preset ID from dividerPresets.js)
    dividerPresetId: 'coffee-beans',

    // Staff Password (simple password protection)
    staffPassword: "staff123",
    ownerPassword: "owner123",
    superAdminPassword: "admin2024",
};

// Storage key
export const CONFIG_STORAGE_KEY = "grub_config";

// Get current config from storage or return default
export function getConfig() {
    try {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (stored) {
            return { ...defaultConfig, ...JSON.parse(stored) };
        }
        return defaultConfig;
    } catch (e) {
        console.error("Error loading config:", e);
        return defaultConfig;
    }
}

// Save config to storage
export function saveConfig(config) {
    try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        return true;
    } catch (e) {
        console.error("Error saving config:", e);
        return false;
    }
}

// Update specific config values
export function updateConfig(updates) {
    const current = getConfig();
    const updated = { ...current, ...updates };
    return saveConfig(updated);
}

// Reset config to defaults
export function resetConfig() {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    return defaultConfig;
}

// Get dynamic greeting based on time of day
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "¡Buen día! ☀️";
    if (hour < 18) return "¡Buenas tardes! 🌤️";
    return "¡Buenas noches! 🌙";
}

// Check if currently open based on opening hours
export function isOpen() {
    const config = getConfig();
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    const hours = config.openingHours[today];

    if (hours.closed) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
}

// ============================================
// FEATURE TOGGLE PERMISSIONS
// Defines which roles can view and modify feature toggles
// ============================================

const ALL_FEATURES = ['ordersEnabled', 'rewardsEnabled', 'gameEnabled', 'instagramSharingEnabled']

export const FEATURE_PERMISSIONS = {
    // Which toggles each role can VIEW
    view: {
        superadmin: ALL_FEATURES,
        owner: ALL_FEATURES,
        staff: [] // staff cannot see feature toggles at all
    },
    // Which toggles each role can MODIFY
    modify: {
        superadmin: ALL_FEATURES,
        owner: ['ordersEnabled'], // owners can only modify ordersEnabled
        staff: []
    }
}

/**
 * Check if a role can view a specific feature toggle
 * @param {string} role - 'staff', 'owner', or 'superadmin'
 * @param {string} feature - feature key like 'ordersEnabled'
 * @returns {boolean}
 */
export function canViewFeatureToggle(role, feature) {
    if (role === 'superadmin') return true
    return FEATURE_PERMISSIONS.view[role]?.includes(feature) || false
}

/**
 * Check if a role can modify a specific feature toggle
 * @param {string} role - 'staff', 'owner', or 'superadmin'
 * @param {string} feature - feature key like 'ordersEnabled'
 * @returns {boolean}
 */
export function canModifyFeatureToggle(role, feature) {
    if (role === 'superadmin') return true
    return FEATURE_PERMISSIONS.modify[role]?.includes(feature) || false
}

/**
 * Get all features a role can view
 * @param {string} role
 * @returns {string[]}
 */
export function getViewableFeatures(role) {
    if (role === 'superadmin') return ALL_FEATURES
    return FEATURE_PERMISSIONS.view[role] || []
}

/**
 * Get all features a role can modify
 * @param {string} role
 * @returns {string[]}
 */
export function getModifiableFeatures(role) {
    if (role === 'superadmin') return ALL_FEATURES
    return FEATURE_PERMISSIONS.modify[role] || []
}

// Curated font list (supports Light, Semi-bold, Bold)
export const CURATED_FONTS = [
    { name: 'Inter', label: 'Inter' },
    { name: 'Outfit', label: 'Outfit' },
    { name: 'Poppins', label: 'Poppins' },
    { name: 'Roboto', label: 'Roboto' },
    { name: 'Open Sans', label: 'Open Sans' },
    { name: 'Lato', label: 'Lato' },
    { name: 'Montserrat', label: 'Montserrat' },
    { name: 'Nunito', label: 'Nunito' },
    { name: 'Raleway', label: 'Raleway' },
    { name: 'Source Sans Pro', label: 'Source Sans Pro' },
    { name: 'Work Sans', label: 'Work Sans' },
    { name: 'DM Sans', label: 'DM Sans' },
    { name: 'Manrope', label: 'Manrope' },
    { name: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
    { name: 'Figtree', label: 'Figtree' },
]

// Curated color presets for confirmation actions
export const CONFIRMATION_COLORS = [
    { value: '#22C55E', label: 'Green' },
    { value: '#10B981', label: 'Emerald' },
    { value: '#14B8A6', label: 'Teal' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
]

// Font weight options
export const FONT_WEIGHTS = [
    { value: '300', label: 'Light' },
    { value: '400', label: 'Normal' },
    { value: '600', label: 'Semi-bold' },
    { value: '700', label: 'Bold' },
]
