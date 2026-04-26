import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ORDER_STATUS } from '../constants/database.js';


const SNAPBACK_TIMEOUT_MS = 8000;

export const useKDSSync = (businessId) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const snapbackTimers = useRef(new Map());

    const fetchInitialOrders = useCallback(async () => {
        if (!businessId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('business_id', businessId) // 🛡️ SILO GUARD
            .in('status', [ORDER_STATUS.RELEASED_TO_KITCHEN, ORDER_STATUS.PREPARING, ORDER_STATUS.READY])
            .order('created_at', { ascending: true });

        if (!error && data) setOrders(data);
        setLoading(false);
    }, [businessId]);

    const fetchOrders = fetchInitialOrders;

    useEffect(() => {
        if (!businessId) return;
        fetchInitialOrders();

        // 🛰️ REALTIME SUBSCRIPTION
        const channel = supabase
            .channel(`kds-silo-${businessId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `business_id=eq.${businessId}`
            }, (payload) => {
                // 🛡️ CAMTECH GUARD: Ignore updates when camera is active
                if (window.__camTechActive) {
                    console.log('[KDS] 🛡️ Ignoring realtime update (CamTech active)');
                    return;
                }
                const { eventType, new: newRow, old: oldRow } = payload;
                
                setOrders(current => {
                    if (eventType === 'INSERT') {
                        if ([ORDER_STATUS.RELEASED_TO_KITCHEN, ORDER_STATUS.PREPARING, ORDER_STATUS.READY].includes(newRow.status)) {
                            return [...current, newRow];
                        }
                        return current;
                    }

                    if (eventType === 'UPDATE') {
                        // 🛡️ SERVER CONFIRMATION: Clear snapback timer
                        if (snapbackTimers.current.has(newRow.id)) {
                            clearTimeout(snapbackTimers.current.get(newRow.id));
                            snapbackTimers.current.delete(newRow.id);
                        }

                        if ([ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(newRow.status)) {
                            return current.filter(o => o.id !== newRow.id);
                        }
                        // Update order and remove optimistic flag
                        return current.map(o => o.id === newRow.id ? { ...newRow, isOptimistic: false } : o);
                    }

                    if (eventType === 'DELETE') return current.filter(o => o.id !== oldRow.id);
                    return current;
                });
            }).subscribe();

        return () => {
            supabase.removeChannel(channel);
            snapbackTimers.current.forEach(timer => clearTimeout(timer));
        };
    }, [businessId, fetchInitialOrders]);

    const transitionOrderState = useCallback(async (orderId, currentStatus, newStatus) => {
        // 🛡️ CAMTECH GUARD: Prevent transitions while camera is active
        if (window.__camTechActive) return;

        // 🛡️ 1. OPTIMISTIC UPDATE: Instantly update UI and set flag
        setOrders(current => current.map(o => 
            o.id === orderId ? { ...o, status: newStatus, isOptimistic: true } : o
        ));

        // 🛡️ 2. SNAPBACK PROTECTION: Rollback if RPC fails or realtime drops
        const timer = setTimeout(() => {
            console.warn(`[KDS] Snapback triggered for ${orderId}`);
            setOrders(current => current.map(o => 
                o.id === orderId ? { ...o, status: currentStatus, isOptimistic: false } : o
            ));
            snapbackTimers.current.delete(orderId);
        }, SNAPBACK_TIMEOUT_MS);
        
        snapbackTimers.current.set(orderId, timer);

        // 🛡️ 3. DATABASE MUTATION (direct update)
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        // If error, rollback immediately
        if (error) {
            clearTimeout(timer);
            snapbackTimers.current.delete(orderId);
            setOrders(current => current.map(o =>
                o.id === orderId ? { ...o, status: currentStatus, isOptimistic: false } : o
            ));
            console.warn('[KDS] Update error:', error.message)
        } else {
            // Success: clear snapback timer
            clearTimeout(timer);
            snapbackTimers.current.delete(orderId);
            setOrders(current => current.map(o =>
                o.id === orderId ? { ...o, status: newStatus, isOptimistic: false } : o
            ));
        }
    }, []);

    return { orders, loading, transitionOrderState, fetchOrders };
};
