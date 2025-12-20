import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'


// =============================================================================
// DEV CLEANUP: Force unregister stale PWA Service Workers
// This ensures the "Layout Preset" cache is cleared on all devices.
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
            // Optional: Force reload if a SW was found and killed? 
            // Better to let the user reload manually to avoid loops.
        } else {
            console.log('✅ [Dev] No stale Service Workers found.')
        }
    })
}
// =============================================================================

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
