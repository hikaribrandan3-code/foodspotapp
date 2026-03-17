const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const supabaseKey = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployTrigger() {
    try {
        // Create function using raw SQL via RPC workaround
        const { data, error } = await supabase.rpc('execute_sql', {
            sql_query: `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN INSERT INTO public.tenants (owner_id, venue_name, language) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'Unnamed Venue'), COALESCE(NEW.raw_user_meta_data->>'language', 'es')); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`
        });
        
        if (error) {
            console.log('RPC approach failed (expected), trying direct insert...');
            return;
        }
        console.log('Success:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

deployTrigger();
