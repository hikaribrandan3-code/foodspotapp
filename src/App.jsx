import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { getConfig, HERO_ICON_DARK, HERO_DEFAULT } from './config/appConfig.js'
import { incrementVisit } from './utils/storage.js'
import { AdminIntentProvider } from './contexts/AdminIntentContext.jsx'

// Components
import BottomNav from './components/BottomNav.jsx'
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
import MenuManager from './pages/owner/MenuManager.jsx'
import RewardsManager from './pages/owner/RewardsManager.jsx'
import Settings from './pages/owner/Settings.jsx'
import Analytics from './pages/owner/Analytics.jsx'

// Admin Pages
import SuperAdmin from './pages/admin/SuperAdmin.jsx'
import CoverPreview from './components/CoverPreview.jsx'

// Demo Pages - KEPT for backend demo editor only (not accessible from frontend)
import DemoBackend from './pages/demo/DemoBackend.jsx'

// Camera Suite
import Camera from './components/Camera/index.jsx'

function App() {
    const [config, setConfig] = useState(() => getConfig())

    // Track visit on app load
    useEffect(() => {
        incrementVisit()
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

        // Rewards
        const rewardsConfig = heroIcons.rewards || HERO_DEFAULT
        root.style.setProperty('--hero-rewards-bg', getHeroBg(rewardsConfig))
        root.style.setProperty('--hero-rewards-icon', getHeroIcon(rewardsConfig))

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
    const refreshConfig = useCallback(() => {
        const newConfig = getConfig()
        const newDemo = isDemoMode()

        // [TEMPORARY DEBUG] Log what is read before setting state
        console.log('[APP] refreshConfig()', {
            demo: newDemo,
            brandingPrimary: newConfig?.branding?.primaryColor,
            heroIcons: newConfig?.heroIcons
        })

        // Always update state to ensure CSS variable re-application
        // The useEffect dependencies will handle actual DOM updates
        setConfig(newConfig)
        setDemoMode(newDemo)
    }, [])

    // AUTO-SYNC: Listen for localStorage changes from other tabs/windows (Super Admin)
    // DEMO MODE: Only frontendSync is allowed - no polling, no auto-refresh
    useEffect(() => {
        const inDemo = isDemoMode()

        // GLOBAL SYNC: Always listen for explicit frontendSync events (demo + production)
        const handleFrontendSync = () => {
            // [TEMPORARY DEBUG] Log when frontendSync is received
            console.log('[APP] frontendSync received', {
                demoMode,
                timestamp: Date.now()
            })
            refreshConfig()
        }
        window.addEventListener('frontendSync', handleFrontendSync)

        // === PRODUCTION-ONLY LISTENERS ===
        // These are disabled in demo mode to prevent overwriting demo branding
        let pollInterval = null

        if (!inDemo) {
            const handleStorageChange = (e) => {
                // Config key changed - refresh
                if (e.key === 'grub_config' || e.key === null) {
                    refreshConfig()
                }
            }
            window.addEventListener('storage', handleStorageChange)

            // Also refresh on visibility change (same-tab sync when returning from admin)
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    refreshConfig()
                }
            }
            document.addEventListener('visibilitychange', handleVisibilityChange)

            // Focus event for PWA standalone mode
            const handleFocus = () => {
                refreshConfig()
            }
            window.addEventListener('focus', handleFocus)

            // Polling fallback for same-tab changes (PWA needs faster polling)
            // 500ms ensures near-instant updates in PWA standalone mode
            pollInterval = setInterval(refreshConfig, 500)

            // Cleanup for production listeners
            return () => {
                window.removeEventListener('storage', handleStorageChange)
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                window.removeEventListener('focus', handleFocus)
                window.removeEventListener('frontendSync', handleFrontendSync)
                clearInterval(pollInterval)
            }
        }

        // Cleanup for demo mode (only frontendSync listener)
        return () => {
            window.removeEventListener('frontendSync', handleFrontendSync)
        }
    }, [refreshConfig, demoMode])

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
                {/* Demo Mode Indicator */}
                {demoMode && (
                    <div className="demo-indicator">DEMO — datos simulados</div>
                )}

                <Routes>
                    {/* Customer Routes */}
                    <Route path="/" element={<Home config={config} />} />
                    <Route path="/menu" element={<Menu config={config} />} />
                    <Route path="/envios" element={<Menu config={config} deliveryMode={true} />} />
                    <Route path="/order" element={<Order config={config} />} />

                    <Route path="/status" element={<OrderStatus config={config} />} />
                    <Route path="/rewards" element={<Rewards config={config} />} />
                    <Route path="/share" element={<ShareFood config={config} />} />
                    <Route path="/game" element={<PerfectPour />} />
                    <Route path="/info" element={<Info config={config} />} />
                    <Route path="/promos" element={<Promos config={config} />} />

                    {/* Staff Routes */}
                    <Route path="/staff" element={<StaffLogin />} />
                    <Route path="/staff/dashboard" element={
                        <ProtectedRoute requiredRole="staff">
                            <StaffDashboard config={config} />
                        </ProtectedRoute>
                    } />

                    {/* Owner Routes */}
                    <Route path="/owner" element={<OwnerLogin />} />
                    <Route path="/owner/menu" element={
                        <ProtectedRoute requiredRole="owner">
                            <MenuManager />
                        </ProtectedRoute>
                    } />
                    <Route path="/owner/rewards" element={
                        <ProtectedRoute requiredRole="owner">
                            <RewardsManager />
                        </ProtectedRoute>
                    } />
                    <Route path="/owner/settings" element={
                        <ProtectedRoute requiredRole="owner">
                            <Settings />
                        </ProtectedRoute>
                    } />
                    <Route path="/owner/analytics" element={
                        <ProtectedRoute requiredRole="owner">
                            <Analytics />
                        </ProtectedRoute>
                    } />

                    {/* Demo Routes - NO AUTH REQUIRED */}
                    <Route path="/demo/backend/dashboard" element={<DemoBackend />} />
                    <Route path="/demo/backend" element={<Navigate to="/demo/backend/dashboard" replace />} />
                    <Route path="/demo" element={<Navigate to="/demo/backend/dashboard" replace />} />

                    {/* Super Admin Routes - Note: SuperAdmin has own login screen */}
                    <Route path="/admin" element={<SuperAdmin />} />
                    <Route path="/admin/cover-preview" element={<CoverPreview />} />

                    {/* Camera Suite */}
                    <Route path="/camera" element={<Camera />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                {/* Bottom Navigation (visible on main customer pages) */}
                <BottomNav />
            </div>
        </AdminIntentProvider>
    )
}

export default App
