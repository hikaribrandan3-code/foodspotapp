import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'

// Core Imports (Static to prevent ChunkLoadError on mobile)
import { TenantProvider } from './contexts/TenantContext.jsx'
import App from './App.jsx'

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
    }).catch(err => console.warn('SW Cleanup failed:', err))
}

// =============================================================================
// 🛡️ STRICT BIFURCATION: Admin vs Tenant
// =============================================================================
const path = window.location.pathname
const root = ReactDOM.createRoot(document.getElementById('root'))

// 🚨 SYSTEM ERROR UI: Global Error Boundary
const renderSystemError = (message, details = null) => {
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
            {details && (
                <div style={{
                    fontSize: '11px',
                    opacity: 0.5,
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    maxWidth: '100%',
                    wordBreak: 'break-all'
                }}>
                    {details}
                </div>
            )}
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

// 🛡️ GLOBAL ERROR TRAP (Catches top-level crashes)
window.addEventListener('error', (event) => {
    console.error('🔥 CRITICAL: Top-level error caught:', event.error);
    // Only hijack if the root is empty (app hasn't started)
    if (!document.getElementById('root')?.hasChildNodes()) {
        renderSystemError('Critical Application Failure', event.error?.message || 'Unknown Error');
    }
});

if (path.startsWith('/admin')) {
    // =====================================================================
    // 🛡️ ADMIN MODE: Render ONLY the Admin System
    // This bypasses TenantProvider, ThemeProvider, and all tenant logic
    // =====================================================================
    console.log('🛡️ [main.jsx] ADMIN MODE - Bypassing TenantProvider')

    // Dynamically import AdminApp to avoid loading tenant logic
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
        renderSystemError('Failed to load Admin Panel. Please check your connection.', err.message)
    })
} else {
    // =====================================================================
    // 🍔 TENANT MODE: Render the standard SaaS App with TenantProvider
    // =====================================================================
    console.log('🍔 [main.jsx] TENANT MODE - Standard Load')

    try {
        root.render(
            <React.StrictMode>
                <HelmetProvider>
                    <BrowserRouter>
                        <TenantProvider>
                            <App />
                        </TenantProvider>
                    </BrowserRouter>
                </HelmetProvider>
            </React.StrictMode>
        )
    } catch (err) {
        console.error('❌ Failed to mount Application:', err)
        renderSystemError('Failed to initialize application.', err.message)
    }
}
