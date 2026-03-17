const { Client } = require('pg');

async function auditDatabase() {
    
    const client = new Client({
        host: 'db.buendqgmwpxdixwvlkhd.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E',
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('🔍 Connected to Supabase - Auditing Database Schema\n');
        
        // Check if orders table exists
        console.log('📋 Checking ORDERS table...');
        const ordersCheck = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'orders'
            ORDER BY ordinal_position
        `);
        
        if (ordersCheck.rows.length === 0) {
            console.log('❌ ORDERS table does NOT exist\n');
        } else {
            console.log('✅ ORDERS table exists with columns:');
            ordersCheck.rows.forEach(col => {
                console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
            });
            console.log('');
        }
        
        // Check if transaction_ledger exists
        console.log('📋 Checking TRANSACTION_LEDGER table...');
        const ledgerCheck = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'transaction_ledger'
            ORDER BY ordinal_position
        `);
        
        if (ledgerCheck.rows.length === 0) {
            console.log('❌ TRANSACTION_LEDGER table does NOT exist\n');
        } else {
            console.log('✅ TRANSACTION_LEDGER table exists with columns:');
            ledgerCheck.rows.forEach(col => {
                console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
            });
            console.log('');
        }
        
        // Check all tables
        console.log('📋 All tables in public schema:');
        const allTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        allTables.rows.forEach(t => console.log(`   • ${t.table_name}`));
        console.log('');
        
        // Check for existing indexes on orders
        if (ordersCheck.rows.length > 0) {
            console.log('📋 Indexes on ORDERS table:');
            const orderIndexes = await client.query(`
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'orders'
            `);
            orderIndexes.rows.forEach(idx => console.log(`   • ${idx.indexname}`));
            console.log('');
        }
        
        // Check RLS policies
        console.log('📋 Row Level Security policies:');
        const rls = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
            FROM pg_policies
            WHERE schemaname = 'public'
        `);
        if (rls.rows.length === 0) {
            console.log('   No RLS policies found\n');
        } else {
            rls.rows.forEach(p => console.log(`   • ${p.tablename}: ${p.policyname} (${p.cmd})`));
            console.log('');
        }
        
        await client.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

auditDatabase();