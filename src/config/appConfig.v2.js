// App Configuration - Editable by Super Admin
// All business branding and feature toggles

export const defaultConfig = {
    // Business Identity
    businessName: "Grub Club",
    logo: null, // Deprecated - use logoLight/logoDark instead
    logoLight: null, // Logo for light mode (dark logo on light bg)
    logoDark: null, // Logo for dark mode (light logo on dark bg)

    // ============================================
    // HEADER BRANDING (PATCH 4.0 → 4.5)
    // ============================================
    // V1: Cover mode is default (Facebook-style header image)
    // mode: "cover" = header renders cover image (default)
    // mode: "text" = header renders app name only
    // mode: "logo" = header renders logo only
    headerBranding: {
        mode: "cover" // "cover" | "text" | "logo"
    },
    // Cover image settings (used when mode === "cover")
    headerCover: {
        image: null,        // Base64 data URI or URL
        scale: 1.0,         // 1.0 = 100%, range: 0.5–3.0
        offsetX: 0,         // Horizontal offset (%)
        offsetY: 0          // Vertical offset (%)
    },
    // ============================================
    // EXPERIMENTAL FLAGS (Super Admin Only)
    // ============================================
    experimental: {
        headerClampMobile: true  // Invisible mobile header padding reducer
    },
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

    // ============================================
    // HERO ICONS CONSTANTS (Fully Isolated)
    // ============================================
    // Single source of truth for hero icon defaults
    // Used by App.jsx, Home.jsx, Settings.jsx, SuperAdmin.jsx

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
        confirmation: "#FFFFFF", // Third color slot: confirmation/success actions (Professional White)
    },

    // Branding Customization (Owner-controlled)
    branding: {
        fontFamily: "Inter", // Selected from curated list
        fontWeight: "normal", // "light" | "normal" | "semibold" | "bold"
        poweredByColor: "#C4856A", // Separate color for "Powered by @foodspotapp"
        // Phase 1 Branding - Navbar
        primaryColor: "#8B7355", // Navbar background color
        iconColorMode: "white", // "white" | "black" - navbar icon color
    },

    // Hero Icons Customization (per-icon color + iconColorMode)
    // color: "auto" = inherits from canvas surface
    // color: "#HEXVAL" = explicit override
    heroIcons: {
        menu: { color: "auto", iconColorMode: "auto" },
        delivery: { color: "auto", iconColorMode: "auto" },
        promos: { color: "auto", iconColorMode: "auto" },
        game: { color: "auto", iconColorMode: "auto" },
    },

    // ============================================
    // CANVAS V1 (Light/Dark)
    // ============================================
    // Applies to outer app container only
    // 'light' = warm beige (#F5F0E8)
    // 'dark' = dark grey (#1F2937)
    canvasMode: "light",

    // Header shield mode (determines header background)
    // 'auto' = opposite of canvas (default)
    // 'locked-light' = always light header
    // 'locked-dark' = always dark header
    headerMode: "auto",



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

    // Rewards Configuration (Legacy - for RewardsPill)
    rewards: {
        stampsRequired: 10, // Stamps needed for reward
        rewardDescription: "¡Café gratis!",
    },

    // Promos Configuration (McDonald's Vibe)
    promos: {
        happyHourEnabled: true,
        happyHourDurationHours: 2,
        headerTitle: 'DELIVERY HAPPY HOUR',
        weeklySpecial: {
            id: 'weekly-boss',
            title: 'WEEKLY SPECIAL',
            name: 'Double Stack "The Boss"',
            price: 1499,
            originalPrice: 1899,
            image: null
        },
        feastBundles: [
            { id: 'feast-crispy', title: 'Feast Bundle', subtitle: 'Crispy Bucket Feast', price: 2499, borderColor: '#DC2626', image: null },
            { id: 'feast-taco', title: 'Family Crnete', subtitle: 'Taco Tuesday Pack', price: 1899, borderColor: '#FCD34D', image: null },
            { id: 'feast-game', title: 'Feast Bundle', subtitle: 'Game Night Combo', price: 2199, borderColor: '#F97316', image: null }
        ]
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

    // ============================================
    // INFO PILL BRANDING (Per-pill colors)
    // ============================================
    // Each pill can have custom bg/text colors
    // textColor: 'white' | 'black' | 'auto'
    infoPills: {
        whatsapp: { bgColor: '#C4856A', textColor: 'white' },
        mercadoPago: { bgColor: '#FFE600', textColor: '#009EE3' },
        rappi: { bgColor: '#FF5A00', textColor: 'white' },
        pedidosYa: { bgColor: '#E31837', textColor: 'white' },
        adminAccess: { bgColor: '#FFFFFF', textColor: '#9CA3AF', borderColor: '#E5E7EB' },
        demo: { bgColor: '#84CC16', textColor: 'white' },
        // Extra custom pill (limit: 1)
        custom: { enabled: false, label: '', url: '', bgColor: '#6366F1', textColor: 'white' }
    },

    // ============================================
    // CAMERA BRANDING
    // ============================================
    // Customize camera button icon and color in nav bar
    // icon: 'default' | 'camera' | 'aperture' | 'webcam'
    camera: {
        enabled: false,        // If false, inherit nav bar styling
        icon: 'default',       // Which camera icon to display
        color: '#8B7355',      // Camera button background color
        textColor: 'auto'      // 'auto' | 'white' | 'black'
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

    // ============================================
    // DELIVERY CONFIGURATION (v1 Minimal)
    // ============================================
    delivery: {
        // Origin address for delivery radius (defaults to businessInfo.address)
        originAddress: '', // If empty, uses businessInfo.address

        // Delivery radius in kilometers (0 = unlimited)
        radiusKm: 5,

        // Flat delivery fee (0 = free)
        flatFee: 0,

        // Free delivery threshold (0 = no threshold)
        freeDeliveryThreshold: 0,

        // Change tracking (2× per month limit)
        configChanges: [], // Array of { timestamp, field, oldValue, newValue }
        maxChangesPerMonth: 2,
    },

    // ============================================
    // HOME SCREEN CONFIGURATION (Owner-reorderable)
    // ============================================
    homeConfig: {
        // Primary action icons (exactly 4, order matters)
        // IDs: 'menu', 'envios', 'promos', 'game'
        primaryActions: ['menu', 'envios', 'promos', 'game'],

        // Featured items (exactly 4 menu item IDs, order matters)
        // These reference menu items by ID, decoupled from menu order
        featuredItems: ['flat-white', 'cappuccino', 'brownie-nuez', 'medialuna-manteca'],
    },
};

// Storage key
export const CONFIG_STORAGE_KEY = "grub_config";

// Demo branding storage key (must match demoSession.js)
const ACTIVE_BRANDING_KEY = 'foodspot_active_branding';
const DEMO_SESSION_KEY = 'demo_session'; // sessionStorage - best-effort accelerator
const DEMO_INTENT_KEY = 'foodspot_demo_active'; // localStorage - source of truth for PWA

// ============================================
// CONFIG NORMALIZATION (FOUNDATIONAL SAFETY)
// ============================================
// Ensures all config fields have safe defaults.
// This is the single point of defense against undefined crashes.
// Components should ONLY consume normalized config.

export function normalizeConfig(config) {
    if (!config || typeof config !== 'object') {
        return { ...defaultConfig };
    }

    return {
        // Spread base config first
        ...config,

        // === PRIMITIVES (with safe defaults) ===
        businessName: config.businessName || defaultConfig.businessName,
        canvasMode: config.canvasMode || 'light',
        headerMode: config.headerMode || 'auto',
        orderMode: config.orderMode || 'A1',
        dividerPresetId: config.dividerPresetId || 'coffee-beans',

        // === BOOLEANS (explicit false defaults) ===
        demoMode: config.demoMode ?? false,
        maintenanceMode: config.maintenanceMode ?? false,
        pauseOrders: config.pauseOrders ?? false,

        // === STRINGS (with fallbacks) ===
        maintenanceMessage: config.maintenanceMessage || defaultConfig.maintenanceMessage,
        pauseOrdersMessage: config.pauseOrdersMessage || defaultConfig.pauseOrdersMessage,

        // === NESTED OBJECTS (guaranteed to exist) ===
        headerBranding: {
            mode: 'cover',
            ...(config.headerBranding || {})
        },
        headerCover: {
            image: null,
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            ...(config.headerCover || {})
        },
        experimental: {
            headerClampMobile: true,
            ...(config.experimental || {})
        },
        colors: {
            ...defaultConfig.colors,
            ...(config.colors || {})
        },
        branding: {
            fontFamily: 'Inter',
            fontWeight: 'normal',
            poweredByColor: '#C4856A',
            primaryColor: '#8B7355',
            iconColorMode: 'white',
            ...(config.branding || {})
        },
        heroIcons: {
            menu: { color: 'auto', iconColorMode: 'auto', ...(config.heroIcons?.menu || {}) },
            delivery: { color: 'auto', iconColorMode: 'auto', ...(config.heroIcons?.delivery || {}) },
            promos: { color: 'auto', iconColorMode: 'auto', ...(config.heroIcons?.promos || {}) },
            game: { color: 'auto', iconColorMode: 'auto', ...(config.heroIcons?.game || {}) },
        },
        features: {
            ordersEnabled: true,
            rewardsEnabled: true,
            gameEnabled: true,
            instagramSharingEnabled: true,
            ...(config.features || {})
        },
        openingHours: {
            ...defaultConfig.openingHours,
            ...(config.openingHours || {})
        },
        rewards: {
            stampsRequired: 10,
            rewardDescription: '¡Café gratis!',
            ...(config.rewards || {})
        },
        businessInfo: {
            address: '',
            phone: '',
            whatsapp: '',
            instagram: '',
            googleMapsLink: '',
            description: '',
            ...(config.businessInfo || {})
        },
        infoDisplay: {
            showWhatsApp: true,
            showHours: true,
            showAddress: true,
            showMapLink: true,
            ...(config.infoDisplay || {})
        },
        externalOrdering: {
            rappiEnabled: false,
            rappiUrl: '',
            pedidosYaEnabled: false,
            pedidosYaUrl: '',
            ...(config.externalOrdering || {})
        },
        payments: {
            mercadoPagoAlias: '',
            ...(config.payments || {})
        },
        infoPills: {
            ...defaultConfig.infoPills,
            ...(config.infoPills || {}),
            ...(config.info_pills || {}), // 🔥 CRITICAL: Map snake_case (legacy/DB) to camelCase
            whatsapp: { bgColor: '#C4856A', textColor: 'white', ...(config.infoPills?.whatsapp || {}) },
            mercadoPago: { bgColor: '#FFE600', textColor: '#009EE3', ...(config.infoPills?.mercadoPago || {}) },
            rappi: { bgColor: '#FF5A00', textColor: 'white', ...(config.infoPills?.rappi || {}) },
            pedidosYa: { bgColor: '#E31837', textColor: 'white', ...(config.infoPills?.pedidosYa || {}) },
            adminAccess: { bgColor: '#FFFFFF', textColor: '#9CA3AF', borderColor: '#E5E7EB', ...(config.infoPills?.adminAccess || {}) },
            demo: { bgColor: '#84CC16', textColor: 'white', ...(config.infoPills?.demo || {}) },
            custom: { enabled: false, label: '', url: '', bgColor: '#6366F1', textColor: 'white', ...(config.infoPills?.custom || {}) },
        },
        camera: {
            enabled: false,
            icon: 'default',
            color: '#8B7355',
            textColor: 'auto',
            ...(config.camera || {})
        },
        delivery: {
            originAddress: '',
            radiusKm: 5,
            flatFee: 0,
            freeDeliveryThreshold: 0,
            configChanges: [],
            maxChangesPerMonth: 2,
            ...(config.delivery || {})
        },
        homeConfig: {
            primaryActions: (config.homeConfig?.primaryActions || ['menu', 'envios', 'promos', 'game']).map(id => id === 'rewards' ? 'promos' : id),
            featuredItems: ['flat-white', 'cappuccino', 'brownie-nuez', 'medialuna-manteca'],
            ...(config.homeConfig || {})
        },

        // === ARRAYS (guaranteed to be arrays) ===
        featuredPhotos: Array.isArray(config.featuredPhotos) ? config.featuredPhotos : defaultConfig.featuredPhotos,
    };
}

// Helper: Check if in demo mode (localStorage first, then sessionStorage)
function isDemoModeActive() {
    // Check localStorage first (source of truth for PWA)
    try {
        const intent = localStorage.getItem(DEMO_INTENT_KEY);
        if (intent) {
            const parsed = JSON.parse(intent);
            if (parsed.active && Date.now() < parsed.expiresAt) {
                return true;
            }
            // Expired - clean up
            localStorage.removeItem(DEMO_INTENT_KEY);
        }
    } catch (e) {
        // Ignore parse errors
    }

    // Fallback to sessionStorage
    return !!sessionStorage.getItem(DEMO_SESSION_KEY);
}

// Get current config from storage or return default
// In demo mode, also merges active demo branding
export function getConfig() {
    try {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        let config;

        if (stored) {
            const parsed = JSON.parse(stored);
            // Deep merge nested objects to preserve both defaults and stored values
            config = {
                ...defaultConfig,
                ...parsed,
                // Deep merge heroIcons (each icon config individually)
                heroIcons: {
                    ...defaultConfig.heroIcons,
                    ...(parsed.heroIcons || {}),
                    // Ensure each icon's config is also deep merged
                    menu: { ...defaultConfig.heroIcons.menu, ...(parsed.heroIcons?.menu || {}) },
                    delivery: { ...defaultConfig.heroIcons.delivery, ...(parsed.heroIcons?.delivery || {}) },
                    promos: { ...defaultConfig.heroIcons.promos, ...(parsed.heroIcons?.rewards || {}), ...(parsed.heroIcons?.promos || {}) },
                    // MIRROR: Fix Google/Stale cache color sync (Unified State)
                    rewards: { ...defaultConfig.heroIcons.promos, ...(parsed.heroIcons?.rewards || {}), ...(parsed.heroIcons?.promos || {}) },
                    game: { ...defaultConfig.heroIcons.game, ...(parsed.heroIcons?.game || {}) },
                },
                // Deep merge other nested objects
                branding: { ...defaultConfig.branding, ...(parsed.branding || {}) },
                colors: { ...defaultConfig.colors, ...(parsed.colors || {}) },
                features: { ...defaultConfig.features, ...(parsed.features || {}) },
                businessInfo: { ...defaultConfig.businessInfo, ...(parsed.businessInfo || {}) },
                delivery: { ...defaultConfig.delivery, ...(parsed.delivery || {}) },
                homeConfig: { ...defaultConfig.homeConfig, ...(parsed.homeConfig || {}) },
                infoDisplay: { ...defaultConfig.infoDisplay, ...(parsed.infoDisplay || {}) },
                infoPills: {
                    ...defaultConfig.infoPills,
                    ...(parsed.infoPills || {}),
                    whatsapp: { ...defaultConfig.infoPills.whatsapp, ...(parsed.infoPills?.whatsapp || {}) },
                    mercadoPago: { ...defaultConfig.infoPills.mercadoPago, ...(parsed.infoPills?.mercadoPago || {}) },
                    rappi: { ...defaultConfig.infoPills.rappi, ...(parsed.infoPills?.rappi || {}) },
                    pedidosYa: { ...defaultConfig.infoPills.pedidosYa, ...(parsed.infoPills?.pedidosYa || {}) },
                    adminAccess: { ...defaultConfig.infoPills.adminAccess, ...(parsed.infoPills?.adminAccess || {}) },
                    demo: { ...defaultConfig.infoPills.demo, ...(parsed.infoPills?.demo || {}) },
                    custom: { ...defaultConfig.infoPills.custom, ...(parsed.infoPills?.custom || {}) },
                },
                camera: { ...defaultConfig.camera, ...(parsed.camera || {}) },
            };
        } else {
            config = defaultConfig;
        }

        // DEMO SIMULATION REMOVED: No demo branding overlay on frontend
        // Frontend always receives real normalized config
        // FOUNDATIONAL: Normalize config before returning to guarantee safe defaults
        return normalizeConfig(config);
    } catch (e) {
        console.error("Error loading config:", e);
        return normalizeConfig(defaultConfig);
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

// Update specific config values (with deep merge for nested objects)
export function updateConfig(updates) {
    const current = getConfig();

    // Deep merge for known nested objects
    const deepMergeKeys = ['heroIcons', 'branding', 'colors', 'features', 'businessInfo', 'infoDisplay', 'externalOrdering', 'payments', 'delivery', 'homeConfig', 'headerCover', 'headerBranding', 'rewards', 'openingHours', 'infoPills', 'camera'];

    const merged = { ...current };

    for (const key of Object.keys(updates)) {
        if (deepMergeKeys.includes(key) && typeof updates[key] === 'object' && updates[key] !== null) {
            // Deep merge nested object
            merged[key] = { ...current[key], ...updates[key] };
        } else {
            // Shallow assign for primitives and non-nested objects
            merged[key] = updates[key];
        }
    }

    return saveConfig(merged);
}

// Reset config to defaults
export function resetConfig() {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    return defaultConfig;
}

// ============================================
// HOME SCREEN REORDER FUNCTIONS
// ============================================

// Reorder primary actions on Home screen (exactly 4 action IDs)
export function reorderPrimaryActions(orderedIds) {
    const config = getConfig();
    config.homeConfig = config.homeConfig || defaultConfig.homeConfig;
    config.homeConfig.primaryActions = orderedIds;
    return saveConfig(config);
}

// Reorder featured items on Home screen (exactly 4 menu item IDs)
export function reorderFeaturedItems(orderedIds) {
    const config = getConfig();
    config.homeConfig = config.homeConfig || defaultConfig.homeConfig;
    config.homeConfig.featuredItems = orderedIds;
    return saveConfig(config);
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

// Hero Icon Constants (Single Source of Truth)
export const HERO_ICON_DARK = '#000000'
export const HERO_DEFAULT = { color: 'auto', iconColorMode: 'auto' }

// Phase 1 Branding - Navbar color presets
export const NAV_COLOR_PRESETS = [
    { value: '#8B7355', label: 'Café' },
    { value: '#2D3436', label: 'Carbón' },
    { value: '#1E3A5F', label: 'Marino' },
    { value: '#5D4E6D', label: 'Uva' },
    { value: '#1E5631', label: 'Bosque' },
    { value: '#8B0000', label: 'Vino' },
    { value: '#C4856A', label: 'Terracota' },
    { value: '#4A4A4A', label: 'Grafito' },
]
