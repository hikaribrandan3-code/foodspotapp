// Demo Session Utilities
// Demo intent persisted in localStorage (PWA-safe)
// Session details cached in sessionStorage (best-effort accelerator)

// NOTE: Must use ES module imports here.
// ❌ require() fails silently in Vite production builds and will break demo → frontend sync.
import { emitDemoEvent } from './demoEvents.js'

const DEMO_SESSION_KEY = 'demo_session'
const DEMO_INTENT_KEY = 'foodspot_demo_active' // localStorage - survives PWA navigation

/**
 * Create a new demo session
 * @returns {Object} The created demo session
 */
export function createDemoSession() {
    const session = {
        isDemo: true,
        role: 'owner', // Default to owner view
        presetId: 'preset-1', // Default branding preset
        startedAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    }

    // Persist intent in localStorage (survives mobile PWA navigation)
    localStorage.setItem(DEMO_INTENT_KEY, JSON.stringify({
        active: true,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt
    }))

    // Cache full session in sessionStorage (best-effort accelerator)
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
    console.log('✅ Demo session created (localStorage + sessionStorage)')
    return session
}

/**
 * Get current demo session (if valid)
 * @returns {Object|null} Demo session or null if expired/missing
 */
export function getDemoSession() {
    try {
        const stored = sessionStorage.getItem(DEMO_SESSION_KEY)
        if (!stored) return null

        const session = JSON.parse(stored)

        // Check if session is valid demo session
        if (!session.isDemo) return null

        // Check expiry
        if (Date.now() > session.expiresAt) {
            clearDemoSession()
            return null
        }

        return session
    } catch (e) {
        return null
    }
}

/**
 * Check if currently in demo mode
 * Uses localStorage as source of truth (survives mobile PWA navigation)
 * Falls back to sessionStorage for legacy compatibility
 * @returns {boolean}
 */
export function isInDemoMode() {
    // Check localStorage first (source of truth for PWA)
    try {
        const intent = localStorage.getItem(DEMO_INTENT_KEY)
        if (intent) {
            const parsed = JSON.parse(intent)
            if (parsed.active && Date.now() < parsed.expiresAt) {
                return true
            }
            // Expired - clean up
            localStorage.removeItem(DEMO_INTENT_KEY)
        }
    } catch (e) {
        // Ignore parse errors
    }

    // Fallback to sessionStorage
    return getDemoSession() !== null
}

/**
 * Update demo session (e.g., change role or preset)
 * @param {Object} updates - Fields to update
 */
export function updateDemoSession(updates) {
    const session = getDemoSession()
    if (!session) return null

    const updated = { ...session, ...updates }
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(updated))
    return updated
}

/**
 * Clear demo session (exit demo mode)
 */
export function clearDemoSession() {
    // Clear both storages
    localStorage.removeItem(DEMO_INTENT_KEY)
    sessionStorage.removeItem(DEMO_SESSION_KEY)
    console.log('✅ Demo session cleared (localStorage + sessionStorage)')

    // Notify App.jsx immediately to refresh config (prevents flash/revert)
    window.dispatchEvent(new CustomEvent('frontendSync'))
}

/**
 * Get effective role in demo mode
 * @returns {string} 'owner' or 'staff'
 */
export function getDemoRole() {
    const session = getDemoSession()
    return session?.role || 'owner'
}

/**
 * Toggle demo role between owner and staff
 */
export function toggleDemoRole() {
    const session = getDemoSession()
    if (!session) return

    const newRole = session.role === 'owner' ? 'staff' : 'owner'
    updateDemoSession({ role: newRole })
    return newRole
}

// ============================================
// DEMO CONFIG UTILITIES (localStorage-based)
// ============================================

const DEMO_CONFIG_KEY = 'foodspot_demo_config'
const DEMO_MENU_KEY = 'foodspot_demo_menu'
const ACTIVE_BRANDING_KEY = 'foodspot_active_branding'
const ACTIVE_MENU_KEY = 'foodspot_active_menu'

/**
 * Get demo-specific config (branding customizations)
 * @returns {Object} Demo config or default
 */
export function getDemoConfig() {
    try {
        const stored = localStorage.getItem(DEMO_CONFIG_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.error('Error reading demo config:', e)
    }
    // Return default demo config
    return {
        businessName: 'Mi Negocio Demo',
        primaryColor: '#8B7355',
        accentColor: '#22C55E',
        iconColorMode: 'white',
        coverImage: null,
        heroIcons: {},
        businessInfo: {
            hours: '',
            address: '',
            phone: '',
            whatsapp: ''
        },
        // INFO PILL COLORS — Demo sandbox can customize these
        infoPills: {
            whatsapp: { bgColor: '#C4856A', textColor: 'white' },
            mercadoPago: { bgColor: '#FFE600', textColor: '#009EE3' },
            rappi: { bgColor: '#FF5A00', textColor: 'white' },
            pedidosYa: { bgColor: '#E31837', textColor: 'white' },
            adminAccess: { bgColor: '#FFFFFF', textColor: '#9CA3AF', borderColor: '#E5E7EB' },
            demo: { bgColor: '#84CC16', textColor: 'white' },
            custom: { enabled: false, label: '', url: '', bgColor: '#6366F1', textColor: 'white' }
        },
        // CAMERA BRANDING — Demo sandbox can customize camera button
        camera: {
            enabled: false,
            icon: 'default',
            color: '#8B7355',
            textColor: 'auto'
        }
    }
}

/**
 * Update demo config (merges updates)
 * @param {Object} updates - Fields to update
 */
export function updateDemoConfig(updates) {
    const current = getDemoConfig()
    const updated = { ...current, ...updates }
    localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(updated))
    return updated
}

