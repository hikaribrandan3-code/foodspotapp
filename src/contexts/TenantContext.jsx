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

                // 🚫 NO-LOOKUP ROUTES: These paths bypass tenant resolution entirely
                // Root path (/) and known non-tenant routes skip Supabase lookup
                const noLookupRoutes = ['start-trial', 'menu', 'order', 'info', 'login', 'staff', 'owner', 'admin', 'demo', 'superadmin']

                // If root path OR first segment is a no-lookup route → skip tenant lookup
                if (pathSegments.length === 0 || noLookupRoutes.includes(pathSegments[0])) {
                    // 🏠 NEUTRAL STATE: No tenant, no error - just render children
                    setLoading(false)
                    return
                }

                // First segment is the tenant slug
                const slug = pathSegments[0]

                // 2. FETCH TENANT FROM SUPABASE (with 1 retry after 1 second)
                const fetchTenant = async (retryCount = 0) => {
                    const { data: tenant, error: fetchError } = await supabase
                        .from('branding')
                        .select('user_id, business_name, slug, is_paid, trial_ends_at, primary_color')
                        .eq('slug', slug)
                        .maybeSingle() // 🛡️ Prevents 406 errors - returns null instead of throwing

                    if (fetchError || !tenant) {
                        if (retryCount < 1) {
                            // 🔄 RETRY: Wait 1 second and try again (handles race conditions)
                            console.log(`[TenantContext] Tenant "${slug}" not found, retrying in 1s...`)
                            await new Promise(resolve => setTimeout(resolve, 1000))
                            return fetchTenant(retryCount + 1)
                        }
                        throw new Error(`[TENANT ERROR] Tenant "${slug}" not found in database`)
                    }
                    return tenant
                }

                const tenant = await fetchTenant()

                // Success: Tenant found
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
        <TenantContext.Provider value={{ businessId, tenantData, trialExpired, loading }}>
            {children}
        </TenantContext.Provider>
    )
}

/**
 * useTenant Hook
 * 
 * Returns full tenant context: { businessId, tenantData, trialExpired, loading }
 */
export function useTenant() {
    const context = useContext(TenantContext)
    if (!context) {
        throw new Error('[TENANT ERROR] useTenant must be used within TenantProvider')
    }
    return context
}

/**
 * useBusinessId Hook (Shortcut)
 * 
 * Returns just the businessId string for simpler use cases.
 */
export function useBusinessId() {
    const { businessId } = useTenant()
    if (!businessId) {
        throw new Error('[SILO VIOLATION] businessId not available - TenantProvider may still be loading')
    }
    return businessId
}
