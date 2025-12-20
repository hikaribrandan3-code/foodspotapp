/**
 * CoverPreview.jsx - Static Cover Preview Route
 * 
 * PWA FIX: No timers, no auto-navigation, persistent until user action
 * 
 * Separate route for cover image preview.
 * Renders real Home with cover applied.
 * Persistent until user taps Back or Done.
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { getConfig } from '../config/appConfig.js'
import Home from '../pages/customer/Home.jsx'

// Static Nav Bar (PWA-safe — doesn't hide on /admin paths)
function StaticBottomNav() {
    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderTop: '1px solid #E5E7EB',
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 1
        }}>
            <NavItem icon="home" label="Home" active />
            <NavItem icon="menu" label="Menú" />
            <CameraButton />
            <NavItem icon="status" label="Estado" />
            <NavItem icon="info" label="Info" />
        </nav>
    )
}

function NavItem({ icon, label, active }) {
    const icons = {
        home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
        menu: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
        status: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
        info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: active ? 1 : 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : 'currentColor'} strokeWidth="2">
                {icons[icon]}
            </svg>
            <span style={{ fontSize: 10, color: active ? '#111' : '#666', marginTop: 2 }}>{label}</span>
        </div>
    )
}

function CameraButton() {
    return (
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -20 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
            </svg>
        </div>
    )
}

function CoverPreview() {
    const navigate = useNavigate()
    const location = useLocation()
    const config = getConfig()

    // NO TIMERS, NO AUTO-NAVIGATION
    // Preview persists until user action
    const returnTo = location.state?.returnTo || '/admin'
    // Filter out returnTo from state to avoid clutter, keep other state (like activeTab)
    const { returnTo: _, ...restState } = location.state || {}

    const handleBack = () => {
        navigate(returnTo, { state: { ...restState, returnToEditor: true } })
    }

    const handleDone = () => {
        navigate(returnTo, { state: restState })
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--canvas-bg, #fff)',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {/* Real Home render (non-interactive for preview) */}
            <div style={{ pointerEvents: 'none' }}>
                <Home config={config} />
            </div>

            {/* Static Nav Bar (always visible, doesn't hide on /admin) */}
            <StaticBottomNav />

            {/* Floating buttons — user's only way to exit */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                paddingTop: 'max(12px, env(safe-area-inset-top))',
                paddingRight: 12,
                display: 'flex',
                gap: 8,
                zIndex: 10000
            }}>
                <button
                    onClick={handleBack}
                    onTouchEnd={(e) => { e.preventDefault(); handleBack(); }}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation'
                    }}
                >
                    ←
                </button>
                <button
                    onClick={handleDone}
                    onTouchEnd={(e) => { e.preventDefault(); handleDone(); }}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#22C55E',
                        color: '#fff',
                        border: 'none',
                        fontSize: 20,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                        touchAction: 'manipulation'
                    }}
                >
                    ✓
                </button>
            </div>
        </div>
    )
}

export default CoverPreview
