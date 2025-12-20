import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getConfig } from '../config/appConfig.js'

// Icons as SVG components for crisp rendering
const HomeIcon = () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
)

const MenuIcon = () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
)

const StatusIcon = () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
)

const InfoIcon = () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
)

const CameraIcon = () => (
    <svg className="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
    </svg>
)

function BottomNav() {
    const location = useLocation()
    const [config, setConfig] = useState(() => getConfig())

    // Poll for branding changes (same as App.jsx for consistency)
    useEffect(() => {
        const refreshAll = () => {
            setConfig(getConfig())
        }

        const pollInterval = setInterval(() => {
            const newConfig = getConfig()
            setConfig(prev => {
                // Only update if branding changed
                if (JSON.stringify(prev.branding) !== JSON.stringify(newConfig.branding)) {
                    return newConfig
                }
                return prev
            })
        }, 500)

        // GLOBAL SYNC: Listen for manual sync from Super Admin/Owner Sync button
        const handleFrontendSync = () => {
            console.log('[NAV] Frontend sync triggered')
            refreshAll()
        }
        window.addEventListener('frontendSync', handleFrontendSync)

        return () => {
            clearInterval(pollInterval)
            window.removeEventListener('frontendSync', handleFrontendSync)
        }
    }, [])

    // Hide nav on certain pages
    const hiddenPaths = ['/staff', '/owner', '/admin', '/game', '/receipt', '/camera']
    const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path))

    if (shouldHide) return null

    // Direct branding values from config
    const navBgColor = config.branding?.primaryColor || '#8B7355'
    const navIconColor = config.branding?.iconColorMode === 'black' ? '#000000' : '#FFFFFF'

    return (
        <nav
            className="bottom-nav"
            style={{ backgroundColor: navBgColor }}
        >
            <NavLink
                to="/"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
            >
                <HomeIcon />
                <span className="nav-label">Home</span>
            </NavLink>

            <NavLink
                to="/menu"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
            >
                <MenuIcon />
                <span className="nav-label">Menú</span>
            </NavLink>

            {/* CENTER CAMERA BUTTON - Always accessible */}
            <NavLink to="/camera" className="camera-button">
                <div className="camera-inner" style={{ backgroundColor: navBgColor }}>
                    <CameraIcon style={{ color: navIconColor }} />
                </div>
            </NavLink>

            <NavLink
                to="/status"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
            >
                <StatusIcon />
                <span className="nav-label">Estado</span>
            </NavLink>

            <NavLink
                to="/info"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
            >
                <InfoIcon />
                <span className="nav-label">Info</span>
            </NavLink>
        </nav>
    )
}

export default BottomNav
