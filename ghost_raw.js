// Use raw fetch to bypass Supabase client schema cache
const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

async function fetchSupabase(table, method, body = null, filter = null) {
    let url = `${supabaseUrl}/rest/v1/${table}`;
    if (filter) url += `?${filter}`;
    
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
    };
    
    const options = {
        method,
        headers
    };
    
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
        return { error: { message: data.message || response.statusText, details: data.details, hint: data.hint }, data: null };
    }
    
    return { data, error: null };
}

const validStatuses = ['open', 'closed', 'canceled', 'cancelled', 'active', 'inactive', 'draft', 'published', 'new', 'processing', 'confirmed', 'completed', 'done', 'paid', 'pending', 'archived', 'finalized'];

async function findValidStatuses() {
    console.log('🔍 FINDING ALL VALID ORDER STATUS VALUES\n');
    console.log('=' .repeat(50));
    
    const workingStatuses = [];
    
    for (const status of validStatuses) {
        const { data, error } = await fetchSupabase('orders', 'POST', {
            items: [{ name: 'Test', price_cents: 100, quantity: 1 }],
            status: status
        });
        
        if (error) {
            console.log(`❌ "${status}": ${error.message.substring(0, 50)}`);
        } else {
            console.log(`✅ "${status}" WORKS!`);
            workingStatuses.push(status);
            // Clean up
            await fetchSupabase('orders', 'DELETE', null, `id=eq.${data[0].id}`);
        }
    }
    
    console.log(`\n📊 Found ${workingStatuses.length} valid statuses: ${workingStatuses.join(', ')}`);
    return workingStatuses;
}

async function createGhostTransaction(workingStatuses) {
    console.log('\n👻 CREATING GHOST TRANSACTION ($10.00 GHOST BURGER)\n');
    console.log('=' .repeat(50));
    
    const externalRef = `GHOST-${Date.now()}`;
    const amountCents = 1000; // $10.00
    
    // Pick a "new" status and a "completed" status from working statuses
    const initialStatus = workingStatuses.includes('open') ? 'open' : 
                          workingStatuses.includes('new') ? 'new' : 
                          workingStatuses.includes('pending') ? 'pending' :
                          workingStatuses[0];
    
    const paidStatus = workingStatuses.includes('closed') ? 'closed' :
                       workingStatuses.includes('completed') ? 'completed' :
                       workingStatuses.includes('finalized') ? 'finalized' :
                       workingStatuses.includes('archived') ? 'archived' :
                       workingStatuses[workingStatuses.length - 1];
    
    try {
        // Create order with valid status
        const orderInsert = {
            items: [{ name: 'Ghost Burger', price_cents: amountCents, quantity: 1 }],
            status: initialStatus
        };
        
        console.log(`📦 Creating order with status="${initialStatus}"...`);
        console.log('   Payload:', JSON.stringify(orderInsert));
        
        const { data: orderData, error: orderError } = await fetchSupabase('orders', 'POST', orderInsert);
        
        if (orderError) {
            console.log('❌ Order creation failed:', orderError.message);
            return null;
        }
        
        const orderId = orderData[0].id;
        console.log(`✅ Order created: ${orderId}`);
        console.log(`   Status: ${orderData[0].status}`);
        
        // Create ledger entry
        const ledgerInsert = {
            amount_gross_cents: amountCents,
            platform_fee_cents: 0,
            net_to_owner_cents: amountCents,
            idempotency_key: `ghost-${Date.now()}`,
            status: 'pending'
        };
        
        console.log('\n📒 Creating ledger entry...');
        const { data: ledgerData, error: ledgerError } = await fetchSupabase('transaction_ledger', 'POST', ledgerInsert);
        
        if (ledgerError) {
            console.log('❌ Ledger entry failed:', ledgerError.message);
            return null;
        }
        
        const ledgerId = ledgerData[0].id;
        console.log(`✅ Ledger entry created: ${ledgerId}`);
        console.log(`   Status: ${ledgerData[0].status}`);
        
        return { orderId, ledgerId, externalRef, amountCents, paidStatus };
        
    } catch (err) {
        console.log('❌ Error:', err.message);
        return null;
    }
}

async function simulatePayment(ghost) {
    console.log('\n💰 SIMULATING MERCADO PAGO PAYMENT WEBHOOK\n');
    console.log('=' .repeat(50));
    
    try {
        // Update order to a "paid" equivalent status
        const paidStatus = ghost.paidStatus;
        
        console.log(`📝 Updating order status to "${paidStatus}"...`);
        const { data: orderUpdate, error: orderError } = await fetchSupabase(
            'orders', 
            'PATCH', 
            { status: paidStatus },
            `id=eq.${ghost.orderId}`
        );
        
        if (orderError) {
            console.log('❌ Order update failed:', orderError.message);
            return false;
        }
        
        console.log(`✅ Order ${ghost.orderId} marked as ${paidStatus.toUpperCase()}`);
        console.log(`   New Status: ${orderUpdate[0].status}`);
        
        // Update ledger
        console.log('\n📝 Updating ledger status...');
        const { data: ledgerUpdate, error: ledgerError } = await fetchSupabase(
            'transaction_ledger',
            'PATCH',
            { status: 'completed' },
            `id=eq.${ghost.ledgerId}`
        );
        
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
    const { data: order, error: orderError } = await fetchSupabase(
        'orders',
        'GET',
        null,
        `id=eq.${ghost.orderId}`
    );
    
    if (orderError || !order || order.length === 0) {
        console.log('❌ Could not fetch order:', orderError?.message || 'Not found');
        return false;
    }
    
    const o = order[0];
    console.log('📋 Order Details:');
    console.log(`   ID: ${o.id}`);
    console.log(`   Status: ${o.status}`);
    console.log(`   Items: ${JSON.stringify(o.items)}`);
    
    // Check ledger
    const { data: ledger, error: ledgerError } = await fetchSupabase(
        'transaction_ledger',
        'GET',
        null,
        `id=eq.${ghost.ledgerId}`
    );
    
    if (ledgerError || !ledger || ledger.length === 0) {
        console.log('\n❌ Could not fetch ledger:', ledgerError?.message || 'Not found');
        return false;
    }
    
    const l = ledger[0];
    console.log('\n📋 Ledger Details:');
    console.log(`   ID: ${l.id}`);
    console.log(`   Status: ${l.status}`);
    console.log(`   Amount: $${(l.amount_gross_cents / 100).toFixed(2)}`);
    
    // Final validation
    console.log('\n' + '=' .repeat(50));
    const success = (o.status === 'closed' || o.status === 'completed') && l.status === 'completed';
    
    if (success) {
        console.log('✅ GHOST TRANSACTION SUCCESSFUL!');
        console.log('   Order flipped to closed ✓');
        console.log('   Ledger entry created ✓');
        console.log('   No errors ✓');
    } else {
        console.log('❌ GHOST TRANSACTION FAILED');
        console.log(`   Order status: ${o.status} (expected: closed/completed)`);
        console.log(`   Ledger status: ${l.status} (expected: completed)`);
    }
    
    return success;
}

async function main() {
    // First find all valid statuses
    const workingStatuses = await findValidStatuses();
    
    if (!workingStatuses || workingStatuses.length === 0) {
        console.log('\n❌ Could not find valid status values');
        return;
    }
    
    // Create ghost transaction
    const ghost = await createGhostTransaction(workingStatuses);
    
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