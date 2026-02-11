
/**
 * refresh-tokens: The Eternal Handshake
 * 
 * 🔄 Mission: Prevent "Silent Killer #2" (Token Expiry).
 * 🛡️ Security: Runs with SERVICE_ROLE_KEY to update secrets.
 * ⏱️ Schedule: Weekly (Sunday Midnight) via pg_cron.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("🔄 refresh-tokens: Starting Handshake Routine...");

        // 2. Initialize Supabase (God Mode)
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // MP Platform Credentials (Your App's Keys)
        const mpClientId = Deno.env.get("MP_CLIENT_ID") ?? "";
        const mpClientSecret = Deno.env.get("MP_CLIENT_SECRET") ?? "";

        if (!supabaseUrl || !supabaseServiceKey || !mpClientId || !mpClientSecret) {
            console.error("❌ Missing Env Vars: SUPABASE_URL, SERVICE_KEY, MP_CLIENT_ID, or MP_CLIENT_SECRET");
            return new Response(JSON.stringify({ error: "Configuration Error" }), { status: 500, headers: corsHeaders });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Fetch All Refresh Tokens
        // We only need rows that HAVE a refresh token
        const { data: secrets, error: dbError } = await supabase
            .from("branding_secrets")
            .select("id, mp_refresh_token")
            .not("mp_refresh_token", "is", null);

        if (dbError) throw dbError;

        console.log(`📋 Found ${secrets?.length || 0} tokens to check.`);

        const results = [];

        // 4. Iterate & Refresh
        for (const secret of (secrets || [])) {
            try {
                console.log(`🔹 Refreshing token for Branding ID: ${secret.id}...`);

                // Call Mercado Pago OAuth Endpoint
                const mpResponse = await fetch("https://api.mercadopago.com/oauth/token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/json"
                    },
                    body: new URLSearchParams({
                        client_id: mpClientId,
                        client_secret: mpClientSecret,
                        grant_type: "refresh_token",
                        refresh_token: secret.mp_refresh_token
                    })
                });

                const mpData = await mpResponse.json();

                if (!mpResponse.ok) {
                    console.error(`❌ MP Error for ${secret.id}:`, mpData);
                    results.push({ id: secret.id, status: "failed", error: mpData });
                    continue; // Continue to next restaurant
                }

                // 5. Update Database with NEW Tokens
                const { error: updateError } = await supabase
                    .from("branding_secrets")
                    .update({
                        mp_access_token: mpData.access_token,
                        mp_refresh_token: mpData.refresh_token,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", secret.id);

                if (updateError) {
                    console.error(`❌ DB Update Error for ${secret.id}:`, updateError);
                    results.push({ id: secret.id, status: "db_failed", error: updateError });
                } else {
                    console.log(`✅ Success for ${secret.id}`);
                    results.push({ id: secret.id, status: "refreshed" });
                }

            } catch (innerErr) {
                console.error(`❌ Exception for ${secret.id}:`, innerErr);
                results.push({ id: secret.id, status: "error", error: innerErr.message });
            }
        }

        // 6. Summary Report
        console.log("🏁 Routine Complete.", results);

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                results: results
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
