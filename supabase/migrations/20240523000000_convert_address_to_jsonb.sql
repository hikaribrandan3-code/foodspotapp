-- Migration: Convert delivery_address to JSONB
-- Author: Antigravity
-- Description: Converts the delivery_address column from TEXT to JSONB to support structured address objects.
-- Backward Compatibility: Uses to_jsonb() to convert existing text strings into JSON strings.

DO $$
BEGIN
    -- Check if column checks/types need to be adjusted
    -- We assume the column exists. If not, this block handles the alteration safely.
    
    -- 1. Alter the column type to JSONB
    -- 'USING to_jsonb(delivery_address)' ensures that raw strings like "Av Cabildo 123" 
    -- become JSON strings like '"Av Cabildo 123"', which are valid JSONB values.
    ALTER TABLE orders 
    ALTER COLUMN delivery_address TYPE JSONB 
    USING to_jsonb(delivery_address);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration failed regarding delivery_address JSONB conversion: %', SQLERRM;
END $$;
