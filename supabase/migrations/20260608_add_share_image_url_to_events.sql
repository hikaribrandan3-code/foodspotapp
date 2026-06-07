-- Migration: Add share_image_url column to events table
-- Date: 2026-06-08
-- Purpose: Allow owners to upload custom flyer/share images for social media
-- Format: URL string pointing to a custom image for Instagram Stories/social sharing

BEGIN;

-- Add nullable share_image_url column (existing events unaffected)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS share_image_url TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN events.share_image_url IS
  'Custom image URL for social media sharing (Instagram Stories, etc.). Recommended size: 1080x1920px (9:16 ratio). If null, use default auto-generated share card.';

COMMIT;
