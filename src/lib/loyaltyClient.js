/**
 * FoodSpot Loyalty Client
 * Item-tier rewards: earn 50pts per qualifying order, 100pts = 1 free item
 * All monetary thresholds in ARS cents (integer).
 * Supports both phone-based and localStorage-based (anonymous) tracking.
 */

import { supabase } from './supabaseClient.js'

// ─── ANONYMOUS CUSTOMER ID ────────────────────────────────────────
// For unidentified customers, use localStorage UUID as "phone"

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
    // Try phone first (identified customer), fallback to anonymous ID
    const phone = localStorage.getItem(`fs_loyalty_phone_${businessId}`)
        || localStorage.getItem('fs_customer_phone')
    if (phone) return phone.replace(/\s/g, '')
    return getOrCreateAnonymousId(businessId)
}

// ─── SETTINGS ──────────────────────────────────────────────────────

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

// ─── FREE ITEMS ─────────────────────────────────────────────────────

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
    // Delete existing, reinsert (max 3)
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

// ─── BALANCE ────────────────────────────────────────────────────────

export async function getLoyaltyBalance(phone, businessId) {
    if (!phone || !businessId) return { data: null, error: null }
    const { data, error } = await supabase
        .from('loyalty_accounts')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_phone', phone.replace(/\s/g, ''))
        .maybeSingle()
    return { data, error }
}

export async function getLoyaltyTransactions(phone, businessId) {
    if (!phone || !businessId) return { data: [], error: null }
    const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_phone', phone.replace(/\s/g, ''))
        .order('created_at', { ascending: false })
        .limit(20)
    return { data: data || [], error }
}

// ─── EARN ────────────────────────────────────────────────────────────

export async function earnPoints(phone, businessId, orderId, orderSubtotalCents) {
    if (!businessId) return { earned: false }
    const identifier = phone ? phone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!identifier) return { earned: false }

    // Get settings to check threshold
    const { data: settings } = await getLoyaltySettings(businessId)
    if (!settings?.enabled) return { earned: false }

    const minCents = settings.min_order_cents ?? 800000 // 8000 ARS default
    const pointsPerOrder = settings.points_per_order ?? 50

    if (orderSubtotalCents < minCents) return { earned: false }

    // Upsert loyalty_account
    const { data: account } = await supabase
        .from('loyalty_accounts')
        .upsert(
            { business_id: businessId, customer_phone: identifier, points_balance: 0 },
            { onConflict: 'business_id,customer_phone', ignoreDuplicates: true }
        )
        .select()
        .maybeSingle()

    // Increment balance
    await supabase.rpc('increment_loyalty_points', {
        p_business_id: businessId,
        p_phone: identifier,
        p_delta: pointsPerOrder,
    })

    // Log transaction
    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: identifier,
        order_id: orderId,
        type: 'earn',
        points_delta: pointsPerOrder,
    })

    return { earned: true, points: pointsPerOrder }
}

// ─── EARN UGC (camera share) ─────────────────────────────────────────

export async function earnUGCPoints(phone, businessId) {
    if (!businessId) return { earned: false }
    const identifier = phone ? phone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!identifier) return { earned: false }

    // 24h cooldown per device — one UGC award per day
    const cooldownKey = `fs_ugc_${businessId}_${new Date().toISOString().slice(0, 10)}`
    if (localStorage.getItem(cooldownKey)) return { earned: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    if (!settings?.enabled) return { earned: false }

    const pts = settings.ugc_points_per_share ?? 10
    if (pts <= 0) return { earned: false }

    // Upsert account first — same as order trigger, prevents RPC fail on new identifier
    await supabase
        .from('loyalty_accounts')
        .upsert(
            { business_id: businessId, customer_phone: identifier, points_balance: 0 },
            { onConflict: 'business_id,customer_phone', ignoreDuplicates: true }
        )

    const { error: rpcError } = await supabase.rpc('increment_loyalty_points', {
        p_business_id: businessId,
        p_phone: identifier,
        p_delta: pts,
    })

    if (rpcError) return { earned: false }

    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: identifier,
        order_id: null,
        type: 'ugc_receipt',
        points_delta: pts,
    })

    localStorage.setItem(cooldownKey, '1')
    return { earned: true, points: pts }
}

// ─── REFERRAL AWARD ──────────────────────────────────────────────────

export async function awardReferralPoints(referrerPhone, refereePhone, businessId, orderId) {
    if (!businessId) return { awarded: false }
    const cleanReferrer = referrerPhone ? referrerPhone.replace(/\s/g, '') : null
    const cleanReferee = refereePhone ? refereePhone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!cleanReferrer || !cleanReferee || cleanReferrer === cleanReferee) return { awarded: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    if (!settings?.enabled) return { awarded: false }

    const pts = settings.referral_points ?? 100
    if (pts <= 0) return { awarded: false }

    // Insert claim — UNIQUE(business_id, referee_phone) blocks double award
    const { error: claimError } = await supabase
        .from('loyalty_referral_claims')
        .insert({
            business_id: businessId,
            referrer_phone: cleanReferrer,
            referee_phone: cleanReferee,
            order_id: orderId || null,
        })

    if (claimError) return { awarded: false } // unique_violation = already claimed

    // Award points to the referrer
    await supabase.rpc('increment_loyalty_points', {
        p_business_id: businessId,
        p_phone: cleanReferrer,
        p_delta: pts,
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

// ─── REDEEM ──────────────────────────────────────────────────────────

export async function redeemPoints(phone, businessId, orderId) {
    if (!businessId) return { redeemed: false }
    const identifier = phone ? phone.replace(/\s/g, '') : getCustomerIdentifier(businessId)
    if (!identifier) return { redeemed: false }

    const { data: settings } = await getLoyaltySettings(businessId)
    const pointsNeeded = settings?.points_to_redeem ?? 100

    // Check balance
    const { data: account } = await getLoyaltyBalance(identifier, businessId)
    if (!account || account.points_balance < pointsNeeded) return { redeemed: false }

    // Deduct balance
    await supabase.rpc('increment_loyalty_points', {
        p_business_id: businessId,
        p_phone: identifier,
        p_delta: -pointsNeeded,
    })

    // Log transaction
    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: identifier,
        order_id: orderId,
        type: 'redeem',
        points_delta: -pointsNeeded,
    })

    return { redeemed: true, points: pointsNeeded }
}
