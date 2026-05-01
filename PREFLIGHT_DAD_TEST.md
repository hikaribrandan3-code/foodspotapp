# 📋 Pre-Flight Checklist + Dad's Test Environment Setup
**Date:** May 1, 2026 (Tonight)  
**Purpose:** Prepare everything so dad can test delivery payment tomorrow at 10am-2pm  
**Time Estimate:** 30 minutes

---

## 🔧 DEV SETUP (You, Tonight)

### 1. Database Migration
```bash
cd /path/to/foodspotapp-main

# Run migration locally
supabase db reset

# Verify columns exist
supabase db execute "SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name LIKE 'delivery_%'"
```

**Expected Output:**
```
delivery_photo_captured_at
delivery_photo_url
```

**✅ Checklist:**
- [ ] Migration applied without errors
- [ ] Columns verified in DB

---

### 2. Edge Functions Deployment

```bash
# Deploy in order (webhooks first)
supabase functions deploy mp-webhook --no-verify-jwt
supabase functions deploy mp-split-webhook --no-verify-jwt
supabase functions deploy create-preference
supabase functions deploy create-split-preference
supabase functions deploy upload-delivery-photo
supabase functions deploy mp-oauth

# Verify all deployed
supabase functions list | grep "mp-webhook\|create-preference\|upload-delivery-photo"
```

**Expected Output:**
```
mp-webhook                  Deployed
mp-split-webhook            Deployed
create-preference           Deployed
create-split-preference     Deployed
upload-delivery-photo       Deployed
mp-oauth                    Deployed
```

**✅ Checklist:**
- [ ] All 6 functions deployed
- [ ] No deployment errors

---

### 3. Environment Variables

**Verify in Supabase:**
```bash
supabase secrets list
```

**Required Secrets:**
- [ ] `MP_WEBHOOK_SECRET` - Set and correct value
- [ ] `SUPABASE_URL` - Populated
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Populated

**If Missing, Add:**
```bash
supabase secrets set MP_WEBHOOK_SECRET="your_secret_here"
supabase secrets set SUPABASE_URL="https://buendqgmwpxdixwvlkhd.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_key_here"
```

**✅ Checklist:**
- [ ] `MP_WEBHOOK_SECRET` confirmed
- [ ] Both SUPABASE env vars exist

---

### 4. Storage Setup

```bash
# Check if bucket exists
supabase storage ls

# If no 'delivery-photos' bucket:
supabase storage buckets create delivery-photos

# Verify RLS policies (should be applied by migration)
# Check Supabase dashboard: Storage → delivery-photos → Policies
```

**✅ Checklist:**
- [ ] `delivery-photos` bucket exists
- [ ] RLS policies visible in dashboard

---

### 5. Dad's Tenant Configuration

**Check Dad's Restaurant in Supabase:**

```sql
-- Replace 'dad-restaurant' with actual business_id or name
SELECT id, business_name, mp_user_id, mp_access_token, service_modes
FROM branding
WHERE business_name LIKE '%dad%' OR business_name LIKE '%restaurant%'
LIMIT 1;
```

**Must Have:**
- [ ] `business_name` = Dad's restaurant
- [ ] `service_modes` includes `delivery: true`
- [ ] `mp_user_id` = Dad's MP user ID
- [ ] `store_lat`, `store_lon` = Delivery location coords
- [ ] `delivery_radius` = Delivery zone (e.g., 10 km)
- [ ] `delivery_fee` = Delivery cost (e.g., $2.50 ARS)

**If Missing, Add:**
```sql
INSERT INTO branding (id, business_name, business_id, mp_user_id, service_modes, store_lat, store_lon, delivery_radius, delivery_fee)
VALUES (
  gen_random_uuid(),
  'Dad Restaurant',
  '{BUSINESS_ID}',
  '{DAD_MP_USER_ID}',
  '{"delivery":true,"pickup":true,"dineIn":false}'::jsonb,
  -34.6037,  -- Dad's store lat
  -58.3816,  -- Dad's store lon
  10,
  250  -- $2.50 ARS in cents
)
ON CONFLICT (business_id) DO UPDATE SET
  service_modes = '{"delivery":true,"pickup":true,"dineIn":false}'::jsonb,
  mp_user_id = '{DAD_MP_USER_ID}';
```

**✅ Checklist:**
- [ ] Dad's tenant record exists
- [ ] `service_modes.delivery` = true
- [ ] `mp_user_id` populated
- [ ] Delivery zone coordinates set

---

### 6. Dad's MP Token (OAuth)

**Two Options:**

#### Option A: Dad Provides Client ID + Secret
```sql
INSERT INTO branding_secrets (id, business_id, mp_client_id, mp_client_secret, mp_user_id)
VALUES (
  gen_random_uuid(),
  '{DAD_BUSINESS_ID}',
  '{DAD_CLIENT_ID}',
  '{DAD_CLIENT_SECRET}',
  '{DAD_MP_USER_ID}'
)
ON CONFLICT (business_id) DO UPDATE SET
  mp_client_id = '{DAD_CLIENT_ID}',
  mp_client_secret = '{DAD_CLIENT_SECRET}';
```

