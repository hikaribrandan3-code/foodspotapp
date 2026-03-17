const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairSchema() {
    console.log('🔧 REPAIRING DATABASE SCHEMA FOR MERCADO PAGO\n');
    console.log('=' .repeat(50));
    
    // We'll use RPC to execute SQL if available, otherwise we'll document what needs to be done
    const sqlCommands = [
        // Orders table modifications
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255)`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS mercado_pago_payment_id VARCHAR(100)`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS mercado_pago_preference_id VARCHAR(100)`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE`,
        `ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_response JSONB`,
        
        // Ledger table modifications
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE`,
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'payment'`,
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255)`,
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS mercado_pago_response JSONB`,
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'`,
        `ALTER TABLE IF EXISTS public.transaction_ledger ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE`
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const sql of sqlCommands) {
        try {
            // Try to execute via RPC
            const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
            
            if (error) {
                // RPC not available, log what needs to be done
                console.log(`⚠️  ${sql.substring(0, 60)}...`);
                console.log(`   Note: ${error.message}`);
                errorCount++;
            } else {
                console.log(`✅ ${sql.substring(0, 60)}...`);
                successCount++;
            }
        } catch (err) {
            console.log(`⚠️  ${sql.substring(0, 60)}...`);
            console.log(`   Error: ${err.message}`);
            errorCount++;
        }
    }
    
    console.log(`\n📊 Results: ${successCount} applied, ${errorCount} need manual execution\n`);
    
    if (errorCount > 0) {
        console.log('⚠️  SQL commands need to be run manually in Supabase SQL Editor');
        console.log('📄 File: repair_schema.sql\n');
    }
    
    return { successCount, errorCount };
}

async function createGhostTransaction() {
    console.log('\n👻 CREATING GHOST TRANSACTION ($10.00 GHOST BURGER)\n');
    console.log('=' .repeat(50));
    
    const tenantId = '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd';
    const externalRef = `GHOST-TEST-${Date.now()}`;
    const amountCents = 1000; // $10.00
    
    try {
        // Create order
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                tenant_id: tenantId,
                status: 'pending',
                table_number: 99,
                items: [{ name: 'Ghost Burger', price_cents: amountCents, quantity: 1 }],
                total_amount_cents: amountCents,
                currency: 'USD',
                external_reference: externalRef,
                payment_status: 'pending'
            })
            .select();
        
        if (orderError) {
            console.log('❌ Order creation failed:', orderError.message);
            if (orderError.details) console.log('   Details:', orderError.details);
            return null;
        }
        
        const orderId = orderData[0].id;
        console.log(`✅ Order created: ${orderId}`);
        console.log(`   External Ref: ${externalRef}`);
        console.log(`   Amount: $10.00`);
        console.log(`   Status: ${orderData[0].status}`);
        
        // Create ledger entry
        const { data: ledgerData, error: ledgerError } = await supabase
            .from('transaction_ledger')
            .insert({
                order_id: orderId,
                transaction_type: 'payment',
                amount_gross_cents: amountCents,
                currency: 'USD',
                external_reference: externalRef,
                status: 'pending'
            })
            .select();
        
        if (ledgerError) {
            console.log('❌ Ledger entry failed:', ledgerError.message);
            if (ledgerError.details) console.log('   Details:', ledgerError.details);
            return null;
        }
        
        console.log(`✅ Ledger entry created: ${ledgerData[0].id}`);
        console.log(`   Status: ${ledgerData[0].status}`);
        
        return { orderId, ledgerId: ledgerData[0].id, externalRef };
        
    } catch (err) {
        console.log('❌ Error:', err.message);
        return null;
    }
}

async function simulatePayment(orderId, externalRef) {
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
        // Update order to paid
        const { data: orderUpdate, error: orderError } = await supabase
            .from('orders')
            .update({
                status: 'paid',
                payment_status: 'approved',
                mercado_pago_payment_id: mpPaymentId,
                payment_method: paymentMethod,
                paid_at: new Date().toISOString(),
                payment_response: mockResponse
            })
            .eq('id', orderId)
            .select();
        
        if (orderError) {
            console.log('❌ Order update failed:', orderError.message);
            return false;
        }
        
        console.log(`✅ Order ${orderId} marked as PAID`);
        console.log(`   Payment Status: ${orderUpdate[0].payment_status}`);
        console.log(`   MP Payment ID: ${orderUpdate[0].mercado_pago_payment_id}`);
        
        // Update ledger
        const { data: ledgerUpdate, error: ledgerError } = await supabase
            .from('transaction_ledger')
            .update({
                status: 'completed',
                payment_method: paymentMethod,
                mercado_pago_response: mockResponse,
                processed_at: new Date().toISOString()
            })
            .eq('order_id', orderId)
            .select();
        
        if (ledgerError) {
            console.log('❌ Ledger update failed:', ledgerError.message);
            return false;
        }
        
        console.log(`✅ Ledger marked as COMPLETED`);
        console.log(`   Status: ${ledgerUpdate[0].status}`);
        
        return true;
        
    } catch (err) {
        console.log('❌ Error:', err.message);
        return false;
    }
}

async function verifyGhostTransaction(orderId) {
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
        return;
    }
    
    console.log('📋 Order Details:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Payment Status: ${order.payment_status}`);
    console.log(`   External Ref: ${order.external_reference}`);
    console.log(`   MP Payment ID: ${order.mercado_pago_payment_id}`);
    console.log(`   Paid At: ${order.paid_at}`);
    
    // Check ledger
    const { data: ledger, error: ledgerError } = await supabase
        .from('transaction_ledger')
        .select('*')
        .eq('order_id', orderId)
        .single();
    
    if (ledgerError) {
        console.log('\n❌ Could not fetch ledger:', ledgerError.message);
        return;
    }
    
    console.log('\n📋 Ledger Details:');
    console.log(`   ID: ${ledger.id}`);
    console.log(`   Order ID: ${ledger.order_id}`);
    console.log(`   Status: ${ledger.status}`);
    console.log(`   Amount: $${(ledger.amount_gross_cents / 100).toFixed(2)}`);
    console.log(`   External Ref: ${ledger.external_reference}`);
    console.log(`   Processed At: ${ledger.processed_at}`);
    
    // Final validation
    console.log('\n' + '=' .repeat(50));
    const success = order.status === 'paid' && 
                   order.payment_status === 'approved' && 
                   ledger.status === 'completed';
    
    if (success) {
        console.log('✅ GHOST TRANSACTION SUCCESSFUL!');
        console.log('   Order flipped to paid ✓');
        console.log('   Ledger entry created ✓');
        console.log('   No errors ✓');
    } else {
        console.log('❌ GHOST TRANSACTION FAILED');
        console.log(`   Order status: ${order.status} (expected: paid)`);
        console.log(`   Payment status: ${order.payment_status} (expected: approved)`);
        console.log(`   Ledger status: ${ledger.status} (expected: completed)`);
    }
}

async function main() {
    // First try to repair schema
    await repairSchema();
    
    // Create ghost transaction
    const ghost = await createGhostTransaction();
    
    if (ghost) {
        // Simulate payment webhook
        const paid = await simulatePayment(ghost.orderId, ghost.externalRef);
        
        if (paid) {
            // Verify everything
            await verifyGhostTransaction(ghost.orderId);
        }
    }
    
    console.log('\n🏁 Process complete!');
}

main();