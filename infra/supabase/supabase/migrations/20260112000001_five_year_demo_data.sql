-- Potato Stock Tracking - 5-Year Demo Data Generator
-- Creates realistic historical data spanning 5 years for demo purposes
-- Includes: seasonal patterns, business growth, supplier rotation, waste
--
-- NOTE: This migration only creates the generator function.
-- The actual items, suppliers, and seed data are inserted via seed.sql

-- ============================================
-- 1. CREATE 5-YEAR DATA GENERATOR FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION generate_five_year_demo_data()
RETURNS TABLE(
    total_transactions BIGINT,
    total_batches BIGINT,
    total_usage_logs BIGINT,
    date_range TEXT
) AS $$
DECLARE
    v_start_date DATE := CURRENT_DATE - INTERVAL '5 years';
    v_end_date DATE := CURRENT_DATE;
    v_curr_date DATE;
    v_location RECORD;
    v_item RECORD;
    v_supplier_id UUID;
    v_admin_id UUID;
    v_batch_id UUID;
    v_trans_id UUID;
    v_warehouse_id UUID;

    -- Dynamic variables
    v_daily_bags INTEGER;
    v_kg DECIMAL;
    v_receipt_qty DECIMAL;
    v_transfer_qty DECIMAL;
    v_quality_score INTEGER;
    v_year_multiplier DECIMAL;
    v_season_multiplier DECIMAL;
    v_day_multiplier DECIMAL;
    v_supplier_idx INTEGER := 0;
    v_waste_chance DECIMAL;
    v_month INTEGER;
    v_dow INTEGER;
    v_years_ago INTEGER;
