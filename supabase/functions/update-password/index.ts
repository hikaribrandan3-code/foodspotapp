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
        const { email, code, password } = await req.json();

        if (!email || !code || !password) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (password.length < 8) {
            return new Response(
                JSON.stringify({ success: false, error: "Password too short" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Defense-in-depth: confirm the code was already verified (used=true)
        const { data: resetData, error: codeError } = await supabaseAdmin
            .from("password_reset_codes")
            .select("id")
            .eq("email", email)
            .eq("code", code)
            .eq("used", true)
            .gt("expires_at", new Date(Date.now() - 10 * 60 * 1000).toISOString()) // within last 10 min
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (codeError || !resetData) {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid code" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Look up user ID via the get_user_id_by_email helper (avoids listUsers pagination)
        const { data: userId, error: rpcError } = await supabaseAdmin
            .rpc("get_user_id_by_email", { p_email: email });

        if (rpcError || !userId) {
            console.error("[update-password] User lookup failed:", rpcError?.message);
            return new Response(
                JSON.stringify({ success: false, error: "User not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update password via admin API (no session needed)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (updateError) {
            console.error("[update-password] Update failed:", updateError.message);
            return new Response(
                JSON.stringify({ success: false, error: updateError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Invalidate all reset codes for this email after successful update
        await supabaseAdmin
            .from("password_reset_codes")
            .update({ used: true })
            .eq("email", email)
            .eq("used", false);

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("[update-password] Unexpected error:", err);
        return new Response(
            JSON.stringify({ success: false, error: "Something went wrong" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
