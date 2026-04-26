// src/hooks/useOrderFlow.js
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';

/**
 * useOrderFlow
 *
 * Wraps the core order lifecycle operations against Supabase:
 *   - createOrder   – inserts a new order row and returns it
 *   - getOrderStatus – fetches a single order by primary key
 *   - cancelOrder    – transitions any order to 'cancelado'
 *
 * Status state machine:
 *   pending → pending_payment → paid_unreleased → released_to_kitchen
 *           → preparing → ready → delivered
 *   any → cancelado  (cancel path)
 *
 * Payment-method rules (enforced by the caller via orderData.status):
 *   cash          → status 'paid_unreleased'
 *   mercadopago   → status 'pending'
 */
export function useOrderFlow() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * createOrder
     * @param {object} orderData - Order payload. Must include `paymentMethod`.
     *   Pass `status` explicitly, or let this hook derive the correct initial
     *   status from `paymentMethod`:
     *     'cash'        → 'paid_unreleased'
     *     'mercadopago' → 'pending'
     * @returns {Promise<{ success: boolean, order?: object, error?: string }>}
     */
    const createOrder = useCallback(async (orderData) => {
        setLoading(true);
        setError(null);

        try {
            // Derive the correct initial status from the payment method when
            // the caller has not already set it explicitly.
            let status = orderData.status;
            if (!status) {
                status = orderData.paymentMethod === 'cash'
                    ? 'paid_unreleased'
                    : 'pending';
            }

            const insertPayload = {
                ...orderData,
                status,
            };

            const { data, error: dbError } = await supabase
                .from('orders')
                .insert(insertPayload)
                .select()
                .single();

            if (dbError) throw dbError;

            return { success: true, order: data };
        } catch (e) {
            const message = e?.message ?? String(e);
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * getOrderStatus
     * @param {string} orderId - Primary key of the order row.
     * @returns {Promise<{ success: boolean, order?: object, error?: string }>}
     */
    const getOrderStatus = useCallback(async (orderId) => {
        if (!orderId) {
            return { success: false, error: 'No order ID provided' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: dbError } = await supabase
                .from('orders')
                .select()
                .eq('id', orderId)
                .single();

            if (dbError) throw dbError;

            return { success: true, order: data };
        } catch (e) {
            const message = e?.message ?? String(e);
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * cancelOrder
     * @param {string} orderId - Primary key of the order to cancel.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const cancelOrder = useCallback(async (orderId) => {
        if (!orderId) {
            return { success: false, error: 'No order ID provided' };
        }

        setLoading(true);
        setError(null);

        try {
            const { error: dbError } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', orderId);

            if (dbError) throw dbError;

            return { success: true };
        } catch (e) {
            const message = e?.message ?? String(e);
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        createOrder,
        getOrderStatus,
        cancelOrder,
    };
}
