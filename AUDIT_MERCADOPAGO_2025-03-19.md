# 🔴 MERCADO PAGO AUDIT — CRITICAL FAILURES FOUND

**Date:** 2025-03-19  
**Scope:** Payment routing, webhook handling, Edge Functions  
**Severity:** 🔴 HIGH — Payments falling back to cash silently

---

## 🎯 THE USER'S SYMPTOM

> "When I try to pay thru Mercado Pago, it routes the same way as if I paid cash"

**Translation:** The MP branch is failing silently and falling back to the cash/WhatsApp flow.

---

## 🔴 CRITICAL BUG #1: Wrong Webhook URL in `create-preference`

**File:** `supabase/functions/create-preference/index.ts` (line ~93)

```javascript
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mercadopago-handler`;
```

**Problem:** This points to the OLD `mercadopago-handler` function. But the proper, working webhook is `mp-webhook`.

**What `mercadopago-handler` does (WRONG):**
- Uses a **single global** `MP_ACCESS_TOKEN` env var
- No multi-tenant support — can't handle per-business MP accounts
- Sets order status to `paid_unreleased` (inconsistent with rest of app)
- No HMAC verification
- No idempotency guards

**What `mp-webhook` does (CORRECT):**
- Multi-tenant token lookup via `branding_secrets.mp_user_id`
- HMAC signature verification
- Idempotency guards (won't double-process)
- Transaction ledger integration
- Sets order status to `released_to_kitchen` (correct)

**Fix:**
```javascript
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mp-webhook`;
```

---

## 🔴 CRITICAL BUG #2: Old Webhook Uses Global Token (Breaks Multi-Tenant)

**File:** `supabase/functions/mercadopago-handler/index.ts` (line ~111)

```javascript
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
```

**Problem:** This is ONE global token. But `create-preference` fetches a **per-tenant** token from `branding.mp_access_token`. When Mercado Pago sends the webhook, the handler tries to verify the payment using the wrong token. If each vendor has their own MP account, this **always fails**.

**The flow that breaks:**
1. Ghost Burger creates preference with THEIR token
2. Customer pays on MP
3. MP sends webhook to `mercadopago-handler`
4. Handler tries to fetch payment details with GLOBAL token
5. MP API rejects it (404/401 — payment not found for this token)
6. Handler returns error
7. Order never marked as paid

---

## 🔴 CRITICAL BUG #3: Silent Cash Fallback on ANY Error

**File:** `src/pages/customer/Order.jsx` (lines ~340-360)

```javascript
} catch (mpError) {
    // ========== SILENT MP FALLBACK ==========
    console.warn('[Order] MP fallback triggered:', mpError.message)
    await supabase
        .from('orders')
        .update({ payment_method: 'efectivo' })
        .eq('id', savedOrder.id)
    if (whatsappUrl) {
        window.open(whatsappUrl, '_blank')
    }
    showToast('✅ ' + t('cash_registered'))
}
```

**Problem:** When the MP Edge Function fails for ANY reason (not deployed, wrong JWT, network timeout, invalid token, etc.), the frontend:
1. Silently patches the order to `payment_method: 'efectivo'`
2. Opens WhatsApp (cash receipt behavior)
3. Shows "cash_registered" toast
4. The user thinks they paid cash, not MP

**But it gets worse:** The order `status` is NOT updated. It stays `pending_payment`. So on the status page it shows "Awaiting Confirmation" forever.

---

## 🔴 CRITICAL BUG #4: `mp-webhook` Expects `branding_secrets` Table

**File:** `supabase/functions/mp-webhook/index.ts` (lines ~117-128)

```javascript
const { data: secretData, error: secretError } = await supabase
    .from("branding_secrets")
    .select("mp_access_token, id, business_id")
    .eq("mp_user_id", mpUserId)
    .single();
```

**Problem:** `mp-webhook` looks up the access token from `branding_secrets` using `mp_user_id`. But `create-preference` reads from `branding` table directly:

```javascript
const { data: branding, error: brandingError } = await supabase
    .from("branding")
    .select("mp_access_token, business_name, slug")
    .eq("business_id", order.business_id)
    .single();
```

