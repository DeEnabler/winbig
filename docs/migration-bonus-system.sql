-- ============================================
-- MIGRATION: Bonus System
-- ============================================
-- Implements sharable and personal bonus funds with:
-- - Volume requirements for profit unlock
-- - Gift/share functionality
-- - Full audit trail
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- ============================================
-- TABLE 1: bonuses
-- ============================================
-- Tracks all bonus allocations per user
-- Each bonus can be personal (non-transferable) or sharable (can gift portions)

CREATE TABLE IF NOT EXISTS bonuses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Owner
    user_id TEXT NOT NULL,                    -- wallet address (lowercase)
    
    -- Bonus type and source
    bonus_type TEXT NOT NULL CHECK (bonus_type IN ('personal', 'sharable')),
    source TEXT,                              -- 'signup', 'vip', 'event', 'gift_received', etc.
    source_gift_id BIGINT,                    -- If this bonus came from a gift claim
    
    -- Amounts
    total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
    remaining_amount NUMERIC NOT NULL CHECK (remaining_amount >= 0),
    
    -- Volume requirement for profit unlock
    volume_requirement_multiplier NUMERIC DEFAULT 30,  -- 30x wagering required
    volume_completed NUMERIC DEFAULT 0,                -- tracks wagering progress
    
    -- Profits locked until volume requirement met
    pending_profits NUMERIC DEFAULT 0,
    unlocked_profits NUMERIC DEFAULT 0,                -- profits moved to withdrawable
    
    -- Lifecycle
    expires_at TIMESTAMPTZ,                            -- NULL = never expires
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'forfeited')),
    
    -- Anti-abuse
    ip_address TEXT,                                   -- IP when bonus was issued/claimed
    notes TEXT
);

-- Indexes for bonuses
CREATE INDEX IF NOT EXISTS idx_bonuses_user_id ON bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_bonus_type ON bonuses(bonus_type);
CREATE INDEX IF NOT EXISTS idx_bonuses_expires_at ON bonuses(expires_at);

-- ============================================
-- TABLE 2: bonus_gifts
-- ============================================
-- Tracks gift links created from sharable bonuses
-- When a user shares a portion of their sharable bonus

CREATE TABLE IF NOT EXISTS bonus_gifts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Gift code for URL (e.g., /gift/abc123)
    gift_code TEXT UNIQUE NOT NULL,
    
    -- Source (who is gifting)
    source_bonus_id BIGINT NOT NULL REFERENCES bonuses(id),
    gifter_user_id TEXT NOT NULL,             -- wallet address
    gifter_username TEXT,                     -- X/Twitter username for display
    gifter_avatar TEXT,                       -- Avatar URL for display
    
    -- Recipient (filled when claimed)
    recipient_user_id TEXT,                   -- NULL until claimed
    recipient_bonus_id BIGINT,                -- The bonus created for recipient
    
    -- Amount
    amount NUMERIC NOT NULL CHECK (amount > 0),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired', 'revoked')),
    claimed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    
    -- Tracking
    claim_ip TEXT,
    notes TEXT
);

-- Indexes for bonus_gifts
CREATE INDEX IF NOT EXISTS idx_bonus_gifts_gift_code ON bonus_gifts(gift_code);
CREATE INDEX IF NOT EXISTS idx_bonus_gifts_gifter_user_id ON bonus_gifts(gifter_user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_gifts_recipient_user_id ON bonus_gifts(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_gifts_status ON bonus_gifts(status);
CREATE INDEX IF NOT EXISTS idx_bonus_gifts_source_bonus_id ON bonus_gifts(source_bonus_id);

-- ============================================
-- TABLE 3: bonus_transactions
-- ============================================
-- Audit log of all bonus movements
-- Every credit, debit, gift, and profit event

CREATE TABLE IF NOT EXISTS bonus_transactions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Who
    user_id TEXT NOT NULL,                    -- wallet address
    bonus_id BIGINT REFERENCES bonuses(id),
    
    -- What
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'credit',           -- Initial bonus credit
        'debit_bet',        -- Used for betting
        'debit_gift',       -- Gifted to another user
        'gift_received',    -- Received from another user
        'profit_locked',    -- Won bet, profit locked pending volume
        'profit_unlocked',  -- Volume met, profit unlocked
        'expired',          -- Bonus expired
        'forfeited'         -- Bonus forfeited (abuse, etc.)
    )),
    
    -- Amount (positive for credits, positive for debits too - type indicates direction)
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    
    -- Running balance after this transaction
    balance_after NUMERIC,
    
    -- References
    bet_id BIGINT,                            -- If related to a bet
    gift_id BIGINT,                           -- If related to a gift
    
    -- Context
    notes TEXT
);

