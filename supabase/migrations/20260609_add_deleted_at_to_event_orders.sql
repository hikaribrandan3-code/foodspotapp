-- Migration: Add soft delete support to event_orders table
-- Date: 2026-06-09
-- Purpose: Allow customers to delete tickets from My Tickets without hard-deleting from DB
-- Soft delete preserves payment history and audit trail

BEGIN;

-- Add nullable deleted_at column (null = not deleted, timestamp = when deleted)
ALTER TABLE event_orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient filtering of active (non-deleted) orders
CREATE INDEX IF NOT EXISTS idx_event_orders_guest_token_deleted_at
ON event_orders(guest_token, deleted_at);

-- Add comment for clarity
COMMENT ON COLUMN event_orders.deleted_at IS
  'Soft delete timestamp. When set, this order is hidden from customers but preserved for audit/payment history. NULL = active order.';

COMMIT;
