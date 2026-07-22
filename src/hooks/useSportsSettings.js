import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useSportsSettings - Fetch the Deportes module config for a business.
 * Drives the Eventos/Deportes hero-button toggle on Home and the
 * SportsThemeWrapper feature flags.
 * @param {string} businessId
 * @returns {{ settings: object|null, loading: boolean, error: Error|null, refetch: () => void }}
 */
export function useSportsSettings(businessId) {
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchSettings = useCallback(async () => {
        if (!businessId) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('sports_settings')
                .select('*')
                .eq('business_id', businessId)
                .maybeSingle()

            if (fetchError) {
                console.error('[useSportsSettings] Fetch failed:', fetchError)
                setError(fetchError)
                setSettings(null)
            } else {
                setSettings(data || null)
            }
        } catch (err) {
            console.error('[useSportsSettings] Error:', err?.message)
            setError(err)
            setSettings(null)
        } finally {
            setLoading(false)
        }
    }, [businessId])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    return { settings, loading, error, refetch: fetchSettings }
}