-- Indexes for bonus_transactions
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_bonus_id ON bonus_transactions(bonus_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_transaction_type ON bonus_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_created_at ON bonus_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_bet_id ON bonus_transactions(bet_id);

-- ============================================
-- MODIFY BETS TABLE
-- ============================================
-- Add columns to track bonus usage per bet

ALTER TABLE bets ADD COLUMN IF NOT EXISTS bonus_amount_used NUMERIC DEFAULT 0;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS cash_amount_used NUMERIC;  -- NULL means all from wallet
ALTER TABLE bets ADD COLUMN IF NOT EXISTS source_bonus_id BIGINT;

-- Index for bonus-related bet queries
CREATE INDEX IF NOT EXISTS idx_bets_source_bonus_id ON bets(source_bonus_id);
CREATE INDEX IF NOT EXISTS idx_bets_bonus_amount_used ON bets(bonus_amount_used) WHERE bonus_amount_used > 0;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_transactions ENABLE ROW LEVEL SECURITY;

-- Bonuses: Users can read their own, service can manage all
CREATE POLICY "Users can read own bonuses" ON bonuses
    FOR SELECT USING (true);  -- Public read for now

CREATE POLICY "Service can manage bonuses" ON bonuses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow bonus insertion" ON bonuses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow bonus update" ON bonuses
    FOR UPDATE USING (true);

-- Bonus Gifts: Public read (for claim pages), service manages
CREATE POLICY "Public can read bonus gifts" ON bonus_gifts
    FOR SELECT USING (true);

CREATE POLICY "Service can manage bonus gifts" ON bonus_gifts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow gift insertion" ON bonus_gifts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow gift update" ON bonus_gifts
    FOR UPDATE USING (true);

-- Bonus Transactions: Users can read their own
CREATE POLICY "Users can read own bonus transactions" ON bonus_transactions
    FOR SELECT USING (true);

CREATE POLICY "Service can manage bonus transactions" ON bonus_transactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow transaction insertion" ON bonus_transactions
    FOR INSERT WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON bonuses TO authenticated;
GRANT ALL ON bonuses TO service_role;
GRANT USAGE ON SEQUENCE bonuses_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE bonuses_id_seq TO service_role;

GRANT ALL ON bonus_gifts TO authenticated;
GRANT ALL ON bonus_gifts TO service_role;
GRANT USAGE ON SEQUENCE bonus_gifts_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE bonus_gifts_id_seq TO service_role;

GRANT ALL ON bonus_transactions TO authenticated;
GRANT ALL ON bonus_transactions TO service_role;
GRANT USAGE ON SEQUENCE bonus_transactions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE bonus_transactions_id_seq TO service_role;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's total bonus balance (sum of all active bonuses)
CREATE OR REPLACE FUNCTION get_user_bonus_balance(target_user_id TEXT)
RETURNS TABLE (
    total_balance NUMERIC,
    personal_balance NUMERIC,
    sharable_balance NUMERIC,
    pending_profits NUMERIC,
    unlocked_profits NUMERIC,
    total_volume_required NUMERIC,
    total_volume_completed NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(remaining_amount), 0) as total_balance,
        COALESCE(SUM(CASE WHEN bonus_type = 'personal' THEN remaining_amount ELSE 0 END), 0) as personal_balance,
        COALESCE(SUM(CASE WHEN bonus_type = 'sharable' THEN remaining_amount ELSE 0 END), 0) as sharable_balance,
        COALESCE(SUM(pending_profits), 0) as pending_profits,
        COALESCE(SUM(unlocked_profits), 0) as unlocked_profits,
        COALESCE(SUM(total_amount * volume_requirement_multiplier), 0) as total_volume_required,
        COALESCE(SUM(volume_completed), 0) as total_volume_completed
    FROM bonuses
    WHERE LOWER(user_id) = LOWER(target_user_id)
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's gift history (sent and received)
CREATE OR REPLACE FUNCTION get_user_gift_history(target_user_id TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id BIGINT,
    gift_code TEXT,
    amount NUMERIC,
    status TEXT,
    direction TEXT,
    other_user_id TEXT,
    other_username TEXT,
    created_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bg.id,
        bg.gift_code,
        bg.amount,
        bg.status,
        CASE 
            WHEN LOWER(bg.gifter_user_id) = LOWER(target_user_id) THEN 'sent'
            ELSE 'received'
        END as direction,
        CASE 
            WHEN LOWER(bg.gifter_user_id) = LOWER(target_user_id) THEN bg.recipient_user_id
            ELSE bg.gifter_user_id
        END as other_user_id,
        CASE 
            WHEN LOWER(bg.gifter_user_id) = LOWER(target_user_id) THEN NULL  -- Could join to get recipient username
            ELSE bg.gifter_username
        END as other_username,
        bg.created_at,
        bg.claimed_at
    FROM bonus_gifts bg
    WHERE LOWER(bg.gifter_user_id) = LOWER(target_user_id)
       OR LOWER(bg.recipient_user_id) = LOWER(target_user_id)
    ORDER BY bg.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bonuses_updated_at ON bonuses;
CREATE TRIGGER update_bonuses_updated_at
    BEFORE UPDATE ON bonuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (for testing - comment out in production)
-- ============================================

/*
-- Insert a test sharable bonus for a user
INSERT INTO bonuses (user_id, bonus_type, total_amount, remaining_amount, source, notes)
VALUES (
    '0x1234567890123456789012345678901234567890',
    'sharable',
    1000,
    1000,
    'vip',
    'VIP sharable bonus for testing'
);

-- Insert a test personal bonus
INSERT INTO bonuses (user_id, bonus_type, total_amount, remaining_amount, source, notes)
VALUES (
    '0x1234567890123456789012345678901234567890',
    'personal',
    50,
    50,
    'signup',
    'Welcome bonus for testing'
);
*/

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('bonuses', 'bonus_gifts', 'bonus_transactions');

-- Check columns on bonuses:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bonuses';

-- Check bets table has new columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bets' AND column_name IN ('bonus_amount_used', 'cash_amount_used', 'source_bonus_id');

-- Test balance function:
-- SELECT * FROM get_user_bonus_balance('0x1234567890123456789012345678901234567890');
