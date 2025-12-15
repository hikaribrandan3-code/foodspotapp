// Archive utilities for FoodSpot
// Prepares frontend structure for monthly order archiving

import { getOrders, saveOrders } from './storage.js'

/**
 * Archive current orders to remote storage (MOCK - NOT YET CONNECTED)
 * 
 * This function:
 * 1. Collects current orders from localStorage
 * 2. Builds a payload with venueId, month, and orders
 * 3. Sends to backend (currently mocked)
 * 4. Clears local orders only on success
 * 
 * @param {string} venueId - The venue identifier
 * @returns {Promise<{success: boolean, archivedCount?: number, error?: string}>}
 */
export async function archiveOrders(venueId = 'venue_default') {
    const orders = getOrders()

    // Nothing to archive
    if (!orders || orders.length === 0) {
        return { success: true, message: 'No orders to archive', archivedCount: 0 }
    }

    // Build archive payload
    const month = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const payload = {
        venueId,
        month,
        orders,
        archivedAt: new Date().toISOString(),
        orderCount: orders.length
    }

    try {
        // ============================================
        // FUTURE BACKEND CONNECTION POINT
        // ============================================
        // Replace mockSendToBackend() with actual backend call:
        //
        // Option 1: Supabase Storage
        // const { data, error } = await supabase.storage
        //   .from('order-archives')
        //   .upload(`${venueId}/${month}.json`, JSON.stringify(payload))
        //
        // Option 2: Supabase Edge Function
        // const { data, error } = await supabase.functions
        //   .invoke('archive-orders', { body: payload })
        //
        // Option 3: Direct API call
        // const response = await fetch('/api/archive-orders', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(payload)
        // })
        // ============================================

        const result = await mockSendToBackend(payload)

        if (result.success) {
            // Clear local orders ONLY on successful archive
            clearLocalOrders()
            console.log(`[Archive] Successfully archived ${orders.length} orders for ${month}`)
        }

        return result

    } catch (error) {
        // On failure, DO NOT clear local orders
        console.error('[Archive] Failed to archive orders:', error)
        return { success: false, error: error.message || 'Archive failed' }
    }
}

/**
 * MOCK: Simulates sending to backend
 * Replace this with actual backend integration later
 */
async function mockSendToBackend(payload) {
    // Simulate network delay (300-700ms)
    const delay = 300 + Math.random() * 400
    await new Promise(resolve => setTimeout(resolve, delay))

    // Log payload for debugging
    console.log('[MOCK] Archive payload:', {
        venueId: payload.venueId,
        month: payload.month,
        orderCount: payload.orderCount,
        archivedAt: payload.archivedAt
    })

    // ============================================
    // MOCK BEHAVIOR CONFIGURATION
    // Set SIMULATE_FAILURE = true to test failure handling
    // ============================================
    const SIMULATE_FAILURE = false

    if (SIMULATE_FAILURE) {
        return { success: false, error: 'Simulated network error' }
    }

    return {
        success: true,
        archivedCount: payload.orders.length,
        archiveId: `archive_${Date.now()}`
    }
}

/**
 * Clear local orders after successful archive
 */
function clearLocalOrders() {
    saveOrders([])
}

/**
 * Get archive status for current month
 * (Stub for future implementation)
 */
export function getArchiveStatus(venueId) {
    // ============================================
    // FUTURE: Check backend for archive status
    // For now, return local state only
    // ============================================
    const orders = getOrders()
    return {
        pendingOrders: orders.length,
        lastArchive: null // Will come from backend
    }
}
