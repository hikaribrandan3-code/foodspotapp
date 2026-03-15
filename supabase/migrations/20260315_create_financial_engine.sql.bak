-- ========================================================
-- GRUB CLUB FINANCIAL ENGINE
-- High-velocity festival payment system
-- ========================================================

-- 1. TABLE LEDGERS: Track table-level billing
CREATE TABLE IF NOT EXISTS table_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    table_number VARCHAR(20) NOT NULL,
    order_id UUID REFERENCES orders(id),
    total_due NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
    split_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 2. WALLETS: GrubCard balances
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    card_id VARCHAR(50) UNIQUE NOT NULL,
    card_holder_name VARCHAR(100),
    balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'deactivated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SPLIT PAYMENTS: Individual split payments
CREATE TABLE IF NOT EXISTS split_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id UUID NOT NULL REFERENCES table_ledgers(id),
    participant_name VARCHAR(100),
    participant_token VARCHAR(100),
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(20) DEFAULT 'mercadopago',
    mp_preference_id VARCHAR(100),
    mp_payment_id VARCHAR(100),
    mp_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 4. WALLET TRANSACTIONS: Audit trail for deductions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    ledger_id UUID REFERENCES table_ledgers(id),
    amount NUMERIC(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('debit', 'credit', 'refund')),
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_table_ledgers_business ON table_ledgers(business_id);
CREATE INDEX IF NOT EXISTS idx_table_ledgers_table ON table_ledgers(business_id, table_number);
CREATE INDEX IF NOT EXISTS idx_table_ledgers_status ON table_ledgers(status) WHERE status IN ('pending', 'partial');
CREATE INDEX IF NOT EXISTS idx_wallets_card_id ON wallets(card_id);
CREATE INDEX IF NOT EXISTS idx_wallets_business ON wallets(business_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_ledger ON split_payments(ledger_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);

-- RLS POLICIES
ALTER TABLE table_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Table Ledgers Policies
CREATE POLICY "Allow read table ledgers" ON table_ledgers FOR SELECT
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

CREATE POLICY "Allow insert table ledgers" ON table_ledgers FOR INSERT
    WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

CREATE POLICY "Allow update table ledgers" ON table_ledgers FOR UPDATE
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- Wallets Policies (for card scanning - needs to be writable by all)
CREATE POLICY "Allow read wallets" ON wallets FOR SELECT
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

CREATE POLICY "Allow scan wallet" ON wallets FOR UPDATE
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- Split Payments Policies
CREATE POLICY "Allow read split payments" ON split_payments FOR SELECT
    USING (ledger_id IN (SELECT id FROM table_ledgers WHERE business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid));

CREATE POLICY "Allow insert split payments" ON split_payments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update split payments" ON split_payments FOR UPDATE
    USING (true);

-- Wallet Transactions Policies
CREATE POLICY "Allow read wallet transactions" ON wallet_transactions FOR SELECT
    USING (wallet_id IN (SELECT id FROM wallets WHERE business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid));

CREATE POLICY "Allow insert wallet transactions" ON wallet_transactions FOR INSERT
    WITH CHECK (true);

-- Function to auto-update ledger status when paid
CREATE OR REPLACE FUNCTION update_ledger_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_paid >= NEW.total_due AND NEW.total_due > 0 THEN
        NEW.status := 'paid';
        NEW.paid_at := NOW();
    ELSIF NEW.total_paid > 0 AND NEW.total_paid < NEW.total_due THEN
        NEW.status := 'partial';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ledger_status
    BEFORE UPDATE ON table_ledgers
    FOR EACH ROW
    EXECUTE FUNCTION update_ledger_status();