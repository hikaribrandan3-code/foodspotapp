const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

async function fetchSupabase(endpoint, method, body = null) {
    const url = `${supabaseUrl}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
        return { error: { message: data.message || response.statusText, details: data.details }, data: null };
    }
    return { data, error: null };
}

async function executeGhostBurger() {
    console.log('👻 EXECUTING GHOST BURGER FINALIZATION\n');
    console.log('=' .repeat(60));
    
    const orderId = 'abc038f2-5f39-4b9d-89ae-7835a3f0423c';
    const ledgerId = '11715578-3a3b-4974-a767-1e9beab0bb6f';
    
    // Step 1: Check current order status
    console.log('\n📋 Step 1: Checking current order status...');
    const { data: order, error: orderError } = await fetchSupabase(`orders?id=eq.${orderId}`, 'GET');
    
    if (orderError) {
        console.log('❌ Error fetching order:', orderError.message);
        return;
    }
    
    console.log(`   Current Status: ${order[0].status}`);
    console.log(`   Items: ${JSON.stringify(order[0].items)}`);
    
    // Step 2: Attempt to update to 'paid' - this will fail if constraint not fixed
    console.log('\n💰 Step 2: Attempting to flip order to PAID...');
    const { data: updatedOrder, error: updateError } = await fetchSupabase(
        `orders?id=eq.${orderId}`,
        'PATCH',
        { status: 'paid' }
    );
    
    if (updateError) {
        console.log('❌ FAILED - Schema constraint still active:');
        console.log(`   ${updateError.message}`);
        console.log('\n⚠️  MANUAL SQL REQUIRED IN SUPABASE:');
        console.log('   ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;');
        console.log('   ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN (\'pending\', \'confirmed\', \'preparing\', \'ready\', \'delivered\', \'paid\', \'cancelled\', \'refunded\'));');
        return false;
    }
    
    console.log(`   ✅ Order status: ${updatedOrder[0].status}`);
    
    // Step 3: Update ledger to completed
    console.log('\n📒 Step 3: Updating ledger to COMPLETED...');
    const { data: ledger, error: ledgerError } = await fetchSupabase(
        `transaction_ledger?id=eq.${ledgerId}`,
        'PATCH',
        { status: 'completed' }
    );
    
    if (ledgerError) {
        console.log('❌ Ledger update failed:', ledgerError.message);
        return false;
    }
    
    console.log(`   ✅ Ledger status: ${ledger[0].status}`);
    
    // Step 4: Verify both
    console.log('\n🔍 Step 4: Final Verification...');
    const { data: finalOrder } = await fetchSupabase(`orders?id=eq.${orderId}`, 'GET');
    const { data: finalLedger } = await fetchSupabase(`transaction_ledger?id=eq.${ledgerId}`, 'GET');
    
    console.log('\n📊 FINAL STATUS:');
    console.log(`   Order: ${finalOrder[0].status} (ID: ${finalOrder[0].id})`);
    console.log(`   Ledger: ${finalLedger[0].status} (ID: ${finalLedger[0].id})`);
    
    if (finalOrder[0].status === 'paid' && finalLedger[0].status === 'completed') {
        console.log('\n🎉 GHOST BURGER FULLY PAID AND VERIFIED!');
        return true;
    } else {
        console.log('\n⚠️  PARTIAL SUCCESS - Check statuses above');
        return false;
    }
}

async function auditBrandingTable() {
    console.log('\n\n📋 AUDITING BRANDING TABLE\n');
    console.log('=' .repeat(60));
    
    const { data, error } = await fetchSupabase('branding?limit=1', 'GET');
    
    if (error) {
        console.log('❌ Error:', error.message);
        return;
    }
    
    if (data.length === 0) {
        console.log('⚠️  Branding table is empty');
        return;
    }
    
    const columns = Object.keys(data[0]);
    console.log('Columns found:', columns.join(', '));
    
    const hasBusinessId = columns.includes('business_id');
    const hasSlug = columns.includes('slug');
    
    console.log(`\n   business_id: ${hasBusinessId ? '✅ Present' : '❌ MISSING'}`);
    console.log(`   slug: ${hasSlug ? '✅ Present' : '❌ MISSING'}`);
    
    if (!hasBusinessId || !hasSlug) {
        console.log('\n⚠️  MISSING COLUMNS - Need to add for multi-tenancy');
    }
}

// Execute
executeGhostBurger().then(success => {
    if (success) {
        console.log('\n✅ Supabase mission complete!');
    }
    return auditBrandingTable();
});