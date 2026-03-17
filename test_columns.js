const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getExistingColumns() {
    console.log('🔍 DETECTING EXISTING TABLE COLUMNS\n');
    
    // Try to insert an empty object to see what columns exist (this will fail but tell us what's required)
    console.log('📋 Testing ORDERS table structure...');
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert({})
            .select();
        
        if (error) {
            // Parse error to find required columns
            const match = error.message.match(/column "([^"]+)" of relation/);
            if (match) {
                console.log(`   Column mentioned in error: ${match[1]}`);
            }
            console.log(`   Error type: ${error.code}`);
            console.log(`   Hint: ${error.hint || 'None'}`);
            console.log(`   Details: ${error.details || 'None'}`);
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    // Try with minimal fields
    console.log('\n📋 Testing with tenant_id...');
    const { data: testData, error: testError } = await supabase
        .from('orders')
        .insert({ tenant_id: '00470a1a-f5c4-4fb8-a4a5-2ab0d8d758fd' })
        .select();
    
    if (testError) {
        console.log('   Error:', testError.message);
        if (testError.details) console.log('   Details:', testError.details);
    } else {
        console.log('✅ Insert succeeded!');
        console.log('   Columns in table:', Object.keys(testData[0]).join(', '));
        
        // Clean up test row
        await supabase.from('orders').delete().eq('id', testData[0].id);
    }
    
    // Do the same for transaction_ledger
    console.log('\n📋 Testing TRANSACTION_LEDGER table...');
    const { data: ledgerTest, error: ledgerError } = await supabase
        .from('transaction_ledger')
        .insert({})
        .select();
    
    if (ledgerError) {
        console.log('   Error:', ledgerError.message);
        if (ledgerError.details) console.log('   Details:', ledgerError.details);
    }
}

getExistingColumns();