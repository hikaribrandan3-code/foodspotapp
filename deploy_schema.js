const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'repair_schema.sql'), 'utf8');

const client = new Client({
    host: 'db.buendqgmwpxdixwvlkhd.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E',
    ssl: { rejectUnauthorized: false }
});

async function deploy() {
    try {
        await client.connect();
        console.log('🔌 Connected to Supabase\n');
        
        // Split SQL into statements (simple split on semicolon)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        console.log(`📋 Executing ${statements.length} SQL statements...\n`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';';
            const firstLine = stmt.split('\n')[0].trim();
            
            try {
                await client.query(stmt);
                successCount++;
                if (firstLine.includes('ALTER') || firstLine.includes('CREATE') || firstLine.includes('COMMENT')) {
                    console.log(`  ✅ ${firstLine.substring(0, 60)}...`);
                }
            } catch (err) {
                // Ignore "already exists" errors
                if (err.message.includes('already exists')) {
                    console.log(`  ⚠️  ${firstLine.substring(0, 50)}... (already exists)`);
                    successCount++;
                } else {
                    errorCount++;
                    console.log(`  ❌ ERROR: ${firstLine.substring(0, 50)}...`);
                    console.log(`     ${err.message.substring(0, 100)}`);
                }
            }
        }
        
        console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed\n`);
        
        // Verify the schema changes
        console.log('🔍 Verifying schema changes...\n');
        
        const ordersCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'orders'
            AND column_name IN ('payment_status', 'external_reference', 'mercado_pago_payment_id')
        `);
        
        if (ordersCheck.rows.length >= 3) {
            console.log('✅ Orders table has required Mercado Pago columns:');
            ordersCheck.rows.forEach(r => console.log(`   • ${r.column_name}: ${r.data_type}`));
        } else {
            console.log('⚠️  Some orders columns may be missing');
        }
        
        const ledgerCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'transaction_ledger'
            AND column_name IN ('order_id', 'external_reference', 'mercado_pago_response')
        `);
        
        if (ledgerCheck.rows.length >= 3) {
            console.log('\n✅ Transaction ledger has required columns:');
            ledgerCheck.rows.forEach(r => console.log(`   • ${r.column_name}: ${r.data_type}`));
        } else {
            console.log('\n⚠️  Some ledger columns may be missing');
        }
        
        await client.end();
        console.log('\n🎉 Schema repair complete!');
        
    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
        process.exit(1);
    }
}

deploy();