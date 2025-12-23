/**
 * BackendNav.jsx - Shared Backend Bottom Navigation
 * 
 * PRODUCTION-GRADE BOTTOM TAB BAR
 * 
 * Features:
 * - Role-based tab visibility (superadmin/owner, staff)
 * - Route-derived active tab (no local state)
 * - Tab switch debounce (150ms)
 * - Optional badge counts
 * - iOS-safe touch handling
 * - Reduced motion support
 * - Safe area insets
 * 
 * Constraints:
 * - No swipe gestures
 * - No long-press actions
 * - No FABs
 * - Visibility only, not access control
 * 
 * IMPORTANT:
 * BackendNav is intentionally mounted at the page-entry level (SuperAdmin, DemoBackend, StaffDashboard).
 * Do NOT duplicate this component inside individual owner sub-pages.
 * A layout-level lift will be handled in a future, dedicated refactor.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ============================================
// TAB CONFIGURATIONS BY ROLE
// ============================================

const OWNER_TABS = [
    { id: 'summary', label: 'Summary', route: null },
    { id: 'menu', label: 'Menu', route: null },
    { id: 'branding', label: 'Branding', route: null },
    { id: 'orders', label: 'Orders', route: null, hasBadge: true },
    { id: 'analytics', label: 'Analytics', route: null }
]

const STAFF_TABS = [
    { id: 'orders', label: 'Orders', route: null, hasBadge: true },
    { id: 'delivery', label: 'Delivery', route: null, hasBadge: true },
    { id: 'history', label: 'History', route: null }
]

// Route mappings for different contexts
const ROUTE_MAPS = {
    owner: {
        summary: '/owner/settings',
        menu: '/owner/menu',
        branding: '/owner/branding',
        orders: '/owner/delivery',
        analytics: '/owner/analytics'
    },
    staff: {
        orders: '/staff/dashboard',
        delivery: '/staff/dashboard',
        history: '/staff/dashboard'
    },
    // Demo and SuperAdmin use state-based navigation (no routes)
    demo: null,
    superadmin: null
}

// ============================================
// ICON COMPONENTS - Matching Reference Image
// ============================================

// Active color from reference: Teal/Cyan
const ACTIVE_COLOR = '#0EA5E9'
const INACTIVE_COLOR = '#9CA3AF'

function TabIcon({ id, active }) {
    const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
    const size = 24
    const strokeWidth = 1.75

    const icons = {
        // Summary (Home icon from reference)
        summary: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
        // Orders (Document/clipboard icon from reference)
        orders: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <line x1="9" y1="7" x2="15" y2="7" />
                <line x1="9" y1="11" x2="15" y2="11" />
                <line x1="9" y1="15" x2="12" y2="15" />
            </svg>
        ),
        // Menu (Fork & Knife / Utensils icon from reference)
        menu: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
            </svg>
        ),
        // Analytics (Reports/Bar chart icon from reference)
        analytics: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="8" y1="16" x2="8" y2="10" />
                <line x1="12" y1="16" x2="12" y2="6" />
                <line x1="16" y1="16" x2="16" y2="12" />
            </svg>
        ),
        // Branding (Settings/Gear icon from reference)
        branding: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
        // Staff tabs
        delivery: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
        ),
        history: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        )
    }

    return icons[id] || icons.orders
}


// ============================================
// MAIN COMPONENT
// ============================================

/**
 * BackendNav - Production-grade bottom navigation
 * 
 * Props:
 * - role: 'superadmin' | 'owner' | 'staff' | 'demo'
 * - activeTab: Current active tab ID (for state-based mode)
 * - onTabChange: Callback when tab changes (for state-based mode)
 * - useRoutes: Boolean to enable route-based navigation
 * - badges: Object with badge counts { orders: 3, delivery: 2 }
 */
function BackendNav({
    role = 'owner',
    activeTab,
    onTabChange,
    useRoutes = false,
    badges = {}
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const lastTapRef = useRef(0)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    // Check reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)
        const handler = (e) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    // Get tabs based on role
    const tabs = role === 'staff' ? STAFF_TABS : OWNER_TABS

    // Derive active tab from route if using routes
    const getActiveFromRoute = () => {
        const routes = ROUTE_MAPS[role]
        if (!routes) return activeTab
        for (const [tabId, route] of Object.entries(routes)) {
            if (location.pathname === route || location.pathname.startsWith(route + '/')) {
                return tabId
            }
        }
        return tabs[0]?.id
    }

    const currentTab = useRoutes ? getActiveFromRoute() : activeTab

    // Handle tab click with debounce
    const handleTabClick = (tabId) => {
        // Debounce: ignore taps within 150ms
        const now = Date.now()
        if (now - lastTapRef.current < 150) return
        lastTapRef.current = now

        // Skip if already on this tab
        if (tabId === currentTab) return

        // Optional: Haptic feedback for PWA
        if (window.matchMedia('(display-mode: standalone)').matches && navigator.vibrate) {
            navigator.vibrate(10)
        }

        // Route-based navigation
        if (useRoutes) {
            const routes = ROUTE_MAPS[role]
            if (routes && routes[tabId]) {
                navigate(routes[tabId])
            }
        }

        // State-based callback
        if (onTabChange) {
            onTabChange(tabId)
        }
    }

    // ============================================
    // STYLES
    // ============================================

    const navContainerStyle = {
        position: 'fixed',
        bottom: 0,
        left: 10,
        right: 10,
        background: '#FFFFFF',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 68,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 1000,
        // iOS safety
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        // Prevent overscroll
        overscrollBehavior: 'contain'
    }

    const tabButtonStyle = (isActive) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        minWidth: 56,
        minHeight: 44, // Apple HIG minimum
        position: 'relative',
        // iOS safety
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        // Transition
        transition: prefersReducedMotion ? 'none' : 'opacity 0.15s ease'
    })

    const labelStyle = (isActive) => ({
        fontSize: 11,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
        letterSpacing: '-0.01em',
        marginTop: 2,
        // Prevent zoom
        userSelect: 'none',
        WebkitUserSelect: 'none'
    })

    // Active indicator bar (matching reference image)
    const activeIndicatorStyle = {
        position: 'absolute',
        bottom: -4,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 32,
        height: 3,
        borderRadius: 2,
        background: ACTIVE_COLOR
    }

    const badgeStyle = {
        position: 'absolute',
        top: 4,
        right: 8,
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 8,
        background: '#6B7280',
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
    }

    return (
        <nav style={navContainerStyle} role="navigation" aria-label="Backend navigation">
            {tabs.map(tab => {
                const isActive = currentTab === tab.id
                const badgeCount = tab.hasBadge && badges[tab.id]

                return (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        style={tabButtonStyle(isActive)}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={tab.label}
                    >
                        <TabIcon id={tab.id} active={isActive} />

                        {/* Badge */}
                        {badgeCount > 0 && (
                            <span style={badgeStyle} aria-label={`${badgeCount} ${tab.label.toLowerCase()}`}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                        )}

                        <span style={labelStyle(isActive)}>
                            {tab.label}
                        </span>

                        {/* Active indicator bar (reference image) */}
                        {isActive && <span style={activeIndicatorStyle} />}
                    </button>
                )
            })}
        </nav>
    )
}

export default BackendNav
export { OWNER_TABS, STAFF_TABS, ROUTE_MAPS }
