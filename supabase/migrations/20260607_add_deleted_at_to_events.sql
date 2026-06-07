-- Migration: Add soft delete support to events table
-- Date: 2026-06-07
-- Purpose: Allow owners to archive events without hard-deleting (preserves tickets for audit trail)

BEGIN;

-- Add nullable deleted_at column (null = not deleted, timestamp = when deleted)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient filtering of active (non-deleted) events
CREATE INDEX IF NOT EXISTS idx_events_business_id_deleted_at
ON events(business_id, deleted_at);

-- Add comment for clarity
COMMENT ON COLUMN events.deleted_at IS
  'Soft delete timestamp. When set, this event is archived and hidden from owner view. Tickets remain in event_orders for audit trail. NULL = active event.';

COMMIT;
