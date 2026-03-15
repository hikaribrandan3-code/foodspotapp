// src/hooks/useLedgerRealtime.js
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useLedgerRealtime(businessId, onPaidNotification) {
    const notificationQueue = useRef([]);
    const channelRef = useRef(null);

    const handlePaidNotification = useCallback((payload) => {
        const ledger = payload.new;
        
        if (ledger.status === 'paid' && ledger.total_paid >= ledger.total_due) {
            const notification = {
                id: ledger.id,
                tableNumber: ledger.table_number,
                totalPaid: ledger.total_paid,
                timestamp: new Date().toISOString(),
                type: 'PAID'
            };

            notificationQueue.current.push(notification);
            
            if (onPaidNotification) {
                onPaidNotification(notification);
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ledger-paid', {
                    detail: notification
                }));
            }

            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }, [onPaidNotification]);

    useEffect(() => {
        if (!businessId) return;

        channelRef.current = supabase
            .channel(`ledger-notifications:${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'table_ledgers',
                    filter: `business_id=eq.${businessId}`
                },
                (payload) => {
                    console.log('[LedgerRealtime] Update received:', payload);
                    handlePaidNotification(payload);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'table_ledgers',
                    filter: `business_id=eq.${businessId}`
                },
                (payload) => {
                    console.log('[LedgerRealtime] New ledger:', payload);
                    if (payload.new.status === 'paid') {
                        handlePaidNotification({ new: payload.new });
                    }
                }
            )
            .subscribe((status) => {
                console.log('[LedgerRealtime] Channel status:', status);
            });

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [businessId, handlePaidNotification]);

    const getActiveLedgers = useCallback(async () => {
        if (!businessId) return { data: [], error: null };

        const { data, error } = await supabase
            .from('table_ledgers')
            .select('*')
            .eq('business_id', businessId)
            .in('status', ['pending', 'partial'])
            .order('created_at', { ascending: false });

        return { data: data || [], error };
    }, [businessId]);

    const getLedgerByTable = useCallback(async (tableNumber) => {
        if (!businessId || !tableNumber) return { data: null, error: null };

        const { data, error } = await supabase
            .from('table_ledgers')
            .select('*')
            .eq('business_id', businessId)
            .eq('table_number', tableNumber)
            .in('status', ['pending', 'partial'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        return { data, error };
    }, [businessId]);

    const getRecentPaidLedgers = useCallback(async (limit = 10) => {
        if (!businessId) return { data: [], error: null };

        const { data, error } = await supabase
            .from('table_ledgers')
            .select('*')
            .eq('business_id', businessId)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .limit(limit);

        return { data: data || [], error };
    }, [businessId]);

    return {
        getActiveLedgers,
        getLedgerByTable,
        getRecentPaidLedgers,
        notificationQueue: notificationQueue.current
    };
}