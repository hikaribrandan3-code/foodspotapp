import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * useRentalItems - Fetch the Equipos catalog (rental_items) for a business.
 * @param {string} businessId
 */
export function useRentalItems(businessId) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchItems = useCallback(async () => {
        if (!businessId) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('rental_items')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_available', true)
                .eq('is_deleted', false)
                .order('sort_order', { ascending: true })

            if (fetchError) {
                console.error('[useRentalItems] Fetch failed:', fetchError)
                setError(fetchError)
                setItems([])
            } else {
                setItems(data || [])
            }
        } catch (err) {
            console.error('[useRentalItems] Error:', err?.message)
            setError(err)
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [businessId])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    return { items, loading, error, refetch: fetchItems }
}

/**
 * createRentalReservation - RPC wrapper for cart checkout (no payment step).
 * Kept for zero-cost carts / non-MP flows.
 * @param {{businessId, customerName, customerPhone, items: [{rental_item_id, quantity}], reservedFor, guestToken}} params
 */
export async function createRentalReservation({ businessId, customerName, customerPhone, items, reservedFor, guestToken }) {
    const { data, error } = await supabase.rpc('create_rental_reservation', {
        p_business_id: businessId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_items: items,
        p_reserved_for: reservedFor || null,
        p_guest_token: guestToken || null
    })
    if (error) {
        console.error('[createRentalReservation] RPC failed:', error)
        throw error
    }
    return data
}

/**
 * createRentalPreference - reserves the cart AND creates the Mercado Pago checkout
 * preference in one call (create-sports-preference edge function). Same checkout
 * pattern as food/events: zero-cost → paid immediately, else → init_point redirect.
 */
export async function createRentalPreference({ businessId, tenantSlug, customerName, customerPhone, items, reservedFor }) {
    const { data, error } = await supabase.functions.invoke('create-sports-preference', {
        body: {
            kind: 'rental',
            business_id: businessId,
            tenant_slug: tenantSlug,
            customer_name: customerName,
            customer_phone: customerPhone,
            items,
            reserved_for: reservedFor || null
        }
    })
    if (error) {
        console.error('[createRentalPreference] Edge function failed:', error)
        throw error
    }
    return data
}

/**
 * fetchRentalOrder - read a single rental order row (used for the MP-return confirmation screen)
 */
export async function fetchRentalOrder(orderId) {
    const { data, error } = await supabase
        .from('rental_orders')
        .select('id, rental_code, items, subtotal_cents, deposit_cents, total_cents, payment_status')
        .eq('id', orderId)
        .single()
    if (error) {
        console.error('[fetchRentalOrder] Fetch failed:', error)
        throw error
    }
    return data
}
