-- ============================================================================
-- 2026-06-16  CASH LEDGER BACKFILL + 100x CORRECTION  (Database Bible v2.4)
-- ----------------------------------------------------------------------------
-- RUN ORDER: apply 2026-06-16_cash_settlement_rpc.sql FIRST (not required for
--            this script to run, but it's the durable fix; this script repairs
--            the historical damage that fix prevents going forward).
--
-- This script has TWO independent repairs. Each is PREVIEW-FIRST: run the
-- SELECT, eyeball the rows/totals, THEN run the INSERT/UPDATE beneath it.
-- Both repairs are idempotent — safe to re-run.
--
-- Cash payment_method values include legacy strings ('efectivo',
-- 'pay_at_counter') from before the 2026-04-26 standardization, so we match all
-- known cash-equivalents.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- REPAIR 1 — Backfill ledger rows for paid cash orders that have NO payment row
-- ----------------------------------------------------------------------------
-- Root cause: staff verifyCash / customer offline-drain ran on the anon key and
-- 403'd on the transaction_ledger insert (no anon INSERT policy). The order was
-- marked paid but no ledger row was ever written → invisible to owner Analytics.

-- 1a) PREVIEW — how many orders, and how much revenue, are we about to restore?
SELECT
  count(*)                              AS orphan_cash_orders,
  COALESCE(sum(o.total), 0)             AS total_cents_to_restore,
  COALESCE(sum(o.total), 0) / 100.0     AS total_pesos_to_restore
FROM public.orders o
WHERE o.payment_method IN ('cash', 'efectivo', 'pay_at_counter')
  AND o.payment_status = 'paid'
  AND COALESCE(o.is_deleted, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_ledger t
    WHERE t.order_id = o.id
      AND t.transaction_type = 'payment'
  );

-- 1b) APPLY — insert one ledger row per orphaned order. Idempotent: the
--     NOT EXISTS guard (any payment row for the order) means re-running is a
--     no-op. Amount comes straight from orders.total (integer cents).
INSERT INTO public.transaction_ledger (
  order_id, business_id, transaction_type, status,
  amount_gross_cents, platform_fee_cents, net_to_owner_cents,
  idempotency_key, currency, payment_method, external_reference, processed_at
)
SELECT
  o.id,
  o.business_id,
  'payment',
  'completed',
  COALESCE(o.total, 0),
  0,
  COALESCE(o.total, 0),
  'cash-' || o.id::text,
  'ARS',
  'cash',
  'CASH-' || o.id::text,
  COALESCE(o.paid_at, o.created_at, now())
FROM public.orders o
WHERE o.payment_method IN ('cash', 'efectivo', 'pay_at_counter')
  AND o.payment_status = 'paid'
  AND COALESCE(o.is_deleted, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_ledger t
    WHERE t.order_id = o.id
      AND t.transaction_type = 'payment'
  );


-- ----------------------------------------------------------------------------
-- REPAIR 2 — Correct 100x-inflated rows written by the owner Dashboard path
-- ----------------------------------------------------------------------------
-- Root cause: Dashboard.jsx did `Math.round(order.total * 100)` on a value that
-- was ALREADY integer cents, storing 100x the real amount. The owner path is
-- authenticated, so these inserts succeeded (unlike the anon path above).
-- Signature of a bug row: amount_gross_cents = orders.total * 100, fee = 0.

-- 2a) PREVIEW — which rows look 100x-inflated, and by how much?
SELECT
  t.id            AS ledger_id,
  t.order_id,
  t.payment_method,
  t.amount_gross_cents AS stored_cents,
  o.total              AS correct_cents
FROM public.transaction_ledger t
JOIN public.orders o ON o.id = t.order_id
WHERE t.transaction_type = 'payment'
  AND t.platform_fee_cents = 0
  AND o.total > 0
  AND t.amount_gross_cents = o.total * 100;

-- 2b) APPLY — reset gross/net to the true cents value. Idempotent: once
--     corrected, `amount_gross_cents = o.total * 100` no longer matches.
UPDATE public.transaction_ledger t
SET amount_gross_cents = o.total,
    net_to_owner_cents  = o.total
FROM public.orders o
WHERE t.order_id = o.id
  AND t.transaction_type = 'payment'
  AND t.platform_fee_cents = 0
  AND o.total > 0
  AND t.amount_gross_cents = o.total * 100;
