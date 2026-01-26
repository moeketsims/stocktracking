-- ============================================
-- Bag Usage Tracking System
-- Real-time bag-level stock tracking with notifications
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Core bag usage logging table
CREATE TABLE bag_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
    logged_by UUID NOT NULL REFERENCES auth.users(id),
    bag_count INTEGER NOT NULL DEFAULT 1 CHECK (bag_count > 0),
    kg_equivalent DECIMAL(10,2) NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_undone BOOLEAN DEFAULT FALSE,
    undone_at TIMESTAMPTZ,
    stock_transaction_id UUID REFERENCES stock_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_bag_usage_location_date ON bag_usage_logs(location_id, logged_at DESC);
CREATE INDEX idx_bag_usage_item ON bag_usage_logs(item_id, logged_at DESC);
CREATE INDEX idx_bag_usage_user ON bag_usage_logs(logged_by, logged_at DESC);

-- Push notification tokens
CREATE TABLE user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_id TEXT,
    platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, expo_push_token)
);

CREATE INDEX idx_push_tokens_user ON user_push_tokens(user_id) WHERE is_active = TRUE;

-- Usage notifications queue
CREATE TABLE usage_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bag_usage_log_id UUID REFERENCES bag_usage_logs(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('bag_used', 'threshold_alert', 'daily_summary')),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_unsent ON usage_notifications(is_sent, created_at) WHERE is_sent = FALSE;
CREATE INDEX idx_notifications_user ON usage_notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread ON usage_notifications(recipient_user_id, created_at DESC) WHERE is_read = FALSE;

-- Daily usage summary (materialized aggregates)
CREATE TABLE daily_usage_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    total_bags_used INTEGER NOT NULL DEFAULT 0,
    total_kg_used DECIMAL(10,2) NOT NULL DEFAULT 0,
    bags_remaining INTEGER,
    kg_remaining DECIMAL(10,2),
    usage_vs_yesterday_pct DECIMAL(5,2),
    avg_bags_per_hour DECIMAL(5,2),
    peak_usage_hour INTEGER CHECK (peak_usage_hour >= 0 AND peak_usage_hour <= 23),
    first_log_at TIMESTAMPTZ,
    last_log_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(location_id, item_id, summary_date)
);

CREATE INDEX idx_daily_summary_lookup ON daily_usage_summary(location_id, item_id, summary_date DESC);

-- ============================================
-- 2. VIEWS
-- ============================================

-- Real-time today's usage view
CREATE OR REPLACE VIEW today_bag_usage
WITH (security_invoker = true)
AS
SELECT
    location_id,
    item_id,
    COALESCE(SUM(bag_count), 0)::INTEGER AS bags_used_today,
    COALESCE(SUM(kg_equivalent), 0)::DECIMAL(10,2) AS kg_used_today,
    COUNT(*)::INTEGER AS log_count,
    MAX(logged_at) AS last_logged_at,
    MIN(logged_at) AS first_logged_at
FROM bag_usage_logs
WHERE logged_at >= CURRENT_DATE
    AND is_undone = FALSE
GROUP BY location_id, item_id;

-- Yesterday's usage for comparison
CREATE OR REPLACE VIEW yesterday_bag_usage
WITH (security_invoker = true)
AS
SELECT
    location_id,
    item_id,
    COALESCE(SUM(bag_count), 0)::INTEGER AS bags_used_yesterday,
    COALESCE(SUM(kg_equivalent), 0)::DECIMAL(10,2) AS kg_used_yesterday
FROM bag_usage_logs
WHERE logged_at >= (CURRENT_DATE - INTERVAL '1 day')
    AND logged_at < CURRENT_DATE
    AND is_undone = FALSE
GROUP BY location_id, item_id;

-- Hourly breakdown for trend charts
CREATE OR REPLACE VIEW hourly_usage_breakdown
WITH (security_invoker = true)
AS
SELECT
    location_id,
    item_id,
    DATE_TRUNC('hour', logged_at) AS hour,
    DATE(logged_at) AS usage_date,
    EXTRACT(HOUR FROM logged_at)::INTEGER AS hour_of_day,
    SUM(bag_count)::INTEGER AS bags_used,
    SUM(kg_equivalent)::DECIMAL(10,2) AS kg_used,
    COUNT(*)::INTEGER AS log_count
FROM bag_usage_logs
WHERE is_undone = FALSE
GROUP BY location_id, item_id, DATE_TRUNC('hour', logged_at), DATE(logged_at), EXTRACT(HOUR FROM logged_at)
ORDER BY hour DESC;