#### Option B: Dad Provides Access Token Directly
```sql
INSERT INTO branding (id, business_id, mp_user_id, mp_access_token)
VALUES (
  gen_random_uuid(),
  '{DAD_BUSINESS_ID}',
  '{DAD_MP_USER_ID}',
  '{DAD_ACCESS_TOKEN}'
)
ON CONFLICT (business_id) DO UPDATE SET
  mp_access_token = '{DAD_ACCESS_TOKEN}';
```

**✅ Checklist:**
- [ ] Dad's MP credentials added (either client ID/secret or token)
- [ ] Both `branding` and `branding_secrets` updated

---

### 7. Test Mode Setup

**For Testing (Sandbox):**
- Dad should use MP test account: `test_user_{id}@testuser.com`
- Or use test card: `5031 7557 3453 2488` (Visa test)

**For Live (Tomorrow):**
- Dad logs into his real Mercado Pago account
- Uses his real credentials

**✅ Checklist:**
- [ ] Decide: sandbox or live mode
- [ ] Communicate choice to dad

---

## 🌐 DAD'S TEST ENVIRONMENT (Share with Dad)

### Prerequisites
- [ ] Mercado Pago account (personal or test)
- [ ] Mobile phone with camera
- [ ] Phone has internet (WiFi or mobile data)
- [ ] ~30 minutes available tomorrow (10am-2pm)

---

### Test Link for Dad

**Share this URL:**
```
https://app.foodspot.com/{tenantSlug}/order?restaurant_id={businessId}
```

**OR directly:**
```
https://app.foodspot.com/dad-restaurant/order
```

**What Dad Will See:**
1. FoodSpot menu
2. Add items to cart
3. Checkout page with:
   - Address field (his delivery address)
   - Payment method: "Mercado Pago"
4. Click "Pagar" (Pay)
5. Redirect to Mercado Pago
6. Pay with his real card
7. Order appears in kitchen
8. Staff marks "Despachado" (dispatched)
9. Camera button appears: "📸 Tomar foto"
10. Dad takes photo of order
11. Photo uploads
12. Delivery tracker shows proof ✅

---

### Talking Points for Dad

**Brief Intro (30 seconds):**
> "Hey! I built a delivery app feature. You're going to test it by ordering food, paying with your real Mercado Pago account, and then taking a photo when the order arrives. This tests our payment system and proof-of-delivery feature. Should take 30 minutes. Sound good?"

**What to Expect:**
1. Order menu items (any items available in system)
2. Enter delivery address (within delivery zone)
3. Pay with Mercado Pago (his account, real money)
4. Order appears in kitchen
5. Take a photo when "order is ready"
6. Photo shows up in the app as proof

**If He Sees an Error:**
- Take screenshot
- Note the time it happened
- Send to you with message: "This broke at 2:15pm"

**Success Signal:**
- Photo appears in delivery tracker
- Timestamp shows capture time
- Message: "✅ Foto de entrega guardada"

---

### Day-Of Timeline for Dad

**Morning (Before Test):**
- [ ] Have Mercado Pago app open on phone
- [ ] Make sure phone camera works
- [ ] Confirm delivery address is within zone
- [ ] Open browser with test link ready

