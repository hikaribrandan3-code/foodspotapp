/**
 * AdminApp.jsx
 * 
 * 🛡️ STANDALONE ADMIN RUNTIME
 * 
 * This is a completely isolated Admin application that runs WITHOUT:
 * - TenantProvider
 * - TenantContext
 * - Any tenant-specific theme injection
 * 
 * This prevents the g[x] crash by ensuring tenant code never executes.
 */

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminIntentProvider } from './contexts/AdminIntentContext.jsx'
import AdminErrorBoundary from './components/Error/AdminErrorBoundary.jsx'

// Lazy load SuperAdmin to prevent any accidental imports
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin.jsx'))
const CoverPreview = lazy(() => import('./components/CoverPreview.jsx'))

// Loading fallback
const AdminLoadingFallback = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a1a2e',
        color: '#7C3AED',
        fontFamily: 'Inter, system-ui, sans-serif'
    }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading Admin...</div>
        </div>
    </div>
)

/**
 * AdminApp Component
 * 
 * The root component for the Admin runtime.
 * Completely isolated from tenant context.
 */
export default function AdminApp() {
    // Safe empty config for Admin mode
    const safeConfig = {
        pauseOrders: false,
        branding: {},
        settings: {}
    }

    return (
        <AdminIntentProvider>
            <AdminErrorBoundary>
                <div className="admin-app" style={{ minHeight: '100vh', background: '#1a1a2e' }}>
                    <Suspense fallback={<AdminLoadingFallback />}>
                        <Routes>
                            <Route path="/admin" element={<SuperAdmin config={safeConfig} />} />
                            <Route path="/admin/cover-preview" element={<CoverPreview config={safeConfig} />} />
                            <Route path="*" element={<Navigate to="/admin" replace />} />
                        </Routes>
                    </Suspense>
                </div>
            </AdminErrorBoundary>
        </AdminIntentProvider>
    )
}
