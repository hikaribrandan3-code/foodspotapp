const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function detectColumns() {
    console.log('🔍 DETECTING ACTUAL COLUMN NAMES\n');
    
    // Get a sample order to see column names
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
    
    if (orderError) {
        console.log('Orders error:', orderError.message);
    } else if (orders.length > 0) {
        console.log('📋 ORDERS columns:');
        Object.keys(orders[0]).forEach(col => {
            const val = orders[0][col];
            const type = val === null ? 'null' : typeof val;
            console.log(`   • ${col}: ${type} = ${val}`);
        });
    } else {
        // Try inserting to see what's required
        console.log('Orders table empty - testing with insert...');
        const { error } = await supabase.from('orders').insert({}).select();
        if (error) {
            console.log('Insert error:', error.message);
            console.log('Details:', error.details);
        }
    }
    
    // Get ledger sample
    const { data: ledgers, error: ledgerError } = await supabase
        .from('transaction_ledger')
        .select('*')
        .limit(1);
    
    if (ledgerError) {
        console.log('\nLedger error:', ledgerError.message);
    } else if (ledgers.length > 0) {
        console.log('\n📋 TRANSACTION_LEDGER columns:');
        Object.keys(ledgers[0]).forEach(col => {
            const val = ledgers[0][col];
            const type = val === null ? 'null' : typeof val;
            console.log(`   • ${col}: ${type} = ${val}`);
        });
    } else {
        console.log('\nTransaction_ledger empty');
    }
}

detectColumns();