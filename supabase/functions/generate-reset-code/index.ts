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
        const { email } = await req.json();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid email" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Generate cryptographically-safe 6-digit code
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const code = String(100000 + (array[0] % 900000));

        // Store code with 10-minute expiry
        const { error: insertError } = await supabaseAdmin
            .from("password_reset_codes")
            .insert({
                email,
                code,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            });

        if (insertError) {
            console.error("[generate-reset-code] Insert error:", insertError.message);
            return new Response(
                JSON.stringify({ success: false, error: "Failed to create reset code" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Send email via Supabase's built-in SMTP.
        // generateLink triggers the "Reset Password" email template with the code injected
        // into {{ .Data.code }} so users see the 6-digit code, not a magic link.
        const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
                data: { code },
            },
        });

        // emailError means user doesn't exist — silently succeed (no email enumeration)
        if (emailError) {
            console.log("[generate-reset-code] User not found or email skipped:", emailError.message);
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("[generate-reset-code] Unexpected error:", err);
        return new Response(
            JSON.stringify({ success: true }), // always return success
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
