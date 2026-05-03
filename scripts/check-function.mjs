// Deploy script for FoodSpot AI edge function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployFunction() {
    try {
        // Check if function exists
        const { data: functions, error: listError } = await supabase.functions.list();
        
        if (listError) {
            console.error('Error listing functions:', listError);
            return;
        }
        
        const foodspotAi = functions?.find(f => f.name === 'foodspot-ai');
        
        if (foodspotAi) {
            console.log('✅ foodspot-ai function exists');
            console.log('Status:', foodspotAi.status);
        } else {
            console.log('❌ foodspot-ai function NOT found');
        }
        
        // Try to invoke the function to test
        const { data, error } = await supabase.functions.invoke('foodspot-ai', {
            body: { messages: [{ role: 'user', content: 'test' }] }
        });
        
        if (error) {
            console.error('Function invocation error:', error);
        } else {
            console.log('Function response:', data);
        }
        
    } catch (err) {
        console.error('Deployment error:', err);
    }
}

deployFunction();
