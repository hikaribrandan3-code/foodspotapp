import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useOrdersPolling - Simple polling-only hook (no realtime)
 * Fetches orders every 15 seconds. Avoids realtime subscription errors.
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
                .limit(50)

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
        fetchOrders()
        const interval = setInterval(fetchOrders, 15000) // Poll every 15 sec
        return () => clearInterval(interval)
    }, [businessId, fetchOrders])

    return { orders, loading, refreshOrders: fetchOrders }
}
