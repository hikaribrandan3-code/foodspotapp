/**
 * ProtectedRoute - Production-Grade RBAC Silo Bouncer
 * 
 * SECURITY INVARIANTS:
 * 1. ROLE GUARD: User must have matching role from Supabase user_metadata
 * 2. SILO GUARD: User must have business_id in metadata (multi-tenant isolation)
 * 3. URL SILO GUARD: User's business_id must match URL tenant slug
 * 4. AUTH PERSISTENCE: Handles async session loading to prevent false redirects
 * 5. HARD REDIRECT: Uses 'replace' to trigger state purge in App.jsx
 */
import { useState, useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useTenant } from '../contexts/TenantContext.jsx'

// Role hierarchy: higher index = more access
const ROLE_HIERARCHY = ['staff', 'owner', 'superadmin']

// Home base routes for each role (used for "wrong role" redirects)
// Note: Now includes tenantSlug placeholder
const getRoleHomeRoute = (role, tenantSlug) => {
    const routes = {
        staff: `/${tenantSlug}/staff/dashboard`,
        owner: `/${tenantSlug}/owner/summary`,
        superadmin: '/admin'
    }
    return routes[role] || `/${tenantSlug}`
}

// Login routes for each role (used for "not authenticated" redirects)
const getRoleLoginRoute = (role, tenantSlug) => {
    const routes = {
        staff: `/${tenantSlug}/staff`,
        owner: `/${tenantSlug}/owner`,
        superadmin: '/admin'
    }
    return routes[role] || `/${tenantSlug}/staff`
}

function ProtectedRoute({ children, requiredRole }) {
    // 🏢 PHASE 3: Get URL tenant context
    const { businessId: urlBusinessId, tenantData } = useTenant()
    const { tenantSlug } = useParams()

    const [authState, setAuthState] = useState({
        isLoading: true,
        session: null,
        role: null,
        businessId: null
    })

    // 🛡️ SUPABASE DIRECT: Fetch session from Supabase auth
    // Reads role and business_id from raw_user_meta_data
    useEffect(() => {
        let isMounted = true

        const fetchSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error || !session) {
                    if (isMounted) {
                        setAuthState({
                            isLoading: false,
                            session: null,
                            role: null,
                            businessId: null
                        })
                    }
                    return
                }

                // 🔐 EXTRACT METADATA: Role and Business ID from Supabase
                const user = session.user
                const metadata = user?.user_metadata || {}
                const role = metadata.role || null
                const businessId = metadata.business_id || null

                if (isMounted) {
                    setAuthState({
                        isLoading: false,
                        session,
                        role,
                        businessId
                    })
                }
            } catch {
                if (isMounted) {
                    setAuthState({
                        isLoading: false,
                        session: null,
                        role: null,
                        businessId: null
                    })
                }
            }
        }

        fetchSession()

        // 🔄 REALTIME AUTH: Listen for session changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return

            if (session) {
                const metadata = session.user?.user_metadata || {}
                setAuthState({
                    isLoading: false,
                    session,
                    role: metadata.role || null,
                    businessId: metadata.business_id || null
                })
            } else {
                setAuthState({
                    isLoading: false,
                    session: null,
                    role: null,
                    businessId: null
                })
            }
        })

        return () => {
            isMounted = false
            authListener?.subscription?.unsubscribe()
        }
    }, [])

    const { isLoading, session, role, businessId: userBusinessId } = authState
    const currentSlug = tenantSlug || tenantData?.slug || ''

    // ============================================
    // STATE 1: LOADING (Supabase session hydrating)
    // ============================================
    // Show spinner while waiting for Supabase to resolve session
    // This prevents false redirects on initial page load
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--canvas-bg, #fff)'
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    border: '3px solid #E5E7EB',
                    borderTopColor: '#3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    // ============================================
    // STATE 2: NOT AUTHENTICATED
    // ============================================
    // No session = redirect to login page for required role
    if (!session) {
        const loginRoute = getRoleLoginRoute(requiredRole, currentSlug)
        return <Navigate to={loginRoute} replace />
    }

    // ============================================
    // STATE 3: SILO GUARD (Multi-Tenant Isolation)
    // ============================================
    // 🛡️ CRITICAL: If no business_id in metadata, user is "orphaned"
    // They cannot access any protected route until assigned to a business
    // This is a NON-NEGOTIABLE security invariant for multi-tenancy
    if (!userBusinessId) {
        console.error('[SILO GUARD] User has no business_id in metadata:', session.user?.email)
        // Redirect to root with error state (could show a "Contact Admin" page)
        return <Navigate to="/" replace state={{ siloError: true }} />
    }

    // ============================================
    // STATE 3.5: URL SILO GUARD (Cross-Tenant Jump Prevention)
    // ============================================
    // 🛡️ CRITICAL: Prevent user from accessing a different tenant's routes
    // Compare user's business_id from metadata against URL's businessId
    // SuperAdmins bypass this check (they can view any tenant)
    const userRole = role
    if (userRole !== 'superadmin' && urlBusinessId && userBusinessId !== urlBusinessId) {
        console.warn('[SILO JUMP BLOCKED] User attempted cross-tenant access:', {
            userBusinessId,
            urlBusinessId,
            email: session.user?.email
        })
        // Redirect them to their own tenant's dashboard
        // We need to look up their tenant's slug from their businessId
        // For now, redirect to root and let TenantContext figure it out
        return <Navigate to="/" replace state={{ siloJump: true }} />
    }

    // ============================================
    // STATE 4: ROLE GUARD (Role-Based Access Control)
    // ============================================
    // Check if user's role meets the required role for this route

    // No role in metadata = cannot determine access
    if (!role) {
        console.error('[ROLE GUARD] User has no role in metadata:', session.user?.email)
        return <Navigate to="/" replace />
    }

    // superadmin bypasses all role checks (god mode)
    if (role === 'superadmin') {
        return children
    }

    // Check role hierarchy
    const userLevel = ROLE_HIERARCHY.indexOf(role)
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)

    // Unknown role = deny access
    if (userLevel === -1) {
        console.error('[ROLE GUARD] Unknown role:', role)
        return <Navigate to="/" replace />
    }

    // Wrong role = redirect to their correct home base
    // e.g., Staff trying to access Owner route → redirect to /staff/dashboard
    if (userLevel < requiredLevel) {
        const correctHome = getRoleHomeRoute(role, currentSlug)
        return <Navigate to={correctHome} replace />
    }

    // ============================================
    // STATE 5: ACCESS GRANTED
    // ============================================
    // User has valid session, business_id, matching URL tenant, and sufficient role
    // Render the protected content
    return children
}

export default ProtectedRoute

