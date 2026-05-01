// src/hooks/useSplitPayment.js
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getGuestToken } from '../utils/guestToken';
import { PAYMENT_METHOD } from '../constants/database.js';


export function useSplitPayment(businessId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [splitPayments, setSplitPayments] = useState([]);
    const [activeLedger, setActiveLedger] = useState(null);

    const createLedger = useCallback(async (tableNumber, orderId, totalAmount, splitCount = 1) => {
        if (!businessId) {
            return { success: false, error: 'No business ID' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: dbError } = await supabase
                .from('table_ledgers')
                .insert({
                    business_id: businessId,
                    table_number: tableNumber,
                    order_id: orderId,
                    total_due: totalAmount,
                    split_count: splitCount,
                    status: 'pending'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setActiveLedger(data);
            return { success: true, ledger: data };
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const splitBill = useCallback(async (ledgerId, splitCount, participantNames = []) => {
        if (!ledgerId) {
            return { success: false, error: 'No ledger ID' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data: ledger, error: ledgerError } = await supabase
                .from('table_ledgers')
                .select('*')
                .eq('id', ledgerId)
                .single();

            if (ledgerError) throw ledgerError;

            const amountPerPerson = Math.ceil((ledger.total_due / splitCount) * 100) / 100;
            const remainder = ledger.total_due - (amountPerPerson * (splitCount - 1));
            const amounts = amountsArray(splitCount, amountPerPerson, remainder);

            const guests = [];
            for (let i = 0; i < splitCount; i++) {
                guests.push({
                    ledger_id: ledgerId,
                    participant_name: participantNames[i] || `Comensal ${i + 1}`,
                    participant_token: `${getGuestToken()}_${i}_${Date.now()}`,
                    amount: amounts[i],
                    status: 'pending',
                    payment_method: PAYMENT_METHOD.MERCADO_PAGO
                });
            }

            const { data: splits, error: splitsError } = await supabase
                .from('split_payments')
                .insert(guests)
                .select();

            if (splitsError) throw splitsError;

            await supabase
                .from('table_ledgers')
                .update({ split_count: splitCount })
                .eq('id', ledgerId);

            setSplitPayments(splits);
            return { success: true, splits };
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const amountsArray = (count, perPerson, last) => {
        const arr = Array(count - 1).fill(perPerson);
        arr.push(last);
        return arr;
    };

    const generateMPSplitPreference = useCallback(async (splitId, amount, participantName) => {
        if (!splitId || !amount) {
            return { success: false, error: 'Missing split ID or amount' };
        }

        try {
            const { data, error } = await supabase.functions.invoke('create-split-preference', {
                body: {
                    split_id: splitId,
                    amount: amount,
                    participant_name: participantName,
                    business_id: businessId
                }
            });

            if (error) throw error;

            await supabase
                .from('split_payments')
                .update({ 
                    mp_preference_id: data.preference_id,
                    status: 'processing'
                })
                .eq('id', splitId);

            return { success: true, init_point: data.init_point };
        } catch (e) {
            console.error('[SplitPayment] MP preference failed:', e);
            return { success: false, error: e.message };
        }
    }, [businessId]);

    const processMPWebhook = useCallback(async (paymentId, status) => {
        try {
            const { data: split } = await supabase
                .from('split_payments')
                .select('*, ledger_id')
                .eq('mp_payment_id', paymentId)
                .single();

            if (!split) return { success: false, error: 'Split not found' };

            const newStatus = status === 'approved' ? 'paid' : 'failed';
            
            await supabase
                .from('split_payments')
                .update({
                    mp_status: status,
                    status: newStatus,
                    paid_at: newStatus === 'paid' ? new Date().toISOString() : null
                })
                .eq('id', split.id);

            if (newStatus === 'paid') {
                const { error: rpcError } = await supabase.rpc('increment_ledger_total', {
                    p_ledger_id: split.ledger_id,
                    p_amount: split.amount,
                });
                if (rpcError) throw rpcError;
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    const paySplitWithCard = useCallback(async (splitId, cardId) => {
        if (!splitId || !cardId) {
            return { success: false, error: 'Missing parameters' };
        }

        setLoading(true);

        try {
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('card_id', cardId)
                .single();

            if (walletError || !wallet) {
                return { success: false, error: 'Card no encontrada' };
            }

            if (wallet.status !== 'active') {
                return { success: false, error: 'Tarjeta inactiva' };
            }

            const { data: split, error: splitError } = await supabase
                .from('split_payments')
                .select('*, ledger_id')
                .eq('id', splitId)
                .single();

            if (splitError || !split) {
                return { success: false, error: 'Split no encontrado' };
            }

            if (wallet.balance < split.amount) {
                return { success: false, error: 'Saldo insuficiente' };
            }

            await supabase.rpc('deduct_wallet_balance', {
                p_wallet_id: wallet.id,
                p_amount: split.amount,
                p_ledger_id: split.ledger_id,
                p_split_id: splitId
            });

            await supabase
                .from('split_payments')
                .update({
                    payment_method: 'grubcard',
                    status: 'paid',
                    paid_at: new Date().toISOString()
                })
                .eq('id', splitId);

            const { error: rpcError } = await supabase.rpc('increment_ledger_total', {
                p_ledger_id: split.ledger_id,
                p_amount: split.amount,
            });
            if (rpcError) throw rpcError;

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const getLedgerStatus = useCallback(async (ledgerId) => {
        try {
            const { data, error } = await supabase
                .from('table_ledgers')
                .select('*')
                .eq('id', ledgerId)
                .single();

            if (error) throw error;
            setActiveLedger(data);
            return { success: true, ledger: data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    const subscribeToLedgerUpdates = useCallback((ledgerId, callback) => {
        const channel = supabase
            .channel(`ledger:${ledgerId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'table_ledgers',
                    filter: `id=eq.${ledgerId}`
                },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    return {
        loading,
        error,
        splitPayments,
        activeLedger,
        createLedger,
        splitBill,
        generateMPSplitPreference,
        processMPWebhook,
        paySplitWithCard,
        getLedgerStatus,
        subscribeToLedgerUpdates
    };
}