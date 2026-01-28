/**
 * TenantContext.jsx
 * 
 * 🏢 Multi-Tenant Identity Provider
 * 
 * 🛡️ RECOVERY MODE: FORCED BYPASS ACTIVE
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// Context
const TenantContext = createContext(null)

// 🛡️ Timeout utility
const withTimeout = (promise, ms, errorMessage) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
    )
    return Promise.race([promise, timeout])
}

export function TenantProvider({ children }) {
    const [loading, setLoading] = useState(true)
    const [businessId, setBusinessId] = useState(null)
    const [tenantData, setTenantData] = useState(null)
    const [trialExpired, setTrialExpired] = useState(false)
    const [error, setError] = useState(null)

    // Emergency Unblock State
    const [emergencyUnblock, setEmergencyUnblock] = useState(false)

    useEffect(() => {
        const resolveTenant = async () => {
            const pathname = window.location.pathname
            if (pathname === '/' || pathname === '/start-trial') {
                setLoading(false)
                return
            }

            try {
                // 1. EXTRACT SLUG
                const pathSegments = pathname.split('/').filter(Boolean)
                const RESERVED_ROUTES = ['start-trial', 'login', 'signup', 'register', 'admin', 'owner', 'staff', 'camera']

                if (pathSegments.length === 0 || RESERVED_ROUTES.includes(pathSegments[0])) {
                    setLoading(false)
                    return
                }

                const slug = pathSegments[0].toLowerCase()

                // 2. FETCH TENANT
                console.log('[TenantContext] 🔍 Looking for slug:', slug)

                // 🛡️ CLOUD-FIRST POLICY (Protocol v3.0)
                // We deliberately SKIP local storage "Fast Paint" to ensure we NEVER show stale data.
                // Mobile vs Desktop sync requires absolute truth from the Cloud Vault.

                // Hard-coded ID for Universal Alignment to match MenuManager
                const LOCKED_ID = '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd';

                const { data: tenant, error: fetchError } = await supabase
                    .from('branding')
                    .select('*')
                    .or(`slug.ilike.${slug},tenant_id.eq.${LOCKED_ID}`) // 🛡️ Fetch by EITHER slug or ID (Case-insensitive slug)
                    .maybeSingle()

                if (fetchError) throw fetchError

                if (tenant) {
                    console.log('[TenantContext] ✅ VAULT LOADED (Cloud-First):', tenant.business_name)
                    // console.log('[TenantContext] 🍔 Menu Data Payload:', tenant.menu_data ? 'Present' : 'MISSING')

                    setBusinessId(tenant.business_id)
                    setTenantStoragePrefix(tenant.business_id)
                    setTenantData(tenant)

                    // 🛡️ RECOVERY: BYPASS ALL TRIAL CHECKS
                    setTrialExpired(false)
                    console.log('[TenantContext] 🛡️ RECOVERY: Trial check BYPASSED (Active)')

                    setLoading(false)

                } else {
                    console.warn(`[TenantContext] Tenant "${slug}" not found`)
                    setError('Tenant not found')
                    setLoading(false)
                }

            } catch (err) {
                console.error('[TenantContext] Error:', err)
                setError(err.message)
                setLoading(false)
            }
        }

        resolveTenant()
    }, [])

    // 🎨 THEME HYDRATION ENGINE
    useEffect(() => {
        if (!tenantData) return;
        const root = document.documentElement.style;
        const fontFamily = tenantData.font_family ? `'${tenantData.font_family}', sans-serif` : 'Inter, system-ui, sans-serif';
        root.setProperty('--font-family-brand', fontFamily);
        if (tenantData.primary_color) root.setProperty('--color-primary', tenantData.primary_color);
        if (tenantData.secondary_color) root.setProperty('--color-secondary', tenantData.secondary_color);
        if (tenantData.confirmation_color) root.setProperty('--color-confirm', tenantData.confirmation_color);
        if (tenantData.powered_by_color) root.setProperty('--color-powered', tenantData.powered_by_color);
        if (tenantData.background_color) root.setProperty('--color-bg', tenantData.background_color);
    }, [tenantData]);

    // Loading Splash
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fff' }}>
                <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    // Error Screen
    if (error && !loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fff', textAlign: 'center' }}>
                <h1>🏢 Negocio no encontrado</h1>
                <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 8 }}>Reintentar</button>
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
            emergencyUnblock,
            forceRefresh: Date.now() // Signal downstream components
        }}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (!context) return { businessId: null, tenantData: {}, isLoaded: false, loading: false, forceRefresh: 0, branding: {}, settings: {}, slug: null };
    return {
        ...context,
        branding: context.tenantData || {},
        settings: context.tenantData?.settings || {},
        slug: context.tenantData?.slug
    };
}

export function useBusinessId() {
    const context = useContext(TenantContext);
    if (!context) return null;
    return context.businessId;
}
