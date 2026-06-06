-- ============================================================
-- FIX: Add username column to staff table
-- OwnerLogin.jsx line 242 queries .eq('username', email)
-- but the column did not exist — breaking staff login.
-- Backfill: derive username from email (before @).
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS username VARCHAR(100);

UPDATE public.staff
  SET username = SPLIT_PART(email, '@', 1)
  WHERE username IS NULL AND email IS NOT NULL;

-- Enforce uniqueness per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_username_business
  ON public.staff(business_id, username);
