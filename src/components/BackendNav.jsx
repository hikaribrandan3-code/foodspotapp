/**
 * @file BackendNav.jsx
 * @description Silo-Aware Bottom Navigation for Multi-Tenant Backend
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  🛡️  SILO-CORRECT: AUDITED 2026-01-14                        ║
 * ║                                                              ║
 * ║  All navigation paths are dynamically scoped to tenantSlug.  ║
 * ║  No hardcoded paths. Full multi-tenant isolation.            ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - Role-based tab visibility (superadmin/owner, staff)
 * - Route-derived active tab (no local state)
 * - Dynamic tenant-scoped navigation (/{tenantSlug}/owner/...)
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
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useTenant } from '../contexts/TenantContext'
import { useTier } from '../hooks/useTier'
import { supabase } from '../lib/supabaseClient'

const PRO_ONLY_TABS = ['analytics', 'ai', 'events']

// ============================================
// TAB CONFIGURATIONS BY ROLE
// ============================================

const OWNER_TABS = [
    { id: 'summary', label: 'Summary', route: null },
    { id: 'menu', label: 'Menu', route: null },
    { id: 'branding', label: 'Branding', route: null },
    { id: 'orders', label: 'Orders', route: null, hasBadge: true },
    { id: 'events', label: 'Events', route: null, desktopOnly: true },
    { id: 'analytics', label: 'Analytics', route: null },
    { id: 'contacts', label: 'CRM', route: null, desktopOnly: true },
    { id: 'ai', label: 'AI', route: null },
    { id: 'cash', label: 'Caja', route: null, desktopOnly: true },
    { id: 'tutorials', label: 'Tutorials', route: null }
]

const STAFF_TABS = [
    { id: 'orders', label: 'Orders', route: null, hasBadge: true },
    { id: 'delivery', label: 'Delivery', route: null, hasBadge: true },
    { id: 'events', label: 'Events', route: null, desktopOnly: true },
    { id: 'history', label: 'History', route: null },
    { id: 'tutorials', label: 'Tutorials', route: null }
]

// Super Admin tabs - same as Owner but state-based (no navigation)
const SUPERADMIN_TABS = [
    { id: 'summary', label: 'Summary', route: null },
    { id: 'menu', label: 'Menu', route: null },
    { id: 'branding', label: 'Branding', route: null },
    { id: 'orders', label: 'Orders', route: null, hasBadge: true },
    { id: 'analytics', label: 'Analytics', route: null },
    { id: 'ai', label: 'AI', route: null }
]

/**
 * Generate dynamic route maps based on tenantSlug
 * @param {string} tenantSlug - The current tenant's URL slug
 * @returns {object} Route maps for owner, staff, and demo contexts
 */
const getRouteMaps = (tenantSlug) => ({
    owner: {
        summary: `/${tenantSlug}/owner/summary`,
        menu: `/${tenantSlug}/owner/menu`,
        branding: `/${tenantSlug}/owner/branding`,
        orders: `/${tenantSlug}/owner/delivery`,
        events: `/${tenantSlug}/owner/events`,
        analytics: `/${tenantSlug}/owner/analytics`,
        contacts: `/${tenantSlug}/owner/contacts`,
        ai: `/${tenantSlug}/owner/ai`,
        cash: `/${tenantSlug}/owner/cash`,
        tutorials: `/${tenantSlug}/owner/tutorials`
    },
    staff: {
        orders: `/${tenantSlug}/staff/ops`,
        delivery: `/${tenantSlug}/staff/ops`,
        events: `/${tenantSlug}/staff/events`,
        history: `/${tenantSlug}/staff/ops`,
        tutorials: `/${tenantSlug}/staff/tutorials`
    },
    demo: {
        summary: '/demo',
        menu: '/demo/menu',
        branding: '/demo/branding',
        orders: '/demo/orders',
        analytics: '/demo/analytics',
        ai: '/demo/ai'
    },
    // SuperAdmin uses state-based navigation (no routes)
    superadmin: null
})

