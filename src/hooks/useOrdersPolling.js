import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useOrdersPolling - Polling + Real-time subscription for immediate updates
 * Fetches orders every 15 seconds, but real-time subscription triggers on order changes.
 */
export function useOrdersPolling(businessId) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [offset, setOffset] = useState(0)

    const fetchOrders = useCallback(async (newOffset = 0) => {
        if (!businessId) return
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false })
                .range(newOffset, newOffset + 99)

            if (!error && data) {
                // If offset is 0 (initial load), replace. Otherwise append.
                setOrders(prev => newOffset === 0 ? data : [...prev, ...data])
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

    return { orders, loading, refreshOrders: fetchOrders, loadMore: () => { const newOffset = offset + 100; setOffset(newOffset); fetchOrders(newOffset); } }
}
