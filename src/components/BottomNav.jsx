import { useLocation, useParams } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { getCameraIcon } from './CameraIcons.jsx'

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

// CAMERA ICON: Removed - now imported from CameraIcons.jsx

// INVARIANT: config must come from prop (App.jsx safeConfig)
function BottomNav({ config: configProp }) {
    // 🛡️ NULL GUARD: Ensure config is always an object (prevents f[b] crash)
    const config = configProp || {};

    const location = useLocation()
    const params = useParams()

    // 🏢 SILO-AWARE: Extract tenant from URL
    // Fallback: extract from pathname if useParams doesn't return it
    const tenantSlug = params.tenantSlug || (() => {
        const segments = location.pathname.split('/').filter(Boolean)
        // If path is /{tenantSlug}/something, first segment is the slug
        // But only if it's not a reserved/system route
        const RESERVED = [
            // Auth & System
            'login', 'admin', 'demo', 'staff', 'owner', 'camera', 'start-trial',
            // Customer pages - these are NOT slugs, they're page names
            'menu', 'status', 'info', 'envios', 'order', 'rewards', 'share', 'game', 'promos',
            // API & Assets
            'api', 'assets', 'receipt'
        ]
        if (segments.length >= 1 && !RESERVED.includes(segments[0])) {
            return segments[0]
        }
        return null
    })()

    // Hide nav on certain pages (backend, admin, system routes)
    const hiddenPaths = ['/staff', '/owner', '/admin', '/demo', '/game', '/receipt', '/camera', '/login']
    const shouldHide = hiddenPaths.some(path =>
        location.pathname.includes(path)
    )

    if (shouldHide || !tenantSlug) return null

    // Direct branding values from config
    const navBgColor = config.branding?.navbar_color || config.branding?.primaryColor || '#8B7355'

    // ICON COLOR: Prioritize nav_icon_mode from DB, then fall back to iconColorMode or calculated contrast
    const navMode = config.branding?.nav_icon_mode || config.branding?.iconColorMode
    const navIconColor = navMode === 'black' ? '#1F2937' : '#FFFFFF'

    // CAMERA BRANDING: Use camera-specific styling when enabled
    const cameraConfig = config.camera || {}
    const cameraEnabled = cameraConfig.enabled === true
    const cameraBgColor = cameraEnabled ? (cameraConfig.color || navBgColor) : navBgColor
    const cameraIconColor = cameraEnabled
        ? (cameraConfig.textColor === 'auto'
            ? (isLightColor(cameraBgColor) ? '#000000' : '#FFFFFF')
            : cameraConfig.textColor === 'black' ? '#000000' : '#FFFFFF')
        : navIconColor
    const CameraIconComponent = getCameraIcon(cameraConfig.icon || 'default')

    // Helper: Determine if color is light (for auto contrast)
    function isLightColor(hex) {
        const c = hex.replace('#', '')
        const r = parseInt(c.substr(0, 2), 16)
        const g = parseInt(c.substr(2, 2), 16)
        const b = parseInt(c.substr(4, 2), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance > 0.5
    }

    // 🏢 SILO-AWARE: Generate tenant-scoped routes
    const routes = {
        home: `/${tenantSlug}`,
        menu: `/${tenantSlug}/menu`,
        status: `/${tenantSlug}/status`,
        info: `/${tenantSlug}/info`,
        camera: '/camera' // Camera is global, not tenant-scoped
    }

    return (
        <nav
            className="bottom-nav"
            style={{ backgroundColor: navBgColor }}
        >
            <NavLink
                to={routes.home}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
                end
            >
                <HomeIcon />
                <span className="nav-label">Home</span>
            </NavLink>

            <NavLink
                to={routes.menu}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
            >
                <MenuIcon />
                <span className="nav-label">Menú</span>
            </NavLink>

            {/* CENTER CAMERA BUTTON - Customizable icon and color */}
            <NavLink to={routes.camera} className="camera-button">
                <div className="camera-inner" style={{ backgroundColor: cameraBgColor }}>
                    <CameraIconComponent style={{ color: cameraIconColor }} />
                </div>
            </NavLink>

            <NavLink
                to={routes.status}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ color: navIconColor }}
            >
                <StatusIcon />
                <span className="nav-label">Estado</span>
            </NavLink>

            <NavLink
                to={routes.info}
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

