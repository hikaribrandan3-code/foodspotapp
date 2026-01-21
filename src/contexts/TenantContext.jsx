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

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// Context
const TenantContext = createContext(null)

// 🛡️ Timeout utility for Promise.race
const withTimeout = (promise, ms, errorMessage) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
    )
    return Promise.race([promise, timeout])
}

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

    // 🛡️ RISK 1 FIX: Track if we hit the emergency timeout
    const [emergencyUnblock, setEmergencyUnblock] = useState(false)
    const timeoutRef = useRef(null)

    // 🛡️ RISK 1 FIX: 8-second emergency unblock timer
    useEffect(() => {
        if (loading) {
            timeoutRef.current = setTimeout(() => {
                console.warn('[TenantContext] ⏰ 8-second emergency timeout triggered. Unblocking children.')
                setEmergencyUnblock(true)
                setLoading(false)
            }, 8000)
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, []) // Run only on mount

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

                // First segment is the tenant slug (NORMALIZED TO LOWERCASE)
                const slug = pathSegments[0].toLowerCase()

                // 🛡️ GUARD: Prevent empty slug queries
                if (!slug || slug.trim() === '') {
                    console.warn('[TenantContext] Empty slug detected, skipping lookup')
                    setLoading(false)
                    return
                }

                // 2. FETCH TENANT FROM SUPABASE (with timeout + 1 retry after 1 second)
                const fetchTenant = async (retryCount = 0) => {
                    console.log('[TenantContext] 🔍 Looking for slug:', slug)

                    // Wrap Supabase call in 10-second timeout
                    const supabaseQuery = supabase
                        .from('branding')
                        .select('*')
                        .ilike('slug', slug)
                        .maybeSingle()

                    let tenant, fetchError
                    try {
                        const result = await withTimeout(
                            supabaseQuery,
                            10000,
                            'Connection timeout. Please check your network.'
                        )
                        tenant = result.data
                        fetchError = result.error
                    } catch (timeoutErr) {
                        console.error('[TenantContext] ⏱️ Timeout:', timeoutErr.message)
                        throw timeoutErr
                    }

                    // 🔄 FALLBACK: If no slug match, try business_name (case-insensitive)
                    if (!tenant) {
                        console.log('[TenantContext] ⚠️ No slug match, trying business_name...')
                        try {
                            const fallbackQuery = supabase
                                .from('branding')
                                .select('*')
                                .ilike('business_name', slug)
                                .maybeSingle()

                            const fallbackResult = await withTimeout(
                                fallbackQuery,
                                10000,
                                'Connection timeout on fallback lookup.'
                            )
                            tenant = fallbackResult.data
                        } catch { /* Silent fallback failure */ }
                    }

                    if (tenant) {
                        console.log('[TenantContext] ✅ VAULT LOADED:', {
                            business_name: tenant.business_name,
                            business_id: tenant.business_id,
                            slug: tenant.slug
                        })
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
                setBusinessId(tenant.business_id) // 🔐 CORRECT: Use business_id column
                setTenantStoragePrefix(tenant.business_id)
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

    // 🎨 THEME HYDRATION ENGINE: Paint branding to DOM
    useEffect(() => {
        if (!tenantData) return;

        const root = document.documentElement.style;

        // 0. Dynamic Font Loader (Google Fonts)
        if (tenantData.font_family && tenantData.font_family !== 'Inter') {
            const fontName = tenantData.font_family;
            const linkId = 'tenant-font-loader';
            let link = document.getElementById(linkId);
            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            const formattedFont = fontName.replace(/\s+/g, '+');
            link.href = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@300;400;500;600;700;800&display=swap`;
        }

        // 1. Typography Hydration
        // Ensure fonts with spaces are quoted
        const fontFamily = tenantData.font_family ? `'${tenantData.font_family}', sans-serif` : 'Inter, system-ui, sans-serif';
        root.setProperty('--font-family-brand', fontFamily);
        root.setProperty('--font-weight-brand', tenantData.font_weight || '700');

        // 2. Color Hydration (The Big 4)
        if (tenantData.primary_color) root.setProperty('--color-primary', tenantData.primary_color);
        if (tenantData.secondary_color) root.setProperty('--color-secondary', tenantData.secondary_color);
        if (tenantData.background_color) root.setProperty('--color-bg', tenantData.background_color);
        if (tenantData.accent_color) root.setProperty('--color-accent', tenantData.accent_color);

        // 3. Header Mode Hydration (Fixes Text/Logo Toggle)
        if (tenantData.hero_mode) root.setProperty('--hero-mode', tenantData.hero_mode);

    }, [tenantData]); // Trigger on data change

    // ⏳ LOADING STATE
    if (loading && !emergencyUnblock) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#1a1a2e',
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

        // Show Retry button on error instead of dead end
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
                <p style={{ opacity: 0.7, maxWidth: '400px', marginBottom: '24px' }}>
                    No pudimos encontrar el negocio solicitado.
                    Verificá la URL o contactá al soporte.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '12px 24px',
                        background: '#7C3AED',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    Reintentar
                </button>
            </div>
        )
    }

    return (
        <TenantContext.Provider value={{
            businessId,
            tenantData,
            trialExpired,
            loading,
            isLoaded: !loading,
            emergencyUnblock // Pass this so App.jsx knows if we hit timeout
        }}>
            {children}
        </TenantContext.Provider>
    )
}

/**
 * useTenant Hook - NUCLEAR HARDENED V3 (FLAT DATA)
 * returns the full tenant object with SAFE DEFAULTS (never null, never undefined nested)
 */
export function useTenant() {
    const context = useContext(TenantContext);

    // 🔥 NUCLEAR FIX V3: Return object with all nested defaults
    if (!context) {
        return {
            businessId: null,
            tenantData: {},
            branding: {},  // Safe empty object for destructuring
            settings: {},
            trialExpired: false,
            loading: false,
            isLoaded: false,
            error: null,
            slug: null,
            emergencyUnblock: false
        };
    }

    // 🛡️ FLAT DATA: tenantData IS the branding (no nesting)
    return {
        ...context,
        tenantData: context.tenantData || {},
        branding: context.tenantData || {},  // 🔐 FIXED: tenantData IS branding
        settings: context.tenantData?.settings || {},
        isLoaded: context.isLoaded ?? !context.loading,
        slug: context.tenantData?.slug || null
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
