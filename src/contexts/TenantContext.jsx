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
            try {
                const pathSegments = window.location.pathname.split('/').filter(Boolean)
                const slug = pathSegments[0]

                // 🛡️ PROTECTED ROUTES: Skip vault resolution for static paths
                const RESERVED = ['admin', 'owner', 'start-trial', 'login', 'signup', 'camera']
                if (!slug || RESERVED.includes(slug)) {
                    setLoading(false)
                    return
                }

                console.log('[TenantContext] 🔍 Resolving Vault for slug:', slug)

                // 🛡️ THE FIX: Use 'slug' column instead of 'tenant_id'
                const { data, error } = await supabase
                    .from('branding')
                    .select('*')
                    .eq('slug', slug)
                    .single()

                if (error) throw error

                if (data) {
                    console.log('[TenantContext] ✅ VAULT LOADED:', data.business_name)

                    // 🛡️ MIRROR-FIRST HYDRATION: Fetch from 'menu_view' (The Universal Truth)
                    const { data: mirrorData } = await supabase
                        .from('menu_view')
                        .select('menu_data')
                        .eq('business_id', data.business_id)
                        .single()

                    if (mirrorData?.menu_data) {
                        console.log('[TenantContext] 🪞 MIRROR APPLIED: Using Universal Menu Data')
                        data.menu_data = mirrorData.menu_data
                    } else {
                        console.log('[TenantContext] ⚠️ MIRROR MISSING: Falling back to Legacy-Stale Data')
                    }

                    // 🛡️ ALIGNED: Using business_id column (Fixed 2026-01-29)
                    setBusinessId(data.business_id)
                    setTenantData(data)
                    setTenantStoragePrefix(data.business_id)
                    setTrialExpired(false) // 🛡️ RECOVERY MODE
                }
            } catch (err) {
                console.error('[TenantContext] ❌ Resolution Failed:', err.message)
                setError(err.message)
            } finally {
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

    // 🔄 GLOBAL REFRESH: Force re-fetch from Cloud after saves
    const refreshTenantData = async () => {
        if (!businessId) return
        console.log('🔄 FORCING GLOBAL REFRESH...')
        const { data, error } = await supabase
            .from('branding')
            .select('*')
            .eq('business_id', businessId)
            .single()

        if (!error && data) {
            // 🛡️ MIRROR-FIRST REFRESH
            const { data: mirrorData } = await supabase
                .from('menu_view')
                .select('menu_data')
                .eq('business_id', businessId)
                .single()

            if (mirrorData?.menu_data) {
                console.log('[TenantContext] 🪞 REFRESH MIRROR: Updated with Universal Data')
                data.menu_data = mirrorData.menu_data
            }

            setTenantData(data)
            console.log('✅ GLOBAL REFRESH COMPLETE')
        }
    }

    return (
        <TenantContext.Provider value={{
            businessId,
            tenantData,
            trialExpired,
            loading,
            isLoaded: !loading,
            emergencyUnblock,
            forceRefresh: Date.now(),
            refreshTenantData
        }}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (!context) return { businessId: null, tenantData: {}, isLoaded: false, loading: false, forceRefresh: 0, branding: {}, settings: {}, slug: null, refreshTenantData: async () => { } };
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
