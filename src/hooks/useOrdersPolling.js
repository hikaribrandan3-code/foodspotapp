import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useOrdersPolling - Polling + Real-time subscription for immediate updates
 * Fetches orders every 15 seconds, but real-time subscription triggers on order changes.
 */
export function useOrdersPolling(businessId) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = useCallback(async () => {
        if (!businessId) return
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false })
                .limit(100)

            if (!error && data) {
                setOrders(data)
            }
            setLoading(false)
        } catch (err) {
            console.error('[useOrdersPolling] Fetch failed:', err?.message)
            setLoading(false)
        }
    }, [businessId])

    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        // Initial fetch
        fetchOrders()

        // Real-time subscription for immediate updates
        const subscription = supabase
            .channel(`polling-orders-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `business_id=eq.${businessId}`
                },
                () => {
                    if (!cancelled) fetchOrders()
                }
            )
            .subscribe()

        // Fallback polling every 15 sec if subscription fails
        const interval = setInterval(() => {
            if (!cancelled) fetchOrders()
        }, 15000)

        return () => {
            cancelled = true
            clearInterval(interval)
            supabase.removeChannel(subscription)
        }
    }, [businessId, fetchOrders])

    return { orders, loading, refreshOrders: fetchOrders }
}
