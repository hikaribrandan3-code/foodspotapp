// Mercado Pago OAuth Token Exchange Edge Function
// Path: supabase/functions/mp-oauth/index.ts
// Deploy: supabase functions deploy mp-oauth

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS Headers for browser requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // ============================================
        // 1. EXTRACT QUERY PARAMS FROM MP REDIRECT
        // ============================================
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // state = business_id
        const error = url.searchParams.get("error");

        // Handle MP OAuth errors
        if (error) {
            console.error("MP OAuth Error:", error);
            return redirectToSettings(state, false, `error=${error}`);
        }

        // Validate required params
        if (!code || !state) {
            console.error("Missing code or state param");
            return redirectToSettings(state, false, "error=missing_params");
        }

        console.log(`🔐 OAuth exchange for business_id: ${state}`);

        // ============================================
        // 2. EXCHANGE CODE FOR TOKENS
        // ============================================
        const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID");
        const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET");
        const REDIRECT_URI = Deno.env.get("MP_REDIRECT_URI") || `${url.origin}/functions/v1/mp-oauth`;

        if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
            console.error("Missing MP credentials in environment");
            return redirectToSettings(state, false, "error=config_missing");
        }

        const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: MP_CLIENT_ID,
                client_secret: MP_CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            console.error("MP Token Exchange Failed:", tokenResponse.status, errorBody);
            return redirectToSettings(state, false, "error=token_exchange_failed");
        }

        const tokenData = await tokenResponse.json();

        // ============================================
        // 3. VALIDATE TOKEN RESPONSE
        // ============================================
        const {
            access_token,
            refresh_token,
            expires_in,
            user_id: mp_user_id,
            public_key,
        } = tokenData;

        if (!access_token) {
            console.error("No access_token in response:", tokenData);
            return redirectToSettings(state, false, "error=no_access_token");
        }

        console.log(`✅ Got tokens for MP User: ${mp_user_id}`);

        // ============================================
        // 4. CALCULATE TOKEN EXPIRY
        // ============================================
        const now = new Date();
        const expiresAt = new Date(now.getTime() + expires_in * 1000);

        // ============================================
        // 5. UPDATE BRANDING TABLE
        // ============================================
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data, error: updateError } = await supabase
            .from("branding")
            .update({
                mp_access_token: access_token,
                mp_refresh_token: refresh_token,
                mp_token_expires_at: expiresAt.toISOString(),
                mp_user_id: mp_user_id?.toString() || null,
                mp_public_key: public_key || null,
                mp_connected_at: now.toISOString(),
            })
            .eq("business_id", state)
            .select()
            .single();

        if (updateError) {
            console.error("Failed to update branding:", updateError);
            return redirectToSettings(state, false, "error=db_update_failed");
        }

        // ============================================
        // 5b. UPSERT TO BRANDING_SECRETS (sync for webhook lookup)
        // ============================================
        const { error: secretsError } = await supabase
            .from("branding_secrets")
            .upsert({
                business_id: state,
                mp_user_id: mp_user_id?.toString() || null,
                mp_access_token: access_token,
                mp_refresh_token: refresh_token,
                updated_at: now.toISOString(),
            }, { onConflict: "business_id" });

        if (secretsError) {
            console.error("Failed to upsert branding_secrets:", secretsError);
            // Non-fatal: branding table is the source of truth, but log for monitoring
        }

        console.log(`🏦 Saved tokens for business: ${data.business_name}`);

        // ============================================
        // 6. REDIRECT BACK TO SETTINGS
        // ============================================
        return redirectToSettings(state, true);

    } catch (err) {
        console.error("OAuth Handler Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: err.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});

/**
 * Redirect user back to the owner settings page
 */
function redirectToSettings(businessId: string | null, success: boolean, params?: string): Response {
    // Construct the base URL - adjust for your app's domain
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://your-app.com";

    let redirectUrl = `${APP_BASE_URL}/owner/settings`;

    // Add query params
    const queryParams = [];
    if (success) {
        queryParams.push("mp_connected=true");
    }
    if (params) {
        queryParams.push(params);
    }
    if (businessId) {
        queryParams.push(`business_id=${businessId}`);
    }

    if (queryParams.length > 0) {
        redirectUrl += `?${queryParams.join("&")}`;
    }

    return new Response(null, {
        status: 302,
        headers: {
            ...corsHeaders,
            Location: redirectUrl,
        },
    });
}

// ============================================
// TOKEN REFRESH FUNCTION (for scheduled runs)
// ============================================
export async function refreshExpiredTokens() {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID")!;
    const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Find tokens expiring in the next 24 hours
    const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: expiringTokens, error } = await supabase
        .from("branding")
        .select("business_id, mp_refresh_token")
        .not("mp_refresh_token", "is", null)
        .lt("mp_token_expires_at", expiryThreshold);

    if (error || !expiringTokens) {
        console.error("Failed to fetch expiring tokens:", error);
        return;
    }

    for (const row of expiringTokens) {
        try {
            const refreshResponse = await fetch("https://api.mercadopago.com/oauth/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    client_id: MP_CLIENT_ID,
                    client_secret: MP_CLIENT_SECRET,
                    refresh_token: row.mp_refresh_token,
                }),
            });

            if (!refreshResponse.ok) {
                console.error(`Failed to refresh token for ${row.business_id}`);
                continue;
            }

            const newTokens = await refreshResponse.json();
            const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

            await supabase
                .from("branding")
                .update({
                    mp_access_token: newTokens.access_token,
                    mp_refresh_token: newTokens.refresh_token,
                    mp_token_expires_at: expiresAt.toISOString(),
                })
                .eq("business_id", row.business_id);

            console.log(`🔄 Refreshed token for ${row.business_id}`);
        } catch (err) {
            console.error(`Error refreshing token for ${row.business_id}:`, err);
        }
    }
}
