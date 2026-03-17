const { Client } = require('pg');

// Try connecting with the service role key as password
// Supabase connection format
const client = new Client({
    host: 'db.buendqgmwpxdixwvlkhd.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E',
    ssl: { rejectUnauthorized: false },
    family: 4
});

const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenants (owner_id, venue_name, language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'Unnamed Venue'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'es')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

SELECT 'Function created' as status;
`;

async function deploy() {
    try {
        await client.connect();
        console.log('Connected to Supabase');
        
        const result = await client.query(sql);
        console.log('✅ Mission A deployed successfully');
        console.log(result.rows);
        
        // Verify
        const verifyFunc = await client.query(`
            SELECT proname, prosrc IS NOT NULL as exists 
            FROM pg_proc WHERE proname = 'handle_new_user'
        `);
        console.log('Function check:', verifyFunc.rows[0]);
        
        const verifyTrigger = await client.query(`
            SELECT tgname, tgrelid::regclass as table_name, tgenabled 
            FROM pg_trigger WHERE tgname = 'on_auth_user_created'
        `);
        console.log('Trigger check:', verifyTrigger.rows[0]);
        
        await client.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

deploy();
