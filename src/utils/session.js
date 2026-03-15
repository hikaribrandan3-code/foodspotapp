// src/utils/session.js
import { supabase } from '../lib/supabaseClient';
import { getGuestToken } from './guestToken';

const SESSION_STORAGE_KEY = 'active_session';

export function generateSessionId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function generateShareCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function saveSessionLocally(sessionData) {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        return true;
    } catch (e) {
        console.error('[Session] Failed to save locally:', e);
        return false;
    }
}

export function getLocalSession() {
    try {
        const data = localStorage.getItem(SESSION_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('[Session] Failed to get local session:', e);
        return null;
    }
}

export function clearLocalSession() {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return true;
    } catch (e) {
        console.error('[Session] Failed to clear local session:', e);
        return false;
    }
}

export async function createSession(businessId, options = {}) {
    const { tableNumber, sessionName, createdBy } = options;
    const guestToken = getGuestToken();
    const shareCode = generateShareCode();
    const sessionId = generateSessionId();

    const sessionData = {
        id: sessionId,
        business_id: businessId,
        share_code: shareCode,
        table_number: tableNumber || null,
        session_name: sessionName || null,
        created_by: createdBy || guestToken,
        status: 'active',
        items: [],
        participants: [{ token: guestToken, joined_at: new Date().toISOString() }],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('order_sessions')
            .insert(sessionData)
            .select()
            .single();

        if (error) throw error;

        const localData = {
            sessionId: data.id,
            shareCode: data.share_code,
            businessId: data.business_id,
            isOwner: true
        };
        saveSessionLocally(localData);

        return { success: true, session: data };
    } catch (e) {
        console.error('[Session] Failed to create session:', e);
        return { success: false, error: e.message };
    }
}

export async function joinSession(sessionIdOrCode, businessId) {
    const guestToken = getGuestToken();

    let query = supabase
        .from('order_sessions')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

    if (sessionIdOrCode.length === 6) {
        query = query.eq('share_code', sessionIdOrCode.toUpperCase());
    } else {
        query = query.eq('id', sessionIdOrCode);
    }

    try {
        const { data, error } = await query.single();

        if (error) throw error;
        if (!data) {
            return { success: false, error: 'Session not found or expired' };
        }

        const participants = data.participants || [];
        const alreadyJoined = participants.some(p => p.token === guestToken);

        if (!alreadyJoined) {
            participants.push({
                token: guestToken,
                joined_at: new Date().toISOString()
            });

            await supabase
                .from('order_sessions')
                .update({ participants })
                .eq('id', data.id);
        }

        const localData = {
            sessionId: data.id,
            shareCode: data.share_code,
            businessId: data.business_id,
            isOwner: false
        };
        saveSessionLocally(localData);

        return { success: true, session: data };
    } catch (e) {
        console.error('[Session] Failed to join session:', e);
        return { success: false, error: e.message };
    }
}

export async function getSession(sessionId) {
    try {
        const { data, error } = await supabase
            .from('order_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;
        return { success: true, session: data };
    } catch (e) {
        console.error('[Session] Failed to get session:', e);
        return { success: false, error: e.message };
    }
}

export async function updateSessionItems(sessionId, items) {
    try {
        const { error } = await supabase
            .from('order_sessions')
            .update({ items, updated_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('[Session] Failed to update session items:', e);
        return { success: false, error: e.message };
    }
}

export async function addItemToSession(sessionId, item) {
    try {
        const { data, error } = await supabase
            .from('order_sessions')
            .select('items')
            .eq('id', sessionId)
            .single();

        if (error) throw error;

        const items = data.items || [];
        items.push(item);

        const { error: updateError } = await supabase
            .from('order_sessions')
            .update({ items, updated_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (updateError) throw updateError;
        return { success: true };
    } catch (e) {
        console.error('[Session] Failed to add item:', e);
        return { success: false, error: e.message };
    }
}

export async function endSession(sessionId) {
    try {
        const { error } = await supabase
            .from('order_sessions')
            .update({ status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;

        clearLocalSession();
        return { success: true };
    } catch (e) {
        console.error('[Session] Failed to end session:', e);
        return { success: false, error: e.message };
    }
}

export async function subscribeToSession(sessionId, callback) {
    const channel = supabase
        .channel(`session:${sessionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'order_sessions',
                filter: `id=eq.${sessionId}`
            },
            (payload) => callback(payload)
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}