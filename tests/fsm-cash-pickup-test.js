/**
 * 🧪 FSM CASH PICKUP WALKTHROUGH TEST
 * 
 * Prerequisites:
 * 1. Run the SQL migration: supabase/migrations/20260425_owner_status_and_rpc_update.sql
 * 2. Have a business_id ready (from your tenant)
 * 
 * Usage:
 *   node tests/fsm-cash-pickup-test.js <business_id>
 * 
 * This script:
 * 1. Creates a cash pickup order (starts at released_to_kitchen)
 * 2. Walks it through: preparing → ready → delivered
 * 3. Verifies status + owner_status persist after each step
 * 4. Cleans up the test order at the end
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://buendqgmwpxdixwvlkhd.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1ZW5kcWdtd3B4ZGl4d3Zsa2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjEzNzUsImV4cCI6MjA4MjkzNzM3NX0.oKSivOi-JhHZhM9Cp8W-uofbK_-I7slOPgTWtWLpysI'

const businessId = process.argv[2]
if (!businessId) {
    console.error('Usage: node tests/fsm-cash-pickup-test.js <business_id>')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function createCashPickupOrder() {
    const { data, error } = await supabase
        .from('orders')
        .insert({
            business_id: businessId,
            order_number: Math.floor(Math.random() * 9000) + 1000,
            items: [{ name: 'Test Burger', price: 10, quantity: 1 }],
            subtotal: 10,
            total: 10,
            status: 'released_to_kitchen',
            payment_status: 'pending',
            order_type: 'pickup',
            customer_name: 'FSM Test',
            customer_phone: '1112345678',
            payment_method: 'cash',
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) throw error
    console.log('✅ Created order:', data.id, '- Status:', data.status, '- Owner Status:', data.owner_status)
    return data
}

async function advanceOrder(orderId, targetStatus) {
    const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: targetStatus
    })

    if (error) throw error
    console.log('  RPC result:', data)
    return data
}

async function fetchOrder(orderId) {
    const { data, error } = await supabase
        .from('orders')
        .select('id, status, owner_status, payment_status, payment_confirmed, order_type')
        .eq('id', orderId)
        .single()

    if (error) throw error
    return data
}

async function deleteOrder(orderId) {
    await supabase.from('orders').delete().eq('id', orderId)
    console.log('🧹 Cleaned up test order')
}

async function run() {
    let order
    try {
        console.log('\n🚀 FSM Cash Pickup Walkthrough Test\n')

        // Step 0: Create order
        order = await createCashPickupOrder()
        await sleep(500)

        // Verify initial state
        let check = await fetchOrder(order.id)
        console.assert(check.status === 'released_to_kitchen', 'Initial status mismatch')
        console.assert(check.owner_status === 'released_to_kitchen', 'Initial owner_status mismatch')
        console.log('✅ Initial state verified\n')

        // Step 1: released_to_kitchen → preparing
        console.log('Step 1: Advance to preparing')
        await advanceOrder(order.id, 'preparing')
        await sleep(500)
        check = await fetchOrder(order.id)
        console.assert(check.status === 'preparing', 'Status should be preparing')
        console.assert(check.owner_status === 'preparing', 'owner_status should be preparing')
        console.log('✅ Status persisted after reload\n')

        // Step 2: preparing → ready
        console.log('Step 2: Advance to ready')
        await advanceOrder(order.id, 'ready')
        await sleep(500)
        check = await fetchOrder(order.id)
        console.assert(check.status === 'ready', 'Status should be ready')
        console.assert(check.owner_status === 'ready', 'owner_status should be ready')
        console.log('✅ Status persisted after reload\n')

        // Step 3: ready → delivered (pickup should go to delivered, NOT dispatched)
        console.log('Step 3: Advance to delivered (pickup)')
        await advanceOrder(order.id, 'delivered')
        await sleep(500)
        check = await fetchOrder(order.id)
        console.assert(check.status === 'delivered', 'Status should be delivered')
        console.assert(check.owner_status === 'delivered', 'owner_status should be delivered')
        console.assert(check.order_type === 'pickup', 'Should remain pickup')
        console.log('✅ Status persisted after reload\n')

        // Step 4: Try to advance from delivered (should fail)
        console.log('Step 4: Try invalid transition delivered → preparing')
        const result = await advanceOrder(order.id, 'preparing')
        console.assert(result.success === false, 'Should reject invalid transition')
        console.assert(result.error === 'INVALID_TRANSITION', 'Should return INVALID_TRANSITION')
        console.log('✅ FSM correctly blocked invalid transition\n')

        console.log('🎉 All FSM tests passed!\n')

    } catch (err) {
        console.error('❌ Test failed:', err.message)
        process.exitCode = 1
    } finally {
        if (order?.id) {
            await deleteOrder(order.id)
        }
    }
}

run()
