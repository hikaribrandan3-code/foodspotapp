const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGhostTransaction() {
    console.log('👻 CREATING GHOST TRANSACTION ($10.00 GHOST BURGER)\n');
    console.log('=' .repeat(50));
    
    const externalRef = `GHOST-${Date.now()}`;
    const amountCents = 1000; // $10.00
    
    try {
        // Create order with MINIMUM required columns from schema analysis
        // From error: columns are: id, [4 nulls], status, [8 nulls], items, [3 nulls], 
        // total_amount_cents, [2 values], [3 nulls], table_number, [3 values]
        const orderInsert = {
            items: { name: 'Ghost Burger', price_cents: amountCents, quantity: 1 },
            total_amount_cents: amountCents,
            table_number: 99
        };
        
        console.log('📦 Creating order...');
        console.log('   Payload:', JSON.stringify(orderInsert));
        
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert(orderInsert)
            .select();
        
        if (orderError) {
            console.log('❌ Order creation failed:', orderError.message);
            if (orderError.details) console.log('   Details:', orderError.details);
            if (orderError.hint) console.log('   Hint:', orderError.hint);
            return null;
        }
        
        const orderId = orderData[0].id;
        console.log(`✅ Order created: ${orderId}`);
        console.log(`   Status: ${orderData[0].status}`);
        console.log(`   Amount: $${(orderData[0].total_amount_cents / 100).toFixed(2)}`);
        console.log(`   Table: ${orderData[0].table_number}`);
        
        // Create ledger entry with existing columns
        const ledgerInsert = {
            amount_gross_cents: amountCents,
            status: 'pending'
        };
        
        console.log('\n📒 Creating ledger entry...');
        const { data: ledgerData, error: ledgerError } = await supabase
            .from('transaction_ledger')
            .insert(ledgerInsert)
            .select();
        
        if (ledgerError) {
            console.log('❌ Ledger entry failed:', ledgerError.message);
            if (ledgerError.details) console.log('   Details:', ledgerError.details);
            return null;
        }
        
        const ledgerId = ledgerData[0].id;
        console.log(`✅ Ledger entry created: ${ledgerId}`);
        console.log(`   Status: ${ledgerData[0].status}`);
        console.log(`   Amount: $${(ledgerData[0].amount_gross_cents / 100).toFixed(2)}`);
        
        return { orderId, ledgerId, externalRef, amountCents };
        
    } catch (err) {
        console.log('❌ Error:', err.message);
        return null;
    }
}

async function simulatePayment(ghost) {
    console.log('\n💰 SIMULATING MERCADO PAGO PAYMENT WEBHOOK\n');
    console.log('=' .repeat(50));
    
    try {
        // Update order to paid
        console.log('📝 Updating order status...');
        const { data: orderUpdate, error: orderError } = await supabase
            .from('orders')
            .update({
                status: 'paid'
            })
            .eq('id', ghost.orderId)
            .select();
        
        if (orderError) {
            console.log('❌ Order update failed:', orderError.message);
            return false;
        }
        
        console.log(`✅ Order ${ghost.orderId} marked as PAID`);
        console.log(`   New Status: ${orderUpdate[0].status}`);
        
        // Update ledger
        console.log('\n📝 Updating ledger status...');
        const { data: ledgerUpdate, error: ledgerError } = await supabase
            .from('transaction_ledger')
            .update({
                status: 'completed'
            })
            .eq('id', ghost.ledgerId)
            .select();
        
        if (ledgerError) {
            console.log('❌ Ledger update failed:', ledgerError.message);
            return false;
        }
        
        console.log(`✅ Ledger marked as COMPLETED`);
        console.log(`   New Status: ${ledgerUpdate[0].status}`);
        
        return true;
        
    } catch (err) {
        console.log('❌ Error:', err.message);
        return false;
    }
}

async function verifyGhostTransaction(ghost) {
    console.log('\n🔍 VERIFYING GHOST TRANSACTION RESULTS\n');
    console.log('=' .repeat(50));
    
    // Check order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', ghost.orderId)
        .single();
    
    if (orderError) {
        console.log('❌ Could not fetch order:', orderError.message);
        return false;
    }
    
    console.log('📋 Order Details:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Table: ${order.table_number}`);
    console.log(`   Total: $${(order.total_amount_cents / 100).toFixed(2)}`);
    console.log(`   Items: ${JSON.stringify(order.items)}`);
    
    // Check ledger
    const { data: ledger, error: ledgerError } = await supabase
        .from('transaction_ledger')
        .select('*')
        .eq('id', ghost.ledgerId)
        .single();
    
    if (ledgerError) {
        console.log('\n❌ Could not fetch ledger:', ledgerError.message);
        return false;
    }
    
    console.log('\n📋 Ledger Details:');
    console.log(`   ID: ${ledger.id}`);
    console.log(`   Status: ${ledger.status}`);
    console.log(`   Amount: $${(ledger.amount_gross_cents / 100).toFixed(2)}`);
    console.log(`   Created: ${ledger.created_at}`);
    
    // Final validation
    console.log('\n' + '=' .repeat(50));
    const success = order.status === 'paid' && ledger.status === 'completed';
    
    if (success) {
        console.log('✅ GHOST TRANSACTION SUCCESSFUL!');
        console.log('   Order flipped to paid ✓');
        console.log('   Ledger entry created ✓');
        console.log('   No errors ✓');
    } else {
        console.log('❌ GHOST TRANSACTION FAILED');
        console.log(`   Order status: ${order.status} (expected: paid)`);
        console.log(`   Ledger status: ${ledger.status} (expected: completed)`);
    }
    
    return success;
}

async function main() {
    // Create ghost transaction
    const ghost = await createGhostTransaction();
    
    if (!ghost) {
        console.log('\n❌ Failed to create ghost transaction');
        return;
    }
    
    // Simulate payment webhook
    const paid = await simulatePayment(ghost);
    
    if (!paid) {
        console.log('\n❌ Failed to simulate payment');
        return;
    }
    
    // Verify everything
    const success = await verifyGhostTransaction(ghost);
    
    console.log('\n' + '=' .repeat(50));
    if (success) {
        console.log('🎉 MISSION ACCOMPLISHED - Ghost Transaction Complete!');
    }
}

main();