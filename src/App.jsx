import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { getConfig, HERO_ICON_DARK, HERO_DEFAULT } from './config/appConfig.js'
import { incrementVisit, isDemoMode } from './utils/storage.js'

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

// Camera Suite
import Camera from './components/Camera/index.jsx'

function App() {
    const [config, setConfig] = useState(() => getConfig())
    const [demoMode, setDemoMode] = useState(() => isDemoMode())

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

        // PATCH 3.5: Binary theme (pure white/black)
        const CANVAS_LIGHT = '#FFFFFF'
        const CANVAS_DARK = '#000000'

        // Canvas text colors (pure contrast)
        const TEXT_LIGHT_PRIMARY = '#000000'
        const TEXT_LIGHT_MUTED = '#666666'
        const TEXT_DARK_PRIMARY = '#FFFFFF'
        const TEXT_DARK_MUTED = '#999999'

        // Header = same as canvas (no separation)
        const HEADER_LIGHT_BG = '#FFFFFF'
        const HEADER_LIGHT_TEXT = '#000000'
        const HEADER_DARK_BG = '#000000'
        const HEADER_DARK_TEXT = '#FFFFFF'

        // Set canvas background
        const canvasBg = canvasMode === 'dark' ? CANVAS_DARK : CANVAS_LIGHT
        root.style.setProperty('--canvas-bg', canvasBg)

        // Set canvas text colors and surfaces
        if (canvasMode === 'dark') {
            root.style.setProperty('--canvas-text', TEXT_DARK_PRIMARY)
            root.style.setProperty('--canvas-text-muted', TEXT_DARK_MUTED)
            // Surface = same as canvas for binary mode
            root.style.setProperty('--canvas-surface', '#000000')
            root.style.setProperty('--canvas-surface-text', '#FFFFFF')
        } else {
            root.style.setProperty('--canvas-text', TEXT_LIGHT_PRIMARY)
            root.style.setProperty('--canvas-text-muted', TEXT_LIGHT_MUTED)
            // Surface = same as canvas for binary mode
            root.style.setProperty('--canvas-surface', '#FFFFFF')
            root.style.setProperty('--canvas-surface-text', '#000000')
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
    }, [config.canvasMode, config.headerMode])

    // Manual config refresh - call from admin/owner actions when needed
    const refreshConfig = useCallback(() => {
        const newConfig = getConfig()
        const newDemo = isDemoMode()

        // Only update state if values actually changed
        setConfig(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newConfig)) {
                return newConfig
            }
            return prev
        })

        setDemoMode(prev => {
            if (prev !== newDemo) {
                return newDemo
            }
            return prev
        })
    }, [])

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

                <Route path="/status" element={<OrderStatus />} />
                <Route path="/rewards" element={<Rewards config={config} />} />
                <Route path="/share" element={<ShareFood config={config} />} />
                <Route path="/game" element={<PerfectPour />} />
                <Route path="/info" element={<Info />} />
                <Route path="/promos" element={<Promos />} />

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
    )
}

export default App
