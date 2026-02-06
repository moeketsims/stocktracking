-- Migration: Stock Take, Expiry Alerts, Auto-Reorder features
-- Date: 2026-02-06

-- ============================================================
-- 1. Stock Takes tables
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_takes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    total_lines INT NOT NULL DEFAULT 0,
    lines_counted INT NOT NULL DEFAULT 0,
    variance_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (completed_at IS NULL AND completed_by IS NULL) OR
        (completed_at IS NOT NULL AND completed_by IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS stock_take_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_take_id UUID NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    expected_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
    counted_qty NUMERIC(10,2),
    variance NUMERIC(10,2),
    variance_pct NUMERIC(8,2),
    notes TEXT,
    counted_at TIMESTAMPTZ,
    counted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stock_take_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_takes_location_status
    ON stock_takes(location_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_take_lines_stock_take
    ON stock_take_lines(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_lines_item
    ON stock_take_lines(item_id);

-- Triggers
CREATE TRIGGER update_stock_takes_updated_at
    BEFORE UPDATE ON stock_takes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_take_lines_updated_at
    BEFORE UPDATE ON stock_take_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Expiry notification settings
-- ============================================================

CREATE TABLE IF NOT EXISTS expiry_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID UNIQUE REFERENCES locations(id) ON DELETE CASCADE,
    warning_days INT NOT NULL DEFAULT 7,
    send_daily_digest BOOLEAN NOT NULL DEFAULT TRUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_expiry_notification_settings_updated_at
    BEFORE UPDATE ON expiry_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert system-wide default (location_id NULL = global)
INSERT INTO expiry_notification_settings (location_id, warning_days, send_daily_digest, enabled)
VALUES (NULL, 7, TRUE, TRUE)
ON CONFLICT (location_id) DO NOTHING;

-- ============================================================
-- 3. Auto-reorder columns on reorder_policies
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reorder_policies' AND column_name = 'auto_reorder_enabled'
    ) THEN
        ALTER TABLE reorder_policies ADD COLUMN auto_reorder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reorder_policies' AND column_name = 'auto_reorder_quantity_bags'
    ) THEN
        ALTER TABLE reorder_policies ADD COLUMN auto_reorder_quantity_bags INT;
    END IF;
END $$;

-- ============================================================
-- 4. Auto-generated flag on stock_requests
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stock_requests' AND column_name = 'is_auto_generated'
    ) THEN
        ALTER TABLE stock_requests ADD COLUMN is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- ============================================================
-- 5. RLS policies
-- ============================================================

ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_take_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiry_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on stock_takes"
    ON stock_takes FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view stock takes for accessible locations"
    ON stock_takes FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            is_admin()
            OR EXISTS (
                SELECT 1 FROM locations l
                WHERE l.id = stock_takes.location_id
                AND (l.zone_id = get_user_zone_id() OR l.id = get_user_location_id())
            )
        )
    );

CREATE POLICY "Managers can create stock takes for accessible locations"
    ON stock_takes FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            is_admin()
            OR EXISTS (
                SELECT 1 FROM locations l
                WHERE l.id = stock_takes.location_id
                AND (l.zone_id = get_user_zone_id() OR l.id = get_user_location_id())
            )
        )
    );

CREATE POLICY "Managers can update stock takes for accessible locations"
    ON stock_takes FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            is_admin()
            OR EXISTS (
                SELECT 1 FROM locations l
                WHERE l.id = stock_takes.location_id
                AND (l.zone_id = get_user_zone_id() OR l.id = get_user_location_id())
            )
        )
    );

CREATE POLICY "Service role full access on stock_take_lines"
    ON stock_take_lines FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view stock take lines"
    ON stock_take_lines FOR SELECT
    USING (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM stock_takes st
            WHERE st.id = stock_take_lines.stock_take_id
            AND (
                is_admin()
                OR EXISTS (
                    SELECT 1 FROM locations l
                    WHERE l.id = st.location_id
                    AND (l.zone_id = get_user_zone_id() OR l.id = get_user_location_id())
                )
            )
        )
    );

CREATE POLICY "Managers can insert stock take lines"
    ON stock_take_lines FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM stock_takes st
            WHERE st.id = stock_take_lines.stock_take_id
            AND (
                is_admin()
                OR EXISTS (
                    SELECT 1 FROM locations l
                    WHERE l.id = st.location_id
                    AND (l.zone_id = get_user_zone_id() OR l.id = get_user_location_id())
                )
            )
        )
    );

CREATE POLICY "Managers can update stock take lines"
    ON stock_take_lines FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND EXISTS (
            SELECT 1 FROM stock_takes st
            WHERE st.id = stock_take_lines.stock_take_id
            AND (
                is_admin()
                OR EXISTS (
                    SELECT 1 FROM locations l
                    WHERE l.id = st.location_id
                    AND (l.zone_id = get_user_zone_id() OR l.id = get_user_location_id())
                )
            )
        )
    );

CREATE POLICY "Service role full access on expiry_notification_settings"
    ON expiry_notification_settings FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage expiry notification settings"
    ON expiry_notification_settings FOR ALL
    USING (auth.role() = 'authenticated' AND is_admin())
    WITH CHECK (auth.role() = 'authenticated' AND is_admin());

-- ============================================================
-- 6. Grants
-- ============================================================

GRANT ALL ON stock_takes TO service_role;
GRANT ALL ON stock_take_lines TO service_role;
GRANT ALL ON expiry_notification_settings TO service_role;

GRANT SELECT, INSERT, UPDATE ON stock_takes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stock_take_lines TO authenticated;
GRANT SELECT ON expiry_notification_settings TO authenticated;
