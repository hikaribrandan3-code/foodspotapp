// src/hooks/useGrubCard.js
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useGrubCard(businessId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastScannedCard, setLastScannedCard] = useState(null);

    const scanCard = useCallback(async (cardId) => {
        if (!cardId) {
            return { success: false, error: 'No card ID provided' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('card_id', cardId)
                .eq('business_id', businessId)
                .single();

            if (walletError) {
                if (walletError.code === 'PGRST116') {
                    return { success: false, error: 'Tarjeta no registrada', notFound: true };
                }
                throw walletError;
            }

            if (wallet.status !== 'active') {
                return { success: false, error: `Tarjeta ${wallet.status === 'frozen' ? 'congelada' : 'inactiva'}` };
            }

            setLastScannedCard(wallet);
            return { 
                success: true, 
                wallet: {
                    id: wallet.id,
                    cardId: wallet.card_id,
                    holderName: wallet.card_holder_name,
                    balance: wallet.balance
                }
            };
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const deductFromCard = useCallback(async (cardId, amount, ledgerId = null, description = '') => {
        if (!cardId || !amount) {
            return { success: false, error: 'Missing card ID or amount' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('card_id', cardId)
                .eq('business_id', businessId)
                .single();

            if (walletError) throw walletError;

            if (wallet.status !== 'active') {
                return { success: false, error: 'Tarjeta inactiva' };
            }

            if (wallet.balance < amount) {
                return { success: false, error: `Saldo insuficiente. Saldo actual: $${wallet.balance}` };
            }

            const newBalance = wallet.balance - amount;

            const { error: updateError } = await supabase
                .from('wallets')
                .update({ 
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            if (updateError) throw updateError;

            const { error: txError } = await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    ledger_id: ledgerId,
                    amount: -amount,
                    type: 'debit',
                    description: description || 'Deducción en mesa'
                });

            if (txError) throw txError;

            return { 
                success: true, 
                newBalance,
                transaction: {
                    walletId: wallet.id,
                    amount: -amount,
                    newBalance
                }
            };
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const createWallet = useCallback(async (cardId, cardHolderName, initialBalance = 0) => {
        if (!cardId || !cardHolderName) {
            return { success: false, error: 'Card ID and holder name required' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data: existing } = await supabase
                .from('wallets')
                .select('id')
                .eq('card_id', cardId)
                .single();

            if (existing) {
                return { success: false, error: 'Esta tarjeta ya está registrada' };
            }

            const { data, error: createError } = await supabase
                .from('wallets')
                .insert({
                    business_id: businessId,
                    card_id: cardId,
                    card_holder_name: cardHolderName,
                    balance: initialBalance,
                    status: 'active'
                })
                .select()
                .single();

            if (createError) throw createError;

            if (initialBalance > 0) {
                await supabase
                    .from('wallet_transactions')
                    .insert({
                        wallet_id: data.id,
                        amount: initialBalance,
                        type: 'credit',
                        description: 'Saldo inicial'
                    });
            }

            return { success: true, wallet: data };
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const addFunds = useCallback(async (cardId, amount, description = '') => {
        if (!cardId || !amount || amount <= 0) {
            return { success: false, error: 'Invalid card ID or amount' };
        }

        setLoading(true);
        setError(null);

        try {
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('card_id', cardId)
                .eq('business_id', businessId)
                .single();

            if (walletError) throw walletError;

            const newBalance = wallet.balance + amount;

            await supabase
                .from('wallets')
                .update({ 
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            await supabase
                .from('wallet_transactions')
                .insert({
                    wallet_id: wallet.id,
                    amount: amount,
                    type: 'credit',
                    description: description || 'Recarga'
                });

            return { success: true, newBalance };
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const getWalletByCard = useCallback(async (cardId) => {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('card_id', cardId)
                .eq('business_id', businessId)
                .single();

            if (error) throw error;
            return { success: true, wallet: data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, [businessId]);

    const getWalletTransactions = useCallback(async (cardId, limit = 10) => {
        try {
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('card_id', cardId)
                .eq('business_id', businessId)
                .single();

            if (!wallet) throw new Error('Wallet not found');

            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('wallet_id', wallet.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, transactions: data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, [businessId]);

    const freezeCard = useCallback(async (cardId) => {
        return await updateCardStatus(cardId, 'frozen');
    }, [businessId]);

    const activateCard = useCallback(async (cardId) => {
        return await updateCardStatus(cardId, 'active');
    }, [businessId]);

    const deactivateCard = useCallback(async (cardId) => {
        return await updateCardStatus(cardId, 'deactivated');
    }, [businessId]);

    const updateCardStatus = async (cardId, status) => {
        if (!cardId) {
            return { success: false, error: 'No card ID' };
        }

        try {
            const { error } = await supabase
                .from('wallets')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('card_id', cardId)
                .eq('business_id', businessId);

            if (error) throw error;
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    };

    return {
        loading,
        error,
        lastScannedCard,
        scanCard,
        deductFromCard,
        createWallet,
        addFunds,
        getWalletByCard,
        getWalletTransactions,
        freezeCard,
        activateCard,
        deactivateCard
    };
}