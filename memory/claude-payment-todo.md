Analyze and fix FoodSpot-OS payment processing. We're a small business empowerment platform (NOT a Rappi/UberEats replacement). Our merchants own their customers and data.

## CONTEXT
- Mercado Pago sandbox: ghost burger $10 PAID ✅
- Order flow: customer orders → create-preference edge function → MP redirect → webhook → order paid
- Cash fallback exists but is silent (only triggers on MP failure)

## CURRENT FILES TO ANALYZE
- `supabase/functions/create-preference/index.ts` — creates MP checkout
- `supabase/functions/mercadopago-handler/index.ts` — webhook (PROBLEM: referenced as `mp-webhook` in create-preference but actual function name is `mercadopago-handler`)
- `src/services/offlinePayment.js` — cash queue + sync
- `src/pages/customer/Order.jsx` — payment UI (only shows MP, no explicit cash button)
- `src/pages/owner/Analytics.jsx` — owner sees transactions
- `src/pages/owner/DeliveryManager.jsx` — staff dashboard (has payment method display)

## TODAY'S TODO (in order)

### 1. FIX WEBHOOK URL
`create-preference` references `functions/v1/mp-webhook` but actual function is `mercadopago-handler`. Fix the `notification_url`.

### 2. ADD EXPLICIT CASH PAYMENT BUTTON
In `Order.jsx`:
- Add "Pagar en Efectivo" button alongside Mercado Pago
- When clicked: skip MP, mark order `payment_method: 'cash'`, `payment_status: 'approved'`
- Still send WhatsApp receipt if configured
- Show confirmation modal: "Confirmar pago en efectivo al recibir"

### 3. STAFF "MARK AS PAID CASH" DASHBOARD
In `DeliveryManager.jsx` or new component:
- Staff sees orders with "⏳ Pendiente de Pago" status
- Button: "✅ Pagó en Efectivo" — marks order `payment_confirmed: true`, `paid_at: now()`
- Button: "💳 Pagó con Mercado Pago" — same, but `payment_method: 'mercadopago'`
- Write to `transaction_ledger` for analytics

### 4. FIX WEBHOOK TO USE PER-TENANT TOKEN
`mercadopago-handler` uses global `MP_ACCESS_TOKEN`. It should:
- Extract `business_id` from `external_reference` (order UUID)
- Fetch `branding.mp_access_token` for that business
- Use tenant's token to verify payment

### 5. TRANSACTION LEDGER INTEGRITY
Ensure every payment (MP or cash) writes to `transaction_ledger`:
- `order_id`, `business_id`, `amount_gross_cents`, `currency`, `payment_method`, `status`, `processed_at`
- Cash payments: `offline_sync: false`, `payment_method: 'cash'`
- MP payments: `offline_sync: false`, `payment_method: 'mercadopago'`, `mp_payment_data: json`

### 6. ANALYTICS WIRING
In `Analytics.jsx` and `OwnerSummary.jsx`:
- Query `transaction_ledger` instead of just `orders` for payment data
- Show: total revenue, MP vs Cash split, average ticket, transaction count
- Filter by date range (today, this week, this month)

## SMALL BUSINESS CONSTRAINTS
- No complex invoicing (Argentina AFIP integration = v2)
- No partial refunds (v2)
- Simple: customer pays → order released to kitchen → staff confirms → done
- Cash is king for food trucks/festivals — make it FIRST-CLASS, not a fallback

## TOKEN OPTIMIZATION NOTES
- Keep existing Supabase client patterns
- Reuse `handleCashPayment` from `offlinePayment.js` where possible
- Don't redesign the database schema — work with existing `orders`, `transaction_ledger`, `branding` tables
- Order.jsx payment section is around line 330-400

Execute in order. Test each piece before moving to next. Push to main after each working component.