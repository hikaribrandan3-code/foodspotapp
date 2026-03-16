/**
 * TenantContext.jsx - Strike 3: Identity Resurrector
 * 
 * 🏢 Multi-Tenant Identity Provider (Strict Mode)
 * Reference: Antigravity Protocol Phase 3
 * 
 * 🛡️ Features:
 * - Strict Slug Resolution
 * - System Route Fallback (Persistence)
 * - Hoisted Revalidation Engine
 * - Global Refresh Support
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// Context Definition
const TenantContext = createContext(null)

// 🚫 SYSTEM ROUTES (Reserved Slugs)
const SYSTEM_ROUTES = [
    'admin', 'owner', 'login', 'signup', 'start-trial',
    'status', 'checkout', 'order', 'menu', 'home', 'info',
    'envios', 'rewards', 'share', 'game', 'arcade', 'promos',
    'wall', 'session', 'staff'
]

export function TenantProvider({ children }) {
    const [tenantData, setTenantData] = useState(null)
    const [businessId, setBusinessId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [forceRefresh, setForceRefresh] = useState(0)
    const [trialExpired, setTrialExpired] = useState(false)

    // Helper: Identify if current path segment is a tenant slug
    const getTargetSlug = useCallback(() => {
        const pathSegments = window.location.pathname.split('/').filter(Boolean)
        const possibleSlug = pathSegments[0]

        // 🛡️ RECOVERY: If path is empty or a known system route, fallback to persistence
        if (!possibleSlug || SYSTEM_ROUTES.includes(possibleSlug)) {
            const lastActive = localStorage.getItem('fs_last_active_slug')
            if (lastActive && lastActive !== 'undefined' && lastActive !== 'null') {
                return lastActive
            }
            return null
        }
        return possibleSlug
    }, [])

    // 🎨 THEME ENGINE
    const applyTheme = useCallback((data) => {
        if (!data) return
        const root = document.documentElement.style
        const fontFamily = data.font_family ? `'${data.font_family}', sans-serif` : 'Inter, system-ui, sans-serif'

        root.setProperty('--font-family-brand', fontFamily)
        if (data.primary_color) root.setProperty('--color-primary', data.primary_color)
        if (data.secondary_color) root.setProperty('--color-secondary', data.secondary_color)
        if (data.confirmation_color) root.setProperty('--color-confirm', data.confirmation_color)
        if (data.powered_by_color) root.setProperty('--color-powered', data.powered_by_color)
        if (data.background_color) root.setProperty('--color-bg', data.background_color)
    }, [])

    // 🛡️ RESOLUTION ENGINE
    useEffect(() => {
        let mounted = true

        const revalidate = async (slug) => {
            if (!slug || slug === 'undefined' || slug === 'null') {
                console.warn('[TenantLock] ⚠️ Aborting revalidate: Invalid slug', slug)
                return
            }

            try {
                const { data: brandingData, error: brandingError } = await supabase
                    .from('branding')
                    .select('*')
                    .eq('slug', slug)
                    .single()

                if (brandingError) {
                    if (brandingError.code === 'PGRST116') {
                        console.warn(`[TenantLock] ⚠️ No branding found for slug: ${slug}`)
                        return
                    }
                    throw brandingError
                }

                if (brandingData) {
                    let { data: tenantRow, error: langError } = await supabase
                        .from('tenants')
                        .select('id, language, venue_name, owner_id')
                        .ilike('venue_name', slug)
                        .single()

                    // Failsafe: Fetch by owner ID if slug fails
                    if ((langError || !tenantRow) && mounted) {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                            const { data: ownerRow } = await supabase
                                .from('tenants')
                                .select('id, language, venue_name, owner_id')
                                .eq('owner_id', user.id)
                                .single()
                            if (ownerRow) tenantRow = ownerRow
                        }
                    }

                    const mergedData = {
                        ...brandingData,
                        id: tenantRow?.id,
                        venue_name: tenantRow?.venue_name,
                        language: tenantRow?.language || 'es'
                    }

                    if (mounted) {
                        setTenantData(mergedData)
                        setBusinessId(mergedData.business_id)
                        setTenantStoragePrefix(mergedData.business_id)
                        setTrialExpired(false)
                    }

                    localStorage.setItem(`tenant_lock_${slug}`, JSON.stringify(mergedData))
                    localStorage.setItem('fs_last_active_slug', slug)
                    applyTheme(mergedData)
                }
            } catch (err) {
                console.error('[TenantLock] Revalidate failed:', err)
            }
        }

        const resolveIdentity = async () => {
            try {
                const targetSlug = getTargetSlug()
                if (!targetSlug) {
                    console.warn('[TenantLock] ⚠️ No Identity Found.')
                    setLoading(false)
                    return
                }

                console.log(`[TenantLock] 🔐 Locking Tenant: ${targetSlug}`)
                const CACHE_KEY = `tenant_lock_${targetSlug}`
                const cached = localStorage.getItem(CACHE_KEY)

                if (cached && cached !== 'undefined') {
                    const parsed = JSON.parse(cached)
                    setTenantData(parsed)
                    setBusinessId(parsed.business_id)
                    setTenantStoragePrefix(parsed.business_id)
                    setLoading(false)
                    setTimeout(() => revalidate(targetSlug), 100)
                } else {
                    await revalidate(targetSlug)
                }
            } catch (err) {
                console.error('[TenantLock] 💥 Critical Failure:', err)
                if (mounted) setError(err.message)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        resolveIdentity()
        return () => { mounted = false }
    }, [getTargetSlug, applyTheme, forceRefresh])

    const refreshTenantData = async () => {
        if (!businessId) return
        setForceRefresh(prev => prev + 1)
    }

    const contextValue = {
        businessId,
        tenantData,
        serviceModes: tenantData?.service_modes || { dineIn: true, dineInPayment: 'before', delivery: true, events: true },
        loading,
        error,
        trialExpired,
        refreshTenantData,
        isLoaded: !loading
    }

    return (
        <TenantContext.Provider value={contextValue}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenant() {
    const context = useContext(TenantContext)
    if (!context) {
        return {
            businessId: null, tenantData: {}, loading: false, error: null,
            refreshTenantData: async () => { }, isLoaded: false
        }
    }
    return context
}

export function useBusinessId() {
    const context = useContext(TenantContext)
    return context?.businessId || null
}
