/**
 * FoodSpot Loyalty Client — Universal Points
 * Points are tied to customer_phone globally across all locations.
 * loyalty_settings & loyalty_free_items remain per-location (each location configures its own rates/rewards).
 * loyalty_transactions keeps business_id for audit (which location earned/spent points).
 * Anonymous customers (no phone) earn local-only points via anon ID — expected behavior.
 */

import { supabase } from './supabaseClient.js'

// ─── CUSTOMER IDENTIFIER ──────────────────────────────────────────────────────
// Phone-identified customers get a global balance across all locations.
// Anonymous customers fall back to a per-location anon ID (points don't transfer — intentional).

export function getOrCreateAnonymousId(businessId) {
    if (!businessId) return null
    const key = `fs_anon_customer_${businessId}`
    let id = localStorage.getItem(key)
    if (!id) {
        id = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem(key, id)
    }
    return id
}

export function getCustomerIdentifier(businessId) {
    const phone = localStorage.getItem(`fs_loyalty_phone_${businessId}`)
        || localStorage.getItem('fs_customer_phone')
    if (phone) return phone.replace(/\s/g, '')
    return getOrCreateAnonymousId(businessId)
}

// ─── SETTINGS (per-location) ──────────────────────────────────────────────────

export async function getLoyaltySettings(businessId) {
    if (!businessId) return { data: null, error: null }
    const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle()
    return { data, error }
}

export async function upsertLoyaltySettings(settings, businessId) {
    if (!businessId) return { data: null, error: new Error('Missing business ID') }
    const { data, error } = await supabase
        .from('loyalty_settings')
        .upsert(
            { ...settings, business_id: businessId, updated_at: new Date().toISOString() },
            { onConflict: 'business_id' }
        )
        .select()
        .maybeSingle()
    return { data, error }
}

// ─── FREE ITEMS (per-location) ────────────────────────────────────────────────

export async function getLoyaltyFreeItems(businessId) {
    if (!businessId) return { data: [], error: null }
    const { data, error } = await supabase
        .from('loyalty_free_items')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order')
    return { data: data || [], error }
}

export async function saveLoyaltyFreeItems(items, businessId) {
    if (!businessId) return { error: new Error('Missing business ID') }
    await supabase.from('loyalty_free_items').delete().eq('business_id', businessId)
    if (!items.length) return { error: null }
    const rows = items.slice(0, 3).map((item, i) => ({
        business_id: businessId,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        sort_order: i,
    }))
    const { error } = await supabase.from('loyalty_free_items').insert(rows)
    return { error }
}

// ─── BALANCE (global — phone only) ───────────────────────────────────────────

export async function getLoyaltyBalance(phone) {
    if (!phone) return { data: null, error: null }
    const { data, error } = await supabase
        .from('loyalty_accounts')
        .select('*')
        .eq('customer_phone', phone.replace(/\s/g, ''))
        .maybeSingle()
    return { data, error }
}

// Returns all transactions across locations — pass businessId to filter to one location
export async function getLoyaltyTransactions(phone, businessId = null) {
    if (!phone) return { data: [], error: null }
    let query = supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_phone', phone.replace(/\s/g, ''))
        .order('created_at', { ascending: false })
        .limit(30)
    if (businessId) query = query.eq('business_id', businessId)
    const { data, error } = await query
    return { data: data || [], error }
}

// ─── EARN (per-order) ────────────────────────────────────────────────────────

export async function earnPoints(phone, businessId, orderId, orderSubtotalCents) {
    if (!businessId) return { earned: false }
    const identifier = phone ? phone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!identifier) return { earned: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    if (!settings?.enabled) return { earned: false }

    const minCents = settings.min_order_cents ?? 800000
    const pointsPerOrder = settings.points_per_order ?? 50

    if (orderSubtotalCents < minCents) return { earned: false }

    // Ensure global account exists
    await supabase
        .from('loyalty_accounts')
        .upsert(
            { customer_phone: identifier, points_balance: 0 },
            { onConflict: 'customer_phone', ignoreDuplicates: true }
        )

    const { error: rpcError } = await supabase.rpc('increment_loyalty_points', {
        p_phone: identifier,
        p_delta: pointsPerOrder,
        p_business_id: businessId,
    })
    if (rpcError) return { earned: false }

    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: identifier,
        order_id: orderId,
        type: 'earn',
        points_delta: pointsPerOrder,
    })

    return { earned: true, points: pointsPerOrder }
}

