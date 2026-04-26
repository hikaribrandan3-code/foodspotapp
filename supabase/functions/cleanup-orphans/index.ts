
/**
 * cleanup-orphans: The Automatic Janitor
 * 
 * 🧹 Mission: Identify and archive abandoned orders ("Ghost Orders").
 * 🛡️ Safety: Runs with SERVICE_ROLE_KEY to bypass RLS (God Mode).
 * ⏱️ Schedule: Every 60 minutes via pg_cron.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("🧹 cleanup-orphans: Starting Janitor Routine...");

        // 2. Initialize Supabase Client (God Mode)
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("❌ Missing Environment Variables");
            return new Response(JSON.stringify({ error: "Configuration Error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Define Threshold (60 Minutes Ago)
        const ONE_HOUR = 60 * 60 * 1000;
        const thresholdTime = new Date(Date.now() - ONE_HOUR).toISOString();

        console.log(`⏱️ Scanning for orders older than: ${thresholdTime}`);

        // 4. Find ghost orders (still in pending_payment after threshold)
        // Safety Lock: ONLY touch 'pending_payment'. The FSM RPC enforces
        // that other states are not affected by this cancel.
        const { data: ghostOrders, error: fetchError } = await supabase
            .from("orders")
            .select("id")
            .eq("status", "pending_payment")
            .lt("created_at", thresholdTime);

        if (fetchError) {
            console.error("❌ cleanup-orphans: Fetch Error", fetchError);
            throw fetchError;
        }

        // 5. Cancel each via the FSM RPC (audit log + cancelled_at set automatically)
        let expiredCount = 0;
        const failures: { id: string; error: string }[] = [];
        for (const order of ghostOrders ?? []) {
            const { data: rpcData, error: rpcError } = await supabase.rpc('advance_order_status', {
                p_order_id: order.id,
                p_target_status: 'cancelled',
                p_cancel_reason: 'Order expired - no payment received within 1 hour'
            });
            if (rpcError) {
                failures.push({ id: order.id, error: rpcError.message });
                continue;
            }
            if (rpcData && !rpcData.success) {
                failures.push({ id: order.id, error: rpcData.message || rpcData.error });
                continue;
            }
            expiredCount++;
        }

        if (failures.length > 0) {
            console.warn(`⚠️ cleanup-orphans: ${failures.length} cancellations failed`, failures);
        }
        console.log(`✅ cleanup-orphans: Operation Complete. Cancelled ${expiredCount} ghost orders.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Expired ${expiredCount} orders.`,
                timestamp: new Date().toISOString()
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (err) {
        console.error("❌ cleanup-orphans: Fatal Error", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
