-- Per-Bag Barcode Tracking
-- Version: 1.0
-- Date: 2026-02-07
-- Features: Track individual bags by supplier barcode, scan on receive and issue

-- ============================================
-- BAG STATUS ENUM
-- ============================================

CREATE TYPE bag_status AS ENUM (
    'registered',   -- Scanned at receive, in stock
    'issued',       -- Scanned out (consumed/used)
    'wasted',       -- Marked as waste
    'returned'      -- Returned after issue
);

-- ============================================
-- BAGS TABLE
-- ============================================
-- Each physical bag gets a row, linked to its parent batch

CREATE TABLE bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(200) NOT NULL,
    batch_id UUID NOT NULL REFERENCES stock_batches(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    weight_kg DECIMAL(10,2) NOT NULL,

    status bag_status NOT NULL DEFAULT 'registered',

    -- Receive context
    received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    received_by UUID NOT NULL,

    -- Issue context (filled when bag is issued)
    issued_at TIMESTAMPTZ,
    issued_by UUID,
    issue_transaction_id UUID REFERENCES stock_transactions(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partial unique index: same barcode can't be registered twice at a location while active
CREATE UNIQUE INDEX idx_bags_barcode_active
    ON bags (barcode, location_id)
    WHERE status = 'registered';

-- Lookup indexes
CREATE INDEX idx_bags_batch ON bags(batch_id);
CREATE INDEX idx_bags_location_status ON bags(location_id, status);
CREATE INDEX idx_bags_barcode ON bags(barcode);
CREATE INDEX idx_bags_item_location ON bags(item_id, location_id) WHERE status = 'registered';

-- ============================================
-- MODIFY STOCK_TRANSACTIONS
-- ============================================
-- Add bag_id so transactions can reference the specific bag

ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS bag_id UUID REFERENCES bags(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_bag ON stock_transactions(bag_id) WHERE bag_id IS NOT NULL;

-- ============================================
-- BATCH BAG SUMMARY VIEW
-- ============================================
-- Aggregated bag counts per batch for quick display

CREATE OR REPLACE VIEW batch_bag_summary AS
SELECT
    b.batch_id,
    b.location_id,
    b.item_id,
    COUNT(*) FILTER (WHERE b.status = 'registered') AS bags_registered,
    COUNT(*) FILTER (WHERE b.status = 'issued') AS bags_issued,
    COUNT(*) FILTER (WHERE b.status = 'wasted') AS bags_wasted,
    COUNT(*) AS total_bags,
    COALESCE(SUM(b.weight_kg) FILTER (WHERE b.status = 'registered'), 0) AS kg_registered,
    COALESCE(SUM(b.weight_kg) FILTER (WHERE b.status = 'issued'), 0) AS kg_issued,
    sb.received_at AS batch_received_at
FROM bags b
JOIN stock_batches sb ON sb.id = b.batch_id
GROUP BY b.batch_id, b.location_id, b.item_id, sb.received_at;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE bags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view bags
CREATE POLICY "Authenticated users can view bags" ON bags
    FOR SELECT TO authenticated USING (true);

-- Staff and managers can register and issue bags at their location
CREATE POLICY "Users can manage bags at their location" ON bags
    FOR ALL TO authenticated
    USING (
        location_id = (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    )
    WITH CHECK (
        location_id = (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );

-- Service role bypass
CREATE POLICY "Service role bypass for bags" ON bags
    FOR ALL TO service_role USING (true);