BEGIN
    -- 1. Setup IDs
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@test.com' LIMIT 1;
    SELECT id INTO v_warehouse_id FROM locations WHERE type = 'warehouse' LIMIT 1;

    IF v_warehouse_id IS NULL THEN
        SELECT id INTO v_warehouse_id FROM locations LIMIT 1;
    END IF;

    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'No admin user found - using NULL for created_by';
    END IF;

    -- 2. Clear existing data for clean slate
    RAISE NOTICE 'Clearing existing data...';
    TRUNCATE bag_usage_logs CASCADE;
    DELETE FROM stock_transactions;
    DELETE FROM stock_batches;

    RAISE NOTICE 'Generating 5 years of data from % to %...', v_start_date, v_end_date;

    -- 3. Loop through each day
    v_curr_date := v_start_date;
    WHILE v_curr_date <= v_end_date LOOP

        v_month := EXTRACT(MONTH FROM v_curr_date)::INTEGER;
        v_dow := EXTRACT(DOW FROM v_curr_date)::INTEGER;
        v_years_ago := EXTRACT(YEAR FROM v_end_date)::INTEGER - EXTRACT(YEAR FROM v_curr_date)::INTEGER;

        -- Calculate year multiplier (5% YoY growth, older years have less volume)
        -- Year 5 ago = 0.77, Year 4 = 0.81, Year 3 = 0.86, Year 2 = 0.90, Year 1 = 0.95, Current = 1.0
        v_year_multiplier := POWER(1.05, -v_years_ago);

        -- Calculate seasonal multiplier (South Africa: winter = May-Aug = higher usage)
        -- Winter (May-Aug): 1.2-1.4x, Summer (Nov-Feb): 0.8-0.9x, Transition: 1.0x
        v_season_multiplier := CASE
            WHEN v_month IN (6, 7) THEN 1.35  -- Peak winter
            WHEN v_month IN (5, 8) THEN 1.20  -- Early/late winter
            WHEN v_month IN (4, 9) THEN 1.05  -- Transition
            WHEN v_month IN (12, 1) THEN 0.80 -- Peak summer (holidays)
            WHEN v_month IN (11, 2) THEN 0.85 -- Summer
            ELSE 1.0                           -- Normal
        END;

        -- Day of week multiplier (weekends = 60% of weekday)
        v_day_multiplier := CASE
            WHEN v_dow IN (0, 6) THEN 0.6  -- Sunday, Saturday
            WHEN v_dow = 5 THEN 1.15       -- Friday (busy)
            ELSE 1.0
        END;

        -- =========================================
        -- A. WAREHOUSE RECEIPTS (Every 10-14 days)
        -- =========================================
        IF (EXTRACT(DAY FROM v_curr_date)::INTEGER % 12 = 0) OR
           (EXTRACT(DAY FROM v_curr_date)::INTEGER = 1 AND v_dow NOT IN (0, 6)) THEN

            -- Rotate through suppliers
            v_supplier_idx := (v_supplier_idx + 1) % 3;

            FOR v_item IN SELECT id, conversion_factor, name FROM items LOOP
                -- Get supplier for this delivery (rotate through suppliers)
                SELECT id INTO v_supplier_id FROM suppliers
                ORDER BY id OFFSET v_supplier_idx LIMIT 1;

                IF v_supplier_id IS NULL THEN
                    SELECT id INTO v_supplier_id FROM suppliers LIMIT 1;
                END IF;

                -- Base receipt qty varies by item type and growth
                v_receipt_qty := CASE
                    WHEN v_item.name LIKE '%10kg%' THEN 1500  -- Popular bulk item
                    WHEN v_item.name LIKE '%5kg%' THEN 800
                    WHEN v_item.name = 'Potatoes' THEN 2500
                    WHEN v_item.name = 'Washed Potatoes' THEN 1800
                    WHEN v_item.name = 'Baby Potatoes' THEN 600
                    WHEN v_item.name = 'Sweet Potatoes' THEN 900
                    ELSE 1000
                END;

                -- Apply year multiplier and some randomness
                v_receipt_qty := v_receipt_qty * v_year_multiplier * (0.85 + random() * 0.3);
                v_receipt_qty := ROUND(v_receipt_qty / 50) * 50;  -- Round to nearest 50

                -- Determine quality score (mostly good, occasionally issues)
                v_quality_score := CASE
                    WHEN random() < 0.75 THEN 1  -- 75% Grade A
                    WHEN random() < 0.90 THEN 2  -- 15% Grade B
                    ELSE 3                        -- 10% Grade C
                END;

                -- Create Receipt Transaction
                INSERT INTO stock_transactions (
                    created_at, created_by, location_id_to, item_id, qty, unit, type, notes
                ) VALUES (
                    v_curr_date + time '07:30' + (random() * interval '2 hours'),
                    v_admin_id, v_warehouse_id, v_item.id, v_receipt_qty, 'kg', 'receive',
                    'Supplier delivery - ' || CASE v_supplier_idx
                        WHEN 0 THEN 'FreshFarm'
                        WHEN 1 THEN 'Golden Harvest'
                        ELSE 'Valley Produce'
                    END
                ) RETURNING id INTO v_trans_id;

                -- Create Batch with expiry (potatoes last ~3-6 weeks)
                INSERT INTO stock_batches (
                    item_id, location_id, supplier_id, receive_transaction_id,
                    initial_qty, remaining_qty, received_at,
                    expiry_date, quality_score,
                    defect_pct, quality_notes, is_depleted
                ) VALUES (
                    v_item.id, v_warehouse_id, v_supplier_id, v_trans_id,
                    v_receipt_qty, v_receipt_qty,
                    v_curr_date + time '08:00',
                    v_curr_date + (21 + floor(random() * 21))::INTEGER,  -- 3-6 weeks expiry
                    v_quality_score,
                    CASE WHEN v_quality_score > 1 THEN (random() * 10)::DECIMAL(4,1) ELSE NULL END,
                    CASE
                        WHEN v_quality_score = 2 THEN 'Minor blemishes, acceptable'
                        WHEN v_quality_score = 3 THEN 'Visible damage, priority sale needed'
                        ELSE NULL
                    END,
                    FALSE
                );
            END LOOP;
        END IF;

        -- =========================================
        -- B. SHOP REPLENISHMENT (Mon, Wed, Fri)
        -- =========================================
        IF v_dow IN (1, 3, 5) THEN
            FOR v_location IN SELECT id, name FROM locations WHERE type = 'shop' LOOP
                FOR v_item IN SELECT id, name FROM items LOOP

                    -- Transfer qty based on item popularity
                    v_transfer_qty := CASE
                        WHEN v_item.name LIKE '%10kg%' THEN 150
                        WHEN v_item.name LIKE '%5kg%' THEN 80
                        WHEN v_item.name = 'Potatoes' THEN 200
                        WHEN v_item.name = 'Washed Potatoes' THEN 180
                        WHEN v_item.name = 'Baby Potatoes' THEN 60
                        WHEN v_item.name = 'Sweet Potatoes' THEN 80
                        ELSE 100
                    END;

                    -- Apply multipliers
                    v_transfer_qty := v_transfer_qty * v_year_multiplier * v_season_multiplier;
                    v_transfer_qty := ROUND(v_transfer_qty / 10) * 10;

                    -- Find warehouse batch with enough stock (FIFO)
                    SELECT id, quality_score INTO v_batch_id, v_quality_score
                    FROM stock_batches
                    WHERE location_id = v_warehouse_id
                      AND item_id = v_item.id
                      AND remaining_qty >= v_transfer_qty
                      AND is_depleted = FALSE
                    ORDER BY received_at ASC
                    LIMIT 1;

                    IF v_batch_id IS NOT NULL THEN
                        -- Deduct from warehouse batch
                        UPDATE stock_batches
                        SET remaining_qty = remaining_qty - v_transfer_qty,
                            is_depleted = (remaining_qty - v_transfer_qty) <= 0
                        WHERE id = v_batch_id;

                        -- Create Transfer Transaction
                        INSERT INTO stock_transactions (
                            created_at, created_by, location_id_from, location_id_to,
                            item_id, batch_id, qty, unit, type, notes
                        ) VALUES (
                            v_curr_date + time '09:00' + (random() * interval '3 hours'),
                            v_admin_id, v_warehouse_id, v_location.id,
                            v_item.id, v_batch_id, v_transfer_qty, 'kg', 'transfer',
                            'Replenishment to ' || v_location.name
                        );

                        -- Create new batch at shop (inherits quality)
                        INSERT INTO stock_batches (
                            item_id, location_id, supplier_id,
                            initial_qty, remaining_qty, received_at,
                            quality_score, is_depleted
                        ) VALUES (
                            v_item.id, v_location.id,
                            (SELECT supplier_id FROM stock_batches WHERE id = v_batch_id),
                            v_transfer_qty, v_transfer_qty,
                            v_curr_date + time '10:00',
                            v_quality_score, FALSE
                        );
                    END IF;
                END LOOP;
            END LOOP;
        END IF;

        -- =========================================
        -- C. DAILY SHOP USAGE
        -- =========================================
        FOR v_location IN SELECT id FROM locations WHERE type = 'shop' LOOP
            FOR v_item IN SELECT id, conversion_factor, name FROM items LOOP

                -- Base daily bags varies by item
                v_daily_bags := CASE
                    WHEN v_item.name LIKE '%10kg%' THEN 8 + floor(random() * 12)   -- 8-20 bags
                    WHEN v_item.name LIKE '%5kg%' THEN 6 + floor(random() * 10)    -- 6-16 bags
                    WHEN v_item.name = 'Potatoes' THEN 10 + floor(random() * 15)   -- 10-25 bags
                    WHEN v_item.name = 'Washed Potatoes' THEN 8 + floor(random() * 12)
                    WHEN v_item.name = 'Baby Potatoes' THEN 3 + floor(random() * 6)
                    WHEN v_item.name = 'Sweet Potatoes' THEN 4 + floor(random() * 8)
                    ELSE 5 + floor(random() * 10)
                END;

                -- Apply all multipliers
                v_daily_bags := GREATEST(1, ROUND(v_daily_bags * v_year_multiplier * v_season_multiplier * v_day_multiplier));
                v_kg := v_daily_bags * v_item.conversion_factor;

                -- Find shop batch with enough stock (FIFO)
                SELECT id INTO v_batch_id
                FROM stock_batches
                WHERE location_id = v_location.id
                  AND item_id = v_item.id
                  AND remaining_qty >= v_kg
                  AND is_depleted = FALSE
                ORDER BY received_at ASC
                LIMIT 1;

                IF v_batch_id IS NOT NULL THEN
                    -- Create Issue Transaction
                    INSERT INTO stock_transactions (
                        created_at, created_by, location_id_from, item_id, batch_id,
                        qty, unit, type, notes
                    ) VALUES (
                        v_curr_date + time '11:00' + (random() * interval '8 hours'),
                        v_admin_id, v_location.id, v_item.id, v_batch_id,
                        v_kg, 'kg', 'issue', 'Daily sales'
                    ) RETURNING id INTO v_trans_id;

                    -- Log Bag Usage
                    INSERT INTO bag_usage_logs (
                        location_id, item_id, batch_id, logged_by,
                        bag_count, kg_equivalent, logged_at, stock_transaction_id
                    ) VALUES (
                        v_location.id, v_item.id, v_batch_id, v_admin_id,
                        v_daily_bags, v_kg,
                        v_curr_date + time '14:00' + (random() * interval '4 hours'),
                        v_trans_id
                    );

                    -- Update Batch
                    UPDATE stock_batches
                    SET remaining_qty = remaining_qty - v_kg,
                        is_depleted = (remaining_qty - v_kg) <= 0
                    WHERE id = v_batch_id;
                END IF;
            END LOOP;
        END LOOP;

        -- =========================================
        -- D. OCCASIONAL WASTE (Spoilage ~2% of days)
        -- =========================================
        v_waste_chance := random();
        IF v_waste_chance < 0.02 THEN
            -- Pick a random shop
            FOR v_location IN SELECT id FROM locations WHERE type = 'shop' ORDER BY random() LIMIT 1 LOOP
                FOR v_item IN SELECT id, conversion_factor FROM items ORDER BY random() LIMIT 1 LOOP

                    -- Find a batch to waste from
                    SELECT id INTO v_batch_id
                    FROM stock_batches
                    WHERE location_id = v_location.id
                      AND item_id = v_item.id
                      AND remaining_qty >= 10
                      AND is_depleted = FALSE
                    ORDER BY received_at ASC
                    LIMIT 1;

                    IF v_batch_id IS NOT NULL THEN
                        v_kg := 5 + floor(random() * 20);  -- Waste 5-25 kg

                        INSERT INTO stock_transactions (
                            created_at, created_by, location_id_from, item_id, batch_id,
                            qty, unit, type, notes,
                            metadata
                        ) VALUES (
                            v_curr_date + time '17:00',
                            v_admin_id, v_location.id, v_item.id, v_batch_id,
                            v_kg, 'kg', 'waste',
                            CASE floor(random() * 4)::INTEGER
                                WHEN 0 THEN 'Spoiled - exceeded shelf life'
                                WHEN 1 THEN 'Damaged during handling'
                                WHEN 2 THEN 'Quality deterioration'
                                ELSE 'Customer returns - quality issue'
                            END,
                            '{"reason": "spoiled"}'::jsonb
                        );

                        UPDATE stock_batches
                        SET remaining_qty = GREATEST(0, remaining_qty - v_kg),
                            is_depleted = (remaining_qty - v_kg) <= 0
                        WHERE id = v_batch_id;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;

        -- Progress logging every 6 months
        IF EXTRACT(DAY FROM v_curr_date) = 1 AND v_month IN (1, 7) THEN
            RAISE NOTICE 'Processing: %', v_curr_date;
        END IF;

        v_curr_date := v_curr_date + 1;
    END LOOP;

    -- Mark any near-zero batches as depleted
    UPDATE stock_batches SET is_depleted = TRUE WHERE remaining_qty < 1;

    RAISE NOTICE 'Data generation complete!';

    -- Return summary
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM stock_transactions)::BIGINT,
        (SELECT COUNT(*) FROM stock_batches)::BIGINT,
        (SELECT COUNT(*) FROM bag_usage_logs)::BIGINT,
        v_start_date::TEXT || ' to ' || v_end_date::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. HELPER: QUICK STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW demo_data_stats AS
SELECT
    'Transactions' as metric,
    COUNT(*)::TEXT as value,
    MIN(created_at)::DATE::TEXT || ' - ' || MAX(created_at)::DATE::TEXT as date_range
FROM stock_transactions
UNION ALL
SELECT
    'Batches',
    COUNT(*)::TEXT,
    MIN(received_at)::DATE::TEXT || ' - ' || MAX(received_at)::DATE::TEXT
FROM stock_batches
UNION ALL
SELECT
    'Usage Logs',
    COUNT(*)::TEXT,
    MIN(logged_at)::DATE::TEXT || ' - ' || MAX(logged_at)::DATE::TEXT
FROM bag_usage_logs
UNION ALL
SELECT
    'Items',
    COUNT(*)::TEXT,
    NULL
FROM items
UNION ALL
SELECT
    'Locations',
    COUNT(*)::TEXT,
    NULL
FROM locations;

COMMENT ON FUNCTION generate_five_year_demo_data IS
'Generates 5 years of realistic demo data for the potato stock tracking system.
Includes: seasonal variations, YoY growth, supplier rotation, quality scoring, and waste.
Run with: SELECT * FROM generate_five_year_demo_data();';
