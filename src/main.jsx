import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

// =============================================================================
// DEV CLEANUP: Force unregister stale PWA Service Workers
// =============================================================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
            console.log('🧹 [Dev] Found stale Service Workers. Unregistering all...')
            for (let registration of registrations) {
                registration.unregister().then(success => {
                    console.log(success ? '✅ Unregistered SW' : '❌ Failed to unregister SW')
                })
            }
        } else {
            console.log('✅ [Dev] No stale Service Workers found.')
        }
    })
}

// =============================================================================
// 🛡️ STRICT BIFURCATION: Physically separate Admin and Tenant runtimes
// =============================================================================
const path = window.location.pathname
const root = ReactDOM.createRoot(document.getElementById('root'))

// 🚨 SYSTEM ERROR UI: Fallback if dynamic imports fail
const renderSystemError = (message) => {
    root.render(
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            flexDirection: 'column',
            gap: '16px',
            padding: '24px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '48px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>System Error</div>
            <div style={{ opacity: 0.7, maxWidth: '400px' }}>{message}</div>
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '12px 24px',
                    background: '#7C3AED',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    marginTop: '8px'
                }}
            >
                Reload Page
            </button>
        </div>
    )
}

if (path.startsWith('/admin')) {
    // =====================================================================
    // 🛡️ ADMIN MODE: Render ONLY the Admin System
    // This bypasses TenantProvider, ThemeProvider, and all tenant logic
    // =====================================================================
    console.log('🛡️ [main.jsx] ADMIN MODE - Bypassing TenantProvider')

    // Dynamically import AdminApp to avoid any tenant code loading
    import('./AdminApp.jsx').then(({ default: AdminApp }) => {
        root.render(
            <React.StrictMode>
                <BrowserRouter>
                    <AdminApp />
                </BrowserRouter>
            </React.StrictMode>
        )
    }).catch(err => {
        console.error('❌ Failed to load AdminApp:', err)
        renderSystemError('Failed to load Admin Panel. Please check your connection and try again.')
    })
} else {
    // =====================================================================
    // 🍔 TENANT MODE: Render the standard SaaS App with TenantProvider
    // =====================================================================
    console.log('🍔 [main.jsx] TENANT MODE - Loading Full App with TenantProvider')

    // 🛡️ FIX 1: Wrapped in .catch() to prevent white screen on import failure
    Promise.all([
        import('./contexts/TenantContext.jsx'),
        import('./App.jsx')
    ]).then(([{ TenantProvider }, { default: App }]) => {
        root.render(
            <React.StrictMode>
                <BrowserRouter>
                    <TenantProvider>
                        <App />
                    </TenantProvider>
                </BrowserRouter>
            </React.StrictMode>
        )
    }).catch(err => {
        console.error('❌ Failed to load Application Core:', err)
        renderSystemError('Failed to load application core. Please check your connection and try again.')
    })
}
