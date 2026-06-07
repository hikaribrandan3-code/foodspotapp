-- Add daily_schedule JSONB column to events table for per-day time slots on multi-day events.
-- Format: [{"date": "2026-08-21", "start_time": "10:00", "end_time": "22:00"}, ...]
-- Nullable — single-day events and existing events without per-day times leave this null.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS daily_schedule JSONB;
