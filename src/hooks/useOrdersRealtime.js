import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useOrdersRealtime - Silo-Hardened Realtime Hook
 * @param {string} businessId - The UUID for the current tenant
 */
export function useOrdersRealtime(businessId) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = useCallback(async () => {
        if (!businessId) return
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('business_id', businessId) // 🛡️ SILO LOCK
            .order('created_at', { ascending: false })
            .limit(50) // Keep the limit from the original dashboard logic to prevent overload

        if (!error) setOrders(data || [])
        setLoading(false)
    }, [businessId])

    useEffect(() => {
        fetchOrders()

        if (!businessId) return

        // 🛰️ REALTIME SUBSCRIPTION WITH HARDENED FILTERING
        let channel = null
        let pollInterval = null

        try {
            channel = supabase
                .channel(`orders-realtime-${businessId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `business_id=eq.${businessId}`
                    },
                    (payload) => {
                        const { eventType, new: newRow, old: oldRow } = payload
                        setOrders(current => {
                            switch (eventType) {
                                case 'INSERT': return [newRow, ...current]
                                case 'UPDATE': return current.map(o => o.id === newRow.id ? newRow : o)
                                case 'DELETE': return current.filter(o => o.id !== oldRow.id)
                                default: return current
                            }
                        })
                    }
                )
                .subscribe((status, err) => {
                    if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('[useOrdersRealtime] Realtime unavailable, falling back to polling:', status, err?.message)
                        // Fallback: poll every 15 seconds
                        pollInterval = setInterval(fetchOrders, 15000)
                    }
                })
        } catch (err) {
            console.warn('[useOrdersRealtime] Realtime init failed, using polling:', err?.message)
            pollInterval = setInterval(fetchOrders, 15000)
        }

        return () => {
            if (channel) supabase.removeChannel(channel)
            if (pollInterval) clearInterval(pollInterval)
        }
    }, [businessId, fetchOrders])

    return { orders, loading, refreshOrders: fetchOrders }
}
