-- Migration: Add phone field to branding table
-- Date: 2026-06-18
-- Purpose: Support separate phone contact field alongside existing WhatsApp field
-- Allows multi-country support (some regions use both WhatsApp + Phone)

ALTER TABLE branding
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_branding_phone ON branding(phone) WHERE phone IS NOT NULL;

COMMIT;