**During Test (10am-2pm):**
- [ ] Click "Start Order" in app
- [ ] Add items (pick whatever he wants)
- [ ] Select delivery address (check it's within zone)
- [ ] Select "Mercado Pago" payment
- [ ] Click "Pagar" (Pay button)
- [ ] Complete payment on Mercado Pago (use real account)
- [ ] Wait for order to appear in kitchen (5-30 seconds)
- [ ] Confirm order status changes to "Despachado" (dispatched)
- [ ] Look for camera button: "📸 Tomar foto"
- [ ] Click it, take a photo
- [ ] Confirm photo upload (wait 2-3 seconds)
- [ ] Check delivery tracker - photo should appear
- [ ] Text you: "Done! Photo worked ✅"

**If Something Breaks:**
- [ ] Screenshot the error
- [ ] Note the time and what he was doing
- [ ] Send screenshot to you
- [ ] Don't keep retrying (wastes real money)

---

### Payment Amount Discussion

**Cost Breakdown:**
- Menu items: ~$X ARS
- Delivery fee: $2.50 ARS
- Total: ~$Y ARS (actual charge)

**Important:**
- This is a REAL payment with dad's real money
- Will charge his Mercado Pago account
- Confirm he's okay with the amount before he starts
- (You might want to reimburse him or discount later 😊)

---

## 🚀 LAUNCH READINESS CHECKLIST (Final)

### Code
- [ ] Migration applied (`delivery_photo_url` columns exist)
- [ ] Edge functions deployed (6 functions live)
- [ ] DeliveryTracker wired with camera UI
- [ ] StaffKDS wired with photo preview

### Infrastructure
- [ ] Storage bucket created (`delivery-photos`)
- [ ] RLS policies set (upload, read, delete)
- [ ] Environment variables confirmed
- [ ] CORS headers configured

### Tenant Setup
- [ ] Dad's business record exists in `branding`
- [ ] Dad's MP credentials in `branding_secrets`
- [ ] Service modes configured (delivery: true)
- [ ] Delivery zone coordinates set

### Monitoring
- [ ] Logs ready to tail (webhook, upload-delivery-photo, create-preference)
- [ ] Supabase dashboard open
- [ ] Storage browser ready to check photos

### Communication
- [ ] Dad has test link
- [ ] Dad knows timeline (10am-2pm tomorrow)
- [ ] Dad knows what to expect
- [ ] Dad knows what to do if error occurs

---

## 📱 QUICK SETUP SCRIPT (Optional)

If you want to automate setup:

```bash
#!/bin/bash

# Run all checklist items
echo "🔧 Deploying edge functions..."
supabase functions deploy mp-webhook --no-verify-jwt
supabase functions deploy mp-split-webhook --no-verify-jwt
supabase functions deploy create-preference
supabase functions deploy create-split-preference
supabase functions deploy upload-delivery-photo
supabase functions deploy mp-oauth

echo "✅ Running database migrations..."
supabase db reset

echo "✅ Checking storage..."
supabase storage ls

echo "✅ Verifying secrets..."
supabase secrets list | grep MP_WEBHOOK_SECRET

echo "✅ All done! Ready for tomorrow's test."
```

Save as `setup.sh`, run: `bash setup.sh`

---

## Rollback Plan (If Critical Issue Found)

If tomorrow's test reveals a critical bug:

1. **Revert edge function:**
   ```bash
   supabase functions delete upload-delivery-photo
   ```

2. **Skip camera feature for soft launch:**
   - Deploy without photo requirement
   - Orders still work (just no POD)
   - Add camera in v2 post-launch

3. **Reschedule test:**
   - Fix issue
   - Re-test with dad next day
   - Launch once verified

---

## Success Criteria (Tomorrow)

✅ All of these must pass:

1. **Payment completes** - Dad's card charged, order appears in kitchen
2. **Webhook fires** - Order status changes to `released_to_kitchen`
3. **Camera opens** - "📸 Tomar foto" button visible and clickable
4. **Photo captures** - Dad can take and edit photo
5. **Photo uploads** - Edge function succeeds, no errors
6. **Photo visible** - Shows in delivery tracker + KDS
7. **No double-charge** - Only one payment transaction
8. **Real-time updates** - Tracker updates without refresh

**Decision:**
- ✅ All pass → Soft launch APPROVED
- ❌ Any fail → Debug & retest (delay soft launch)

---

## Questions for Dad (Before Test)

1. **"Is your delivery address within the delivery zone?"** (Usually yes if in city)
2. **"Do you have Mercado Pago set up?"** (Need real account for real payment)
3. **"Is your phone camera working?"** (Need it to take photo)
4. **"Do you have ~30 minutes available tomorrow?"** (Not too rushed)
5. **"Is it okay if this charges your account for the test order?"** (Real $ charged)

---

## Post-Test Debrief

**If ✅ Success:**
- Message: "Soft launch is GO. Mercado Pago + photo working perfectly."
- Next step: Enable for select customers, monitor 24h
- Timeline: Expand to all customers after 48h of zero issues

**If ❌ Blocker Found:**
- Debug immediately
- Note issue in TEST_CHECKLIST_2026-05-02.md
- Schedule retest for next day
- Don't push soft launch until resolved

---

## Files Ready for Tomorrow

Ensure these files are accessible:

- ✅ `TEST_CHECKLIST_2026-05-02.md` - Full test procedure
- ✅ `PREFLIGHT_DAD_TEST.md` - This file
- ✅ Migration: `supabase/migrations/2026-05-01_delivery_photo_pod.sql`
- ✅ Edge function: `supabase/functions/upload-delivery-photo/index.ts`
- ✅ Updated: `src/pages/customer/DeliveryTracker.jsx`
- ✅ Updated: `src/pages/staff/StaffKDS.jsx`

---

## Sleep Well! 😴

Tonight:
1. Run preflight checklist ✅
2. Deploy functions ✅
3. Verify env vars ✅
4. Prep storage ✅
5. Confirm dad's ready ✅
6. **Get sleep** (you'll need it if we find issues tomorrow)

Tomorrow:
- Dad tests at 10am-2pm
- You monitor logs
- Validate results
- Make soft launch decision

**You've got this!** The code is solid (Kimi's audit passed), the camera is wired cleanly, and idempotency is locked in. 🚀
