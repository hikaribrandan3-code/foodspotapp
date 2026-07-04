-- ============================================================================
-- 2026-07-04  ORPHANED LEDGER BACKFILL (ALL PAYMENT METHODS)
-- ----------------------------------------------------------------------------
-- RUN ORDER: apply 2026-06-16_cash_settlement_rpc.sql and
--            2026-06-16_cash_ledger_backfill.sql FIRST if not already applied.
--            Check first with:
--              select proname from pg_proc where proname = 'record_cash_payment';
--
-- 2026-06-16_cash_ledger_backfill.sql REPAIR 1 only backfilled orders with
-- payment_method IN ('cash','efectivo','pay_at_counter'). Owner Analytics
-- (Métricas + Gastos tabs) showed $0 revenue for ALL time despite 98 real
-- orders, because some paid orders — regardless of payment method — never
-- got a transaction_ledger row (e.g. orders created outside any confirm
-- flow, such as seed/test data). This script generalizes REPAIR 1 to cover
-- any paid order missing a ledger row, not just cash-equivalents.
--
-- PREVIEW-FIRST, idempotent via NOT EXISTS guard — safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PREVIEW — how many orphaned paid orders remain, and how much revenue?
-- ----------------------------------------------------------------------------
SELECT
  o.payment_method,
  count(*)                          AS orphan_orders,
  COALESCE(sum(o.total), 0)         AS cents_missing,
  COALESCE(sum(o.total), 0) / 100.0 AS pesos_missing
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND COALESCE(o.is_deleted, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_ledger t
    WHERE t.order_id = o.id
      AND t.transaction_type = 'payment'
  )
GROUP BY o.payment_method;


-- ----------------------------------------------------------------------------
-- APPLY — insert one ledger row per orphaned order, any payment method.
-- ----------------------------------------------------------------------------
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
  COALESCE(o.payment_method, 'unknown') || '-' || o.id::text,
  'ARS',
  COALESCE(o.payment_method, 'unknown'),
  upper(COALESCE(o.payment_method, 'unknown')) || '-' || o.id::text,
  COALESCE(o.paid_at, o.created_at, now())
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND COALESCE(o.is_deleted, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_ledger t
    WHERE t.order_id = o.id
      AND t.transaction_type = 'payment'
  );


-- ----------------------------------------------------------------------------
-- VERIFY — should return zero rows after APPLY
-- ----------------------------------------------------------------------------
SELECT count(*)
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND COALESCE(o.is_deleted, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_ledger t
    WHERE t.order_id = o.id
      AND t.transaction_type = 'payment'
  );
