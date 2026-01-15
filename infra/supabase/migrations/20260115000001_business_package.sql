-- Business Package Schema Updates
-- Version: 2.0
-- Date: 2026-01-15
-- Features: Batch status, Cost tracking, Returns, Adjustments, Batch editing

-- ============================================
-- NEW ENUMS
-- ============================================

-- Batch status enum (replaces is_depleted boolean)
CREATE TYPE batch_status AS ENUM ('available', 'quarantine', 'hold', 'depleted');

-- Adjustment reason enum
CREATE TYPE adjustment_reason AS ENUM (
    'count_error',
    'theft',
    'found_stock',
    'damage_write_off',
    'system_correction',
    'other'
);

-- Add 'return' to transaction type
ALTER TYPE transaction_type ADD VALUE 'return';

-- ============================================
-- STOCK_BATCHES TABLE UPDATES
-- ============================================

-- Add batch status column
ALTER TABLE stock_batches
ADD COLUMN status batch_status NOT NULL DEFAULT 'available';

-- Add cost tracking columns
ALTER TABLE stock_batches
ADD COLUMN cost_per_unit DECIMAL(10,4),
ADD COLUMN total_cost DECIMAL(12,2);

-- Add delivery note field
ALTER TABLE stock_batches
ADD COLUMN delivery_note_number VARCHAR(100);

-- Add batch edit tracking fields
ALTER TABLE stock_batches
ADD COLUMN last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN last_edited_at TIMESTAMPTZ;

-- ============================================
-- STOCK_TRANSACTIONS TABLE UPDATES
-- ============================================

-- Add return-related fields
ALTER TABLE stock_transactions
ADD COLUMN original_batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
ADD COLUMN return_reason VARCHAR(255);

-- Add adjustment reason field
ALTER TABLE stock_transactions
ADD COLUMN adjustment_reason adjustment_reason;

-- Update valid_locations constraint to include return type
ALTER TABLE stock_transactions DROP CONSTRAINT valid_locations;
ALTER TABLE stock_transactions ADD CONSTRAINT valid_locations CHECK (
    (type = 'receive' AND location_id_to IS NOT NULL) OR
    (type = 'issue' AND location_id_from IS NOT NULL) OR
    (type = 'transfer' AND location_id_from IS NOT NULL AND location_id_to IS NOT NULL) OR
    (type = 'waste' AND location_id_from IS NOT NULL) OR
    (type = 'adjustment' AND (location_id_from IS NOT NULL OR location_id_to IS NOT NULL)) OR
    (type = 'return' AND location_id_to IS NOT NULL)
);

-- ============================================
-- NEW TABLE: BATCH EDIT HISTORY
-- ============================================

CREATE TABLE batch_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES stock_batches(id) ON DELETE CASCADE,
    edited_by UUID NOT NULL REFERENCES auth.users(id),
    edited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    field_changed VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    edit_reason TEXT
);

-- Index for efficient history lookups
CREATE INDEX idx_batch_edit_history_batch ON batch_edit_history(batch_id);
CREATE INDEX idx_batch_edit_history_edited_at ON batch_edit_history(edited_at DESC);

-- ============================================
-- NEW INDEXES FOR FIFO + EXPIRY PRIORITY
-- ============================================

-- Index optimized for expiry-priority FIFO queries
CREATE INDEX idx_batches_fifo_expiry_priority ON stock_batches(
    location_id,
    item_id,
    status,
    expiry_date NULLS LAST,
    received_at ASC
) WHERE remaining_qty > 0;

-- ============================================
-- DATA MIGRATION
-- ============================================

-- Migrate existing batches: set status based on is_depleted and remaining_qty
UPDATE stock_batches
SET status = CASE
    WHEN is_depleted = TRUE OR remaining_qty = 0 THEN 'depleted'::batch_status
    ELSE 'available'::batch_status
END;

-- ============================================
-- UPDATED VIEWS
-- ============================================

-- Update stock_balance view to handle return transactions
CREATE OR REPLACE VIEW stock_balance AS
SELECT
    COALESCE(t.location_id_to, t.location_id_from) AS location_id,
    t.item_id,
    SUM(
        CASE
            WHEN t.type = 'receive' THEN t.qty
            WHEN t.type = 'issue' THEN -t.qty
            WHEN t.type = 'waste' THEN -t.qty
            WHEN t.type = 'return' THEN t.qty
            WHEN t.type = 'transfer' AND t.location_id_to = COALESCE(t.location_id_to, t.location_id_from) THEN t.qty
            WHEN t.type = 'transfer' AND t.location_id_from = COALESCE(t.location_id_to, t.location_id_from) THEN -t.qty
            WHEN t.type = 'adjustment' AND t.location_id_to IS NOT NULL THEN t.qty
            WHEN t.type = 'adjustment' AND t.location_id_from IS NOT NULL THEN -t.qty
            ELSE 0
        END
    ) AS on_hand_qty
