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
        const channel = supabase
            .channel(`orders-realtime-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `business_id=eq.${businessId}` // 🛡️ DB-LEVEL ISOLATION
                },
                (payload) => {
                    const { eventType, new: newRow, old: oldRow } = payload

                    setOrders(current => {
                        switch (eventType) {
                            case 'INSERT':
                                return [newRow, ...current]
                            case 'UPDATE':
                                return current.map(o => o.id === newRow.id ? newRow : o)
                            case 'DELETE':
                                return current.filter(o => o.id !== oldRow.id)
                            default:
                                return current
                        }
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [businessId, fetchOrders])

    return { orders, loading, refreshOrders: fetchOrders }
}
