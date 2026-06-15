/**
 * FoodSpot Loyalty Client
 * Item-tier rewards: earn 50pts per qualifying order, 100pts = 1 free item
 * All monetary thresholds in ARS cents (integer).
 */

import { supabase } from './supabaseClient.js'

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
    if (!phone || !businessId) return { earned: false }

    const cleanPhone = phone.replace(/\s/g, '')

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
            { business_id: businessId, customer_phone: cleanPhone, points_balance: 0 },
            { onConflict: 'business_id,customer_phone', ignoreDuplicates: true }
        )
        .select()
        .maybeSingle()

    // Increment balance
    await supabase.rpc('increment_loyalty_points', {
        p_business_id: businessId,
        p_phone: cleanPhone,
        p_delta: pointsPerOrder,
    })

    // Log transaction
    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: cleanPhone,
        order_id: orderId,
        type: 'earn',
        points_delta: pointsPerOrder,
    })

    return { earned: true, points: pointsPerOrder }
}

// ─── REDEEM ──────────────────────────────────────────────────────────

export async function redeemPoints(phone, businessId, orderId) {
    if (!phone || !businessId) return { redeemed: false }

    const cleanPhone = phone.replace(/\s/g, '')

    const { data: settings } = await getLoyaltySettings(businessId)
    const pointsNeeded = settings?.points_to_redeem ?? 100

    // Check balance
    const { data: account } = await getLoyaltyBalance(cleanPhone, businessId)
    if (!account || account.points_balance < pointsNeeded) return { redeemed: false }

    // Deduct balance
    await supabase.rpc('increment_loyalty_points', {
        p_business_id: businessId,
        p_phone: cleanPhone,
        p_delta: -pointsNeeded,
    })

    // Log transaction
    await supabase.from('loyalty_transactions').insert({
        business_id: businessId,
        customer_phone: cleanPhone,
        order_id: orderId,
        type: 'redeem',
        points_delta: -pointsNeeded,
    })

    return { redeemed: true, points: pointsNeeded }
}
