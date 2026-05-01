// ============================================
// 📸 DELIVERY PHOTO UPLOAD EDGE FUNCTION
// Handles proof-of-delivery (POD) photo capture
// ============================================
// Deploy: supabase functions deploy upload-delivery-photo
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ============================================
    // 1. PARSE MULTIPART FORM DATA
    // ============================================
    const formData = await req.formData();
    const orderId = formData.get("order_id") as string;
    const photoBlob = formData.get("photo") as Blob;

    if (!orderId || !photoBlob) {
      return new Response(
        JSON.stringify({ error: "Missing order_id or photo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📸 Photo upload received: order_id=${orderId}, file_size=${photoBlob.size}`);

    // ============================================
    // 2. VALIDATE ORDER
    // ============================================
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_type, status, business_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`❌ Order not found: ${orderId}`);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure it's a delivery order
    if (order.order_type !== "delivery") {
      console.error(`❌ Order ${orderId} is not a delivery order (type: ${order.order_type})`);
      return new Response(
        JSON.stringify({ error: "This order is not a delivery order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure order is in 'dispatched' status (driver on the way)
    if (order.status !== "dispatched") {
      console.warn(
        `⚠️ Order ${orderId} is in status '${order.status}', expected 'dispatched'`
      );
      // Allow upload anyway (graceful) but warn
    }

    // ============================================
    // 3. UPLOAD TO STORAGE
    // ============================================
    const timestamp = Date.now();
    const filename = `${orderId}_${timestamp}.jpg`;
    const storagePath = `orders/delivery-photos/${filename}`;

    const photoBuffer = await photoBlob.arrayBuffer();
    const { data: uploadedFile, error: uploadError } = await supabase.storage
      .from("delivery-photos")
      .upload(storagePath, new Uint8Array(photoBuffer), {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error(`❌ Storage upload failed:`, uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload photo", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("delivery-photos")
      .getPublicUrl(storagePath);

    console.log(`✅ Photo uploaded: ${storagePath}`);

    // ============================================
    // 4. UPDATE ORDER WITH PHOTO URL & TIMESTAMP
    // ============================================
    const capturedAt = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        delivery_photo_url: publicUrl.publicUrl,
        delivery_photo_captured_at: capturedAt,
        updated_at: capturedAt,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Order update failed:`, updateError);
      // Photo is uploaded but order wasn't updated — log for manual intervention
      return new Response(
        JSON.stringify({
          error: "Photo uploaded but order update failed",
          details: updateError.message,
          photo_url: publicUrl.publicUrl,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📍 Order ${orderId} updated with delivery photo`);

    // ============================================
    // 5. SUCCESS RESPONSE
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        photo_url: publicUrl.publicUrl,
        captured_at: capturedAt,
        message: "Delivery photo captured successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("💥 Upload Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
