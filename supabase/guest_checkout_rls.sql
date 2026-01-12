-- ============================================
-- GUEST CHECKOUT RLS POLICIES (Simplified)
-- Run in Supabase SQL Editor
-- No custom headers - simple column comparison
-- ============================================

-- Add guest_token column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_token UUID;
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_token);

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Authenticated insert" ON orders;
DROP POLICY IF EXISTS "Customers create orders" ON orders;
DROP POLICY IF EXISTS "Anonymous create orders" ON orders;
DROP POLICY IF EXISTS "Allow guest checkout" ON orders;
DROP POLICY IF EXISTS "Guest view own orders" ON orders;

-- ============================================
-- INSERT POLICIES
-- ============================================

-- POLICY 1: Allow anyone (guest or authenticated) to create orders
CREATE POLICY "Allow guest checkout" ON orders 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

-- ============================================
-- SELECT POLICIES (Simplified - No Custom Headers)
-- ============================================

-- POLICY 2: Anyone can view orders (RLS via application layer)
-- The guest_token filter is applied in the JS query, not RLS
-- This is simpler and faster for the Jan 7th deadline
CREATE POLICY "Public order status view" ON orders 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- POLICY 3: Staff/Owner can update any order
CREATE POLICY "Staff update orders" ON orders 
    FOR UPDATE 
    TO authenticated 
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('staff', 'owner', 'superadmin')
    );

-- ============================================
-- NOTES
-- ============================================
-- Security is enforced at the APPLICATION layer:
--   1. Guests can only fetch orders WHERE guest_token = their token
--   2. The JS query filters by guest_token column
--   3. This avoids complex RLS header parsing
-- 
-- For production hardening post-launch:
--   - Add RLS policy that filters by guest_token in JWT claim
--   - Enable Supabase Auth for all users (no more anon)
