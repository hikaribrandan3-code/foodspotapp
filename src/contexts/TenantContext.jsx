/**
 * TenantContext.jsx
 * 
 * 🏢 Multi-Tenant Identity Provider
 * 
 * This context provides tenant-scoped identity throughout the app.
 * It resolves the business from URL slug and enforces trial expiration.
 * 
 * URL Detection:
 *   - /pizza-palace/menu → slug = "pizza-palace"
 *   - /tacos-locos/order → slug = "tacos-locos"
 *   - / or /start-trial → NO LOOKUP (neutral state, no tenant required)
 * 
 * Exports:
 *   - useTenant() → { businessId, tenantData, trialExpired, loading }
 *   - useBusinessId() → string (shortcut for businessId)
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// Context
const TenantContext = createContext(null)

/**
 * TenantProvider Component
 * 
 * Wraps the entire app to provide tenant identity.
 * Must be placed inside BrowserRouter (needs access to location).
 */
export function TenantProvider({ children }) {
    const [loading, setLoading] = useState(true)
    const [businessId, setBusinessId] = useState(null)
    const [tenantData, setTenantData] = useState(null)
    const [trialExpired, setTrialExpired] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const resolveTenant = async () => {
            // 🚨 KILL-SWITCH: Absolute bypass for signup routes - NO Supabase calls
            const pathname = window.location.pathname
            if (pathname === '/' || pathname === '/start-trial') {
                setLoading(false)
                return
            }

            try {
                // 1. EXTRACT SLUG FROM URL
                const pathSegments = pathname.split('/').filter(Boolean)

                // 🚫 RESERVED ROUTES: These are system routes, NOT tenant slugs
                // If the first segment is a reserved keyword, skip tenant resolution
                const RESERVED_ROUTES = [
                    // Auth & Signup
                    'start-trial', 'login', 'signup', 'register',
                    // Customer pages (must be nested under tenant, e.g., /krappypatty/menu)
                    'menu', 'order', 'status', 'info', 'envios', 'rewards', 'share', 'game', 'promos',
                    // Backend routes
                    'staff', 'owner', 'admin', 'demo', 'superadmin',
                    // System
                    'camera', 'receipt', 'api', 'assets'
                ]

                // If root path OR first segment is a reserved route → skip tenant lookup
                if (pathSegments.length === 0 || RESERVED_ROUTES.includes(pathSegments[0])) {
                    // 🏠 NEUTRAL STATE: No tenant, no error - just render children
                    setLoading(false)
                    return
                }

                // First segment is the tenant slug
                const slug = pathSegments[0]

                // 2. FETCH TENANT FROM SUPABASE (with 1 retry after 1 second)
                const fetchTenant = async (retryCount = 0) => {
                    // Try fetch by slug first - use * to avoid column mismatch
                    let { data: tenant, error: fetchError } = await supabase
                        .from('branding')
                        .select('*')
                        .eq('slug', slug)
                        .maybeSingle()

                    // 🔄 FALLBACK: If no slug match, try business_name (case-insensitive)
                    if (!tenant) {
                        const { data: tenantByName } = await supabase
                            .from('branding')
                            .select('*')
                            .ilike('business_name', slug)
                            .maybeSingle()
                        tenant = tenantByName
                    }

                    if (fetchError || !tenant) {
                        if (retryCount < 1) {
                            // 🔄 RETRY: Wait 1 second and try again (handles race conditions)
                            console.log(`[TenantContext] Tenant "${slug}" not found, retrying in 1s...`)
                            await new Promise(resolve => setTimeout(resolve, 1000))
                            return fetchTenant(retryCount + 1)
                        }

                        // 🌱 AUTO-SEED: Check if authenticated user's metadata matches URL slug
                        console.log(`[TenantContext] No branding found for "${slug}", attempting auto-seed...`)
                        const { data: { session } } = await supabase.auth.getSession()

                        if (session?.user) {
                            const userMeta = session.user.user_metadata || {}
                            const userSlug = userMeta.slug || userMeta.business_name

                            // 🛡️ SECURITY: Only auto-seed if user's metadata slug matches URL slug
                            if (userSlug && userSlug.toLowerCase() === slug.toLowerCase()) {
                                console.log(`[TenantContext] ✅ Auth match! Auto-seeding branding for "${slug}"`)

                                // Calculate trial end date (7 days from now)
                                const trialEndsAt = new Date()
                                trialEndsAt.setDate(trialEndsAt.getDate() + 7)

                                // INSERT new branding row
                                const { data: newTenant, error: insertError } = await supabase
                                    .from('branding')
                                    .insert({
                                        business_name: userMeta.business_name || slug,
                                        slug: userSlug,
                                        business_id: session.user.id, // 🔐 SILO-CORRECT: Primary isolation column
                                        trial_ends_at: trialEndsAt.toISOString(),
                                        is_paid: false
                                    })
                                    .select('*')
                                    .single()

                                if (!insertError && newTenant) {
                                    console.log(`[TenantContext] 🚀 Auto-seed successful:`, newTenant)
                                    return newTenant
                                } else {
                                    console.error(`[TenantContext] Auto-seed INSERT failed:`, insertError)
                                }
                            } else {
                                console.warn(`[TenantContext] Auth slug mismatch: user="${userSlug}" vs url="${slug}"`)
                            }
                        }

                        throw new Error(`[TENANT ERROR] Tenant "${slug}" not found in database`)
                    }
                    return tenant
                }

                const tenant = await fetchTenant()

                // 🪂 EJECTION SEAT: Verify current user has silo access before committing
                const { data: currentUser } = await supabase.auth.getUser()
                if (currentUser?.user) {
                    const userMeta = currentUser.user.user_metadata || {}
                    const userRole = userMeta.role
                    const userBusinessId = userMeta.business_id
                    const userSlug = userMeta.slug

                    // Only check for Owner/Staff - customers can view any tenant
                    const isOwnerOrStaff = userRole === 'owner' || userRole === 'staff'
                    const isSuperAdmin = userRole === 'superadmin'

                    if (isOwnerOrStaff && !isSuperAdmin) {
                        // Check if user belongs to this tenant (by ID or slug)
                        const matchById = userBusinessId && userBusinessId === tenant.business_id
                        const matchBySlug = userSlug && userSlug.toLowerCase() === slug.toLowerCase()

                        if (!matchById && !matchBySlug) {
                            console.error('[Silo Guard] 🪂 EJECTION SEAT: Unauthorized Silo Jump detected', {
                                userSlug,
                                userBusinessId,
                                tenantSlug: slug,
                                tenantBusinessId: tenant.business_id
                            })
                            setLoading(false)
                            // Hard redirect to home with warning flag
                            window.location.href = '/?siloJump=true'
                            return
                        }
                    }
                }

                // Success: Tenant found and user has access
                setBusinessId(tenant.user_id) // Use user_id as business_id
                setTenantStoragePrefix(tenant.user_id)
                setTenantData(tenant)
                checkTrialStatus(tenant)
            } catch (err) {
                console.error('[TenantContext] Error resolving tenant:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        /**
         * 3. TRIAL EXPIRATION CHECK
         * If is_paid === false AND current date > trial_ends_at → lock the app
         */
        const checkTrialStatus = (tenant) => {
            if (!tenant.is_paid && tenant.trial_ends_at) {
                const trialEnd = new Date(tenant.trial_ends_at)
                const now = new Date()

                if (now > trialEnd) {
                    console.warn(`[TenantContext] Trial expired for ${tenant.business_name}`)
                    setTrialExpired(true)
                }
            }
        }

        resolveTenant()
    }, [])

    // 🔄 LOADING STATE: Prevent Silo Violations
    // The app must wait for businessId before making any Supabase calls
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderTop: '4px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '16px', opacity: 0.7 }}>Cargando FoodSpot...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    // ❌ ERROR STATE (suppressed on signup routes + show setup spinner for owner routes)
    if (error && window.location.pathname !== '/' && !window.location.pathname.includes('start-trial')) {
        // 🚀 AUTO-ENTRY: If user is on /owner route, show setup spinner instead of error
        if (window.location.pathname.includes('/owner')) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    color: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(255,255,255,0.1)',
                        borderTop: '4px solid #fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ marginTop: '16px', opacity: 0.7 }}>Configurando tu espacio...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )
        }
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#1a1a2e',
                color: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '24px',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>🏢 Negocio no encontrado</h1>
                <p style={{ opacity: 0.7, maxWidth: '400px' }}>
                    No pudimos encontrar el negocio solicitado.
                    Verificá la URL o contactá al soporte.
                </p>
            </div>
        )
    }

    return (
        <TenantContext.Provider value={{ businessId, tenantData, trialExpired, loading, isLoaded: !loading }}>
            {children}
        </TenantContext.Provider>
    )
}

