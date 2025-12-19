import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { getConfig } from './config/appConfig.js'
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
