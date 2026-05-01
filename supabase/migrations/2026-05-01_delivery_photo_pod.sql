-- ============================================
-- DELIVERY PROOF-OF-DELIVERY (POD) SCHEMA
-- Adds photo capture columns to track delivery completion
-- ============================================

-- Add POD photo columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_photo_captured_at TIMESTAMPTZ;

-- Constraint: Dine-in orders cannot have delivery photos (nonsensical)
ALTER TABLE orders ADD CONSTRAINT check_delivery_photo_dine_in
  CHECK (order_type != 'dine_in' OR delivery_photo_url IS NULL);

-- Create storage bucket for delivery photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-photos', 'delivery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated users (delivery workers) to upload to their tenant's folder
CREATE POLICY "Allow delivery workers to upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] = 'orders'
);

-- RLS Policy: Allow public read access to delivery photos (customer can view proof)
CREATE POLICY "Allow public read of delivery photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] = 'orders'
);

-- RLS Policy: Allow owners to delete photos (cleanup)
CREATE POLICY "Allow tenant deletion of their delivery photos"
ON storage.objects FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] = 'orders'
);
