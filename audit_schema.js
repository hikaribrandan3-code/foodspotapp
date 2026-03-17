const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditSchema() {
    console.log('🔍 AUDITING FOODSPOT-OS DATABASE SCHEMA\n');
    console.log('=' .repeat(50));
    
    // Get sample data from orders to infer schema
    console.log('\n📋 ORDERS TABLE - Sample Data Analysis:');
    const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(3);
    
    if (ordersError) {
        console.log('❌ Error:', ordersError.message);
    } else if (ordersData.length === 0) {
        console.log('⚠️  Table exists but is empty');
    } else {
        console.log(`✅ Found ${ordersData.length} sample rows`);
        console.log('\nColumns detected:');
        const columns = Object.keys(ordersData[0]);
        columns.forEach(col => {
            const sample = ordersData[0][col];
            const type = sample === null ? 'null' : typeof sample;
            console.log(`   • ${col}: ${type}`);
        });
        console.log('\nSample row:');
        console.log(JSON.stringify(ordersData[0], null, 2));
    }
    
    // Get sample data from transaction_ledger
    console.log('\n\n📋 TRANSACTION_LEDGER TABLE - Sample Data Analysis:');
    const { data: ledgerData, error: ledgerError } = await supabase
        .from('transaction_ledger')
        .select('*')
        .limit(3);
    
    if (ledgerError) {
        console.log('❌ Error:', ledgerError.message);
    } else if (ledgerData.length === 0) {
        console.log('⚠️  Table exists but is empty');
    } else {
        console.log(`✅ Found ${ledgerData.length} sample rows`);
        console.log('\nColumns detected:');
        const columns = Object.keys(ledgerData[0]);
        columns.forEach(col => {
            const sample = ledgerData[0][col];
            const type = sample === null ? 'null' : typeof sample;
            console.log(`   • ${col}: ${type}`);
        });
        console.log('\nSample row:');
        console.log(JSON.stringify(ledgerData[0], null, 2));
    }
    
    // Check for critical Mercado Pago columns
    console.log('\n\n📋 CHECKING FOR MERCADO PAGO REQUIRED COLUMNS:');
    
    const requiredOrderColumns = [
        'payment_status',
        'payment_method', 
        'external_reference',
        'mercado_pago_payment_id',
        'mercado_pago_preference_id',
        'total_amount',
        'currency'
    ];
    
    const requiredLedgerColumns = [
        'order_id',
        'transaction_type',
        'amount',
        'currency',
        'external_reference',
        'mercado_pago_response',
        'status'
    ];
    
    // Get orders schema by checking first row
    let orderCols = [];
    if (ordersData && ordersData.length > 0) {
        orderCols = Object.keys(ordersData[0]);
    }
    
    console.log('\nOrders Table:');
    requiredOrderColumns.forEach(col => {
        const exists = orderCols.includes(col);
        console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
    
    // Get ledger schema
    let ledgerCols = [];
    if (ledgerData && ledgerData.length > 0) {
        ledgerCols = Object.keys(ledgerData[0]);
    }
    
    console.log('\nTransaction Ledger Table:');
    requiredLedgerColumns.forEach(col => {
        const exists = ledgerCols.includes(col);
        console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
    
    // Summary
    console.log('\n\n📊 AUDIT SUMMARY:');
    const missingOrderCols = requiredOrderColumns.filter(c => !orderCols.includes(c));
    const missingLedgerCols = requiredLedgerColumns.filter(c => !ledgerCols.includes(c));
    
    if (missingOrderCols.length === 0 && missingLedgerCols.length === 0) {
        console.log('✅ All required columns present - Schema looks good!');
    } else {
        console.log('❌ ISSUES FOUND:');
        if (missingOrderCols.length > 0) {
            console.log(`   Orders table missing: ${missingOrderCols.join(', ')}`);
        }
        if (missingLedgerCols.length > 0) {
            console.log(`   Ledger table missing: ${missingLedgerCols.join(', ')}`);
        }
    }
}

auditSchema();