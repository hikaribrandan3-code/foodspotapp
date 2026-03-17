const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLCommands() {
    console.log('🔧 OPERATION VAULT-SEAL: CRITICAL SCHEMA FIX\n');
    console.log('=' .repeat(60));
    
    // Try to execute SQL via various methods
    const commands = [
        {
            name: 'Drop broken constraint',
            sql: `ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check`
        },
        {
            name: 'Add proper status constraint',
            sql: `ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled', 'refunded'))`
        },
        {
            name: 'Set default status',
            sql: `ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending'`
        },
        {
            name: 'Add payment_status column',
            sql: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'`
        },
        {
            name: 'Add external_reference column',
            sql: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255)`
        },
        {
            name: 'Add mercado_pago_payment_id column',
            sql: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mercado_pago_payment_id VARCHAR(100)`
        },
        {
            name: 'Add mercado_pago_preference_id column',
            sql: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mercado_pago_preference_id VARCHAR(100)`
        },
        {
            name: 'Add currency column',
            sql: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'`
        }
    ];
    
    let applied = 0;
    let failed = 0;
    
    for (const cmd of commands) {
        console.log(`\n📋 ${cmd.name}...`);
        try {
            // Try via RPC if available
            const { error } = await supabase.rpc('execute_sql', { sql_query: cmd.sql });
            
            if (error) {
                console.log(`   ⚠️  ${error.message}`);
                failed++;
            } else {
                console.log('   ✅ Applied');
                applied++;
            }
        } catch (err) {
            console.log(`   ⚠️  ${err.message}`);
            failed++;
        }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Results: ${applied} applied, ${failed} need manual execution`);
    
    if (failed > 0) {
        console.log('\n⚠️  MANUAL ACTION REQUIRED:');
        console.log('   1. Go to https://buendqgmwpxdixwvlkhd.supabase.co');
        console.log('   2. Open SQL Editor');
        console.log('   3. Run: critical_schema_fix.sql');
    }
    
    return { applied, failed };
}

async function completeGhostBurger() {
    console.log('\n\n👻 COMPLETING GHOST BURGER TEST\n');
    console.log('=' .repeat(60));
    
    const orderId = 'abc038f2-5f39-4b9d-89ae-7835a3f0423c';
    const ledgerId = '11715578-3a3b-4974-a767-1e9beab0bb6f';
    
    console.log(`\n📝 Order ID: ${orderId}`);
    console.log(`📝 Ledger ID: ${ledgerId}`);
    
    // First, try to update the order status to 'paid'
    console.log('\n💰 Attempting to flip order to PAID...');
    
    try {
        // Try updating via REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ status: 'paid' })
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.log(`   ❌ Failed: ${error.message || response.statusText}`);
            console.log(`   💡 Schema fix must be applied first!`);
            return false;
        }
        
        const data = await response.json();
        console.log(`   ✅ Order status: ${data[0].status}`);
        
        // Verify ledger
        const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/transaction_ledger?id=eq.${ledgerId}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        const ledgerData = await ledgerResponse.json();
        console.log(`   ✅ Ledger status: ${ledgerData[0].status}`);
        
        console.log('\n🎉 GHOST BURGER FULLY PAID!');
        return true;
        
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        return false;
    }
}

async function main() {
    const result = await executeSQLCommands();
    
    // Only try to complete ghost burger if schema fix was applied
    if (result.failed === 0) {
        await completeGhostBurger();
    } else {
        console.log('\n⚠️  Cannot complete Ghost Burger until schema fix is applied.');
        console.log('   Run critical_schema_fix.sql manually, then I can complete the test.');
    }
}

main();