/**
 * TenantContext.jsx
 * 
 * 🏢 Multi-Tenant Identity Provider
 * 
 * This context provides tenant-scoped identity throughout the app.
 * It resolves the business from URL slug and enforces trial expiration.
 * 
 * URL Detection:
 *   - /grub-club/menu → slug = "grub-club"
 *   - /pizza-palace/order → slug = "pizza-palace"
 *   - / or /menu (no slug) → fallback to "grub-club"
 * 
 * Exports:
 *   - useTenant() → { businessId, tenantData, trialExpired, loading }
 *   - useBusinessId() → string (shortcut for businessId)
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// 🛡️ FALLBACK: Default demo tenant when no slug detected
const DEFAULT_SLUG = 'grub-club'

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
            try {
                // 1. EXTRACT SLUG FROM URL
                // Supports: /grub-club/menu, /pizza-palace/order, etc.
                const pathname = window.location.pathname
                const pathSegments = pathname.split('/').filter(Boolean)

                // First segment could be the tenant slug
                // We check if it looks like a tenant slug (not a known route)
                // 🚪 TRIAL BYPASS: 'start-trial' skips tenant lookup entirely
                const knownRoutes = ['menu', 'order', 'info', 'login', 'staff', 'owner', 'admin', 'demo', 'superadmin', 'start-trial']
                let slug = DEFAULT_SLUG

                if (pathSegments.length > 0 && !knownRoutes.includes(pathSegments[0])) {
                    slug = pathSegments[0]
                }

                // 2. FETCH TENANT FROM SUPABASE
                const { data: tenant, error: fetchError } = await supabase
                    .from('branding')
                    .select('business_id, business_name, slug, is_paid, trial_ends_at, primary_color')
                    .eq('slug', slug)
                    .single()

                if (fetchError || !tenant) {
                    // Fallback: If slug not found, try default
                    if (slug !== DEFAULT_SLUG) {
                        console.warn(`[TenantContext] Slug "${slug}" not found, falling back to "${DEFAULT_SLUG}"`)
                        const { data: fallbackTenant } = await supabase
                            .from('branding')
                            .select('business_id, business_name, slug, is_paid, trial_ends_at, primary_color')
                            .eq('slug', DEFAULT_SLUG)
                            .single()

                        if (fallbackTenant) {
                            setBusinessId(fallbackTenant.business_id)
                            setTenantStoragePrefix(fallbackTenant.business_id) // 🏢 Scope localStorage
                            setTenantData(fallbackTenant)
                            checkTrialStatus(fallbackTenant)
                        } else {
                            throw new Error(`[TENANT ERROR] Default tenant "${DEFAULT_SLUG}" not found in database`)
                        }
                    } else {
                        throw new Error(`[TENANT ERROR] Tenant "${slug}" not found in database`)
                    }
                } else {
                    // Success: Tenant found
                    setBusinessId(tenant.business_id)
                    setTenantStoragePrefix(tenant.business_id) // 🏢 Scope localStorage
                    setTenantData(tenant)
                    checkTrialStatus(tenant)
                }
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

    // ❌ ERROR STATE
    if (error) {
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
