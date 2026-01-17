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
        // Fallback: Show error UI
        root.render(
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#1a1a2e',
                color: '#ff6b6b',
                fontFamily: 'Inter, sans-serif',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ fontSize: '48px' }}>⚠️</div>
                <div>Failed to load Admin Panel</div>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '12px 24px',
                        background: '#7C3AED',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Reload
                </button>
            </div>
        )
    })
} else {
    // =====================================================================
    // 🍔 TENANT MODE: Render the standard SaaS App with TenantProvider
    // =====================================================================
    console.log('🍔 [main.jsx] TENANT MODE - Loading Full App with TenantProvider')

    // Standard imports for tenant mode
    import('./contexts/TenantContext.jsx').then(({ TenantProvider }) => {
        import('./App.jsx').then(({ default: App }) => {
            root.render(
                <React.StrictMode>
                    <BrowserRouter>
                        <TenantProvider>
                            <App />
                        </TenantProvider>
                    </BrowserRouter>
                </React.StrictMode>
            )
        })
    })
}