-- Combined usage stats view (today + yesterday + remaining)
CREATE OR REPLACE VIEW bag_usage_stats
WITH (security_invoker = true)
AS
SELECT
    sb.location_id,
    sb.item_id,
    i.name AS item_name,
    i.conversion_factor,
    -- Current stock in kg
    sb.on_hand_qty AS kg_remaining,
    -- Current stock in bags (computed)
    FLOOR(sb.on_hand_qty / NULLIF(i.conversion_factor, 0))::INTEGER AS bags_remaining,
    -- Today's usage
    COALESCE(t.bags_used_today, 0) AS bags_used_today,
    COALESCE(t.kg_used_today, 0) AS kg_used_today,
    t.last_logged_at,
    -- Yesterday's usage
    COALESCE(y.bags_used_yesterday, 0) AS bags_used_yesterday,
    -- Comparison percentage
    CASE
        WHEN COALESCE(y.bags_used_yesterday, 0) = 0 THEN NULL
        ELSE ROUND(((COALESCE(t.bags_used_today, 0) - y.bags_used_yesterday)::DECIMAL / y.bags_used_yesterday * 100), 1)
    END AS usage_vs_yesterday_pct
FROM stock_balance sb
JOIN items i ON i.id = sb.item_id
LEFT JOIN today_bag_usage t ON t.location_id = sb.location_id AND t.item_id = sb.item_id
LEFT JOIN yesterday_bag_usage y ON y.location_id = sb.location_id AND y.item_id = sb.item_id;

-- ============================================
-- 3. FUNCTIONS
-- ============================================