// ─── EARN UGC (camera share) ─────────────────────────────────────────────────

export async function earnUGCPoints(phone, businessId) {
    if (!businessId) return { earned: false }
    const identifier = phone ? phone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!identifier) return { earned: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    if (!settings?.enabled) return { earned: false }

    const pts = settings.ugc_points_per_share ?? 10
    if (pts <= 0) return { earned: false }

    // One UGC award per order — deduplicate against most recent order at this location
    const { data: lastOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('business_id', businessId)
        .eq('customer_phone', identifier)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (lastOrder?.id) {
        const { data: alreadyEarned } = await supabase
            .from('loyalty_transactions')
            .select('id')
            .eq('business_id', businessId)
            .eq('customer_phone', identifier)
            .eq('order_id', lastOrder.id)
            .eq('type', 'ugc_receipt')
            .maybeSingle()
        if (alreadyEarned) return { earned: false }
    }

    await supabase
        .from('loyalty_accounts')
        .upsert(
            { customer_phone: identifier, points_balance: 0 },
            { onConflict: 'customer_phone', ignoreDuplicates: true }
        )

    const { error: rpcError } = await supabase.rpc('increment_loyalty_points', {
        p_phone: identifier,
        p_delta: pts,
        p_business_id: businessId,
    })
    if (rpcError) {
        console.error('[earnUGC] RPC error:', rpcError)
        return { earned: false }
    }

    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: identifier,
        order_id: lastOrder?.id || null,
        type: 'ugc_receipt',
        points_delta: pts,
    })

    return { earned: true, points: pts }
}

// ─── REFERRAL AWARD ──────────────────────────────────────────────────────────
// Referral claims are now global per referee phone — a customer can only be referred once
// across all locations in the group.

export async function awardReferralPoints(referrerPhone, refereePhone, businessId, orderId) {
    if (!businessId) return { awarded: false }
    const cleanReferrer = referrerPhone ? referrerPhone.replace(/\s/g, '') : null
    const cleanReferee = refereePhone ? refereePhone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!cleanReferrer || !cleanReferee || cleanReferrer === cleanReferee) return { awarded: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    if (!settings?.enabled) return { awarded: false }

    const pts = settings.referral_points ?? 100
    if (pts <= 0) return { awarded: false }

    // UNIQUE(referee_phone) — blocks double award globally across all locations
    const { error: claimError } = await supabase
        .from('loyalty_referral_claims')
        .insert({
            business_id: businessId,
            referrer_phone: cleanReferrer,
            referee_phone: cleanReferee,
            order_id: orderId || null,
        })

    if (claimError) return { awarded: false }

    await supabase.rpc('increment_loyalty_points', {
        p_phone: cleanReferrer,
        p_delta: pts,
        p_business_id: businessId,
    })

    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: cleanReferrer,
        order_id: orderId || null,
        type: 'referral',
        points_delta: pts,
    })

    return { awarded: true, points: pts }
}

// ─── REDEEM ───────────────────────────────────────────────────────────────────

export async function redeemPoints(phone, businessId, orderId) {
    if (!businessId) return { redeemed: false }
    const identifier = phone ? phone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!identifier) return { redeemed: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    const pointsNeeded = settings?.points_to_redeem ?? 100

    // Check global balance
    const { data: account } = await getLoyaltyBalance(identifier)
    if (!account || account.points_balance < pointsNeeded) return { redeemed: false }

    const { error: rpcError } = await supabase.rpc('increment_loyalty_points', {
        p_phone: identifier,
        p_delta: -pointsNeeded,
        p_business_id: businessId,
    })
    if (rpcError) return { redeemed: false }

    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: identifier,
        order_id: orderId,
        type: 'redeem',
        points_delta: -pointsNeeded,
    })

    return { redeemed: true, points: pointsNeeded }
}