FROM stock_transactions t
GROUP BY COALESCE(t.location_id_to, t.location_id_from), t.item_id;

-- Update batch_balance view to include status and cost
CREATE OR REPLACE VIEW batch_balance AS
SELECT
    b.id AS batch_id,
    b.item_id,
    b.location_id,
    b.supplier_id,
    b.initial_qty,
    b.remaining_qty,
    b.received_at,
    b.expiry_date,
    b.quality_score,
    b.defect_pct,
    b.is_depleted,
    b.status,
    b.cost_per_unit,
    b.delivery_note_number,
    s.name AS supplier_name,
    CASE
        WHEN b.expiry_date IS NULL THEN NULL
        WHEN b.expiry_date <= CURRENT_DATE THEN 0
        ELSE (b.expiry_date - CURRENT_DATE)
    END AS days_until_expiry
FROM stock_batches b
JOIN suppliers s ON s.id = b.supplier_id
WHERE b.status != 'depleted'
ORDER BY
    -- Expiry priority: batches expiring within 7 days come first
    CASE
        WHEN b.expiry_date IS NOT NULL AND b.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
        THEN 0
        ELSE 1
    END,
    b.expiry_date NULLS LAST,
    b.received_at ASC;

-- New view: Available batches only (for issuing)
CREATE OR REPLACE VIEW available_batches AS
SELECT
    b.id AS batch_id,
    b.item_id,
    b.location_id,
    b.supplier_id,
    b.initial_qty,
    b.remaining_qty,
    b.received_at,
    b.expiry_date,
    b.quality_score,
    b.status,
    b.cost_per_unit,
    s.name AS supplier_name,
    CASE
        WHEN b.expiry_date IS NULL THEN 999999
        WHEN b.expiry_date <= CURRENT_DATE THEN -1
        ELSE (b.expiry_date - CURRENT_DATE)
    END AS days_until_expiry
FROM stock_batches b
JOIN suppliers s ON s.id = b.supplier_id
WHERE b.status = 'available'
  AND b.remaining_qty > 0
ORDER BY
    -- Expiry priority: items expiring soonest first (but not expired)
    CASE
        WHEN b.expiry_date IS NOT NULL AND b.expiry_date > CURRENT_DATE AND b.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
        THEN 0
        ELSE 1
    END,
    b.expiry_date NULLS LAST,
    b.received_at ASC;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get FIFO batch with expiry priority
CREATE OR REPLACE FUNCTION get_fifo_batch(
    p_location_id UUID,
    p_item_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- First try to find batches expiring within 7 days (soonest first)
    SELECT id INTO v_batch_id
    FROM stock_batches
    WHERE location_id = p_location_id
      AND item_id = p_item_id
      AND status = 'available'
      AND remaining_qty > 0
      AND expiry_date IS NOT NULL
      AND expiry_date > CURRENT_DATE
      AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY expiry_date ASC, received_at ASC
    LIMIT 1;

    -- If no expiring batches, fall back to oldest received
    IF v_batch_id IS NULL THEN
        SELECT id INTO v_batch_id
        FROM stock_batches
        WHERE location_id = p_location_id
          AND item_id = p_item_id
          AND status = 'available'
          AND remaining_qty > 0
        ORDER BY received_at ASC
        LIMIT 1;
    END IF;

    RETURN v_batch_id;
END;
$$;

-- Function to record batch edit
CREATE OR REPLACE FUNCTION record_batch_edit(
    p_batch_id UUID,
    p_edited_by UUID,
    p_field_changed VARCHAR(100),
    p_old_value TEXT,
    p_new_value TEXT,
    p_edit_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO batch_edit_history (batch_id, edited_by, field_changed, old_value, new_value, edit_reason)
    VALUES (p_batch_id, p_edited_by, p_field_changed, p_old_value, p_new_value, p_edit_reason)
    RETURNING id INTO v_history_id;

    -- Update the batch's last edited fields
    UPDATE stock_batches
    SET last_edited_by = p_edited_by,
        last_edited_at = NOW()
    WHERE id = p_batch_id;

    RETURN v_history_id;
END;
$$;

-- ============================================
-- RLS POLICIES FOR NEW TABLE
-- ============================================

ALTER TABLE batch_edit_history ENABLE ROW LEVEL SECURITY;

-- Admins and zone managers can view all edit history
CREATE POLICY "Managers can view batch edit history" ON batch_edit_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );

-- Only admins and zone managers can insert edit history (via functions)
CREATE POLICY "Managers can insert batch edit history" ON batch_edit_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );
