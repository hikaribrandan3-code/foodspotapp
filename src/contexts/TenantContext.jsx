/**
 * TenantContext.jsx - Strike 2: Tenant Lock
 * 
 * 🏢 Multi-Tenant Identity Provider (Strict Mode)
 * Reference: Antigravity Protocol Phase 3
 * 
 * 🛡️ Features:
 * - Strict Slug Resolution
 * - System Route Fallback (Persistence)
 * - Global Refresh Support
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// Context Definition
const TenantContext = createContext(null)

// 🚫 SYSTEM ROUTES (Reserved Slugs)
// Apps should be mounted at /:slug/*
// But some global routes might exist.
const SYSTEM_ROUTES = [
    'admin', 'owner', 'login', 'signup', 'start-trial',
    'status', 'checkout', 'order' // Sub-resources that might appear at root
]

export function TenantProvider({ children }) {
    // 🛡️ STATE
    const [tenantData, setTenantData] = useState(null)
    const [businessId, setBusinessId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Compatibility State
    const [trialExpired, setTrialExpired] = useState(false)
    const [emergencyUnblock, setEmergencyUnblock] = useState(false)
    const [forceRefresh, setForceRefresh] = useState(0)

    // Helper: Identify if current path segment is a tenant slug
    const getTargetSlug = () => {
        const pathSegments = window.location.pathname.split('/').filter(Boolean)
        const possibleSlug = pathSegments[0]

        // 1. If no slug, or it's a system route, try to RECOVER from storage
        if (!possibleSlug || SYSTEM_ROUTES.includes(possibleSlug)) {
            const lastActive = localStorage.getItem('fs_last_active_slug')
            if (lastActive) {
                console.log(`[TenantLock] 🔌 Recovered identity for system route '/${possibleSlug}': ${lastActive}`)
                return lastActive
            }
            return null // Identity Lost
        }

        return possibleSlug
    }

    // 🛡️ RESOLUTION ENGINE
    useEffect(() => {
        let mounted = true

        const resolveIdentity = async () => {
            try {
                const targetSlug = getTargetSlug()

                if (!targetSlug) {
                    console.warn('[TenantLock] ⚠️ No Identity Found. Waiting for injection or manual slug.')
                    // Don't error immediately, allows Admin/Login pages to render if they don't consume context
                    setLoading(false)
                    return
                }

                console.log(`[TenantLock] 🔐 Locking Tenant: ${targetSlug}`)

                // ⚡ CACHE-FIRST STRATEGY (Optimization)
                const CACHE_KEY = `tenant_lock_${targetSlug}`
                const cached = localStorage.getItem(CACHE_KEY)

                if (cached) {
                    const parsed = JSON.parse(cached)
                    setTenantData(parsed)
                    setBusinessId(parsed.business_id)
                    setTenantStoragePrefix(parsed.business_id)

                    // Update last active
                    localStorage.setItem('fs_last_active_slug', targetSlug)

                    setLoading(false) // Hydrated!

                    // Background Revalidation
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

        const revalidate = async (slug) => {
            const { data, error } = await supabase
                .from('branding')
                .select('*')
                .eq('slug', slug)
                .single()

            if (error) throw error

            if (data) {
                // UPDATE STATE
                if (mounted) {
                    setTenantData(data)
                    setBusinessId(data.business_id)
                    setTenantStoragePrefix(data.business_id)
                    // Reset compatibility flags
                    setTrialExpired(false)
                }

                // UPDATE PERSISTENCE
                const CACHE_KEY = `tenant_lock_${slug}`
                localStorage.setItem(CACHE_KEY, JSON.stringify(data))
                localStorage.setItem('fs_last_active_slug', slug)

                // APPLY THEME
                applyTheme(data)
            }
        }

        resolveIdentity()

        // Listen for forced refreshes
        if (forceRefresh > 0 && businessId) {
            refreshTenantData()
        }

        return () => { mounted = false }
    }, [forceRefresh])

    // 🔄 GLOBAL REFRESH Action
    const refreshTenantData = async () => {
        if (!businessId) return
        console.log('🔄 FORCING GLOBAL REFRESH...')

        try {
            const { data, error } = await supabase
                .from('branding')
                .select('*')
                .eq('business_id', businessId)
                .single()

            if (!error && data) {
                setTenantData(data)
                applyTheme(data)

                // Update Cache
                if (data.slug) {
                    localStorage.setItem(`tenant_lock_${data.slug}`, JSON.stringify(data))
                }
                console.log('✅ GLOBAL REFRESH COMPLETE')
            }
        } catch (err) {
            console.error('Refresh Failed', err)
        }
    }

    // 🎨 THEME ENGINE
    const applyTheme = (data) => {
        if (!data) return
        const root = document.documentElement.style
        const fontFamily = data.font_family ? `'${data.font_family}', sans-serif` : 'Inter, system-ui, sans-serif'

        root.setProperty('--font-family-brand', fontFamily)
        if (data.primary_color) root.setProperty('--color-primary', data.primary_color)
        if (data.secondary_color) root.setProperty('--color-secondary', data.secondary_color)
        if (data.confirmation_color) root.setProperty('--color-confirm', data.confirmation_color)
        if (data.powered_by_color) root.setProperty('--color-powered', data.powered_by_color)
        if (data.background_color) root.setProperty('--color-bg', data.background_color)

        // 🆕 UNIVERSAL MODES
        // Expose service modes to CSS for conditional styling if needed
        if (data.service_modes && root && root.classList) {
            if (data.service_modes.dineIn) root.classList.add('mode-dine-in')
            else root.classList.remove('mode-dine-in')
        }
    }

    // PUBLIC API
    const contextValue = {
        businessId,
        tenantData,
        // 🆕 EXPOSE SERVICE MODES
        serviceModes: tenantData?.service_modes || { dineIn: true, dineInPayment: 'before', delivery: true, events: true },
        loading,
        error,
        // Compatibility
        trialExpired,
        emergencyUnblock,
        refreshTenantData,
        forceRefresh,
        isLoaded: !loading
    }

    return (
        <TenantContext.Provider value={contextValue}>
            {children}
        </TenantContext.Provider>
    )
}

// HOOK
export function useTenant() {
    const context = useContext(TenantContext)
    if (!context) {
        // Return mostly empty/safe object for components used outside provider (rare)
        return {
            businessId: null, tenantData: {}, loading: false, error: null,
            refreshTenantData: async () => { }, isLoaded: false
        }
    }
    return context
}

// Compatibility Hook
export function useBusinessId() {
    const context = useContext(TenantContext)
    return context?.businessId || null
}
