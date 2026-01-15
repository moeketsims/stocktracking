-- Fix Stock Balance View
-- Date: 2026-01-13
-- Bug: Transfer transactions were only counted at destination, not deducted from source
-- Fix: Use UNION ALL to properly handle transfers at both source and destination

DROP VIEW IF EXISTS stock_balance CASCADE;

CREATE VIEW stock_balance
WITH (security_invoker = true)
AS
WITH transaction_movements AS (
    -- Receives: add to destination location
    SELECT
        location_id_to AS location_id,
        item_id,
        qty AS movement
    FROM stock_transactions
    WHERE type = 'receive' AND location_id_to IS NOT NULL

    UNION ALL

    -- Issues: subtract from source location
    SELECT
        location_id_from AS location_id,
        item_id,
        -qty AS movement
    FROM stock_transactions
    WHERE type = 'issue' AND location_id_from IS NOT NULL

    UNION ALL

    -- Waste: subtract from source location
    SELECT
        location_id_from AS location_id,
        item_id,
        -qty AS movement
    FROM stock_transactions
    WHERE type = 'waste' AND location_id_from IS NOT NULL

    UNION ALL

    -- Transfers: ADD to destination
    SELECT
        location_id_to AS location_id,
        item_id,
        qty AS movement
    FROM stock_transactions
    WHERE type = 'transfer' AND location_id_to IS NOT NULL

    UNION ALL

    -- Transfers: SUBTRACT from source
    SELECT
        location_id_from AS location_id,
        item_id,
        -qty AS movement
    FROM stock_transactions
    WHERE type = 'transfer' AND location_id_from IS NOT NULL

    UNION ALL

    -- Adjustments: add to destination (positive adjustment)
    SELECT
        location_id_to AS location_id,
        item_id,
        qty AS movement
    FROM stock_transactions
    WHERE type = 'adjustment' AND location_id_to IS NOT NULL

    UNION ALL

    -- Adjustments: subtract from source (negative adjustment)
    SELECT
        location_id_from AS location_id,
        item_id,
        -qty AS movement
    FROM stock_transactions
    WHERE type = 'adjustment' AND location_id_from IS NOT NULL
)
SELECT
    location_id,
    item_id,
    SUM(movement) AS on_hand_qty
FROM transaction_movements
WHERE location_id IS NOT NULL
GROUP BY location_id, item_id;

-- Also create a useful view for debugging/verification
CREATE OR REPLACE VIEW stock_balance_detail AS
SELECT
    sb.location_id,
    l.name AS location_name,
    l.type AS location_type,
    sb.item_id,
    i.name AS item_name,
    i.sku,
    sb.on_hand_qty,
    i.unit
FROM stock_balance sb
JOIN locations l ON l.id = sb.location_id
JOIN items i ON i.id = sb.item_id
ORDER BY l.type, l.name, i.name;

COMMENT ON VIEW stock_balance IS 'Real-time stock balance by location and item, calculated from transaction history';
COMMENT ON VIEW stock_balance_detail IS 'Stock balance with location and item details for debugging';

-- Recreate bag_usage_stats view that was dropped by CASCADE
CREATE OR REPLACE VIEW bag_usage_stats
WITH (security_invoker = true)
AS
SELECT
    sb.location_id,
    sb.item_id,
    i.name AS item_name,
    i.conversion_factor,
    sb.on_hand_qty AS kg_remaining,
    FLOOR(sb.on_hand_qty / NULLIF(i.conversion_factor, 0))::INTEGER AS bags_remaining,
    COALESCE(t.bags_used_today, 0) AS bags_used_today,
    COALESCE(t.kg_used_today, 0) AS kg_used_today,
    t.last_logged_at,
    COALESCE(y.bags_used_yesterday, 0) AS bags_used_yesterday,
    CASE
        WHEN COALESCE(y.bags_used_yesterday, 0) = 0 THEN NULL
        ELSE ROUND(((COALESCE(t.bags_used_today, 0) - y.bags_used_yesterday)::DECIMAL / y.bags_used_yesterday * 100), 1)
    END AS usage_vs_yesterday_pct
FROM stock_balance sb
JOIN items i ON i.id = sb.item_id
LEFT JOIN today_bag_usage t ON t.location_id = sb.location_id AND t.item_id = sb.item_id
LEFT JOIN yesterday_bag_usage y ON y.location_id = sb.location_id AND y.item_id = sb.item_id;