**Two problems:**
1. `branding_secrets` table may not exist or may not have the data
2. `branding.mp_access_token` and `branding_secrets.mp_access_token` are in **different tables** — they can get out of sync

**The webhook also needs `mp_user_id`** (Mercado Pago's account ID) to look up the token. This must be stored in `branding_secrets` when the vendor connects their MP account.

---

## 🔴 CRITICAL BUG #5: Order Status Inconsistency

| Flow | Initial Status | After Webhook | Status Page Shows |
|------|---------------|---------------|-------------------|
| Cash | `released_to_kitchen` | — | "Order Confirmed" |
| MP (current) | `pending_payment` | `paid_unreleased` (old webhook) or stuck | "Awaiting Confirmation" |
| MP (correct) | `pending_payment` | `released_to_kitchen` (mp-webhook) | "Order Confirmed" |

**Problem:** `mercadopago-handler` sets `paid_unreleased` but `mp-webhook` sets `released_to_kitchen`. The frontend status page checks `isPaid = order.status !== 'pending_payment'`, so `paid_unreleased` DOES show as paid. But if the webhook fails, the order is stuck at `pending_payment`.

---

## 🔴 CRITICAL BUG #6: `create-preference` Modifies `back_urls` Incorrectly

**File:** `src/pages/customer/Order.jsx` (line ~335)

```javascript
const redirectUrl = new URL(prefData.init_point)
redirectUrl.searchParams.set('order_id', savedOrder.id)
window.location.href = redirectUrl.toString()
```

**Problem:** `init_point` is already a complete Mercado Pago URL. The frontend is injecting `order_id` into it. But MP's `back_urls` already have `external_reference` (the order ID). This injection is unnecessary and might cause issues with MP's redirect logic.

**The `back_urls` in create-preference:**
```javascript
success: `${statusBase}/${order.id}?payment=success`,
failure: `${statusBase}/${order.id}?payment=failure`,
pending: `${statusBase}/${order.id}?payment=pending`
```

Wait — these include `/${order.id}` in the path. But the status route is `/${tenantSlug}/status?orderId=xxx`. This path mismatch might cause 404s when returning from MP.

---

## 📋 THE COMPLETE BROKEN FLOW

```
1. User selects "Mercado Pago" in Order.jsx
2. Order created with status: 'pending_payment'
3. Frontend calls create-preference Edge Function
4. Function fetches tenant's mp_access_token from branding table ✅
5. Function creates MP preference with notification_url pointing to OLD webhook ❌
6. User redirected to MP checkout ✅
7. User pays on MP ✅
8. MP sends webhook to mercadopago-handler ❌ (wrong handler)
9. Handler tries to verify with GLOBAL token ❌ (wrong token)
10. Verification fails — order never updated ❌
11. OR: Edge Function fails in step 3-5, catch block triggers ❌
12. Frontend patches order to payment_method: 'efectivo' ❌
13. WhatsApp opens — user thinks they paid cash ❌
14. Order status stays 'pending_payment' forever ❌
```

---

## ✅ REQUIRED FIXES (In Priority Order)

### Fix 1: Point `create-preference` to `mp-webhook`
**File:** `supabase/functions/create-preference/index.ts`
```javascript
// BEFORE:
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mercadopago-handler`;

// AFTER:
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mp-webhook`;
```

### Fix 2: Unify Token Storage
Either:
- **Option A:** Store `mp_access_token` ONLY in `branding_secrets` (not `branding`), and ensure `mp_user_id` is populated when vendor connects MP
- **Option B:** Modify `mp-webhook` to fall back to `branding.mp_access_token` if `branding_secrets` lookup fails

### Fix 3: Fix `mp-webhook` Token Lookup to Match `create-preference`
Since `create-preference` uses `branding.mp_access_token`, the webhook should too. Modify `mp-webhook` to:
1. First try `branding_secrets` with `mp_user_id`
2. If that fails, look up `business_id` from the order, then fetch `branding.mp_access_token`

### Fix 4: Remove or Fix the Silent Cash Fallback
The fallback in Order.jsx is dangerous. At minimum:
- Show the actual error to the user (don't hide it)
- Don't patch payment_method to 'efectivo' — keep it as 'mercadopago' and let them retry
- Don't open WhatsApp on MP failure

### Fix 5: Fix `back_urls` Path
The status page URL should match the actual React Router route:
```javascript
// BEFORE:
success: `${statusBase}/${order.id}?payment=success`,

// AFTER (if route is /:slug/status?orderId=xxx):
success: `${statusBase}?orderId=${order.id}&payment=success`,
```

### Fix 6: Deploy `mp-webhook` with `--no-verify-jwt`
```bash
supabase functions deploy mp-webhook --no-verify-jwt
```

### Fix 7: Ensure `branding_secrets` Table Exists
```sql
CREATE TABLE IF NOT EXISTS branding_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    mp_user_id TEXT, -- Mercado Pago account ID from webhook
    mp_access_token TEXT,
    mp_refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Fix 8: Add Missing `mp_user_id` Population
When a vendor connects their MP account (OAuth flow), store their MP `user_id` in `branding_secrets`:
```javascript
// After MP OAuth callback
const mpUserId = mpAccountResponse.user_id; // From MP API
await supabase.from('branding_secrets').upsert({
    business_id: businessId,
    mp_user_id: mpUserId,
    mp_access_token: accessToken,
    mp_refresh_token: refreshToken
});
```

---

## 🧪 QUICK DIAGNOSTIC CHECKLIST

Run these to confirm the issues:

1. **Check which webhook URL is stored on recent preferences:**
```sql
SELECT id, mp_preference_id, created_at 
FROM orders 
WHERE mp_preference_id IS NOT NULL 
ORDER BY created_at DESC LIMIT 5;
```
Then check the preference in MP dashboard to see its `notification_url`.

2. **Check if `mercadopago-handler` logs errors:**
Go to Supabase Dashboard → Edge Functions → `mercadopago-handler` → Logs
Look for 401/404 errors when fetching payments.

3. **Check if `mp-webhook` is deployed:**
```bash
supabase functions list
```

4. **Check if `branding_secrets` table exists:**
```sql
SELECT * FROM branding_secrets LIMIT 1;
```

5. **Check if Ghost Burger's `mp_user_id` is stored:**
```sql
SELECT mp_user_id, mp_access_token IS NOT NULL as has_token
FROM branding_secrets 
WHERE business_id = '<ghost-burger-id>';
```

6. **Check Edge Function logs for `create-preference`:**
Look for errors when creating preferences.

---

## 🎯 IMMEDIATE ACTION

**The fastest fix to get MP working TODAY:**

1. Change the webhook URL in `create-preference` from `mercadopago-handler` to `mp-webhook`
2. Deploy `mp-webhook` with `--no-verify-jwt`
3. Ensure `branding_secrets` has Ghost Burger's `mp_user_id` and `mp_access_token`
4. Test with Ghost Burger's $10 order

**If `branding_secrets` doesn't have the data yet:**
- Quick patch: Make `mp-webhook` fall back to `branding.mp_access_token`
- Then do the proper `branding_secrets` migration later

---

## 📊 IMPACT ASSESSMENT

| Issue | Impact | Fix Complexity |
|-------|--------|----------------|
| Wrong webhook URL | 🔴 HIGH (payments never confirm) | 1 line change |
| Global token in old webhook | 🔴 HIGH (multi-tenant broken) | Replace function |
| Silent cash fallback | 🔴 HIGH (user confusion, lost revenue) | 5 line change |
| branding_secrets mismatch | 🟡 MEDIUM | DB migration |
| back_urls path mismatch | 🟡 MEDIUM | URL construction fix |
| Order status inconsistency | 🟡 MEDIUM | Align statuses |

---

## 📝 NOTES

- The `create-split-preference` and `mp-split-webhook` appear to be properly paired (split payments use the right webhook)
- The main order flow is the one that's broken
- The `mercadopago-handler` function should probably be **deleted** after migrating to `mp-webhook` to avoid confusion
- Consider adding a `payment_method` of `mercado_pago` (with underscore) vs `mercadopago` (no underscore) — there's inconsistency in the codebase

---

*Audit by: Kimi Claw*  
*Next step: Fix #1 (webhook URL) and deploy*
