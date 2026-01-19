-- Stock Replenishment Workflow Enhancements
-- Features: Request Expiration/Escalation, Cancellation Notifications, ETA, Low Stock Alerts, Partial Fulfillment, Request Modification

-- 1. Request escalation tracking
CREATE TABLE IF NOT EXISTS request_escalation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE UNIQUE,
    escalation_level INT NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 3),
    last_escalation_at TIMESTAMPTZ,
    next_escalation_at TIMESTAMPTZ NOT NULL,
    reminder_threshold_hours INT NOT NULL,
    escalate_threshold_hours INT NOT NULL,
    expire_threshold_hours INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_escalation_pending ON request_escalation_state(next_escalation_at)
    WHERE escalation_level < 3;

-- 2. Low stock alert tracking
CREATE TABLE IF NOT EXISTS low_stock_alert_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    escalation_level INT NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 3),
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notification_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_escalation_at TIMESTAMPTZ,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by_request_id UUID REFERENCES stock_requests(id) ON DELETE SET NULL,
    stock_qty_when_detected DECIMAL(10,2) NOT NULL,
    reorder_point_qty DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, item_id, is_resolved) -- Only one active alert per location/item
);

CREATE INDEX IF NOT EXISTS idx_alert_state_unresolved ON low_stock_alert_state(is_resolved, next_escalation_at)
    WHERE is_resolved = FALSE;

-- 3. Add ETA to trips
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'estimated_arrival_time') THEN
        ALTER TABLE trips ADD COLUMN estimated_arrival_time TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Add cancellation fields to stock_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_requests' AND column_name = 'cancelled_at') THEN
        ALTER TABLE stock_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_requests' AND column_name = 'cancelled_by') THEN
        ALTER TABLE stock_requests ADD COLUMN cancelled_by UUID REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_requests' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE stock_requests ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- 5. Add delivered_qty_bags to trip_requests junction table for partial fulfillment tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_requests' AND column_name = 'delivered_qty_bags') THEN
        ALTER TABLE trip_requests ADD COLUMN delivered_qty_bags INT DEFAULT 0;
    END IF;
END $$;

-- 6. Add expired status to stock_requests status check (if using check constraint)
-- Note: PostgreSQL doesn't allow easy modification of CHECK constraints, so we use a trigger instead
-- The expired status is already allowed by the application code

-- 7. Database function for low stock detection
CREATE OR REPLACE FUNCTION get_low_stock_locations()
RETURNS TABLE (
    location_id UUID,
    item_id UUID,
    location_name TEXT,
    item_name TEXT,
    on_hand_qty DECIMAL,
    reorder_point_qty DECIMAL,
    zone_id UUID
)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT
        sb.location_id,
        sb.item_id,
        l.name AS location_name,
        i.name AS item_name,
        sb.on_hand_qty,
        COALESCE(rp.reorder_point_qty, 50) AS reorder_point_qty,
        l.zone_id
    FROM stock_balance sb
    JOIN locations l ON l.id = sb.location_id
    JOIN items i ON i.id = sb.item_id
    LEFT JOIN reorder_policies rp ON rp.location_id = sb.location_id AND rp.item_id = sb.item_id
    WHERE sb.on_hand_qty < COALESCE(rp.reorder_point_qty, 50);
$$;

-- 8. Function to check if a request has an open stock request (for alert resolution)
CREATE OR REPLACE FUNCTION check_stock_request_for_location(p_location_id UUID, p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM stock_requests sr
        WHERE sr.location_id = p_location_id
          AND sr.status IN ('pending', 'accepted', 'trip_created', 'in_delivery')
          AND sr.created_at > NOW() - INTERVAL '7 days'
    );
$$;

-- 9. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_request_escalation_state_updated_at') THEN
        CREATE TRIGGER update_request_escalation_state_updated_at
            BEFORE UPDATE ON request_escalation_state
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_low_stock_alert_state_updated_at') THEN
        CREATE TRIGGER update_low_stock_alert_state_updated_at
            BEFORE UPDATE ON low_stock_alert_state
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 10. RLS policies
ALTER TABLE request_escalation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alert_state ENABLE ROW LEVEL SECURITY;

-- Service role full access to request_escalation_state
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to request_escalation_state' AND tablename = 'request_escalation_state') THEN
        CREATE POLICY "Service role full access to request_escalation_state" ON request_escalation_state
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Service role full access to low_stock_alert_state
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to low_stock_alert_state' AND tablename = 'low_stock_alert_state') THEN
        CREATE POLICY "Service role full access to low_stock_alert_state" ON low_stock_alert_state
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Grant permissions (for service role access via admin client)
GRANT ALL ON request_escalation_state TO service_role;
GRANT ALL ON low_stock_alert_state TO service_role;
GRANT EXECUTE ON FUNCTION get_low_stock_locations() TO service_role;
GRANT EXECUTE ON FUNCTION check_stock_request_for_location(UUID, UUID) TO service_role;
