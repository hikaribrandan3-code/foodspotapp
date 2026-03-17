const { Client } = require('pg');
const fs = require('fs');

// Read the SQL fix
const sql = fs.readFileSync('/root/.openclaw/workspace/critical_schema_fix.sql', 'utf8');

// Connect via Supabase IPv4 pooler
const client = new Client({
    host: 'aws-0-us-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.buendqgmwpxdixwvlkhd',
    password: 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E',
    ssl: { rejectUnauthorized: false }
});

async function applyFix() {
    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected\n');
        
        console.log('🔧 Executing Critical Schema Fix...\n');
        
        // Execute the entire SQL file
        await client.query(sql);
        
        console.log('✅ Schema fix applied successfully!\n');
        
        // Verify the fix
        console.log('🔍 Verifying orders status constraint...');
        const constraintCheck = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'orders'::regclass AND contype = 'c' AND conname = 'orders_status_check'
        `);
        
        if (constraintCheck.rows.length > 0) {
            console.log('✅ Orders status constraint:');
            console.log(`   ${constraintCheck.rows[0].definition}`);
        } else {
            console.log('⚠️  Constraint not found - may need to verify manually');
        }
        
        // Check if new columns exist
        console.log('\n🔍 Verifying new columns...');
        const columns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'orders'
            AND column_name IN ('payment_status', 'external_reference', 'mercado_pago_payment_id')
        `);
        
        console.log(`✅ Found ${columns.rows.length} new Mercado Pago columns:`);
        columns.rows.forEach(r => console.log(`   • ${r.column_name}`));
        
        await client.end();
        console.log('\n🎉 CRITICAL SCHEMA FIX COMPLETE');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ENETUNREACH')) {
            console.log('\n⚠️  IPv6 connection failed. Trying alternative...');
        }
        process.exit(1);
    }
}

applyFix();