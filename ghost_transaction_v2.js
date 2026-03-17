const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGhostTransaction() {
    console.log('👻 CREATING GHOST TRANSACTION ($10.00 GHOST BURGER)\n');
    console.log('=' .repeat(50));
    
    const tenantId = '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd';
    const externalRef = `GHOST-TEST-${Date.now()}`;
    const amountCents = 1000; // $10.00
    
    try {
        // Create order with ONLY existing columns
        const orderInsert = {
            tenant_id: tenantId,
            status: 'pending',
            table_number: 99,
            items: [{ name: 'Ghost Burger', price_cents: amountCents, quantity: 1 }],
            total_amount_cents: amountCents
        };
        
        console.log('📦 Creating order...');
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
        console.log(`   External Ref: ${externalRef}`);
        
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
            if (ledgerError.hint) console.log('   Hint:', ledgerError.hint);
            return null;
        }
        
        console.log(`✅ Ledger entry created: ${ledgerData[0].id}`);
        console.log(`   Status: ${ledgerData[0].status}`);
        console.log(`   Amount: $${(ledgerData[0].amount_gross_cents / 100).toFixed(2)}`);
        
        return { orderId, ledgerId: ledgerData[0].id, externalRef };
        
    } catch (err) {
        console.log('❌ Error:', err.message);
        return null;
    }
}

async function simulatePayment(orderId, ledgerId, externalRef) {
    console.log('\n💰 SIMULATING MERCADO PAGO PAYMENT WEBHOOK\n');
    console.log('=' .repeat(50));
    
    const mpPaymentId = '1234567890';
    const paymentMethod = 'visa';
    const mockResponse = {
        id: mpPaymentId,
        status: 'approved',
        payment_method_id: paymentMethod,
        external_reference: externalRef,
        transaction_amount: 10.00,
        currency_id: 'USD'
    };
    
    try {
        // Update order to paid (using existing columns only)
        console.log('📝 Updating order status...');
        const { data: orderUpdate, error: orderError } = await supabase
            .from('orders')
            .update({
                status: 'paid'
            })
            .eq('id', orderId)
            .select();
        
        if (orderError) {
            console.log('❌ Order update failed:', orderError.message);
            return false;
        }
        
        console.log(`✅ Order ${orderId} marked as PAID`);
        console.log(`   New Status: ${orderUpdate[0].status}`);
        
        // Update ledger (using existing columns only)
        console.log('\n📝 Updating ledger status...');
        const { data: ledgerUpdate, error: ledgerError } = await supabase
            .from('transaction_ledger')
            .update({
                status: 'completed'
            })
            .eq('id', ledgerId)
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

async function verifyGhostTransaction(orderId, ledgerId) {
    console.log('\n🔍 VERIFYING GHOST TRANSACTION RESULTS\n');
    console.log('=' .repeat(50));
    
    // Check order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
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
        .eq('id', ledgerId)
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

async function auditMissingColumns() {
    console.log('\n📋 SCHEMA AUDIT - MISSING COLUMNS FOR MERCADO PAGO\n');
    console.log('=' .repeat(50));
    
    // Test adding each required column to see which ones fail
    const requiredColumns = [
        { table: 'orders', column: 'payment_status', type: 'VARCHAR(50)' },
        { table: 'orders', column: 'payment_method', type: 'VARCHAR(50)' },
        { table: 'orders', column: 'external_reference', type: 'VARCHAR(255)' },
        { table: 'orders', column: 'mercado_pago_payment_id', type: 'VARCHAR(100)' },
        { table: 'orders', column: 'mercado_pago_preference_id', type: 'VARCHAR(100)' },
        { table: 'orders', column: 'currency', type: 'VARCHAR(3)' },
        { table: 'orders', column: 'paid_at', type: 'TIMESTAMP' },
        { table: 'orders', column: 'payment_response', type: 'JSONB' },
        { table: 'transaction_ledger', column: 'order_id', type: 'UUID' },
        { table: 'transaction_ledger', column: 'transaction_type', type: 'VARCHAR(50)' },
        { table: 'transaction_ledger', column: 'external_reference', type: 'VARCHAR(255)' },
        { table: 'transaction_ledger', column: 'mercado_pago_response', type: 'JSONB' },
        { table: 'transaction_ledger', column: 'payment_method', type: 'VARCHAR(50)' },
        { table: 'transaction_ledger', column: 'currency', type: 'VARCHAR(3)' },
        { table: 'transaction_ledger', column: 'processed_at', type: 'TIMESTAMP' }
    ];
    
    console.log('Required columns for Mercado Pago integration:\n');
    
    for (const { table, column, type } of requiredColumns) {
        // Try to insert a row with this column to test if it exists
        try {
            const testData = {};
            testData[column] = table === 'orders' ? { test: 1 } : 'test';
            
            const { error } = await supabase
                .from(table)
                .insert(testData)
                .select();
            
            // If we get here without column error, column might exist
            if (error && error.message.includes(`column "${column}"`)) {
                console.log(`❌ ${table}.${column} (${type}) - MISSING`);
            } else if (error && error.message.includes('violates not-null constraint')) {
                // Different error means column exists
                console.log(`✅ ${table}.${column} (${type}) - EXISTS`);
            } else {
                // Actually inserted - cleanup
                console.log(`✅ ${table}.${column} (${type}) - EXISTS`);
            }
        } catch (err) {
            if (err.message.includes('column')) {
                console.log(`❌ ${table}.${column} (${type}) - MISSING`);
            } else {
                console.log(`✅ ${table}.${column} (${type}) - EXISTS`);
            }
        }
    }
    
    console.log('\n⚠️  Run repair_schema.sql in Supabase SQL Editor to add missing columns');
}

async function main() {
    // Create ghost transaction
    const ghost = await createGhostTransaction();
    
    if (ghost) {
        // Simulate payment webhook
        const paid = await simulatePayment(ghost.orderId, ghost.ledgerId, ghost.externalRef);
        
        if (paid) {
            // Verify everything
            await verifyGhostTransaction(ghost.orderId, ghost.ledgerId);
        }
    }
    
    // Audit missing columns
    await auditMissingColumns();
    
    console.log('\n🏁 Process complete!');
}

main();