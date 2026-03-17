const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...\n');
    
    // Test basic connection by listing tables (using supabase metadata)
    try {
        // Try to get table info via RPC if available
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('Tenants table query error:', error.message);
        } else {
            console.log('✅ Connected to Supabase');
            console.log('Tenants table exists, sample:', data);
        }
    } catch (err) {
        console.log('Connection error:', err.message);
    }
    
    // Try to check if orders table exists by querying it
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('\n❌ Orders table:', error.message);
        } else {
            console.log('\n✅ Orders table exists');
        }
    } catch (err) {
        console.log('\nOrders error:', err.message);
    }
    
    // Try to check if transaction_ledger exists
    try {
        const { data, error } = await supabase
            .from('transaction_ledger')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ Transaction_ledger table:', error.message);
        } else {
            console.log('✅ Transaction_ledger table exists');
        }
    } catch (err) {
        console.log('Transaction_ledger error:', err.message);
    }
}

testConnection();