import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// =============================================================================
// DEV CLEANUP: Force unregister stale PWA Service Workers
// =============================================================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
            console.log('🧹 [Dev] Found stale Service Workers. Unregistering all...')
            for (let registration of registrations) {
                registration.unregister()
            }
        }
    })
}

// =============================================================================
// 🛡️ UNIFIED ENTRY POINT: App.jsx now handles Router & TenantProvider
// =============================================================================
const path = window.location.pathname
const root = ReactDOM.createRoot(document.getElementById('root'))

if (path.startsWith('/admin')) {
    // =====================================================================
    // 🛡️ ADMIN MODE: Render ONLY the Admin System
    // This bypasses TenantProvider and all tenant logic
    // =====================================================================
    console.log('🛡️ [main.jsx] ADMIN MODE - Bypassing TenantProvider')

    import('./AdminApp.jsx').then(({ default: AdminApp }) => {
        import('react-router-dom').then(({ BrowserRouter }) => {
            root.render(
                <React.StrictMode>
                    <BrowserRouter>
                        <AdminApp />
                    </BrowserRouter>
                </React.StrictMode>
            )
        })
    }).catch(err => {
        console.error('❌ Failed to load AdminApp:', err)
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
    // 🍔 TENANT MODE: App.jsx handles Router + TenantProvider internally
    // =====================================================================
    console.log('🍔 [main.jsx] TENANT MODE - Loading App (self-contained)')

    import('./App.jsx').then(({ default: App }) => {
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        )
    })
}
