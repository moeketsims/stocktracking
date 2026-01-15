-- RLS (Row Level Security) Validation Tests
-- These tests validate that users can only access data they're authorized to see

-- ============================================
-- SECURITY CHECKLIST
-- ============================================
-- 1. Staff can only see their assigned location's data
-- 2. Location managers can see their location's data
-- 3. Zone managers can see all locations in their zone
-- 4. Admins can see all data
-- 5. No cross-zone data leakage
-- 6. No cross-location data leakage for staff

-- ============================================
-- Test Setup: Create test users and data
-- ============================================

-- Run this as service_role (admin) to set up test data
-- Then run validation queries as different users

-- Helper function to check if user can see specific location's transactions
CREATE OR REPLACE FUNCTION test_rls_can_see_location(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO result_count
  FROM stock_transactions
  WHERE location_id_from = p_location_id
     OR location_id_to = p_location_id;

  RETURN result_count > 0;
END;
$$;

-- ============================================
-- RLS Policy Validation Queries
-- ============================================

-- Query 1: Verify staff can only see their location
-- Run as: staff user assigned to location X
-- Expected: Only see transactions for location X
SELECT
  'staff_location_isolation' as test_name,
  location_id_from,
  location_id_to,
  COUNT(*) as transaction_count
FROM stock_transactions
GROUP BY location_id_from, location_id_to;

-- Query 2: Verify location manager can only see their location
-- Run as: location_manager user assigned to location X
-- Expected: Only see transactions for location X
SELECT
  'location_manager_isolation' as test_name,
  l.name as location_name,
  COUNT(st.*) as transaction_count
FROM locations l
LEFT JOIN stock_transactions st ON (st.location_id_from = l.id OR st.location_id_to = l.id)
GROUP BY l.id, l.name;

-- Query 3: Verify zone manager can see all locations in their zone
-- Run as: zone_manager user assigned to zone Z
-- Expected: See transactions for all locations in zone Z
SELECT
  'zone_manager_scope' as test_name,
  z.name as zone_name,
  l.name as location_name,
  COUNT(st.*) as transaction_count
FROM zones z
JOIN locations l ON l.zone_id = z.id
LEFT JOIN stock_transactions st ON (st.location_id_from = l.id OR st.location_id_to = l.id)
GROUP BY z.id, z.name, l.id, l.name;

-- Query 4: Verify admin can see everything
-- Run as: admin user
-- Expected: See all transactions across all zones/locations
SELECT
  'admin_full_access' as test_name,
  z.name as zone_name,
  l.name as location_name,
  COUNT(st.*) as transaction_count
FROM zones z
JOIN locations l ON l.zone_id = z.id
LEFT JOIN stock_transactions st ON (st.location_id_from = l.id OR st.location_id_to = l.id)
GROUP BY z.id, z.name, l.id, l.name
ORDER BY z.name, l.name;

-- ============================================
-- Cross-Location Leakage Test
-- ============================================

-- This should return 0 rows for staff/location_manager
-- when they try to access a location they're not assigned to
SELECT
  'cross_location_leakage_test' as test_name,
  st.*
FROM stock_transactions st
JOIN locations l ON (st.location_id_from = l.id OR st.location_id_to = l.id)
WHERE l.id NOT IN (
  SELECT location_id FROM profiles WHERE user_id = auth.uid()
);

-- ============================================
-- Profiles Access Test
-- ============================================

-- Staff should only see their own profile
-- Managers should see profiles in their scope
-- Admins can see all profiles
SELECT
  'profiles_access_test' as test_name,
  p.id,
  p.full_name,
  p.role,
  l.name as location_name,
  z.name as zone_name
FROM profiles p
LEFT JOIN locations l ON l.id = p.location_id
LEFT JOIN zones z ON z.id = p.zone_id;

-- ============================================
-- Audit Log Access Test
-- ============================================

-- Only admins should see audit logs
SELECT
  'audit_log_access_test' as test_name,
  COUNT(*) as log_count
FROM audit_logs;

-- ============================================
-- Stock Balance Access Test
-- ============================================

-- Users should only see balances for locations they can access
SELECT
  'stock_balance_access_test' as test_name,
  l.name as location_name,
  i.name as item_name,
  sb.on_hand_qty
FROM stock_balance sb
JOIN locations l ON l.id = sb.location_id
JOIN items i ON i.id = sb.item_id;

-- ============================================
-- Batch Access Test
-- ============================================

-- Users should only see batches for their accessible locations
SELECT
  'batch_access_test' as test_name,
  l.name as location_name,
  b.id as batch_id,
  b.remaining_qty
FROM stock_batches b
JOIN locations l ON l.id = b.location_id;

-- ============================================
-- Summary Report: Run as admin to see all policies
-- ============================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
