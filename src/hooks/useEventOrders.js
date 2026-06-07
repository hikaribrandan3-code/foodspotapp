import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useEventOrders - Fetch ticket orders by guest token
 * @param {string} guestToken - Stored in localStorage after checkout
 * @returns {{ orders: Array, loading: boolean, error: Error | null, refetch: () => void }}
 */
export function useEventOrders(guestToken) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchOrders = useCallback(async () => {
        if (!guestToken) {
            setOrders([])
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('event_orders')
                .select(`
                    *,
                    events:event_id (
                        name, start_date, venue_name, image_url, status
                    )
                `)
                .eq('guest_token', guestToken)
                .eq('payment_status', 'paid')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (fetchError) {
                console.error('[useEventOrders] Fetch failed:', fetchError)
                setError(fetchError)
                setOrders([])
            } else {
                setOrders(data || [])
            }
        } catch (err) {
            console.error('[useEventOrders] Error:', err?.message)
            setError(err)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }, [guestToken])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    return { orders, loading, error, refetch: fetchOrders }
}
