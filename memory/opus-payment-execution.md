Execute payment infrastructure for FoodSpot-OS. We're in the home stretch — build it bulletproof, not beautiful. Gemini will polish UI later.

## CONSTRAINTS (Non-negotiable)
- Small business POS for food trucks, festivals, pop-ups in Argentina/LATAM
- 70% cash, 30% Mercado Pago in real life
- Staff takes order on tablet → customer pays cash → staff marks "paid" → kitchen gets ticket
- OR customer orders on phone → pays MP → webhook confirms → kitchen gets ticket
- No AFIP invoicing, no partial refunds, no complex stuff — simple flow, hardened to the 10th power
- Every payment writes to `transaction_ledger`. Every order has `payment_status`. Kitchen doesn't cook until payment confirmed.

## BUILD ORDER (4 chunks, push main after each)

### CHUNK 1: Cash Payment Flow (Customer)
Files: `src/pages/customer/Order.jsx`, `src/services/offlinePayment.js`
- Add explicit "Pagar en Efectivo" button alongside Mercado Pago
- On click: mark order `payment_method: 'cash'`, `payment_status: 'approved'`, `paid_at: now()`
- Write to `transaction_ledger` via `handleCashPayment()`
- Send WhatsApp receipt if configured
- Show confirmation: "✅ Pedido confirmado — Pagás en efectivo al retirar"
- STATE MACHINE: pending → approved → released_to_kitchen

Checkpoint: Place test order with cash. Verify `orders` table has `payment_method: 'cash'`, `payment_status: 'approved'`. Verify `transaction_ledger` has entry. Kitchen sees order.

### CHUNK 2: Staff "Mark as Paid" Dashboard
Files: `src/pages/owner/DeliveryManager.jsx`
- Staff sees orders filtered by `payment_status != 'approved'` as "⏳ Pendiente de Pago"
- Button "✅ Pagó en Efectivo" → updates order `payment_confirmed: true`, `paid_at: now()`, writes to `transaction_ledger`
- Button "💳 Pagó con Mercado Pago" → same but `payment_method: 'mercadopago'`
- Button "🔄 Cambiar a Efectivo" → for when customer switches from MP to cash at window
- Real-time sync: new pending orders appear without refresh

Checkpoint: Staff marks 2 test orders as paid (1 cash, 1 MP). Orders move from "Pendiente" to "Completado". Ledger has both entries.

### CHUNK 3: Mercado Pago Webhook Hardening
Files: `supabase/functions/create-preference/index.ts`, `supabase/functions/mercadopago-handler/index.ts`
- FIX: `notification_url` in `create-preference` points to `mercadopago-handler` (not `mp-webhook`)
- FIX: `mercadopago-handler` extracts `business_id` from order, fetches tenant's `branding.mp_access_token`
- USE per-tenant token to verify payment (not global `MP_ACCESS_TOKEN`)
- IDEMPOTENCY: if webhook fires twice for same payment, don't double-update order. Check if `payment_id` already exists on order.
- FAILURE HANDLING: if webhook fails, log to `webhook_logs` table, retry logic in edge function
- BACK_URLS: success/failure/pending all route to `/${slug}/status/${orderId}?payment=xxx`

Checkpoint: Place test order with MP sandbox. Complete payment. Verify webhook fires. Verify order status becomes `paid_unreleased`. Verify `transaction_ledger` has MP entry with `mp_payment_data`.

### CHUNK 4: Analytics Wiring
Files: `src/pages/owner/Analytics.jsx`, `src/pages/owner/OwnerSummary.jsx`
- Query `transaction_ledger` (not just `orders`) for payment data
- Show: total revenue, cash vs MP split %, average ticket, transaction count, per-day breakdown
- Date filters: today, this week, this month
- Cache query results in component state (don't hit Supabase on every render)
- Handle empty state: "No pagos registrados hoy"

Checkpoint: Owner dashboard shows correct revenue split. Cash orders = Chunk 1. MP orders = Chunk 3. Analytics reflects both.

## TECHNICAL REQUIREMENTS
- All Supabase writes use `.select().single()` to verify insert succeeded
- All async operations wrapped in try/catch with console.error logging
- Supabase RLS: transactions table scoped to `business_id` (tenant isolation)
- Edge functions: validate `order_id` exists before processing. Return 400 on missing params.
- Webhook: return 200 to MP even if processing fails (prevents MP retry storms). Log failure internally.
- Cash flow: idempotent — clicking "Pagar en Efectivo" twice doesn't create duplicate ledger entries
- Offline resilience: if staff marks paid while offline, queue and sync (reuse offlinePayment.js patterns)

## WHAT "BULLETPROOF" MEANS
- Edge case: customer clicks cash button twice → one order, one ledger entry, idempotent
- Edge case: webhook fires 3 times for same payment → order updated once, ledger has one entry
- Edge case: staff marks order paid while another staff member also marks it → last write wins, no crash
- Edge case: network fails mid-payment → order exists, payment status shows error, customer can retry
- Edge case: tenant switches MP token → new payments use new token, old payments still valid

## UI GUIDELINE
Functional, not pretty. Buttons work. Status is clear. Errors are visible. That's it. No gradients, no animations, no polish. Gemini will handle that.

Push to main after EACH chunk. Do not wait until all 4 are done. Test each chunk independently.
