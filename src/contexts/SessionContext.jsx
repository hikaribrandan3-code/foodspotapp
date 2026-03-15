// src/contexts/SessionContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTenant } from './TenantContext';
import {
    getLocalSession,
    clearLocalSession,
    createSession,
    joinSession,
    getSession,
    addItemToSession,
    updateSessionItems,
    endSession,
    subscribeToSession
} from '../utils/session';
import { getCurrentOrder, saveCurrentOrder, clearCurrentOrder } from '../utils/storage';

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
    const { businessId } = useTenant();
    const [activeSession, setActiveSession] = useState(null);
    const [sessionItems, setSessionItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [unsubscribe, setUnsubscribe] = useState(null);

    useEffect(() => {
        const local = getLocalSession();
        if (local && businessId) {
            refreshSession(local.sessionId);
        }
    }, [businessId]);

    useEffect(() => {
        if (activeSession?.id) {
            const unsub = subscribeToSession(activeSession.id, (payload) => {
                if (payload.new?.items) {
                    setSessionItems(payload.new.items);
                }
            });
            setUnsubscribe(() => unsub);
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [activeSession?.id]);

    const refreshSession = useCallback(async (sessionId) => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const result = await getSession(sessionId);
            if (result.success) {
                setActiveSession(result.session);
                setSessionItems(result.session.items || []);
            } else {
                clearLocalSession();
                setActiveSession(null);
            }
        } catch (e) {
            console.error('[SessionContext] Failed to refresh:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const startNewSession = useCallback(async (options = {}) => {
        if (!businessId) {
            setError('No business ID');
            return { success: false, error: 'No business ID' };
        }
        setLoading(true);
        setError(null);
        try {
            const result = await createSession(businessId, options);
            if (result.success) {
                setActiveSession(result.session);
                setSessionItems([]);
                clearCurrentOrder();
            } else {
                setError(result.error);
            }
            return result;
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const joinExistingSession = useCallback(async (sessionIdOrCode) => {
        if (!businessId) {
            setError('No business ID');
            return { success: false, error: 'No business ID' };
        }
        setLoading(true);
        setError(null);
        try {
            const result = await joinSession(sessionIdOrCode, businessId);
            if (result.success) {
                setActiveSession(result.session);
                setSessionItems(result.session.items || []);
                
                const localOrder = getCurrentOrder();
                if (localOrder.items?.length > 0) {
                    for (const item of localOrder.items) {
                        await addItemToSession(result.session.id, item);
                    }
                    clearCurrentOrder();
                    await refreshSession(result.session.id);
                }
            } else {
                setError(result.error);
            }
            return result;
        } catch (e) {
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [businessId, refreshSession]);

    const addItem = useCallback(async (item) => {
        if (!activeSession?.id) {
            return { success: false, error: 'No active session' };
        }
        try {
            const result = await addItemToSession(activeSession.id, item);
            if (result.success) {
                setSessionItems(prev => [...prev, item]);
            }
            return result;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, [activeSession?.id]);

    const updateItems = useCallback(async (items) => {
        if (!activeSession?.id) {
            return { success: false, error: 'No active session' };
        }
        try {
            const result = await updateSessionItems(activeSession.id, items);
            if (result.success) {
                setSessionItems(items);
            }
            return result;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, [activeSession?.id]);

    const leaveSession = useCallback(async () => {
        if (activeSession?.id) {
            await endSession(activeSession.id);
        }
        clearLocalSession();
        setActiveSession(null);
        setSessionItems([]);
    }, [activeSession?.id]);

    const hasActiveSession = !!activeSession;

    return (
        <SessionContext.Provider value={{
            activeSession,
            sessionItems,
            hasActiveSession,
            loading,
            error,
            startNewSession,
            joinExistingSession,
            addItem,
            updateItems,
            leaveSession,
            refreshSession
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
};