/**
 * Get demo-specific menu
 * @returns {Object} Demo menu or null (falls back to real menu)
 */
export function getDemoMenu() {
    try {
        const stored = localStorage.getItem(DEMO_MENU_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.error('Error reading demo menu:', e)
    }
    return null
}

/**
 * Save full demo menu
 * @param {Object} menu - Full menu object to save
 */
export function saveDemoMenu(menu) {
    localStorage.setItem(DEMO_MENU_KEY, JSON.stringify(menu))
    return menu
}

/**
 * Update a single demo menu item
 * @param {Object} menu - Current menu
 * @param {string} categoryId - Category ID
 * @param {string} itemId - Item ID
 * @param {Object} updates - Fields to update (name, price, etc.)
 */
export function updateDemoMenuItem(menu, categoryId, itemId, updates) {
    const updatedMenu = {
        ...menu,
        categories: menu.categories.map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    items: cat.items.map(item => {
                        if (item.id === itemId) {
                            return { ...item, ...updates }
                        }
                        return item
                    })
                }
            }
            return cat
        })
    }
    saveDemoMenu(updatedMenu)
    return updatedMenu
}

// ============================================
// CORE BRANDING PROMOTION (Shared Logic)
// ============================================
// This is the single source of truth for promoting branding to frontend.
// Used by demo mode (with guards) and can be used by owner/admin modes.

/**
 * Core function to promote branding config to active frontend storage.
 * @param {Object} branding - Branding object to promote
 * @param {Object} menu - Optional menu object to promote
 * @param {Object} options - { emitEvents: boolean, source: 'demo' | 'owner' | 'admin' }
 * @returns {boolean} Success
 */
export function promoteBrandingToFrontend(branding, menu = null, options = {}) {
    const { emitEvents = true, source = 'unknown' } = options

    // Validate branding object
    if (!branding || typeof branding !== 'object') {
        console.error('promoteBrandingToFrontend: Invalid branding object')
        return false
    }

    // Write branding to active storage
    localStorage.setItem(ACTIVE_BRANDING_KEY, JSON.stringify({
        // Core branding fields
        businessName: branding.businessName,
        branding: branding.branding, // Full branding object (primaryColor, iconColorMode, etc.)
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        iconColorMode: branding.iconColorMode,
        coverImage: branding.coverImage,
        heroIcons: branding.heroIcons,
        businessInfo: branding.businessInfo,
        poweredByColor: branding.poweredByColor,
        featuredPhotos: branding.featuredPhotos,
        canvasMode: branding.canvasMode,
        dividerPresetId: branding.dividerPresetId,
        camera: branding.camera,
        infoPills: branding.infoPills,
        // Metadata
        appliedAt: Date.now(),
        source: source
    }))

    // Promote menu if provided
    if (menu) {
        localStorage.setItem(ACTIVE_MENU_KEY, JSON.stringify(menu))
    }

    // Emit events if enabled
    if (emitEvents) {
        // Dispatch frontendSync event to trigger re-renders
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    console.log(`✅ Branding promoted to frontend (source: ${source})`)
    return true
}

/**
 * Apply demo edits to frontend (Commit/Publish)
 * This promotes draft state to active state with demo-specific guards and events.
 */
export function applyDemoToFrontend() {
    // Demo guard: ensure we're in demo mode
    if (!isInDemoMode()) {
        console.warn('applyDemoToFrontend called outside demo mode')
        return false
    }

    const demoConfig = getDemoConfig()
    const demoMenu = getDemoMenu()

    // Use shared promotion function
    const success = promoteBrandingToFrontend(demoConfig, demoMenu, {
        emitEvents: false, // We emit our own events
        source: 'demo'
    })

    if (!success) return false

    // Demo-specific: Emit menu.updated event
    const categoriesCount = demoMenu?.categories?.length || 0
    const itemsCount = demoMenu?.categories?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0
    emitDemoEvent('menu.updated', {
        categoriesCount,
        itemsCount,
        updatedAt: new Date().toISOString()
    })

    console.log('✅ Demo changes applied to frontend')

    // Dispatch frontendSync event to trigger re-renders across all listening components
    window.dispatchEvent(new CustomEvent('frontendSync'))

    return true
}

/**
 * Get active (published) demo branding for frontend consumption
 */
export function getActiveDemoBranding() {
    try {
        const stored = localStorage.getItem(ACTIVE_BRANDING_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.error('Error reading active branding:', e)
    }
    return null
}

/**
 * Get active (published) demo menu for frontend consumption
 */
export function getActiveDemoMenu() {
    try {
        const stored = localStorage.getItem(ACTIVE_MENU_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.error('Error reading active menu:', e)
    }
    return null
}

/**
 * Clear ALL demo data (full reset)
 */
export function clearAllDemoData() {
    // Clear session
    sessionStorage.removeItem('demo_session')

    // Clear draft state
    localStorage.removeItem(DEMO_CONFIG_KEY)
    localStorage.removeItem(DEMO_MENU_KEY)

    // Clear active (published) state
    localStorage.removeItem(ACTIVE_BRANDING_KEY)
    localStorage.removeItem(ACTIVE_MENU_KEY)

    console.log('✅ All demo data cleared')
    return true
}
