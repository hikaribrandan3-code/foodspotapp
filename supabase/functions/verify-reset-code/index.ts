import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return new Response(
                JSON.stringify({ valid: false, error: "Missing email or code" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Find valid, unused, non-expired code
        const { data: resetData, error: queryError } = await supabaseAdmin
            .from("password_reset_codes")
            .select("id")
            .eq("email", email)
            .eq("code", code)
            .eq("used", false)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (queryError || !resetData) {
            return new Response(
                JSON.stringify({ valid: false, error: "Invalid or expired code" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Mark code as used — single-use enforcement
        await supabaseAdmin
            .from("password_reset_codes")
            .update({ used: true })
            .eq("id", resetData.id);

        return new Response(
            JSON.stringify({ valid: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("[verify-reset-code] Unexpected error:", err);
        return new Response(
            JSON.stringify({ valid: false, error: "Invalid or expired code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
