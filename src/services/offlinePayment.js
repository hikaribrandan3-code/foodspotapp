// ============================================
// 📴 OFFLINE PAYMENT SERVICE - Shadow DB Layer
// ============================================
// Handles cash payments when app is offline
// Stores to LocalStorage, syncs when connection returns
// ============================================

import { supabase } from '../lib/supabaseClient.js'

const OFFLINE_PAYMENTS_KEY = 'fs_offline_payments_queue'
const SYNC_STATUS_KEY = 'fs_sync_status'

/**
 * Check if app is online
 */
export function isOnline() {
    return navigator.onLine
}

/**
 * Get offline payment queue
 */
export function getOfflinePaymentQueue() {
    try {
        const queue = localStorage.getItem(OFFLINE_PAYMENTS_KEY)
        return queue ? JSON.parse(queue) : []
    } catch (e) {
        console.error('[OfflinePayment] Error reading queue:', e)
        return []
    }
}

/**
 * Save offline payment queue
 */
function saveOfflineQueue(queue) {
    try {
        localStorage.setItem(OFFLINE_PAYMENTS_KEY, JSON.stringify(queue))
    } catch (e) {
        console.error('[OfflinePayment] Error saving queue:', e)
    }
}

/**
 * Add cash payment to offline queue
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.order_id - Order ID
 * @param {number} paymentData.amount_cents - Amount in cents
 * @param {string} paymentData.currency - Currency code
 * @param {string} paymentData.business_id - Business ID
 */
export function queueOfflineCashPayment(paymentData) {
    const queue = getOfflinePaymentQueue()
    
    const offlineEntry = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: paymentData.order_id,
        business_id: paymentData.business_id,
        transaction_type: 'payment',
        status: 'pending_sync',
        amount_gross_cents: paymentData.amount_cents,
        currency: paymentData.currency || 'ARS',
        payment_method: 'cash',
        external_reference: `CASH-${paymentData.order_id}`,
        created_at: new Date().toISOString(),
        synced_at: null,
        sync_attempts: 0,
        error: null
    }
    
    queue.push(offlineEntry)
    saveOfflineQueue(queue)
    
    console.log('[OfflinePayment] 💵 Cash payment queued:', offlineEntry.id)
    return offlineEntry
}

/**
 * Sync a single offline payment to Supabase
 */
async function syncOfflinePayment(payment) {
    try {
        // Create ledger entry
        const { data: ledgerData, error: ledgerError } = await supabase
            .from('transaction_ledger')
            .insert({
                order_id: payment.order_id,
                business_id: payment.business_id,
                transaction_type: 'payment',
                status: 'completed',
                amount_gross_cents: payment.amount_gross_cents,
                currency: payment.currency,
                payment_method: 'cash',
                external_reference: payment.external_reference,
                processed_at: new Date().toISOString(),
                offline_sync: true
            })
            .select()
            .single()
        
        if (ledgerError) throw ledgerError
        
        // Update order status
        const { error: orderError } = await supabase
            .from('orders')
            .update({
                status: 'released_to_kitchen',
                payment_status: 'paid',
                payment_method: 'cash',
                payment_confirmed: true,
                paid_at: new Date().toISOString()
            })
            .eq('id', payment.order_id)
        
        if (orderError) throw orderError
        
        console.log('[OfflinePayment] ✅ Synced:', payment.id, 'Ledger:', ledgerData.id)
        return { success: true, ledgerId: ledgerData.id }
        
    } catch (error) {
        console.error('[OfflinePayment] ❌ Sync failed:', payment.id, error.message)
        return { success: false, error: error.message }
    }
}

/**
 * Process the offline queue
 * Attempts to sync all pending payments
 */