// ============================================
// ICON COMPONENTS - Matching Reference Image
// ============================================

// Active color: Emerald green (matches MenuManager UI)
const ACTIVE_COLOR = '#10b981'
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
        // Events (Ticket icon)
        events: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7.5V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.5" />
                <path d="M2 16.5V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2.5" />
                <line x1="2" y1="7.5" x2="22" y2="7.5" />
                <line x1="2" y1="16.5" x2="22" y2="16.5" />
                <line x1="8" y1="3" x2="8" y2="6" />
                <line x1="16" y1="3" x2="16" y2="6" />
                <line x1="8" y1="18" x2="8" y2="21" />
                <line x1="16" y1="18" x2="16" y2="21" />
                <circle cx="12" cy="12" r="1.5" fill={color} />
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
        // AI (Sparkle/Brain icon)
        ai: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
        ),
        // Branding (Settings/Gear icon from reference)
        branding: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
        // Contacts (People icon)
        contacts: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
        ),
        // Tutorials (Play/Video icon)
        tutorials: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
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
    const { t } = useLanguage()
    const { tenantData, businessId: contextBusinessId } = useTenant()
    const location = useLocation()
    const params = useParams()
    const lastTapRef = useRef(0)
    const { isPro } = useTier()
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
    )
    const [isDark, setIsDark] = useState(
        () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
    )
    const [userEmail, setUserEmail] = useState('')

    // 🏢 SILO-AWARE: Extract tenant from URL
    // Fallback: extract from pathname if useParams doesn't return it
    const tenantSlug = params.tenantSlug || (() => {
        const segments = location.pathname.split('/').filter(Boolean)
        // If path is /{tenantSlug}/owner/... or /{tenantSlug}/staff/...
        if (segments.length >= 2 && (segments[1] === 'owner' || segments[1] === 'staff')) {
            return segments[0]
        }
        return null
    })()

    // Generate route maps dynamically based on current tenant
    // If no tenantSlug, routes will be null (prevents bad navigation)
    const ROUTE_MAPS = tenantSlug ? getRouteMaps(tenantSlug) : null

    // Fetch current user email
    useEffect(() => {
        const fetchUserEmail = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUserEmail(session?.user?.email || '')
        }
        fetchUserEmail()
    }, [])

    // Check reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)
        const handler = (e) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    // Detect desktop breakpoint
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)')
        const handler = (e) => setIsDesktop(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    // Track dark mode changes reactively
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'))
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    }, [])

    // ============================================
    // RULE 3: URL-BASED TAB SELECTION (Silo-Aware)
    // Check the current URL, NOT the user's rank
    // Handles both /:tenantSlug/owner and legacy /owner patterns
    // ============================================
    const getTabsFromUrl = () => {
        const path = location.pathname
        // Check for tenant-scoped paths first (/:tenantSlug/owner, /:tenantSlug/staff)
        if (path.includes('/staff')) return { tabs: STAFF_TABS, area: 'staff' }
        if (path.includes('/owner')) return { tabs: OWNER_TABS, area: 'owner' }
        if (path.startsWith('/admin')) return { tabs: SUPERADMIN_TABS, area: 'superadmin' }
        if (path.startsWith('/demo')) return { tabs: OWNER_TABS, area: 'demo' }
        return { tabs: OWNER_TABS, area: 'owner' } // Fallback
    }
    const { tabs, area: urlArea } = getTabsFromUrl()
    const isSidebarMode = isDesktop && urlArea === 'owner'

    // Apply/remove body padding-left + CSS var + body class when sidebar is active
    useEffect(() => {
        if (isSidebarMode) {
            document.body.style.paddingLeft = '220px'
            document.body.classList.add('has-owner-sidebar')
            document.documentElement.style.setProperty('--sidebar-width', '220px')
        } else {
            document.body.style.paddingLeft = ''
            document.body.classList.remove('has-owner-sidebar')
            document.documentElement.style.setProperty('--sidebar-width', '0px')
        }
        return () => {
            document.body.style.paddingLeft = ''
            document.body.classList.remove('has-owner-sidebar')
            document.documentElement.style.setProperty('--sidebar-width', '0px')
        }
    }, [isSidebarMode])

    // Derive active tab from route if using routes
    const getActiveFromRoute = () => {
        if (!ROUTE_MAPS) return activeTab
        const routes = ROUTE_MAPS[urlArea] // Use URL-derived area, not prop
        if (!routes) return activeTab

        // Find the best (most specific) match - longest route wins
        let bestMatch = null
        let bestMatchLength = -1

        for (const [tabId, route] of Object.entries(routes)) {
            // Match exact path or path prefix (handles nested routes)
            if (location.pathname === route || location.pathname.startsWith(route + '/')) {
                if (route.length > bestMatchLength) {
                    bestMatch = tabId
                    bestMatchLength = route.length
                }
            }
            // Also check if path ends with the tab segment (for flexible matching)
            const tabSegment = `/${tabId}`
            if (location.pathname.endsWith(tabSegment) || location.pathname.includes(tabSegment + '/')) {
                if (!bestMatch) bestMatch = tabId
            }
        }

        return bestMatch || tabs[0]?.id
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

        // Free tier: block Pro-only tabs, navigate to upgrade screen
        if (!isPro && PRO_ONLY_TABS.includes(tabId) && useRoutes && ROUTE_MAPS) {
            const routes = ROUTE_MAPS[urlArea]
            if (routes && routes[tabId]) {
                navigate(routes[tabId]) // TierGuard inside the page handles the lock
            }
            return
        }

        // Optional: Haptic feedback for PWA
        if (window.matchMedia('(display-mode: standalone)').matches && navigator.vibrate) {
            navigator.vibrate(10)
        }

        // Route-based navigation (uses dynamic tenant-scoped routes)
        if (useRoutes && ROUTE_MAPS) {
            const routes = ROUTE_MAPS[urlArea] // 🏢 Use URL-derived area for consistency
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
        background: '#10b981',
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
    }
    const localizedTabs = useMemo(() => tabs
        .filter(tab => {
            // Hide tutorials unless user is hikaribrandan3@gmail.com
            if (tab.id === 'tutorials' && userEmail !== 'hikaribrandan3@gmail.com') {
                return false
            }
            return !tab.desktopOnly || isDesktop
        })
        .map(tab => ({
            ...tab,
            label: t(tab.id) || tab.label
        })), [tabs, t, isDesktop, userEmail])

    const storeName = tenantData?.venue_name || tenantData?.business_name || 'FoodSpot'
    const storeUrl = tenantSlug ? `/${tenantSlug}` : '/'

    // ── LOCATION SWITCHER STATE ──────────────────────────────────
    const [locations, setLocations] = useState([])
    const [locDropOpen, setLocDropOpen] = useState(false)
    const dropRef = useRef(null)

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                // Try RPC first
                const { data, error } = await supabase.rpc('get_owner_locations')
                if (data && Array.isArray(data) && data.length > 0) {
                    console.log('[BackendNav] Locations from RPC:', data.length)
                    setLocations(data)
                    return
                }

                // Fallback: query businesses + branding directly
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('id, name, branding(slug)')
                    .order('created_at', { ascending: true })

                if (bizData && bizData.length > 0) {
                    console.log('[BackendNav] Locations from fallback query:', bizData.length)
                    const transformed = bizData.map(b => ({
                        id: b.id,
                        name: b.name,
                        slug: b.branding?.[0]?.slug || ''
                    }))
                    setLocations(transformed)
                } else {
                    setLocations([])
                }
            } catch (err) {
                console.error('[BackendNav] Fetch locations error:', err)
                setLocations([])
            }
        }
        fetchLocations()
    }, [tenantSlug])

    // Close dropdown on outside click
    useEffect(() => {
        if (!locDropOpen) return
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setLocDropOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [locDropOpen])

    const handleSwitchLocation = (slug) => {
        setLocDropOpen(false)
        // Full reload so TenantContext re-hydrates from the new slug
        localStorage.setItem('fs_last_active_slug', slug)
        window.location.href = `/${slug}/owner/summary`
    }

    // ── DESKTOP SIDEBAR ──────────────────────────────────────────
    if (isSidebarMode) {
        return (
            <aside
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: 220,
                    height: '100vh',
                    background: isDark ? '#0f172a' : '#ffffff',
                    borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 100,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}
                role="navigation"
                aria-label="Owner navigation"
            >
                {/* Brand / Location Selector */}
                <div
                    ref={dropRef}
                    style={{
                        padding: '16px 14px 14px',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}`,
                        position: 'relative',
                    }}
                >
                    <p style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: '#10b981',
                        marginBottom: 4,
                    }}>FoodSpot</p>

                    {/* Location pill — clickable only if multi-location */}
                    <button
                        onClick={() => locations.length > 1 && setLocDropOpen(o => !o)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            width: '100%',
                            background: locations.length > 1
                                ? (isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb')
                                : 'transparent',
                            border: locations.length > 1
                                ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`
                                : 'none',
                            borderRadius: 20,
                            padding: locations.length > 1 ? '7px 10px' : '0',
                            cursor: locations.length > 1 ? 'pointer' : 'default',
                            textAlign: 'left',
                        }}
                    >
                        {/* Map pin dot */}
                        <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#10b981', flexShrink: 0,
                        }} />
                        <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isDark ? '#f1f5f9' : '#111827',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>{storeName}</span>
                        {locations.length > 1 && (
                            <svg
                                width={12} height={12}
                                viewBox="0 0 24 24" fill="none"
                                stroke={isDark ? '#64748b' : '#9ca3af'}
                                strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: locDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        )}
                    </button>

                    {/* Dropdown */}
                    {locDropOpen && locations.length > 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 10,
                            right: 10,
                            background: isDark ? '#1e293b' : '#ffffff',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                            borderRadius: 10,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            zIndex: 200,
                            overflow: 'hidden',
                            marginTop: 4,
                        }}>
                            {locations.map((loc) => {
                                const isCurrent = loc.slug === tenantSlug
                                return (
                                    <button
                                        key={loc.id}
                                        onClick={() => handleSwitchLocation(loc.slug)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: isCurrent
                                                ? (isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4')
                                                : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}`,
                                        }}
                                    >
                                        <span style={{
                                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                            background: isCurrent ? '#10b981' : (isDark ? '#475569' : '#d1d5db'),
                                        }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                                                color: isCurrent ? '#10b981' : (isDark ? '#e2e8f0' : '#374151'),
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                margin: 0,
                                            }}>{loc.name}</p>
                                            {loc.location_label && loc.location_label !== loc.name && (
                                                <p style={{
                                                    fontSize: 10, color: isDark ? '#64748b' : '#9ca3af',
                                                    margin: 0, marginTop: 1,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>{loc.location_label}</p>
                                            )}
                                        </div>
                                        {isCurrent && (
                                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                                                stroke="#10b981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '12px 10px' }}>
                    {localizedTabs.map(tab => {
                        const isActive = currentTab === tab.id
                        const badgeCount = tab.hasBadge && badges[tab.id]
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                aria-current={isActive ? 'page' : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    width: '100%',
                                    padding: '10px 12px',
                                    marginBottom: 2,
                                    borderRadius: 20,
                                    border: 'none',
                                    background: isActive
                                        ? (isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5')
                                        : 'transparent',
                                    borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    position: 'relative',
                                    transition: 'background 0.15s ease',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <TabIcon id={tab.id} active={isActive} />
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? '#10b981' : (isDark ? '#94a3b8' : '#6b7280'),
                                    flex: 1,
                                }}>
                                    {tab.label}
                                </span>
                                {/* 🔒 Pro-only lock badge */}
                                {!isPro && PRO_ONLY_TABS.includes(tab.id) && (
                                    <span style={{
                                        fontSize: 11, lineHeight: 1,
                                        opacity: 0.55,
                                    }}>🔒</span>
                                )}
                                {badgeCount > 0 && (
                                    <span style={{
                                        minWidth: 18,
                                        height: 18,
                                        padding: '0 5px',
                                        borderRadius: 9,
                                        background: '#10b981',
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom: Ver Tienda + Staff + Logout */}
                <div style={{
                    padding: '12px 10px 20px',
                    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }}>
                    {/* Ver Tienda */}
                    <button
                        onClick={() => window.open(storeUrl, '_blank')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '9px 12px', borderRadius: 20,
                            border: 'none',
                            background: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Ver Tienda
                        </span>
                    </button>

                    {/* Staff View */}
                    {tenantSlug && (
                        <button
                            onClick={async () => {
                                const { supabase: sb } = await import('../lib/supabaseClient.js')
                                const { data: { session } } = await sb.auth.getSession()
                                // Use contextBusinessId if available, otherwise try to fetch from Supabase
                                let businessId = contextBusinessId || localStorage.getItem('fs_business_id')

                                if (!businessId && session?.user?.id) {
                                    // Query Supabase to get business_id for this user
                                    const { data: userBiz } = await sb
                                        .from('user_businesses')
                                        .select('business_id')
                                        .eq('user_id', session.user.id)
                                        .single()
                                    businessId = userBiz?.business_id || ''
                                }

                                const ownerEntry = {
                                    id: session?.user?.id || 'owner',
                                    business_id: businessId,
                                    name: tenantData?.venue_name || session?.user?.email || 'Owner',
                                    role: 'owner',
                                    email: session?.user?.email || ''
                                }
                                console.log('[Staff View] Setting up staff preview:', { tenantSlug, businessId })
                                localStorage.setItem('fs_staff_member', JSON.stringify(ownerEntry))
                                localStorage.setItem('fs_business_id', businessId)
                                localStorage.setItem('fs_current_shift', JSON.stringify({
                                    id: `owner-preview-${Date.now()}`,
                                    staff_id: ownerEntry.id,
                                    business_id: businessId,
                                    clock_in_at: new Date().toISOString(),
                                    status: 'active'
                                }))
                                navigate(`/${tenantSlug}/staff/dashboard`)
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                width: '100%', padding: '9px 12px', borderRadius: 20,
                                border: 'none', background: 'transparent',
                                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#64748b' : '#9ca3af'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#64748b' : '#9ca3af' }}>
                                Vista Staff
                            </span>
                        </button>
                    )}


                    {/* Logout */}
                    <button
                        onClick={async () => {
                            const { supabase: sb } = await import('../lib/supabaseClient.js')
                            await sb.auth.signOut()
                            if (tenantSlug) navigate(`/${tenantSlug}`)
                            else navigate('/')
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '9px 12px', borderRadius: 20,
                            border: 'none', background: 'transparent',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
                            Cerrar sesión
                        </span>
                    </button>
                </div>
            </aside>
        )
    }

    // ── MOBILE BOTTOM NAV ────────────────────────────────────────
    return (
        <nav style={navContainerStyle} role="navigation" aria-label="Backend navigation">
            {localizedTabs.map(tab => {
                const isActive = currentTab === tab.id
                const badgeCount = tab.hasBadge && badges[tab.id]

                return (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        style={tabButtonStyle(isActive)}
                        className={`rounded-xl transition-colors duration-150 ${isActive ? '' : 'hover:bg-emerald-50'}`}
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
                            {!isPro && PRO_ONLY_TABS.includes(tab.id) && (
                                <span style={{ marginLeft: 2, fontSize: 9, opacity: 0.6 }}>🔒</span>
                            )}
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
export { OWNER_TABS, STAFF_TABS, getRouteMaps }
