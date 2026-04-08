-- ============================================
-- MIGRATION: Campaign Events (PropellerAds Funnel Tracking)
-- ============================================
-- Micro-conversion events for the acquisition funnel.
-- Events: lander_view, quiz_complete, tg_join, wallet_connect, bet_placed, bet_funded
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS campaign_events (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    event TEXT NOT NULL,

    -- PropellerAds sub-IDs
    sub1 TEXT,
    sub2 TEXT,
    sub3 TEXT,
    sub4 TEXT,
    sub5 TEXT,

    -- UTM params
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,

    -- Variant for A/B
    variant TEXT,

    -- Privacy-safe analytics
    user_agent TEXT,
    ip_hash TEXT,

    -- Flexible payload
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_event ON campaign_events(event);
CREATE INDEX IF NOT EXISTS idx_campaign_events_sub1 ON campaign_events(sub1);
CREATE INDEX IF NOT EXISTS idx_campaign_events_created ON campaign_events(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(utm_campaign);

ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service insert campaign events" ON campaign_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service read campaign events" ON campaign_events FOR SELECT USING (true);

GRANT ALL ON campaign_events TO service_role;
GRANT USAGE ON SEQUENCE campaign_events_id_seq TO service_role;
