-- =============================================================================
-- Payment Method Standardization Migration
-- Run this AFTER deploying the feat/payment-standardization branch
-- =============================================================================

-- 1. Update existing orders: Spanish → English standard
UPDATE orders
SET payment_method = 'cash'
WHERE payment_method IN ('efectivo', 'pay_at_counter');

UPDATE orders
SET payment_method = 'mercado_pago'
WHERE payment_method = 'mercadopago';

UPDATE orders
SET payment_method = 'card_on_delivery'
WHERE payment_method = 'tarjeta_envio';

-- 2. Update split_payments table
UPDATE split_payments
SET payment_method = 'mercado_pago'
WHERE payment_method = 'mercadopago';

-- 3. Add CHECK constraint to prevent invalid values going forward
-- (Optional — run this after confirming the migration worked)
-- ALTER TABLE orders
-- ADD CONSTRAINT valid_payment_method
-- CHECK (payment_method IN ('cash', 'mercado_pago', 'card_on_delivery'));

-- =============================================================================
-- Verification queries (run these to confirm the migration worked)
-- =============================================================================

-- Should return 0 rows:
-- SELECT payment_method, COUNT(*) FROM orders
-- WHERE payment_method IN ('efectivo', 'mercadopago', 'pay_at_counter', 'tarjeta_envio')
-- GROUP BY payment_method;

-- Should show only the 3 standard values:
-- SELECT payment_method, COUNT(*) FROM orders
-- GROUP BY payment_method;
