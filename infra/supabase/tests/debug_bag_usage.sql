-- Debug script for Bag Usage Tracking System
-- To run: npx supabase db execute -f infra/supabase/tests/debug_bag_usage.sql

BEGIN;

-- 1. Setup session user (Staff Member)
SET LOCAL auth.uid = 'e0000000-0000-0000-0000-000000000003';
SET LOCAL search_path = public, auth;

-- 2. Check initial state
SELECT 'Initial Stock' as label, * FROM bag_usage_stats WHERE location_id = 'b0000000-0000-0000-0000-000000000002';

-- 3. Test logging usage (1 bag of Potatoes)
-- item_id c0000000-0000-0000-0000-000000000001 = Potatoes (kg)
-- conversion_factor = 1.0
SELECT 'Attempting to log 1 bag of kg potatoes...' as action;
SELECT * FROM log_bag_usage(
    'b0000000-0000-0000-0000-000000000002', 
    'c0000000-0000-0000-0000-000000000001', 
    'e0000000-0000-0000-0000-000000000003',
    1
);

-- 4. Check state after log
SELECT 'After Log' as label, * FROM bag_usage_stats WHERE location_id = 'b0000000-0000-0000-0000-000000000002';

-- 5. Test log with Bag item
-- item_id c0000000-0000-0000-0000-000000000002 = Potatoes (10kg bag)
-- conversion_factor = 10.0
SELECT 'Attempting to log 1 bag of bag potatoes...' as action;
SELECT * FROM log_bag_usage(
    'b0000000-0000-0000-0000-000000000002', 
    'c0000000-0000-0000-0000-000000000002', 
    'e0000000-0000-0000-0000-000000000003',
    1
);

-- 6. Check notifications
SELECT 'Notifications queued' as label, * FROM usage_notifications;

-- 7. Test Undo
SELECT 'Undoing last log...' as action;
SELECT undo_bag_usage(
    (SELECT id FROM bag_usage_logs ORDER BY created_at DESC LIMIT 1),
    'e0000000-0000-0000-0000-000000000003'
);

ROLLBACK;
