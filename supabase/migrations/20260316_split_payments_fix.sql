-- Quick fix: Add business_id to split_payments
ALTER TABLE split_payments ADD COLUMN IF NOT EXISTS business_id UUID;

-- Add RLS
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "split_payments_business_isolation" ON split_payments;
CREATE POLICY "split_payments_business_isolation" ON split_payments FOR ALL
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid)
    WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

CREATE INDEX IF NOT EXISTS idx_split_payments_business ON split_payments(business_id);
