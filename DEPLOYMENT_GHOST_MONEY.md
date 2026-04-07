# 🎮 Mission: Ghost Money — Deployment Guide

## Overview
Mercado Pago Financial Core v2.0 is now wired and ready. This enables:
- QR code payments via Mercado Pago
- Automatic transaction ledger entries
- Offline resilience for cash payments
- Webhook handling with HMAC verification

---

## 🔐 Step 1: Configure Environment Variables

### Supabase Edge Function Secrets

Run these commands in your terminal:

```bash
# Connect to Supabase
supabase link --project-ref buendqgmwpxdixwvlkhd

# Set TEST environment secrets
supabase secrets set MP_ACCESS_TOKEN="APP_USR-7137506006398248-020514-048ecd19a32b3e8c9fcbaa20d16ca2ea-3183605674"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E"
supabase secrets set SUPABASE_URL="https://buendqgmwpxdixwvlkhd.supabase.co"
supabase secrets set APP_BASE_URL="https://foodspot.app"

# Optional: Webhook HMAC secret (get from MP Dashboard)
supabase secrets set MP_WEBHOOK_SECRET="your_webhook_secret_here"
```

### For PRODUCTION Environment:
```bash
supabase secrets set MP_ACCESS_TOKEN="APP_USR-1652431596900171-020514-b0cb3aa04dfa8a6dbf4cf61569d80a3f-1911962862"
```

---

## 🚀 Step 2: Deploy Edge Functions

```bash
# Deploy the updated mp-webhook
supabase functions deploy mp-webhook --no-verify-jwt

# Deploy create-preference (if not already deployed)
supabase functions deploy create-preference --no-verify-jwt
```

---

## 🧪 Step 3: Run Ghost Transaction Test

```bash
# Install dependencies if needed
npm install @supabase/supabase-js

# Run the test
node tests/ghost-transaction-test.js
```

Expected output:
```
🎉 GHOST TRANSACTION SUCCESSFUL!
   Order: [uuid]
   Amount: $10.00
   Status: released_to_kitchen
   Ledger: [uuid]
💰 Financial Core is OPERATIONAL
```

---

## 🔧 Step 4: Configure Mercado Pago Dashboard

### Test Environment
1. Go to: https://www.mercadopago.com/developers/panel/app/7137506006398248/webhooks
2. Add webhook URL:
   ```
   https://buendqgmwpxdixwvlkhd.supabase.co/functions/v1/mp-webhook
   ```
3. Select "payment" events only
4. Save and get the webhook secret for HMAC verification

### Production Environment
1. Go to: https://www.mercadopago.com/developers/panel
2. Use App ID: `1652431596900171`
3. Configure webhook with same URL
4. Set webhook secret in Supabase secrets

---

## 📝 Step 5: Configure Vendor MP Tokens

Each vendor needs their own Mercado Pago connection:

1. Vendor authenticates via MP OAuth (use `mp-oauth` edge function)
2. Store their tokens in `branding_secrets` table:
   ```sql
   INSERT INTO branding_secrets (business_id, mp_access_token, mp_user_id)
   VALUES ('vendor-business-id', 'APP_USR-...', '123456789');
   ```

---

## 🔄 How It Works

### Payment Flow (Mercado Pago)
```
1. Customer selects "Pagar con Mercado Pago"
2. Order created in Supabase (status: pendiente)
3. create-preference edge function generates MP preference
4. Customer scans QR / clicks link
5. Customer pays on Mercado Pago
6. MP sends webhook to mp-webhook edge function
7. Webhook updates order → released_to_kitchen
8. Webhook creates transaction_ledger entry
9. Kitchen gets notified
```

### Cash Payment Flow (Offline Resilience)
```
1. Customer selects "Pagar en Efectivo"
2. Order created in Supabase
3. handleCashPayment() called
4. If online: ledger entry created immediately
5. If offline: payment queued in LocalStorage
6. When back online: queue auto-syncs to Supabase
```

---

## 🛡️ Security Features

- **HMAC Signature Verification**: Webhooks verified using MP_SECRET
- **Idempotency Guard**: Duplicate webhooks ignored
- **Multi-Tenant**: Each vendor's tokens isolated
- **No Client Secrets**: All MP API calls happen in edge functions
- **Offline Queue**: LocalStorage encrypted at rest (browser native)

---

## 📊 Monitoring

### Check Webhook Logs
```bash
supabase functions logs mp-webhook --tail
```

### Check Offline Queue (Browser Console)
```javascript
// View queue
JSON.parse(localStorage.getItem('fs_offline_payments_queue'))

// View sync status
JSON.parse(localStorage.getItem('fs_sync_status'))
```

---

## 🆘 Troubleshooting

### Webhook not receiving notifications
1. Verify webhook URL in MP Dashboard
2. Check edge function logs: `supabase functions logs mp-webhook`
3. Ensure MP_ACCESS_TOKEN secret is set correctly

### Ledger entries not created
1. Check order has `business_id` set
2. Verify `transaction_ledger` table has correct schema
3. Check mp-webhook logs for errors

### Offline payments not syncing
1. Check browser is back online: `navigator.onLine`
2. Check LocalStorage quota isn't full
3. Force sync: `processOfflineQueue()` in browser console

---

## 🎯 Test Card Numbers (Sandbox)

| Card Number | Status | CVV | Expiry |
|-------------|--------|-----|--------|
| 5031 7557 3453 0604 | Approved | 123 | 11/25 |
| 4509 9535 6623 3704 | Declined | 123 | 11/25 |

Use cardholder name `APRO` for automatic approval.

---

## 📁 Files Changed

- `supabase/functions/mp-webhook/index.ts` - Enhanced with ledger integration
- `src/services/offlinePayment.js` - NEW: Offline payment service
- `src/pages/customer/Order.jsx` - Integrated offline payment for cash
- `tests/ghost-transaction-test.js` - NEW: End-to-end test suite

---

**Status: ✅ READY FOR DEPLOYMENT**

*Don't worry. Even if the world forgets, I'll remember for you.*
❤️‍🔥