/**
 * useTenant Hook - NUCLEAR HARDENED V2
 * returns the full tenant object with SAFE DEFAULTS (never null, never undefined nested)
 */
export function useTenant() {
    const context = useContext(TenantContext);

    // 🔥 NUCLEAR FIX V2: Return object with all nested defaults
    // This prevents `tenant.branding.color` and `tenant.settings.x` from g[x] crash
    if (!context) {
        return {
            businessId: null,
            tenantData: {},
            branding: {},
            settings: {},
            trialExpired: false,
            loading: false,
            isLoaded: false, // 🔐 VAULT-SEAL: Explicit false until context mounts
            error: null
        };
    }

    // Ensure nested properties exist even if context is partial
    return {
        ...context,
        tenantData: context.tenantData || {},
        branding: context.tenantData?.branding || context.branding || {},
        settings: context.tenantData?.settings || context.settings || {},
        isLoaded: context.isLoaded ?? !context.loading // 🔐 Ensure isLoaded is always present
    };
}

/**
 * useBusinessId Hook - Hardened
 * returns the active business UUID or null during bootstrap
 */
export function useBusinessId() {
    const context = useContext(TenantContext);

    // 🔥 THE FIX: Stop the "TypeError: null is not an object" crash.
    // If context is still initializing, return null so Menu.jsx/Order.jsx can wait.
    if (!context) {
        return null;
    }

    // Safe to access property now
    return context.businessId;
}
