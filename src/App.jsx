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
