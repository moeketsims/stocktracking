-- Security Fixes Migration
-- Date: 2026-01-08
-- Fixes: SECURITY DEFINER views, mutable search_path in functions

-- ============================================
-- FIX VIEWS: Add security_invoker = true
-- ============================================

-- Drop and recreate stock_balance view with security_invoker
DROP VIEW IF EXISTS stock_balance;
CREATE VIEW stock_balance
WITH (security_invoker = true)
AS
SELECT
    COALESCE(t.location_id_to, t.location_id_from) AS location_id,
    t.item_id,
    SUM(
        CASE
            WHEN t.type = 'receive' THEN t.qty
            WHEN t.type = 'issue' THEN -t.qty
            WHEN t.type = 'waste' THEN -t.qty
            WHEN t.type = 'transfer' AND t.location_id_to = COALESCE(t.location_id_to, t.location_id_from) THEN t.qty
            WHEN t.type = 'transfer' AND t.location_id_from = COALESCE(t.location_id_to, t.location_id_from) THEN -t.qty
            WHEN t.type = 'adjustment' AND t.location_id_to IS NOT NULL THEN t.qty
            WHEN t.type = 'adjustment' AND t.location_id_from IS NOT NULL THEN -t.qty
            ELSE 0
        END
    ) AS on_hand_qty
FROM stock_transactions t
GROUP BY COALESCE(t.location_id_to, t.location_id_from), t.item_id;

-- Drop and recreate batch_balance view with security_invoker
DROP VIEW IF EXISTS batch_balance;
CREATE VIEW batch_balance
WITH (security_invoker = true)
AS
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
    s.name AS supplier_name,
    CASE
        WHEN b.expiry_date IS NULL THEN NULL
        WHEN b.expiry_date <= CURRENT_DATE THEN 0
        ELSE (b.expiry_date - CURRENT_DATE)
    END AS days_until_expiry
FROM stock_batches b
JOIN suppliers s ON s.id = b.supplier_id
WHERE b.is_depleted = FALSE
ORDER BY b.received_at ASC;

-- ============================================
-- FIX FUNCTIONS: Add SET search_path
-- ============================================

-- Fix get_user_profile function
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
    id UUID,
    role user_role,
    zone_id UUID,
    location_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.role, p.zone_id, p.location_id
    FROM profiles p
    WHERE p.user_id = auth.uid();
END;
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- Fix is_zone_manager function
CREATE OR REPLACE FUNCTION is_zone_manager(check_zone_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR (role = 'zone_manager' AND zone_id = check_zone_id))
    );
END;
$$;

-- Fix has_location_access function
CREATE OR REPLACE FUNCTION has_location_access(check_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_profile profiles%ROWTYPE;
    location_zone_id UUID;
BEGIN
    SELECT * INTO user_profile FROM profiles WHERE user_id = auth.uid();

    IF user_profile.role = 'admin' THEN
        RETURN TRUE;
    END IF;

    SELECT zone_id INTO location_zone_id FROM locations WHERE id = check_location_id;

    IF user_profile.role = 'zone_manager' AND user_profile.zone_id = location_zone_id THEN
        RETURN TRUE;
    END IF;

    IF user_profile.role IN ('location_manager', 'staff') AND user_profile.location_id = check_location_id THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Fix get_user_zone_id function
CREATE OR REPLACE FUNCTION get_user_zone_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT zone_id FROM profiles WHERE user_id = auth.uid());
END;
$$;

-- Fix get_user_location_id function
CREATE OR REPLACE FUNCTION get_user_location_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT location_id FROM profiles WHERE user_id = auth.uid());
END;
$$;
