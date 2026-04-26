-- ============================================
-- 🎯 TRANSACTION LEDGER: prevent duplicate entries
-- ============================================
-- Issue: transaction_ledger had no unique constraint, so a webhook
-- retry or offline-sync race could insert duplicate rows for the same
-- (order_id, external_reference) pair, breaking reconciliation.
--
-- Fix: enforce uniqueness at the DB layer. Application code should
-- use INSERT ... ON CONFLICT DO NOTHING (or UPDATE) to be idempotent.
-- ============================================

DO $$
BEGIN
    -- Only add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname  = 'transaction_ledger_order_external_uniq'
    ) THEN
        -- Use a regular CREATE UNIQUE INDEX (CONCURRENTLY can't run inside DO block).
        -- Safe because this is an additive constraint on what should already be unique.
        CREATE UNIQUE INDEX transaction_ledger_order_external_uniq
            ON public.transaction_ledger (order_id, external_reference);
    END IF;
END $$;

NOTIFY pgrst, 'reload config';
