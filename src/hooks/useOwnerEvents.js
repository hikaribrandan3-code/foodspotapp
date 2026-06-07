import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useOwnerEvents - Fetch all events for owner dashboard
 * @param {string} businessId - The owner's business UUID
 * @returns {{ events: Array, loading: boolean, error: Error | null, refetch: () => void }}
 */
export function useOwnerEvents(businessId) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchEvents = useCallback(async () => {
        if (!businessId) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('business_id', businessId)
                .order('start_date', { ascending: false })

            if (fetchError) {
                console.error('[useOwnerEvents] Fetch failed:', fetchError)
                setError(fetchError)
                setEvents([])
                return []
            } else {
                setEvents(data || [])
                return data || []
            }
        } catch (err) {
            console.error('[useOwnerEvents] Error:', err?.message)
            setError(err)
            setEvents([])
            return []
        } finally {
            setLoading(false)
        }
    }, [businessId])

    useEffect(() => {
        fetchEvents()

        // Real-time subscription for live stats updates
        let subscription
        if (businessId) {
            subscription = supabase
                .channel(`owner-events-${businessId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'events',
                        filter: `business_id=eq.${businessId}`
                    },
                    () => fetchEvents()
                )
                .subscribe()
        }

        return () => {
            if (subscription) supabase.removeChannel(subscription)
        }
    }, [fetchEvents, businessId])

    const removeEvent = useCallback((eventId) => {
        setEvents(prev => prev.filter(e => e.id !== eventId))
    }, [])

    return { events, loading, error, refetch: fetchEvents, removeEvent }
}
