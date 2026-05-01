# 🎯 Mercado Pago External Payment Test Checklist
**Date:** May 2, 2026 (Tomorrow)  
**Tester:** Dad (Real Mercado Pago Account)  
**Duration:** ~30-45 minutes  
**Goal:** Validate MP payment flow + delivery photo capture end-to-end

---

## Pre-Test Setup (Run Tonight)

- [ ] **Database Migration Applied**
  - Run: `supabase db reset` (local) OR manually execute `2026-05-01_delivery_photo_pod.sql`
  - Verify: `SELECT * FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_photo_url'`
  - Expected: Columns `delivery_photo_url` and `delivery_photo_captured_at` exist

- [ ] **Edge Functions Deployed**
  ```bash
  supabase functions deploy upload-delivery-photo
  supabase functions deploy mp-webhook --no-verify-jwt
  supabase functions deploy create-preference
  ```

- [ ] **Environment Variables Set**
  - [ ] `MP_WEBHOOK_SECRET` is set in Supabase
  - [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are in Deno env
  - [ ] Dad's Mercado Pago credentials in `branding` and `branding_secrets` tables:
    - [ ] `mp_access_token` (OAuth token)
    - [ ] `mp_user_id` (from MP dashboard)
    - [ ] `mp_client_id` and `mp_client_secret` (if refreshing tokens)

- [ ] **Storage Bucket Created**
  - Verify: `delivery-photos` bucket exists in Supabase Storage
  - RLS Policies applied (upload, read, delete)

- [ ] **Test Tenant Ready**
  - [ ] Ghost Burger (or dad's restaurant) has records in `branding` + `branding_secrets`
  - [ ] `app_config` has `service_modes.delivery: true`

---

## Test Flow: Delivery Payment (Main Flow)

### Step 1: Create Delivery Order
**Action:** Open app → select delivery → add items → checkout  
**Expected Results:**
- [ ] Order type dropdown shows "Entrega" (delivery)
- [ ] Address fields visible (street, number, floor, notes)
- [ ] Delivery fee calculated (e.g., $2.50 ARS)
- [ ] Customer can input delivery address

**Criteria:** ✅ Address fields populate correctly

---

### Step 2: Mercado Pago Checkout
**Action:** Select "Mercado Pago" payment → click "Pagar" (Pay)  
**Expected Results:**
- [ ] Redirect to Mercado Pago checkout (sandbox or live)
- [ ] Redirect URL shows: `init_point` OR `sandbox_init_point`
- [ ] Order is persisted to DB (status: `pending_payment`)

**Monitor Logs:**
```bash
supabase functions logs create-preference --tail
```
Expected: `[create-preference] Order {order_id} preference created: {mp_pref_id}`

**Criteria:** ✅ MP checkout page loads

---

### Step 3: Real Payment with Dad's Card
**Action:** Dad completes payment on MP checkout using real Mercado Pago credentials  
**Expected Results:**
- [ ] Payment approved on MP dashboard (`https://www.mercadopago.com.ar`)
- [ ] Dad sees "Pago aprobado" or similar confirmation
- [ ] Redirect back to app with success page or tracking page

**Criteria:** ✅ Payment appears in MP dashboard as "approved"

---

### Step 4: Webhook Fires (Order → Kitchen)
**Action:** Wait 5-30 seconds after payment approval  
**Monitor Logs:**
```bash
supabase functions logs mp-webhook --tail
```

**Expected Log Sequence:**
```
🔔 Webhook received: type=payment, data.id=12345678...
🛡️ HMAC Signature Verified
📡 Fetching payment details for ID: 12345678
🏢 Tenant from branding_secrets: Ghost Burger, Business: {business_id}
✅ Payment stored: transaction_ledger entry created
🎉 Order #{order_number} PAID → KITCHEN! Ledger: {ledger_id}
```

**Database Check:**
```sql
SELECT id, status, payment_status, payment_id, paid_at 
FROM orders 
WHERE id = '{order_id}' 
LIMIT 1;
```
Expected: 
- `status: released_to_kitchen`
- `payment_status: paid`
- `payment_id: {mp_payment_id}`
- `paid_at: {current_timestamp}`

**Criteria:** ✅ Webhook fired, order released to kitchen

---

### Step 5: Order Shows in Kitchen (KDS)
**Action:** View staff KDS page (kitchen display system)  
**Expected Results:**
- [ ] Order appears in "En cocina" (released_to_kitchen) column
- [ ] Order number, items, and price visible
- [ ] No delivery photo shown yet (status != dispatched)

**Criteria:** ✅ Order visible in kitchen queue

---

### Step 6: Staff Prepares & Advances to Ready
**Action:** Staff marks order as "Listo" (ready)  
**Expected Results:**
- [ ] Button in "Preparando" column → "Listo"
- [ ] Order moves to "Listo" column
- [ ] Delivery tracker updates (customer sees "Listo")

**Criteria:** ✅ Order transitions smoothly

---

### Step 7: Staff Dispatches Order (Delivery Driver Assignment)
**Action:** Click "Dispatch" button (if delivery order)  
**Expected Results:**
- [ ] Order status changes to `dispatched`
- [ ] Delivery tracker shows "Despachado" (driver on the way)
- [ ] **Camera button appears:** "📸 Tomar foto" (Take Photo)
- [ ] NO photo URL in database yet

**Database Check:**
```sql
SELECT status, delivery_photo_url 
FROM orders 
WHERE id = '{order_id}';
```
Expected: `status: dispatched, delivery_photo_url: NULL`

**Criteria:** ✅ Camera prompt visible to customer

---

### Step 8: Customer Captures Delivery Photo
**Action:** Dad clicks "📸 Tomar foto" button in delivery tracker  
**Expected Results:**
- [ ] Camera opens in fullscreen
- [ ] Dad can see camera feed (live or permission prompt)
- [ ] "Capture" button available

**Note:** If camera permission denied, show error: "Camera access required"

**Criteria:** ✅ Camera module loads

---

### Step 9: Photo Capture & Edit
**Action:** Dad clicks capture → edits photo (crop, rotate) → confirms  
**Expected Results:**
- [ ] Capture freezes the frame
- [ ] Editor appears (crop/rotate controls)
- [ ] Dad can crop/rotate if needed
- [ ] "Confirm" button uploads photo

**Criteria:** ✅ Photo editor responds to input

---

### Step 10: Photo Upload to Server
**Monitor Logs:**
```bash
supabase functions logs upload-delivery-photo --tail
```

**Expected Log Sequence:**
```
📸 Photo upload received: order_id={uuid}, file_size=XXXXX
✅ Photo uploaded: orders/delivery-photos/{order_id}_{timestamp}.jpg
📍 Order {order_id} updated with delivery photo
```

**Database Check:**
```sql
SELECT delivery_photo_url, delivery_photo_captured_at 
FROM orders 
WHERE id = '{order_id}';
```
Expected:
- `delivery_photo_url: https://...delivery-photos/{order_id}_{timestamp}.jpg`
- `delivery_photo_captured_at: {current_timestamp}`

**Storage Check:**
- [ ] Photo exists in Supabase Storage: `delivery-photos/orders/{order_id}_{timestamp}.jpg`
- [ ] Photo is publicly accessible (can view in browser)

**Criteria:** ✅ Photo persisted to storage + database

---

### Step 11: Delivery Tracker Shows Photo
**Action:** Refresh delivery tracker page or wait for real-time update  
**Expected Results:**
- [ ] Photo preview appears in tracker
- [ ] Text: "✅ Foto de entrega guardada"
- [ ] Timestamp shows capture time
- [ ] Status may auto-advance to "Entregado" (delivered)

**Criteria:** ✅ Photo visible to customer

---

### Step 12: Staff KDS Shows Delivery Photo
**Action:** View staff KDS page for this order  
**Expected Results:**
- [ ] Order card shows photo thumbnail
- [ ] Status shows: "⏳ Esperando foto de entrega" → "✅ Foto: HH:MM:SS"
- [ ] NO warning: "⚠️ Entregado sin foto"

**Criteria:** ✅ Photo visible to staff

---

## Idempotency Test (Race Condition)

### Scenario: Duplicate Webhook
**Action:** MP sends payment notification twice within 5 seconds (common)  
**Expected Results:**
- [ ] First webhook: order updates, ledger created
- [ ] Second webhook: order already has `payment_id` = first payment
- [ ] Log shows: `♻️ Idempotent Replay: Order {id} already processed with payment {id}`
- [ ] Second response: `status: 200, already_processed`
- [ ] **NO double charge, NO duplicate ledger entries**

**Criteria:** ✅ Webhook is idempotent

---

## Edge Cases to Verify

### Case 1: Photo Upload Fails (Network Error)
**Action:** Take photo, then network goes down during upload  
**Expected Results:**
- [ ] Error message: "❌ Photo upload failed"
- [ ] Retry button appears
- [ ] Order status NOT changed to delivered (photo is proof of delivery)

**Criteria:** ✅ Graceful error handling

---

### Case 2: Photo Captured for Non-Delivery Order
**Action:** Try to upload photo for a pickup order (not delivery)  
**Expected Results:**
- [ ] Edge function returns: `400 This order is not a delivery order`
- [ ] Error shown to user
- [ ] Order NOT updated

**Criteria:** ✅ Type validation works

---

### Case 3: Photo Captured but Order Status Wrong
**Action:** Manually change order status from `dispatched` to `ready`  
**Expected Results:**
- [ ] Photo upload still succeeds (graceful)
- [ ] But logs show warning: `⚠️ Order is in status 'ready', expected 'dispatched'`

**Criteria:** ✅ Upload doesn't break

---

## Payment Type Variations

### Pickup Order with MP Payment
**Action:** Create pickup order, select MP, pay  
**Expected Results:**
- [ ] Webhook fires, order released to kitchen
- [ ] NO dispatch step (pickup has no delivery)
- [ ] NO camera prompt (only delivery orders need POD)
- [ ] Order goes: `ready` → `delivered` (no intermediate steps)

**Criteria:** ✅ Pickup flow unaffected

---

### Dine-In Order (Cash Only)
**Action:** Select dine-in, try to change payment method  
**Expected Results:**
- [ ] Payment method forced to "Efectivo" (cash)
- [ ] NO Mercado Pago option visible
- [ ] Order goes straight to kitchen (no payment gate)
- [ ] NO camera prompt

**Criteria:** ✅ Dine-in forced-cash works

---

## Success Criteria (All Must Pass)

✅ **Payment Flow**
- [ ] Webhook fires 5-30 seconds after MP approval
- [ ] Order status changes to `released_to_kitchen`
- [ ] Payment status changes to `paid`
- [ ] Transaction ledger entry created

✅ **Delivery Photo**
- [ ] Camera opens when order status = `dispatched`
- [ ] Photo captures and uploads successfully
- [ ] Photo stored in Supabase Storage (publicly accessible)
- [ ] Order record updated with photo URL + timestamp

✅ **Real-Time Updates**
- [ ] Delivery tracker updates without page refresh
- [ ] Staff KDS updates without page refresh
- [ ] Photo appears in both within 2-3 seconds

✅ **Idempotency**
- [ ] Duplicate webhook doesn't cause double payment
- [ ] No duplicate ledger entries
- [ ] Second webhook returns 200 with `already_processed`

✅ **No Regressions**
- [ ] Pickup orders unaffected
- [ ] Dine-in orders unaffected
- [ ] Existing cash payment flow intact

---

## Failure Scenarios (RED FLAGS)

🚨 **CRITICAL BLOCKERS:**
- [ ] Webhook never fires (check `MP_WEBHOOK_SECRET` env var)
- [ ] Order status doesn't change to `released_to_kitchen`
- [ ] Photo doesn't upload (storage bucket missing or RLS blocked)
- [ ] HMAC signature mismatch (token mismatch)
- [ ] Double charge occurs (idempotency failed)

⚠️ **MINOR ISSUES (Can Fix Post-Launch):**
- [ ] Camera permission denied on some phones
- [ ] Photo upload takes >5 seconds
- [ ] UI layout breaks on mobile

---

## Post-Test Actions

### If ALL Criteria Pass ✅
1. **Soft Launch Decision:** APPROVED
2. Send message: "Mercado Pago is locked in for soft launch tomorrow"
3. Notify: Select customers can now access delivery + MP payment
4. Monitor: Watch webhook logs for 24h
5. Scale: Expand to more customers after 48h of zero issues

### If Any CRITICAL Blocker ❌
1. **Debug:** Check logs, env vars, RLS policies
2. **Fix:** Apply fixes, redeploy edge functions
3. **Retest:** Run test checklist again with dad
4. **Escalate:** If issue persists >1h, push soft launch to next day

---

## Logs to Monitor During Test

**Terminal 1: Webhook**
```bash
supabase functions logs mp-webhook --tail
```

**Terminal 2: Photo Upload**
```bash
supabase functions logs upload-delivery-photo --tail
```

**Terminal 3: Preference Creation**
```bash
supabase functions logs create-preference --tail
```

**Browser Dev Tools:**
- [ ] Network tab: Check MP API calls, storage upload
- [ ] Console: Check for JS errors
- [ ] Application → Storage: Check localStorage for tokens/order IDs

---

## Time Estimates

| Phase | Duration |
|-------|----------|
| Setup & migration | 5 min |
| Create delivery order | 2 min |
| MP checkout | 1 min |
| Dad pays | 2 min |
| Webhook fires (wait) | 5-30 sec |
| Staff prepares | 2 min |
| Staff dispatches | 1 min |
| Dad takes photo | 2 min |
| Photo uploads (wait) | 2-5 sec |
| Verify storage + DB | 2 min |
| Idempotency test | 3 min |
| Edge cases | 10 min |
| **Total** | **~35 minutes** |

---

## Contact Plan

**If Issue Found During Test:**
- [ ] Screenshot error message
- [ ] Copy log output (paste into Slack/email)
- [ ] Note exact time issue occurred
- [ ] Describe what you were doing when it broke
- [ ] Send to dev: "Help debugging Mercado Pago issue at 3:45pm"

**Success Handoff:**
- [ ] Take screenshot of delivery tracker with photo
- [ ] Send: "Mercado Pago delivery payment + photo capture working perfectly ✅"
