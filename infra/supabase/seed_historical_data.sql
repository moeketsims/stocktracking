-- Potato Stock Tracking - Historical Mock Data Generator
-- Generates 365 days of realistic data

DO $$
DECLARE
    v_start_date DATE := CURRENT_DATE - INTERVAL '365 days';
    v_end_date DATE := CURRENT_DATE;
    v_curr_date DATE;
    v_location RECORD;
    v_item RECORD;
    v_supplier_id UUID;
    v_admin_id UUID;
    v_batch_id UUID;
    v_trans_id UUID;
    v_daily_bags INTEGER;
    v_conversion DECIMAL;
    v_kg DECIMAL;
    v_warehouse_id UUID;
BEGIN
    -- 1. Setup IDs
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@test.com' LIMIT 1;
    SELECT id INTO v_supplier_id FROM suppliers LIMIT 1;
    SELECT id INTO v_warehouse_id FROM locations WHERE type = 'warehouse' LIMIT 1;

    -- If no warehouse, just use the first location
    IF v_warehouse_id IS NULL THEN
        SELECT id INTO v_warehouse_id FROM locations LIMIT 1;
    END IF;

    -- Clear existing usage data for a clean slate
    TRUNCATE bag_usage_logs CASCADE;
    DELETE FROM stock_transactions WHERE type IN ('receive', 'issue', 'transfer');
    UPDATE stock_batches SET remaining_qty = 0, is_depleted = TRUE;

    -- 2. Loop through each day
    v_curr_date := v_start_date;
    WHILE v_curr_date <= v_end_date LOOP
        
        -- A. Warehouse Receipts (Every 14 days)
        IF EXTRACT(DAY FROM v_curr_date)::INTEGER % 14 = 0 THEN
            FOR v_item IN SELECT id, conversion_factor FROM items LOOP
                -- Create Receipt Transaction
                INSERT INTO stock_transactions (
                    created_by, location_id_to, item_id, qty, unit, type, notes
                ) VALUES (
                    v_admin_id, v_warehouse_id, v_item.id, 2000, 'kg', 'receive', 'Bulk bi-weekly delivery'
                ) RETURNING id INTO v_trans_id;

                -- Create Batch
                INSERT INTO stock_batches (
                    item_id, location_id, supplier_id, receive_transaction_id, 
                    initial_qty, remaining_qty, received_at, quality_score, is_depleted
                ) VALUES (
                    v_item.id, v_warehouse_id, v_supplier_id, v_trans_id,
                    2000, 2000, v_curr_date + time '08:00', 1, FALSE
                );
            END LOOP;
        END IF;

        -- B. Shop replenishment from Warehouse (Every Monday)
        IF EXTRACT(DOW FROM v_curr_date) = 1 THEN
            FOR v_location IN SELECT id FROM locations WHERE type = 'shop' LOOP
                FOR v_item IN SELECT id FROM items LOOP
                    -- Find warehouse batch with stock
                    SELECT id INTO v_batch_id FROM stock_batches 
                    WHERE location_id = v_warehouse_id AND item_id = v_item.id AND remaining_qty >= 200
                    ORDER BY received_at ASC LIMIT 1;

                    IF v_batch_id IS NOT NULL THEN
                        -- Deduct from warehouse
                        UPDATE stock_batches SET remaining_qty = remaining_qty - 200 WHERE id = v_batch_id;
                        
                        -- Create Transfer Transaction
                        INSERT INTO stock_transactions (
                            created_by, location_id_from, location_id_to, item_id, batch_id, qty, unit, type, notes
                        ) VALUES (
                            v_admin_id, v_warehouse_id, v_location.id, v_item.id, v_batch_id, 200, 'kg', 'transfer', 'Weekly shop replenishment'
                        );

                        -- Create new batch at shop
                        INSERT INTO stock_batches (
                            item_id, location_id, supplier_id, initial_qty, remaining_qty, received_at, quality_score, is_depleted
                        ) VALUES (
                            v_item.id, v_location.id, v_supplier_id, 200, 200, v_curr_date + time '10:00', 1, FALSE
                        );
                    END IF;
                END LOOP;
            END LOOP;
        END IF;

        -- C. Daily Usage (Every day at all shops)
        FOR v_location IN SELECT id FROM locations WHERE type = 'shop' LOOP
            FOR v_item IN SELECT id, conversion_factor FROM items LOOP
                -- Random daily bags (5-20)
                v_daily_bags := 5 + floor(random() * 15);
                v_kg := v_daily_bags * v_item.conversion_factor;

                -- Find shop batch with stock
                SELECT id INTO v_batch_id FROM stock_batches 
                WHERE location_id = v_location.id AND item_id = v_item.id AND remaining_qty >= v_kg
                ORDER BY received_at ASC LIMIT 1;

                IF v_batch_id IS NOT NULL THEN
                    -- Create Issue Transaction
                    INSERT INTO stock_transactions (
                        created_by, location_id_from, item_id, batch_id, qty, unit, type, notes, created_at
                    ) VALUES (
                        v_admin_id, v_location.id, v_item.id, v_batch_id, v_kg, 'kg', 'issue', 'Daily bag usage', v_curr_date + time '14:00'
                    ) RETURNING id INTO v_trans_id;

                    -- Log Bag Usage
                    INSERT INTO bag_usage_logs (
                        location_id, item_id, batch_id, logged_by, bag_count, kg_equivalent, logged_at, stock_transaction_id
                    ) VALUES (
                        v_location.id, v_item.id, v_batch_id, v_admin_id, v_daily_bags, v_kg, v_curr_date + time '14:00', v_trans_id
                    );

                    -- Update Batch
                    UPDATE stock_batches 
                    SET remaining_qty = remaining_qty - v_kg,
                        is_depleted = (remaining_qty - v_kg) <= 0
                    WHERE id = v_batch_id;
                END IF;
            END LOOP;
        END LOOP;

        v_curr_date := v_curr_date + 1;
    END LOOP;
END $$;
