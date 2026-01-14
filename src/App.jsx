import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { getConfig, HERO_ICON_DARK, HERO_DEFAULT } from './config/appConfig.v2.js'
import { incrementVisit, updateOrder, getOrders } from './utils/storage.js'
import { getSession } from './utils/auth.js'
import { AdminIntentProvider, useAdminIntent } from './contexts/AdminIntentContext.jsx'
import { useTenant } from './contexts/TenantContext.jsx'
import { getBranding, subscribeToOrders, getOrdersByGuestToken, getOrdersByPhone } from './lib/supabaseClient.js'

// Components
import BottomNav from './components/BottomNav.jsx'
import BackendNav from './components/BackendNav.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Customer Pages
import Home from './pages/customer/Home.jsx'
import Menu from './pages/customer/Menu.jsx'
import Order from './pages/customer/Order.jsx'

import OrderStatus from './pages/customer/OrderStatus.jsx'
import Rewards from './pages/customer/Rewards.jsx'
import ShareFood from './pages/customer/ShareFood.jsx'
import PerfectPour from './pages/customer/PerfectPour.jsx'
import Info from './pages/customer/Info.jsx'
import Promos from './pages/customer/Promos.jsx'

// Staff Pages
import StaffLogin from './pages/staff/StaffLogin.jsx'
import StaffDashboard from './pages/staff/StaffDashboard.jsx'

// Owner Pages
import OwnerLogin from './pages/owner/OwnerLogin.jsx'
import OwnerSummary from './pages/owner/OwnerSummary.jsx'
import MenuManager from './pages/owner/MenuManager.jsx'
import RewardsManager from './pages/owner/RewardsManager.jsx'
import Settings from './pages/owner/Settings.jsx'
import Analytics from './pages/owner/Analytics.jsx'
import DeliveryManager from './pages/owner/DeliveryManager.jsx'

// Admin Pages (Lazy-loaded for 90+ performance score)
// Offloads ~4,500 lines from initial customer bundle
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin.jsx'))
import CoverPreview from './components/CoverPreview.jsx'

// Demo Pages (Lazy-loaded)
const DemoBackend = lazy(() => import('./pages/demo/DemoBackend.jsx'))
import Demo from './pages/demo/Demo.jsx'

// Auth Pages
import TrialSignup from './pages/auth/TrialSignup.jsx'

// Loading fallback for lazy components
const LazyFallback = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--canvas-bg, #fff)',
        color: 'var(--canvas-text, #000)',
        fontSize: 14,
        fontWeight: 500
    }}>
        Cargando...
    </div>
)

// Camera Suite
import Camera from './components/Camera/index.jsx'

// ====== RULE 2: ROUTE AREA WRAPPER ======
// Forces complete unmount when switching between role areas
// key changes based on URL area = React destroys and rebuilds UI
function RouteAreaWrapper({ children }) {
    const location = useLocation()

    // Derive area from first path segment
    const getRouteArea = () => {
        const path = location.pathname
        if (path.startsWith('/admin')) return 'admin'
        if (path.startsWith('/owner')) return 'owner'
        if (path.startsWith('/staff')) return 'staff'
        if (path.startsWith('/demo')) return 'demo'
        return 'customer' // Default for / and other customer routes
    }

    const routeArea = getRouteArea()

    // Key changes = React unmounts old tree and mounts fresh tree
    return <div key={routeArea}>{children}</div>
}

