-- SQL Tests for Stock Balance Computations
-- Run these tests against a local Supabase instance to validate balance logic

-- Test Setup: Clean slate
BEGIN;

-- Create test data
DO $$
DECLARE
  test_zone_id UUID;
  test_location_id UUID;
  test_item_id UUID;
  test_supplier_id UUID;
  test_user_id UUID;
  balance_result NUMERIC;
BEGIN
  -- Insert test zone
  INSERT INTO zones (name) VALUES ('Test Zone') RETURNING id INTO test_zone_id;

  -- Insert test location
  INSERT INTO locations (name, type, zone_id)
  VALUES ('Test Shop', 'shop', test_zone_id)
  RETURNING id INTO test_location_id;

  -- Insert test item
  INSERT INTO items (sku, name, unit, conversion_factor)
  VALUES ('TEST-001', 'Test Potatoes', 'kg', 1)
  RETURNING id INTO test_item_id;

  -- Insert test supplier
  INSERT INTO suppliers (name) VALUES ('Test Supplier') RETURNING id INTO test_supplier_id;

  -- Get a test user (use first available)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  -- Test 1: Receive transaction increases balance
  RAISE NOTICE 'Test 1: Receive transaction increases balance';

  INSERT INTO stock_transactions (
    type, item_id, location_id_to, qty, unit, created_by
  ) VALUES (
    'receive', test_item_id, test_location_id, 100, 'kg', test_user_id
  );

  SELECT on_hand_qty INTO balance_result
  FROM stock_balance
  WHERE location_id = test_location_id AND item_id = test_item_id;

  IF balance_result = 100 THEN
    RAISE NOTICE 'Test 1 PASSED: Balance is 100 after receiving 100kg';
  ELSE
    RAISE EXCEPTION 'Test 1 FAILED: Expected 100, got %', balance_result;
  END IF;

  -- Test 2: Issue transaction decreases balance
  RAISE NOTICE 'Test 2: Issue transaction decreases balance';

  INSERT INTO stock_transactions (
    type, item_id, location_id_from, qty, unit, created_by
  ) VALUES (
    'issue', test_item_id, test_location_id, 30, 'kg', test_user_id
  );

  SELECT on_hand_qty INTO balance_result
  FROM stock_balance
  WHERE location_id = test_location_id AND item_id = test_item_id;

  IF balance_result = 70 THEN
    RAISE NOTICE 'Test 2 PASSED: Balance is 70 after issuing 30kg';
  ELSE
    RAISE EXCEPTION 'Test 2 FAILED: Expected 70, got %', balance_result;
  END IF;

  -- Test 3: Waste transaction decreases balance
  RAISE NOTICE 'Test 3: Waste transaction decreases balance';

  INSERT INTO stock_transactions (
    type, item_id, location_id_from, qty, unit, created_by, notes
  ) VALUES (
    'waste', test_item_id, test_location_id, 5, 'kg', test_user_id, 'Spoiled'
  );

  SELECT on_hand_qty INTO balance_result
  FROM stock_balance
  WHERE location_id = test_location_id AND item_id = test_item_id;

  IF balance_result = 65 THEN
    RAISE NOTICE 'Test 3 PASSED: Balance is 65 after 5kg waste';
  ELSE
    RAISE EXCEPTION 'Test 3 FAILED: Expected 65, got %', balance_result;
  END IF;

  -- Test 4: Positive adjustment increases balance
  RAISE NOTICE 'Test 4: Positive adjustment increases balance';

  INSERT INTO stock_transactions (
    type, item_id, location_id_to, qty, unit, created_by, notes
  ) VALUES (
    'adjustment', test_item_id, test_location_id, 10, 'kg', test_user_id, 'Count correction'
  );

  SELECT on_hand_qty INTO balance_result
  FROM stock_balance
  WHERE location_id = test_location_id AND item_id = test_item_id;

  IF balance_result = 75 THEN
    RAISE NOTICE 'Test 4 PASSED: Balance is 75 after +10kg adjustment';
  ELSE
    RAISE EXCEPTION 'Test 4 FAILED: Expected 75, got %', balance_result;
  END IF;

  -- Test 5: Negative adjustment decreases balance
  RAISE NOTICE 'Test 5: Negative adjustment decreases balance';

  INSERT INTO stock_transactions (
    type, item_id, location_id_from, qty, unit, created_by, notes
  ) VALUES (
    'adjustment', test_item_id, test_location_id, 5, 'kg', test_user_id, 'Count correction down'
  );

  SELECT on_hand_qty INTO balance_result
  FROM stock_balance
  WHERE location_id = test_location_id AND item_id = test_item_id;

  IF balance_result = 70 THEN
    RAISE NOTICE 'Test 5 PASSED: Balance is 70 after -5kg adjustment';
  ELSE
    RAISE EXCEPTION 'Test 5 FAILED: Expected 70, got %', balance_result;
  END IF;

  RAISE NOTICE 'All balance computation tests PASSED!';

END $$;

-- Rollback all test data (don't persist)
ROLLBACK;

-- Transfer Test (separate transaction)
BEGIN;

DO $$
DECLARE
  test_zone_id UUID;
  test_location_from UUID;
  test_location_to UUID;
  test_item_id UUID;
  test_user_id UUID;
  balance_from NUMERIC;
  balance_to NUMERIC;
BEGIN
  -- Setup
  INSERT INTO zones (name) VALUES ('Transfer Test Zone') RETURNING id INTO test_zone_id;
  INSERT INTO locations (name, type, zone_id) VALUES ('Shop A', 'shop', test_zone_id) RETURNING id INTO test_location_from;
  INSERT INTO locations (name, type, zone_id) VALUES ('Shop B', 'shop', test_zone_id) RETURNING id INTO test_location_to;
  INSERT INTO items (sku, name, unit, conversion_factor) VALUES ('TRANSFER-001', 'Transfer Test', 'kg', 1) RETURNING id INTO test_item_id;
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  -- Initial stock at Shop A
  INSERT INTO stock_transactions (type, item_id, location_id_to, qty, unit, created_by)
  VALUES ('receive', test_item_id, test_location_from, 100, 'kg', test_user_id);

  -- Transfer from Shop A to Shop B
  RAISE NOTICE 'Test 6: Transfer moves stock between locations';

  INSERT INTO stock_transactions (
    type, item_id, location_id_from, location_id_to, qty, unit, created_by
  ) VALUES (
    'transfer', test_item_id, test_location_from, test_location_to, 40, 'kg', test_user_id
  );

  SELECT on_hand_qty INTO balance_from
  FROM stock_balance
  WHERE location_id = test_location_from AND item_id = test_item_id;

  SELECT on_hand_qty INTO balance_to
  FROM stock_balance
  WHERE location_id = test_location_to AND item_id = test_item_id;

  IF balance_from = 60 AND balance_to = 40 THEN
    RAISE NOTICE 'Test 6 PASSED: Shop A has 60kg, Shop B has 40kg after transfer';
  ELSE
    RAISE EXCEPTION 'Test 6 FAILED: Expected 60/40, got %/%', balance_from, balance_to;
  END IF;

  RAISE NOTICE 'Transfer test PASSED!';

END $$;

ROLLBACK;