-- Atomic bag logging with FIFO batch selection
CREATE OR REPLACE FUNCTION log_bag_usage(
    p_location_id UUID,
    p_item_id UUID,
    p_logged_by UUID,
    p_bag_count INTEGER DEFAULT 1
)
RETURNS TABLE(
    bag_log_id UUID,
    transaction_id UUID,
    batch_used_id UUID,
    kg_deducted DECIMAL,
    bags_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversion_factor DECIMAL;
    v_kg_equivalent DECIMAL;
    v_oldest_batch RECORD;
    v_bag_log_id UUID;
    v_transaction_id UUID;
    v_current_balance DECIMAL;
    v_bags_remaining INTEGER;
BEGIN
    -- Get item conversion factor
    SELECT conversion_factor INTO v_conversion_factor
    FROM items WHERE id = p_item_id;

    IF v_conversion_factor IS NULL THEN
        RAISE EXCEPTION 'Item not found: %', p_item_id;
    END IF;

    v_kg_equivalent := p_bag_count * v_conversion_factor;

    -- Find oldest batch with remaining qty (FIFO)
    SELECT id, remaining_qty INTO v_oldest_batch
    FROM stock_batches
    WHERE location_id = p_location_id
        AND item_id = p_item_id
        AND is_depleted = FALSE
        AND remaining_qty > 0
    ORDER BY received_at ASC
    LIMIT 1;

    -- Create stock transaction (issue type)
    INSERT INTO stock_transactions (
        created_by,
        location_id_from,
        item_id,
        batch_id,
        qty,
        unit,
        type,
        notes,
        metadata
    ) VALUES (
        p_logged_by,
        p_location_id,
        p_item_id,
        v_oldest_batch.id,
        v_kg_equivalent,
        'kg',
        'issue',
        'Quick bag log',
        jsonb_build_object(
            'source', 'quick_log',
            'bag_count', p_bag_count,
            'original_unit', 'bag'
        )
    )
    RETURNING id INTO v_transaction_id;

    -- Create bag usage log
    INSERT INTO bag_usage_logs (
        location_id,
        item_id,
        batch_id,
        logged_by,
        bag_count,
        kg_equivalent,
        stock_transaction_id
    ) VALUES (
        p_location_id,
        p_item_id,
        v_oldest_batch.id,
        p_logged_by,
        p_bag_count,
        v_kg_equivalent,
        v_transaction_id
    )
    RETURNING id INTO v_bag_log_id;

    -- Update batch remaining qty if batch exists
    IF v_oldest_batch.id IS NOT NULL THEN
        UPDATE stock_batches
        SET remaining_qty = GREATEST(0, remaining_qty - v_kg_equivalent),
            is_depleted = (remaining_qty - v_kg_equivalent) <= 0
        WHERE id = v_oldest_batch.id;
    END IF;

    -- Calculate remaining bags
    SELECT FLOOR(COALESCE(SUM(on_hand_qty), 0) / v_conversion_factor)::INTEGER
    INTO v_bags_remaining
    FROM stock_balance
    WHERE location_id = p_location_id AND item_id = p_item_id;

    RETURN QUERY SELECT v_bag_log_id, v_transaction_id, v_oldest_batch.id, v_kg_equivalent, v_bags_remaining;
END;
$$;

-- Undo bag usage within time window
CREATE OR REPLACE FUNCTION undo_bag_usage(
    p_bag_log_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log RECORD;
BEGIN
    -- Get log and verify ownership and time window (5 minutes)
    SELECT * INTO v_log
    FROM bag_usage_logs
    WHERE id = p_bag_log_id
        AND logged_by = p_user_id
        AND is_undone = FALSE
        AND logged_at > NOW() - INTERVAL '5 minutes';

    IF v_log IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Mark as undone
    UPDATE bag_usage_logs
    SET is_undone = TRUE,
        undone_at = NOW()
    WHERE id = p_bag_log_id;

    -- Reverse batch deduction
    IF v_log.batch_id IS NOT NULL THEN
        UPDATE stock_batches
        SET remaining_qty = remaining_qty + v_log.kg_equivalent,
            is_depleted = FALSE
        WHERE id = v_log.batch_id;
    END IF;

    -- Mark transaction as undone in metadata
    UPDATE stock_transactions
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('undone', true, 'undone_at', NOW()::text)
    WHERE id = v_log.stock_transaction_id;

    RETURN TRUE;
END;
$$;

-- Get managers to notify for a location
CREATE OR REPLACE FUNCTION get_notification_recipients(p_location_id UUID)
RETURNS TABLE(user_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.user_id, p.role::TEXT
    FROM profiles p
    JOIN locations l ON l.id = p_location_id
    WHERE
        -- Admins get all notifications
        p.role = 'admin'
        -- Zone managers for this zone
        OR (p.role = 'zone_manager' AND p.zone_id = l.zone_id)
        -- Location managers for this location
        OR (p.role = 'location_manager' AND p.location_id = p_location_id);
END;
$$;

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Trigger to queue notifications when bag is logged
CREATE OR REPLACE FUNCTION notify_bag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recipient RECORD;
    v_item_name TEXT;
    v_location_name TEXT;
    v_logger_name TEXT;
BEGIN
    -- Get context for notification
    SELECT name INTO v_item_name FROM items WHERE id = NEW.item_id;
    SELECT name INTO v_location_name FROM locations WHERE id = NEW.location_id;
    SELECT COALESCE(full_name, 'Staff') INTO v_logger_name FROM profiles WHERE user_id = NEW.logged_by;

    -- Queue notification for each recipient
    FOR v_recipient IN SELECT * FROM get_notification_recipients(NEW.location_id)
    LOOP
        -- Don't notify the person who logged it
        IF v_recipient.user_id != NEW.logged_by THEN
            INSERT INTO usage_notifications (
                bag_usage_log_id,
                recipient_user_id,
                notification_type,
                title,
                body,
                data
            ) VALUES (
                NEW.id,
                v_recipient.user_id,
                'bag_used',
                v_item_name || ' Used',
                v_logger_name || ' used ' || NEW.bag_count || ' bag(s) at ' || v_location_name,
                jsonb_build_object(
                    'location_id', NEW.location_id,
                    'item_id', NEW.item_id,
                    'bag_count', NEW.bag_count,
                    'kg_equivalent', NEW.kg_equivalent,
                    'logged_by', NEW.logged_by
                )
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_bag_usage
    AFTER INSERT ON bag_usage_logs
    FOR EACH ROW
    WHEN (NEW.is_undone = FALSE)
    EXECUTE FUNCTION notify_bag_usage();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bag_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_summary ENABLE ROW LEVEL SECURITY;

-- bag_usage_logs policies
CREATE POLICY "Staff can log at their location" ON bag_usage_logs
    FOR INSERT WITH CHECK (
        location_id = (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'zone_manager'))
    );

CREATE POLICY "Users can view logs at their location/zone" ON bag_usage_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN locations l ON l.zone_id = p.zone_id
            WHERE p.user_id = auth.uid()
            AND (
                p.role = 'admin'
                OR p.location_id = bag_usage_logs.location_id
                OR (p.role = 'zone_manager' AND l.id = bag_usage_logs.location_id)
            )
        )
    );

CREATE POLICY "Users can undo their own logs" ON bag_usage_logs
    FOR UPDATE USING (logged_by = auth.uid())
    WITH CHECK (logged_by = auth.uid());

-- usage_notifications policies
CREATE POLICY "Users see their own notifications" ON usage_notifications
    FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON usage_notifications
    FOR UPDATE USING (recipient_user_id = auth.uid());

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications" ON usage_notifications
    FOR INSERT WITH CHECK (true);

-- user_push_tokens policies
CREATE POLICY "Users manage their own tokens" ON user_push_tokens
    FOR ALL USING (user_id = auth.uid());

-- daily_usage_summary policies
CREATE POLICY "Users can view summaries for their location/zone" ON daily_usage_summary
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN locations l ON l.zone_id = p.zone_id
            WHERE p.user_id = auth.uid()
            AND (
                p.role = 'admin'
                OR p.location_id = daily_usage_summary.location_id
                OR (p.role = 'zone_manager' AND l.id = daily_usage_summary.location_id)
            )
        )
    );

-- ============================================
-- 6. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION log_bag_usage TO authenticated;
GRANT EXECUTE ON FUNCTION undo_bag_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_recipients TO authenticated;