// ====== STACKED ADMIN BADGE COMPONENT ======
// Shows Super Admin status with role switcher menu
function StackedAdminBadge() {
    const [session, setSession] = useState(null)
    const [showMenu, setShowMenu] = useState(false)
    const { isSimulated, activeRoleView, exitSimulation } = useAdminIntent()
    const navigate = useNavigate()

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const sessionData = await getSession()
                setSession(sessionData)
            } catch {
                setSession(null)
            }
        }
        fetchSession()
    }, [])

    // Only show for superadmin (wait for session to load)
    if (!session || session?.role !== 'superadmin') return null

    const handleNavigate = (path) => {
        setShowMenu(false)
        navigate(path, { replace: true })
        // Force scroll to top on switch
        window.scrollTo(0, 0)
    }

    return (
        <>
            {/* Main Badge */}
            <div
                onClick={() => setShowMenu(!showMenu)}
                style={{
                    position: 'fixed',
                    bottom: 90, // LIFTED: Clear the 68px BottomNav + safe area
                    left: 20,
                    padding: '8px 12px',
                    // GLASSMORPHISM: Frosted glass effect
                    background: 'rgba(26, 26, 26, 0.85)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: '#00ff00',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 10,
                    zIndex: 2000, // SUPREME LAYER: Above everything
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(0,255,0,0.2)',
                    userSelect: 'none',
                    transition: 'transform 0.1s active'
                }}
            >
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>
                    🔧 SUPER ADMIN
                </span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{showMenu ? '▼' : '▲'}</span>
            </div>

            {/* Switcher Menu */}
            {showMenu && (
                <>
                    {/* Backdrop - High Z-index to catch clicks */}
                    <div
                        onClick={() => setShowMenu(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1999, // Just below the badge
                            background: 'rgba(0,0,0,0.2)' // Dim background
                        }}
                    />
                    {/* Menu */}
                    <div style={{
                        position: 'fixed',
                        bottom: 130, // Positioned relative to lifted badge
                        left: 20,
                        background: '#1a1a1a',
                        borderRadius: 12,
                        padding: 8,
                        zIndex: 2000,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        minWidth: 160,
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        <div style={{ fontSize: 10, color: '#888', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Quick Switch
                        </div>
                        {[
                            { label: '🎛️ Admin Panel', path: '/admin', color: '#7C3AED' },
                            { label: '👤 Owner View', path: '/owner/summary', color: '#3B82F6' },
                            { label: '📋 Staff View', path: '/staff/dashboard', color: '#22C55E' }
                        ].map(item => (
                            <div
                                key={item.path}
                                onClick={() => handleNavigate(item.path)}
                                style={{
                                    padding: '10px 12px',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                {item.label}
                            </div>
                        ))}
                        {isSimulated && (
                            <div
                                onClick={() => { exitSimulation(); setShowMenu(false) }}
                                style={{
                                    padding: '10px 12px',
                                    color: '#EF4444',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: 4
                                }}
                            >
                                ✕ Exit Simulation
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}


function App() {
    const { businessId, tenantData, trialExpired } = useTenant()

    const [config, setConfig] = useState(() => getConfig())
    const [orders, setOrders] = useState([])
    const safeConfig = useMemo(() => config ?? { pauseOrders: false }, [config])

    // 🚫 TRIAL LOCKOUT: Block all interactions if trial expired
    if (trialExpired) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '24px',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: '64px',
                    marginBottom: '24px'
                }}>⏰</div>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    marginBottom: '12px',
                    background: 'linear-gradient(90deg, #ff6b6b, #ffa502)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>Tu período de prueba terminó</h1>
                <p style={{
                    opacity: 0.8,
                    maxWidth: '400px',
                    marginBottom: '32px',
                    lineHeight: 1.6
                }}>
                    El trial de <strong>{tenantData?.business_name || 'tu negocio'}</strong> ha expirado.
                    Actualizá tu plan para seguir recibiendo pedidos y gestionar tu menú.
                </p>
                <a
                    href="https://wa.me/5491123456789?text=Quiero%20activar%20mi%20cuenta%20FoodSpot"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px 32px',
                        background: 'linear-gradient(90deg, #25D366, #128C7E)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '16px',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
                        transition: 'transform 0.2s'
                    }}
                >
                    💬 Contactar Soporte
                </a>
            </div>
        )
    }


    // Track visit on app load
    useEffect(() => {
        incrementVisit()
    }, [])

    // Hard state purge on auth changes
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                localStorage.removeItem('admin_intent')
                localStorage.removeItem('simulatedRole')
                localStorage.removeItem('activeRoleView')
            }
        })
        return () => authListener?.subscription.unsubscribe()
    }, [])

    // Fetch branding from Supabase on mount
    useEffect(() => {
        const loadCloudBranding = async () => {
            try {
                const { data: cloudBranding, error } = await getBranding(businessId)
                if (error || !cloudBranding) return

                // Safe Config Protocol: Cloud data overrides localStorage
                setConfig(prev => ({
                    ...prev,
                    // Business identity
                    businessName: cloudBranding.business_name || prev.businessName,
                    // Branding config (fonts, primary color)
                    branding: {
                        ...prev.branding,
                        primaryColor: cloudBranding.primary_color || prev.branding?.primaryColor,
                        fontFamily: cloudBranding.font_family || prev.branding?.fontFamily,
                    },
                    // Colors (complete mapping to prevent CSS variable desync)
                    colors: {
                        ...prev.colors,
                        primary: cloudBranding.primary_color || prev.colors?.primary,
                        secondary: cloudBranding.secondary_color || prev.colors?.secondary,
                    },
                    // Hero image from cloud
                    headerCover: cloudBranding.hero_url ? {
                        ...prev.headerCover,
                        image: cloudBranding.hero_url
                    } : prev.headerCover,
                    // Logo from cloud
                    logo: cloudBranding.logo_url || prev.logo,
                }))
            } catch {
                // Silent fallback to localStorage
            }
        }
        loadCloudBranding()
    }, [])

    // Service Worker cleanup
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const registration of registrations) {
                    registration.unregister()
                }
            })
        }
        if ('caches' in window) {
            caches.keys().then(names => {
                for (const name of names) {
                    caches.delete(name)
                }
            })
        }
    }, [])

    // Apply global typography from config
    useEffect(() => {
        const root = document.documentElement
        const fontFamily = config.branding?.fontFamily || 'Inter'
        const fontWeight = config.branding?.fontWeight || '400'

        // Set CSS custom properties for global use
        root.style.setProperty('--font-family-brand', `"${fontFamily}", system-ui, -apple-system, sans-serif`)
        root.style.setProperty('--font-weight-brand', fontWeight)

        // Also apply to body for immediate effect
        document.body.style.fontFamily = `"${fontFamily}", system-ui, -apple-system, sans-serif`
    }, [config.branding?.fontFamily, config.branding?.fontWeight])

    // Apply navbar branding colors from config (Phase 1 Branding)
    useEffect(() => {
        const root = document.documentElement
        const primaryColor = config.branding?.primaryColor || '#8B7355'
        const iconColor = config.branding?.iconColorMode === 'black' ? '#000000' : '#FFFFFF'

        root.style.setProperty('--nav-primary-color', primaryColor)
        root.style.setProperty('--nav-icon-color', iconColor)

        // Safari repaint workaround - use opacity toggle instead of transform
        // (transform breaks position: fixed in WebKit by creating new containing block)
        const nav = document.querySelector('.bottom-nav')
        if (nav) {
            nav.style.opacity = '0.99'
            requestAnimationFrame(() => {
                nav.style.opacity = '1'
            })
        }
    }, [config.branding?.primaryColor, config.branding?.iconColorMode])

    // Apply hero icon colors from config (fully isolated from nav)
    // color: "auto" = use canvas-surface, otherwise use explicit override
    useEffect(() => {
        const root = document.documentElement
        const heroIcons = config.heroIcons || {}

        const getHeroBg = (heroConfig) => {
            const color = heroConfig?.color
            // "auto" or undefined/null = use canvas surface
            if (!color || color === 'auto') {
                return 'var(--canvas-surface)'
            }
            return color
        }

        const getHeroIcon = (heroConfig) => {
            const mode = heroConfig?.iconColorMode
            // "auto" or undefined/null = use canvas surface text
            if (!mode || mode === 'auto') {
                return 'var(--canvas-surface-text)'
            }
            return mode === 'white' ? '#FFFFFF' : HERO_ICON_DARK
        }

        // Menu
        const menuConfig = heroIcons.menu || HERO_DEFAULT
        root.style.setProperty('--hero-menu-bg', getHeroBg(menuConfig))
        root.style.setProperty('--hero-menu-icon', getHeroIcon(menuConfig))

        // Delivery 
        const deliveryConfig = heroIcons.delivery || HERO_DEFAULT
        root.style.setProperty('--hero-delivery-bg', getHeroBg(deliveryConfig))
        root.style.setProperty('--hero-delivery-icon', getHeroIcon(deliveryConfig))

        // ⚡ UNIVERSAL SYNC: Merge Promos and Rewards into one 'Master Config'
        // This ensures that if ONE updates, BOTH update in the CSS.
        const masterPromosConfig = {
            ...HERO_DEFAULT,                    // Fallback
            ...(heroIcons.rewards || {}),       // Legacy
            ...(heroIcons.promos || {})         // New (Takes Priority)
        }

        // Set variables for PROMOS (The New Standard)
        root.style.setProperty('--hero-promos-bg', getHeroBg(masterPromosConfig))
        root.style.setProperty('--hero-promos-icon', getHeroIcon(masterPromosConfig))

        // Set variables for REWARDS (The Legacy Fallback) - Maps to SAME master config
        root.style.setProperty('--hero-rewards-bg', getHeroBg(masterPromosConfig))
        root.style.setProperty('--hero-rewards-icon', getHeroIcon(masterPromosConfig))

        // Game
        const gameConfig = heroIcons.game || HERO_DEFAULT
        root.style.setProperty('--hero-game-bg', getHeroBg(gameConfig))
        root.style.setProperty('--hero-game-icon', getHeroIcon(gameConfig))
    }, [config.heroIcons, config.canvasMode])

    // Apply canvas mode from config (isolated from nav and hero)
    useEffect(() => {
        const root = document.documentElement
        const canvasMode = config.canvasMode || 'light'
        const headerMode = config.headerMode || 'auto'

        // ============================================
        // DARK MODE SURFACE TOKENS (LOCKED)
        // ============================================
        // High-end dark mode uses layered surfaces, not pure black
        // Contrast comes from depth layering, not borders
        const DARK_TOKENS = {
            root: '#0E0E0F',           // App canvas background
            surface: '#161618',        // Cards, tiles
            surfaceRaised: '#1C1C1F',  // Modals, sheets, bottom drawers
            surfaceAlt: '#202024'      // Secondary groupings
        }

        // Light mode stays simple (white everywhere)
        const LIGHT_TOKENS = {
            root: '#FFFFFF',
            surface: '#FFFFFF',
            surfaceRaised: '#FFFFFF',
            surfaceAlt: '#F9FAFB'
        }

        // Canvas text colors (pure contrast)
        const TEXT_LIGHT_PRIMARY = '#000000'
        const TEXT_LIGHT_MUTED = '#666666'
        const TEXT_DARK_PRIMARY = '#FFFFFF'
        const TEXT_DARK_MUTED = '#A0A0A5'

        // Header colors
        const HEADER_LIGHT_BG = '#FFFFFF'
        const HEADER_LIGHT_TEXT = '#000000'
        const HEADER_DARK_BG = DARK_TOKENS.root  // Match root, not pure black
        const HEADER_DARK_TEXT = '#FFFFFF'

        // Select token set based on mode
        const tokens = canvasMode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS

        // Apply surface tokens as CSS variables
        root.style.setProperty('--canvas-bg', tokens.root)
        root.style.setProperty('--surface-bg', tokens.surface)
        root.style.setProperty('--surface-raised-bg', tokens.surfaceRaised)
        root.style.setProperty('--surface-alt-bg', tokens.surfaceAlt)

        // Set canvas text colors and legacy surface variables
        if (canvasMode === 'dark') {
            root.style.setProperty('--canvas-text', TEXT_DARK_PRIMARY)
            root.style.setProperty('--canvas-text-muted', TEXT_DARK_MUTED)
            // Legacy surface variables (for backwards compatibility)
            root.style.setProperty('--canvas-surface', tokens.surface)
            root.style.setProperty('--canvas-surface-text', '#FFFFFF')

            // ============================================
            // ELEVATION SHADOWS (DARK MODE ONLY)
            // ============================================
            // Shadows replace borders in dark mode
            // Cards feel "heavier" than background via depth
            root.style.setProperty('--shadow-card', '0px 6px 18px rgba(0,0,0,0.45)')
            root.style.setProperty('--shadow-raised', '0px 12px 32px rgba(0,0,0,0.6)')
            root.style.setProperty('--shadow-none', 'none')

            // Border tokens (subtle, optional)
            root.style.setProperty('--border-subtle', 'rgba(255,255,255,0.04)')
            root.style.setProperty('--border-visible', 'rgba(255,255,255,0.06)')

            // Radius tokens (consistent across UI)
            root.style.setProperty('--radius-sm', '12px')
            root.style.setProperty('--radius-card', '16px')
            root.style.setProperty('--radius-modal', '20px')

            // ============================================
            // ICON COLOR TOKENS (DARK MODE ONLY)
            // ============================================
            // Neutral greys for non-branded icons
            // Ensures visual calm and hierarchy clarity
            root.style.setProperty('--icon-primary', '#E5E7EB')    // Primary icons (nav)
            root.style.setProperty('--icon-secondary', '#9CA3AF')  // Secondary icons
            root.style.setProperty('--icon-muted', '#6B7280')      // Muted/utility icons
        } else {
            root.style.setProperty('--canvas-text', TEXT_LIGHT_PRIMARY)
            root.style.setProperty('--canvas-text-muted', TEXT_LIGHT_MUTED)
            // Legacy surface variables
            root.style.setProperty('--canvas-surface', '#FFFFFF')
            root.style.setProperty('--canvas-surface-text', '#000000')

            // Light mode: softer shadows
            root.style.setProperty('--shadow-card', '0px 2px 8px rgba(0,0,0,0.08)')
            root.style.setProperty('--shadow-raised', '0px 8px 24px rgba(0,0,0,0.12)')
            root.style.setProperty('--shadow-none', 'none')

            // Border tokens (more visible in light mode)
            root.style.setProperty('--border-subtle', 'rgba(0,0,0,0.06)')
            root.style.setProperty('--border-visible', 'rgba(0,0,0,0.10)')

            // Radius tokens (same in both modes)
            root.style.setProperty('--radius-sm', '12px')
            root.style.setProperty('--radius-card', '16px')
            root.style.setProperty('--radius-modal', '20px')

            // Icon color tokens (light mode - darker for contrast)
            root.style.setProperty('--icon-primary', '#374151')    // Primary icons (nav)
            root.style.setProperty('--icon-secondary', '#6B7280')  // Secondary icons
            root.style.setProperty('--icon-muted', '#9CA3AF')      // Muted/utility icons
        }

        // Determine header colors
        let headerBg, headerText
        if (headerMode === 'locked-light') {
            headerBg = HEADER_LIGHT_BG
            headerText = HEADER_LIGHT_TEXT
        } else if (headerMode === 'locked-dark') {
            headerBg = HEADER_DARK_BG
            headerText = HEADER_DARK_TEXT
        } else {
            // Auto: same as canvas (light canvas = light header)
            if (canvasMode === 'dark') {
                headerBg = HEADER_DARK_BG
                headerText = HEADER_DARK_TEXT
            } else {
                headerBg = HEADER_LIGHT_BG
                headerText = HEADER_LIGHT_TEXT
            }
        }

        root.style.setProperty('--header-bg', headerBg)
        root.style.setProperty('--header-text', headerText)

        // ============================================
        // DATA-THEME ATTRIBUTE (STEP 4)
        // ============================================
        // Enables CSS selectors like [data-theme="dark"]
        // Used for header normalization and hero sections
        root.setAttribute('data-theme', canvasMode)
    }, [config.canvasMode, config.headerMode])

    // Manual config refresh - call from admin/owner actions when needed
    // INVARIANT: setConfig must NEVER receive undefined (atomic replacement only)
    // 🛡️ SUPABASE: Now fetches branding from cloud (SINGLE SOURCE OF TRUTH)
    const refreshConfig = useCallback(async () => {
        // 1. Get local config (for non-branding fields like menu, orders)
        const localConfig = getConfig()

        // 2. Fetch branding from Supabase (cloud wins)
        try {
            // 🏢 PHASE 3: Using dynamic businessId from TenantContext
            const { data: cloudBranding } = await getBranding(businessId)

            if (cloudBranding) {
                // 3. Merge: Supabase wins for branding fields
                const mergedConfig = {
                    ...localConfig,
                    branding: {
                        ...localConfig.branding,
                        primaryColor: cloudBranding.primary_color || localConfig.branding?.primaryColor,
                    },
                    colors: {
                        ...localConfig.colors,
                        primary: cloudBranding.primary_color || localConfig.colors?.primary,
                        secondary: cloudBranding.secondary_color || localConfig.colors?.secondary,
                    },
                    headerCover: cloudBranding.hero_url ? {
                        ...localConfig.headerCover,
                        image: cloudBranding.hero_url
                    } : localConfig.headerCover,
                    logo: cloudBranding.logo_url || localConfig.logo,
                }
                setConfig(mergedConfig)
            } else if (localConfig) {
                setConfig(localConfig)
            }
        } catch (err) {
            // Fallback to local config if cloud fails
            console.warn('[Supabase] Refresh failed, using local:', err.message)
            if (localConfig) {
                setConfig(localConfig)
            }
        }

        setOrders(getOrders())
    }, [])

    // ============================================
    // HYBRID CLOUD-FIRST: Realtime + Guest Handshake
    // REPLACES 2000ms polling with Supabase Realtime
    // ============================================
    useEffect(() => {
        let realtimeChannel = null

        const initCloudSync = async () => {
            // 🏢 PHASE 3: Using dynamic businessId from TenantContext
            // (businessId is available from useTenant() at component level)

            // 1. GUEST HANDSHAKE: Check for guest token (Valet Ticket)
            const guestToken = localStorage.getItem('fs_guest_token')
            const customerPhone = localStorage.getItem('fs_customer_phone')

            if (guestToken) {
                try {
                    const { data: guestOrders } = await getOrdersByGuestToken(guestToken, businessId)
                    if (guestOrders && guestOrders.length > 0) {
                        setOrders(guestOrders)
                    }
                } catch {
                    // Silent fallback - no orders to sync
                }
            } else if (customerPhone) {
                // FAIL-SAFE: Phone number anchor if no guest token
                try {
                    const { data: phoneOrders } = await getOrdersByPhone(customerPhone, businessId)
                    if (phoneOrders && phoneOrders.length > 0) {
                        setOrders(phoneOrders)
                    }
                } catch {
                    // Silent fallback
                }
            }

            // 2. REALTIME SUBSCRIPTION: Replace polling
            // ROBUST SYNC: Full spread for all field updates
            realtimeChannel = subscribeToOrders(
                businessId, // 🏢 PHASE 3: Dynamic from TenantContext
                // onInsert: New order created
                (newOrder) => {
                    setOrders(prev => {
                        // Prevent duplicates
                        if (prev.some(o => o.id === newOrder.id)) return prev
                        return [newOrder, ...prev]
                    })
                },
                // onUpdate: Full spread - any field update syncs instantly
                (orderId, updatedData) => {
                    setOrders(prev => prev.map(order =>
                        order.id === orderId
                            ? { ...order, ...updatedData }
                            : order
                    ))
                }
            )
        }

        initCloudSync()

        // 3. VISIBILITY SYNC: Refresh config on tab focus (lightweight, no polling)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshConfig()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // 4. CROSS-TAB SYNC: Listen for storage changes
        const handleStorageChange = (e) => {
            if (e.key === 'grub_config' || e.key === null) {
                refreshConfig()
            }
        }
        window.addEventListener('storage', handleStorageChange)

        // 5. FRONTEND SYNC EVENT: Listen for explicit sync requests
        const handleFrontendSync = () => {
            refreshConfig()
        }
        window.addEventListener('frontendSync', handleFrontendSync)

        // CLEANUP - NO setInterval (polling is BANNED)
        return () => {
            if (realtimeChannel) {
                realtimeChannel.unsubscribe()
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('frontendSync', handleFrontendSync)
        }
    }, [refreshConfig])

    // Maintenance mode overlay
    if (config.maintenanceMode) {
        return (
            <div className="app-container">
                <div className="maintenance-overlay">
                    <div className="maintenance-icon">🔧</div>
                    <h1 className="maintenance-title">En mantenimiento</h1>
                    <p className="maintenance-message">{config.maintenanceMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <AdminIntentProvider>
            <div className="app-container">
                {/* AdminLensBar REMOVED - status now in bottom stacked badge */}

                {/* ============================================
                    RULE 2: FORCED COMPONENT UNMOUNT
                    key changes based on route area = React destroys old UI
                    ============================================ */}
                <RouteAreaWrapper>
                    <Routes>
                        {/* 🏠 ROOT PATH: Show trial signup (no tenant lookup) */}
                        <Route path="/" element={<TrialSignup />} />

                        {/* 🎯 TRIAL FUNNEL: Landing page signup */}
                        <Route path="/start-trial" element={<TrialSignup />} />

                        {/* ============================================
                            TENANT-SCOPED CUSTOMER ROUTES
                            All customer routes are prefixed with :tenantSlug
                            ============================================ */}
                        <Route path="/:tenantSlug" element={<Home config={safeConfig} />} />
                        <Route path="/:tenantSlug/menu" element={<Menu config={safeConfig} />} />
                        <Route path="/:tenantSlug/envios" element={<Menu config={safeConfig} deliveryMode={true} />} />
                        <Route path="/:tenantSlug/order" element={<Order config={safeConfig} />} />

                        <Route path="/:tenantSlug/status" element={<OrderStatus config={safeConfig} featuredItems={safeConfig.featuredPhotos || []} />} />
                        <Route path="/:tenantSlug/rewards" element={<Rewards config={safeConfig} />} />
                        <Route path="/:tenantSlug/share" element={<ShareFood config={safeConfig} />} />
                        <Route path="/:tenantSlug/game" element={<PerfectPour />} />
                        <Route path="/:tenantSlug/info" element={<Info config={safeConfig} />} />
                        <Route path="/:tenantSlug/promos" element={<Promos config={safeConfig} />} />

                        {/* ============================================
                            TENANT-SCOPED STAFF ROUTES
                            ============================================ */}
                        <Route path="/:tenantSlug/staff" element={<StaffLogin />} />
                        <Route path="/:tenantSlug/staff/dashboard" element={
                            <ProtectedRoute requiredRole="staff">
                                <StaffDashboard config={safeConfig} orders={orders} updateOrder={updateOrder} setOrders={setOrders} />
                            </ProtectedRoute>
                        } />

                        {/* ============================================
                            TENANT-SCOPED OWNER ROUTES
                            ============================================ */}
                        <Route path="/:tenantSlug/owner" element={<OwnerLogin />} />
                        <Route path="/:tenantSlug/owner/summary" element={
                            <ProtectedRoute requiredRole="owner">
                                <OwnerSummary config={safeConfig} />
                            </ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/menu" element={
                            <ProtectedRoute requiredRole="owner">
                                <MenuManager config={safeConfig} />
                            </ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/delivery" element={
                            <ProtectedRoute requiredRole="owner">
                                <DeliveryManager config={safeConfig} />
                            </ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/rewards" element={
                            <ProtectedRoute requiredRole="owner">
                                <RewardsManager config={safeConfig} />
                            </ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/settings" element={
                            <ProtectedRoute requiredRole="owner">
                                <Settings config={safeConfig} />
                            </ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/analytics" element={
                            <ProtectedRoute requiredRole="owner">
                                <Analytics orders={orders} />
                            </ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/branding" element={
                            <ProtectedRoute requiredRole="owner">
                                <Settings config={safeConfig} />
                            </ProtectedRoute>
                        } />

                        {/* Demo Routes - NO AUTH REQUIRED */}
                        <Route path="/demo" element={<Demo />} />
                        <Route path="/demo/menu" element={<MenuManager config={safeConfig} demoMode={true} />} />
                        <Route path="/demo/branding" element={<Settings config={safeConfig} demoMode={true} />} />
                        <Route path="/demo/orders" element={<DeliveryManager config={safeConfig} demoMode={true} />} />
                        <Route path="/demo/analytics" element={<Analytics demoMode={true} />} />
                        <Route path="/demo/new" element={<Demo />} />
                        <Route path="/demo/backend/dashboard" element={
                            <Suspense fallback={<LazyFallback />}>
                                <DemoBackend />
                            </Suspense>
                        } />
                        <Route path="/demo/backend" element={<Navigate to="/demo/backend/dashboard" replace />} />

                        {/* Super Admin Routes - Note: SuperAdmin has own login screen */}
                        <Route path="/admin" element={
                            <Suspense fallback={<LazyFallback />}>
                                <SuperAdmin config={safeConfig} />
                            </Suspense>
                        } />
                        <Route path="/admin/cover-preview" element={<CoverPreview config={safeConfig} />} />

                        {/* Camera Suite */}
                        <Route path="/camera" element={<Camera />} />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </RouteAreaWrapper>

                {/* Bottom Navigation (visible on main customer pages) */}
                <BottomNav config={safeConfig} />

                {/* ============================================
                    RULE 1: PERSISTENT ADMIN BADGE (GLOBAL OVERLAY)
                    Always visible for superadmin, never part of a page
                    ============================================ */}
                <StackedAdminBadge />
            </div>
        </AdminIntentProvider>
    )
}

export default App
