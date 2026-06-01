// src/hooks/useOrderFlow.js
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { ORDER_STATUS } from '../constants/database.js';


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
 *   cash          → status ORDER_STATUS.PAID_UNRELEASED
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
     *     'cash'        → ORDER_STATUS.PAID_UNRELEASED
     *     'mercadopago' → 'pending'
     * @returns {Promise<{ success: boolean, order?: object, error?: string }>}
     */
    const createOrder = useCallback(async (orderData) => {
        setLoading(true);
        setError(null);

        try {
            // Status is locked by order type, not payment method
            let status = orderData.status;
            if (!status) {
                // Delivery: pay at door (kitchen starts immediately)
                if (orderData.order_type === 'delivery') {
                    status = ORDER_STATUS.RELEASED_TO_KITCHEN;
                }
                // Dine-in: pay after service (kitchen starts immediately)
                else if (orderData.order_type === 'dine_in') {
                    status = ORDER_STATUS.RELEASED_TO_KITCHEN;
                }
                // Take-out/pickup: unchanged (owner controls timing)
                else {
                    status = orderData.paymentMethod === 'cash'
                        ? ORDER_STATUS.PAID_UNRELEASED
                        : 'pending';
                }
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

            // Auto-import customer into CRM if they have a phone number
            if (data?.customer_phone && data?.business_id && data?.customer_name) {
                await supabase
                    .from('customer_contacts')
                    .upsert({
                        business_id: data.business_id,
                        phone: data.customer_phone.trim(),
                        name: data.customer_name.trim()
                    }, { onConflict: 'business_id,phone' })
                    .catch(err => console.warn('[useOrderFlow] CRM import failed:', err));
            }

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
                .update({ status: ORDER_STATUS.CANCELLED })
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
