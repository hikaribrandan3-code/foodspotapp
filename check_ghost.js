const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

async function checkGhostBurger() {
    const orderId = 'abc038f2-5f39-4b9d-89ae-7835a3f0423c';
    const ledgerId = '11715578-3a3b-4974-a767-1e9beab0bb6f';
    
    console.log('🔍 GHOST BURGER STATUS CHECK\n');
    console.log('=' .repeat(50));
    
    // Check order
    const orderRes = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const order = await orderRes.json();
    
    console.log('📦 ORDER:');
    console.log(`   ID: ${order[0]?.id}`);
    console.log(`   Status: ${order[0]?.status}`);
    console.log(`   Items: ${JSON.stringify(order[0]?.items)}`);
    
    // Check ledger
    const ledgerRes = await fetch(`${supabaseUrl}/rest/v1/transaction_ledger?id=eq.${ledgerId}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const ledger = await ledgerRes.json();
    
    console.log('\n📒 LEDGER:');
    console.log(`   ID: ${ledger[0]?.id}`);
    console.log(`   Status: ${ledger[0]?.status}`);
    console.log(`   Amount: $${(ledger[0]?.amount_gross_cents / 100).toFixed(2)}`);
    
    // Check constraint
    console.log('\n🔒 CONSTRAINT CHECK:');
    try {
        const testRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: { 
                'apikey': supabaseKey, 
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: [{name: 'Test', price_cents: 100}], status: 'paid' })
        });
        
        if (testRes.ok) {
            const testData = await testRes.json();
            console.log('   ✅ Status: paid ALLOWED (constraint fixed!)');
            // Cleanup
            await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${testData[0].id}`, {
                method: 'DELETE',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
        } else {
            const err = await testRes.json();
            console.log(`   ❌ Status: paid BLOCKED - ${err.message}`);
        }
    } catch (e) {
        console.log(`   ⚠️  Check failed: ${e.message}`);
    }
    
    console.log('\n' + '=' .repeat(50));
    const isPaid = order[0]?.status === 'paid';
    const ledgerComplete = ledger[0]?.status === 'completed';
    
    console.log(isPaid && ledgerComplete ? '✅ GHOST BURGER PAID & BALANCED' : '❌ INCOMPLETE - RUN SQL FIX');
}

checkGhostBurger();