export async function processOfflineQueue() {
    if (!isOnline()) {
        console.log('[OfflinePayment] 📴 Still offline, skipping sync')
        return { processed: 0, failed: 0, remaining: getOfflinePaymentQueue().length }
    }
    
    const queue = getOfflinePaymentQueue()
    const pending = queue.filter(p => p.status === 'pending_sync' && p.sync_attempts < 5)
    
    if (pending.length === 0) {
        return { processed: 0, failed: 0, remaining: 0 }
    }
    
    console.log(`[OfflinePayment] 🔄 Processing ${pending.length} offline payments...`)
    
    let processed = 0
    let failed = 0
    
    for (const payment of pending) {
        payment.sync_attempts++
        
        const result = await syncOfflinePayment(payment)
        
        if (result.success) {
            payment.status = 'synced'
            payment.synced_at = new Date().toISOString()
            processed++
        } else {
            payment.error = result.error
            if (payment.sync_attempts >= 5) {
                payment.status = 'failed'
            }
            failed++
        }
    }
    
    // Remove synced entries, keep failed for investigation
    const remaining = queue.filter(p => p.status !== 'synced')
    saveOfflineQueue(remaining)
    
    // Update sync status
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
        last_sync: new Date().toISOString(),
        processed,
        failed,
        remaining: remaining.length
    }))
    
    console.log(`[OfflinePayment] ✅ Sync complete: ${processed} processed, ${failed} failed, ${remaining.length} remaining`)
    
    return { processed, failed, remaining: remaining.length }
}

/**
 * Get sync status
 */
export function getSyncStatus() {
    try {
        const status = localStorage.getItem(SYNC_STATUS_KEY)
        return status ? JSON.parse(status) : null
    } catch (e) {
        return null
    }
}

/**
 * Initialize offline payment service
 * Sets up online/offline listeners
 */
export function initOfflinePaymentService() {
    // Listen for online event
    window.addEventListener('online', () => {
        console.log('[OfflinePayment] 🌐 Back online! Triggering sync...')
        processOfflineQueue()
    })
    
    // Listen for offline event
    window.addEventListener('offline', () => {
        console.log('[OfflinePayment] 📴 Gone offline')
    })
    
    // Initial sync attempt
    if (isOnline()) {
        processOfflineQueue()
    }
    
    // Periodic sync check (every 30 seconds)
    setInterval(() => {
        if (isOnline() && getOfflinePaymentQueue().length > 0) {
            processOfflineQueue()
        }
    }, 30000)
    
    console.log('[OfflinePayment] ✅ Service initialized')
}

/**
 * Handle cash payment with offline resilience
 * This is the main function to call from Order.jsx
 * 
 * @param {Object} params
 * @param {string} params.orderId - Order ID
 * @param {number} params.amountCents - Amount in cents
 * @param {string} params.businessId - Business ID
 * @param {string} params.currency - Currency code (default: ARS)
 * @returns {Promise<{success: boolean, method: 'online'|'offline', data?: any, error?: string}>}
 */
export async function handleCashPayment({ orderId, amountCents, businessId, currency = 'ARS' }) {
    const paymentData = {
        order_id: orderId,
        amount_cents: amountCents,
        business_id: businessId,
        currency
    }
    
    if (isOnline()) {
        // Try online first
        try {
            const result = await syncOfflinePayment({
                ...paymentData,
                amount_gross_cents: amountCents,
                external_reference: `CASH-${orderId}`
            })
            
            if (result.success) {
                return {
                    success: true,
                    method: 'online',
                    data: { ledgerId: result.ledgerId }
                }
            }
            throw new Error(result.error)
            
        } catch (error) {
            // Online failed, fall back to offline queue
            console.warn('[OfflinePayment] Online payment failed, queueing:', error.message)
            const offlineEntry = queueOfflineCashPayment(paymentData)
            return {
                success: true,
                method: 'offline',
                data: { offlineId: offlineEntry.id, message: 'Payment queued for sync' }
            }
        }
    } else {
        // Offline mode - queue it
        const offlineEntry = queueOfflineCashPayment(paymentData)
        return {
            success: true,
            method: 'offline',
            data: { offlineId: offlineEntry.id, message: 'Offline mode - payment will sync when online' }
        }
    }
}

export default {
    isOnline,
    getOfflinePaymentQueue,
    queueOfflineCashPayment,
    processOfflineQueue,
    getSyncStatus,
    initOfflinePaymentService,
    handleCashPayment
}
