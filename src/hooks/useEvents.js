import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useEvents - Fetch live events for a tenant
 * @param {string} tenantSlug - The business slug from URL
 * @returns {{ events: Array, loading: boolean, error: Error | null, refetch: () => void }}
 */
export function useEvents(tenantSlug) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchEvents = useCallback(async () => {
        if (!tenantSlug) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)

            // First resolve business_id from branding slug
            const { data: branding, error: brandingError } = await supabase
                .from('branding')
                .select('business_id')
                .eq('slug', tenantSlug)
                .single()

            if (brandingError || !branding?.business_id) {
                setEvents([])
                setLoading(false)
                return
            }

            // Include events from start of today (not just future) so ongoing events still show
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const { data, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('business_id', branding.business_id)
                .eq('status', 'live')
                .order('start_date', { ascending: true })

            if (fetchError) {
                console.error('[useEvents] Fetch failed:', fetchError)
                setError(fetchError)
                setEvents([])
            } else {
                setEvents(data || [])
            }
        } catch (err) {
            console.error('[useEvents] Error:', err?.message)
            setError(err)
            setEvents([])
        } finally {
            setLoading(false)
        }
    }, [tenantSlug])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    return { events, loading, error, refetch: fetchEvents }
}
