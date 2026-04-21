#!/bin/bash
# FoodSpot Payment Test Script — Manual Walkthrough
# Run this on your terminal or follow steps on iPhone + iPad

echo "🧪 FOODSPOT PAYMENT TEST — Chunk 1 Validation"
echo "============================================="
echo ""
echo "TEST SETUP:"
echo "- iPhone: Customer side"
echo "- iPad: Staff/Owner side"
echo ""
echo "STEP 1: Verify pages load"
curl -s -o /dev/null -w "Customer page: %{http_code}\n" https://foodspotapp.vercel.app/krappypatty
curl -s -o /dev/null -w "Owner page: %{http_code}\n" https://foodspotapp.vercel.app/krappypatty/owner/summary
echo ""
echo "EXPECTED: Both return 200"
echo ""

# The actual testing requires browser interaction
# Below is the manual checklist

cat << 'EOF'

📋 MANUAL TEST CHECKLIST
========================

PHASE A: Cash Payment Flow
--------------------------
1. iPhone: Open https://foodspotapp.vercel.app/krappypatty
2. Tap "Menu" or "Comprar"
3. Add 1-2 items to cart
4. Tap cart → "Continuar"
5. At payment screen, verify:
   [ ] 💵 "Efectivo" button visible (was hidden before fix)
   [ ] 💳 "Mercado Pago" button visible
   [ ] Both buttons are TAPABLE (not just display)
6. Select "Efectivo"
7. Tap "Confirmar Pedido"
8. Verify: Shows "✅ Pagás en efectivo al retirar" confirmation

9. iPad: Open https://foodspotapp.vercel.app/krappypatty/owner/summary
10. Login: hikaribrandan3@gmail.com / Aa39897828!
11. Navigate to "Delivery" or "Pedidos"
12. Find the new order (should appear in real-time or refresh)
13. Tap the order to expand
14. Verify:
    [ ] Order shows payment status: "⏳ Pendiente de Pago"
    [ ] Payment method shows: "Efectivo"
15. Tap "Confirmar Pago" button
16. Verify:
    [ ] Order status changes to "✅ Pagado" or similar
    [ ] Order moves to "Completado" or kitchen queue

17. SUPABASE CHECK (if you have access):
    - Go to Supabase dashboard → Table Editor → orders
    - Filter by business_id for krappypatty
    - Verify new order has:
      [ ] payment_method: 'cash'
      [ ] payment_status: 'approved'
      [ ] paid_at: <timestamp>
      [ ] status: 'released_to_kitchen'
    - Check transaction_ledger table:
      [ ] New entry with payment_method: 'cash'
      [ ] amount_gross_cents matches order total
      [ ] business_id matches krappypatty


PHASE B: Mercado Pago Payment Flow
----------------------------------
1. iPhone: Open https://foodspotapp.vercel.app/krappypatty
2. Add items, go to checkout
3. At payment screen, verify:
   [ ] 💳 "Mercado Pago" button visible (especially for pickup orders)
   [ ] Button works for ALL order types (delivery, pickup, dine-in)
4. Select "Mercado Pago"
5. Tap "Confirmar Pedido"
6. Verify: Redirects to Mercado Pago checkout
7. Complete sandbox payment (test card)
8. Verify: Redirects back to success page

9. iPad: Check orders
10. Verify:
    [ ] Order shows status: "paid_unreleased" (webhook confirmed)
    [ ] Or after staff action: "✅ Pagado"
11. SUPABASE CHECK:
    [ ] orders.status: 'paid_unreleased'
    [ ] orders.payment_method: 'mercadopago'
    [ ] transaction_ledger has entry with mp_payment_data JSON


PHASE C: Pickup Order MP Button
-------------------------------
1. iPhone: Order as PICKUP (not delivery)
2. Go to payment screen
3. CRITICAL VERIFY:
   [ ] 💳 "Mercado Pago" button IS VISIBLE
   [ ] Was broken before: pickup orders only showed cash, no MP
4. If MP button missing → BUG, report to Claude
5. If MP button present → FIXED, proceed with payment


PASS/FAIL CRITERIA
------------------
✅ PASS if:
  - Cash flow: Customer selects cash → staff confirms → order released to kitchen
  - MP flow: Customer pays MP → webhook fires → order paid
  - Pickup MP: MP button visible for pickup orders
  - All paths write to transaction_ledger
  - No JavaScript errors in browser console

❌ FAIL if:
  - Payment buttons don't appear
  - Staff confirm doesn't update Supabase
  - Webhook doesn't fire for MP
  - Orders stuck in "pending" after payment
  - Console shows errors


WHAT TO REPORT BACK
-------------------
Send me:
1. Which tests passed/failed
2. Screenshots of any errors
3. Any console error messages
4. Whether both cash + MP buttons appear on payment screen

EOF