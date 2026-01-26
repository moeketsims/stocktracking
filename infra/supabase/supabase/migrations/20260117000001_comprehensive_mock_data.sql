-- ============================================
-- Comprehensive Mock Data Generation
-- Generates 1 year of realistic operational data
-- ============================================

-- Enable pgcrypto for uuid generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- HELPER FUNCTION: Generate Mock Data
-- ============================================

CREATE OR REPLACE FUNCTION generate_comprehensive_mock_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Reference data
    v_warehouse_id UUID;
    v_shop_ids UUID[];
    v_supplier_ids UUID[];
    v_item_ids UUID[];
    v_vehicle_ids UUID[];
    v_driver_ids UUID[];
    v_system_user_id UUID;

    -- Loop variables
    v_current_date DATE;
    v_end_date DATE;
    v_start_date DATE;
    v_trip_count INTEGER := 0;
    v_batch_count INTEGER := 0;
    v_transaction_count INTEGER := 0;

    -- Temp variables
    v_trip_id UUID;
    v_batch_id UUID;
    v_trip_type TEXT;
    v_from_loc UUID;
    v_to_loc UUID;
    v_supplier_id UUID;
    v_item_id UUID;
    v_vehicle_id UUID;
    v_driver_id UUID;
    v_driver_name TEXT;
    v_departure TIMESTAMPTZ;
    v_arrival TIMESTAMPTZ;
    v_qty DECIMAL;
    v_quality INTEGER;
    v_cost_per_unit DECIMAL;
    v_expiry DATE;
    v_dow INTEGER;
    v_month INTEGER;
    v_seasonal_mult DECIMAL;
    v_trips_today INTEGER;
    v_trip_number TEXT;
    v_year INTEGER;
    v_year_count INTEGER;
    v_fuel_cost DECIMAL;
    v_toll_cost DECIMAL;
    v_other_cost DECIMAL;
    v_distance DECIMAL;

BEGIN
    -- Get reference data IDs
    SELECT id INTO v_warehouse_id FROM locations WHERE type = 'warehouse' LIMIT 1;
    SELECT ARRAY_AGG(id) INTO v_shop_ids FROM locations WHERE type = 'shop';
    SELECT ARRAY_AGG(id) INTO v_supplier_ids FROM suppliers;
    SELECT ARRAY_AGG(id) INTO v_item_ids FROM items;
    SELECT ARRAY_AGG(id) INTO v_vehicle_ids FROM vehicles WHERE is_active = true;
    SELECT ARRAY_AGG(id) INTO v_driver_ids FROM drivers WHERE is_active = true;
    SELECT user_id INTO v_system_user_id FROM profiles LIMIT 1;

    -- Validate reference data exists
    IF v_warehouse_id IS NULL THEN
        RETURN 'ERROR: No warehouse found';
    END IF;
    IF v_shop_ids IS NULL OR array_length(v_shop_ids, 1) = 0 THEN
        RETURN 'ERROR: No shops found';
    END IF;
    IF v_supplier_ids IS NULL OR array_length(v_supplier_ids, 1) = 0 THEN
        RETURN 'ERROR: No suppliers found';
    END IF;
    IF v_system_user_id IS NULL THEN
        RETURN 'ERROR: No user profile found';
    END IF;
    IF v_vehicle_ids IS NULL OR array_length(v_vehicle_ids, 1) = 0 THEN
        RETURN 'ERROR: No active vehicles found';
    END IF;
    IF v_driver_ids IS NULL OR array_length(v_driver_ids, 1) = 0 THEN
        RETURN 'ERROR: No active drivers found';
    END IF;

    -- Set date range (1 year of data)
    v_end_date := CURRENT_DATE;
    v_start_date := v_end_date - INTERVAL '365 days';
    v_current_date := v_start_date;
    v_year_count := 0;

    RAISE NOTICE 'Starting data generation from % to %', v_start_date, v_end_date;
    RAISE NOTICE 'Found: 1 warehouse, % shops, % suppliers, % items, % vehicles, % drivers',
        array_length(v_shop_ids, 1),
        array_length(v_supplier_ids, 1),
        array_length(v_item_ids, 1),
        array_length(v_vehicle_ids, 1),
        array_length(v_driver_ids, 1);

    -- ============================================
    -- GENERATE COMPLETED TRIPS
    -- ============================================

    WHILE v_current_date < v_end_date LOOP
        v_dow := EXTRACT(DOW FROM v_current_date);
        v_month := EXTRACT(MONTH FROM v_current_date);
        v_year := EXTRACT(YEAR FROM v_current_date);

        -- Seasonal multiplier
        v_seasonal_mult := CASE v_month
            WHEN 1 THEN 0.85
            WHEN 2 THEN 0.85
            WHEN 5 THEN 1.35
            WHEN 6 THEN 1.35
            WHEN 7 THEN 1.35
            WHEN 8 THEN 1.35
            WHEN 11 THEN 1.15
            WHEN 12 THEN 1.15
            ELSE 1.0
        END;

        -- Trips per day based on day of week
        v_trips_today := CASE v_dow
            WHEN 0 THEN floor(random() * 2)::INT          -- Sunday
            WHEN 6 THEN floor(random() * 2 + 1)::INT      -- Saturday
            ELSE floor(random() * 2 + 2)::INT             -- Weekdays
        END;

        -- Apply seasonal multiplier
        v_trips_today := GREATEST(0, (v_trips_today * v_seasonal_mult)::INT);

        -- Generate trips for this day
        FOR i IN 1..v_trips_today LOOP
            v_year_count := v_year_count + 1;
            v_trip_count := v_trip_count + 1;
            v_trip_number := 'TRP-' || v_year || '-' || LPAD(v_year_count::TEXT, 4, '0');

            -- Random trip type (weighted)
            v_trip_type := CASE floor(random() * 100)::INT
                WHEN 0 THEN 'supplier_to_warehouse'    -- 25%
                WHEN 1 THEN 'supplier_to_warehouse'
                WHEN 2 THEN 'supplier_to_warehouse'
                WHEN 3 THEN 'supplier_to_warehouse'
                WHEN 4 THEN 'supplier_to_warehouse'
                WHEN 5 THEN 'supplier_to_warehouse'
                WHEN 6 THEN 'supplier_to_warehouse'
                WHEN 7 THEN 'supplier_to_warehouse'
                WHEN 8 THEN 'supplier_to_warehouse'
                WHEN 9 THEN 'supplier_to_warehouse'
                WHEN 10 THEN 'supplier_to_warehouse'
                WHEN 11 THEN 'supplier_to_warehouse'
                WHEN 12 THEN 'supplier_to_warehouse'
                WHEN 13 THEN 'supplier_to_warehouse'
                WHEN 14 THEN 'supplier_to_warehouse'
                WHEN 15 THEN 'supplier_to_warehouse'
                WHEN 16 THEN 'supplier_to_warehouse'
                WHEN 17 THEN 'supplier_to_warehouse'
                WHEN 18 THEN 'supplier_to_warehouse'
                WHEN 19 THEN 'supplier_to_warehouse'
                WHEN 20 THEN 'supplier_to_warehouse'
                WHEN 21 THEN 'supplier_to_warehouse'
                WHEN 22 THEN 'supplier_to_warehouse'
                WHEN 23 THEN 'supplier_to_warehouse'
                WHEN 24 THEN 'supplier_to_warehouse'
                WHEN 25 THEN 'supplier_to_shop'        -- 15%
                WHEN 26 THEN 'supplier_to_shop'
                WHEN 27 THEN 'supplier_to_shop'
                WHEN 28 THEN 'supplier_to_shop'
                WHEN 29 THEN 'supplier_to_shop'
                WHEN 30 THEN 'supplier_to_shop'
                WHEN 31 THEN 'supplier_to_shop'
                WHEN 32 THEN 'supplier_to_shop'
                WHEN 33 THEN 'supplier_to_shop'
                WHEN 34 THEN 'supplier_to_shop'
                WHEN 35 THEN 'supplier_to_shop'
                WHEN 36 THEN 'supplier_to_shop'
                WHEN 37 THEN 'supplier_to_shop'
                WHEN 38 THEN 'supplier_to_shop'
                WHEN 39 THEN 'supplier_to_shop'
                WHEN 90 THEN 'shop_to_shop'            -- 10%
                WHEN 91 THEN 'shop_to_shop'
                WHEN 92 THEN 'shop_to_shop'
                WHEN 93 THEN 'shop_to_shop'
                WHEN 94 THEN 'shop_to_shop'
                WHEN 95 THEN 'shop_to_warehouse'       -- 5%
                WHEN 96 THEN 'shop_to_warehouse'
                WHEN 97 THEN 'shop_to_warehouse'
                WHEN 98 THEN 'shop_to_warehouse'
                WHEN 99 THEN 'shop_to_warehouse'
                ELSE 'warehouse_to_shop'              -- 45%
            END;

            -- Select random vehicle and driver
            v_vehicle_id := v_vehicle_ids[1 + floor(random() * array_length(v_vehicle_ids, 1))::INT];
            v_driver_id := v_driver_ids[1 + floor(random() * array_length(v_driver_ids, 1))::INT];
            SELECT full_name INTO v_driver_name FROM drivers WHERE id = v_driver_id;

            -- Set locations based on trip type
            v_from_loc := NULL;
            v_to_loc := NULL;
            v_supplier_id := NULL;

            IF v_trip_type = 'supplier_to_warehouse' THEN
                v_supplier_id := v_supplier_ids[1 + floor(random() * array_length(v_supplier_ids, 1))::INT];
                v_to_loc := v_warehouse_id;
                v_distance := 20 + random() * 60;
            ELSIF v_trip_type = 'supplier_to_shop' THEN
                v_supplier_id := v_supplier_ids[1 + floor(random() * array_length(v_supplier_ids, 1))::INT];
                v_to_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
                v_distance := 30 + random() * 70;
            ELSIF v_trip_type = 'warehouse_to_shop' THEN
                v_from_loc := v_warehouse_id;
                v_to_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
                v_distance := 15 + random() * 45;
            ELSIF v_trip_type = 'shop_to_shop' THEN
                v_from_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
                v_to_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
                -- Avoid same location
                IF v_from_loc = v_to_loc THEN
                    v_to_loc := v_shop_ids[1 + ((1 + floor(random() * array_length(v_shop_ids, 1))::INT) % array_length(v_shop_ids, 1))];
                END IF;
                v_distance := 10 + random() * 30;
            ELSIF v_trip_type = 'shop_to_warehouse' THEN
                v_from_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
                v_to_loc := v_warehouse_id;
                v_distance := 15 + random() * 45;
            END IF;

            -- Generate times
            v_departure := v_current_date + INTERVAL '1 hour' * (6 + floor(random() * 4)::INT) + INTERVAL '1 minute' * floor(random() * 60)::INT;
            v_arrival := v_departure + INTERVAL '1 minute' * (v_distance * 1.5 + 10 + random() * 30)::INT;

            -- Calculate costs
            v_fuel_cost := ROUND((v_distance * 12)::NUMERIC, 2);  -- R12/km
            v_toll_cost := CASE WHEN v_distance > 30 THEN ROUND((random() * 50)::NUMERIC, 2) ELSE 0 END;
            v_other_cost := ROUND((random() * 30)::NUMERIC, 2);

            -- Insert trip
            INSERT INTO trips (
                trip_number, vehicle_id, driver_id, driver_name, status, trip_type,
                from_location_id, to_location_id, supplier_id,
                origin_description, destination_description,
                departure_time, arrival_time, completed_at,
                fuel_cost, fuel_litres, toll_cost, other_cost,
                odometer_start, odometer_end,
                created_by, created_at
            ) VALUES (
                v_trip_number, v_vehicle_id, v_driver_id, v_driver_name, 'completed', v_trip_type::trip_type,
                v_from_loc, v_to_loc, v_supplier_id,
                CASE WHEN v_supplier_id IS NOT NULL THEN (SELECT name FROM suppliers WHERE id = v_supplier_id) ELSE (SELECT name FROM locations WHERE id = v_from_loc) END,
                (SELECT name FROM locations WHERE id = v_to_loc),
                v_departure, v_arrival, v_arrival,
                v_fuel_cost, ROUND((v_fuel_cost / 23)::NUMERIC, 2), v_toll_cost, v_other_cost,
                ROUND((50000 + random() * 100000)::NUMERIC, 1), ROUND((50000 + random() * 100000 + v_distance)::NUMERIC, 1),
                v_system_user_id, v_departure
            )
            RETURNING id INTO v_trip_id;

            -- Create batches for supplier trips
            IF v_trip_type IN ('supplier_to_warehouse', 'supplier_to_shop') THEN
                -- Create 1-3 batches per trip
                FOR j IN 1..GREATEST(1, floor(random() * 3)::INT) LOOP
                    v_item_id := v_item_ids[1 + floor(random() * array_length(v_item_ids, 1))::INT];
                    v_qty := ROUND((100 + random() * 400)::NUMERIC, 2);

                    -- Quality score (1=75%, 2=20%, 3=5%)
                    v_quality := CASE floor(random() * 100)::INT
                        WHEN 0 THEN 3
                        WHEN 1 THEN 3
                        WHEN 2 THEN 3
                        WHEN 3 THEN 3
                        WHEN 4 THEN 3
                        WHEN 5 THEN 2
                        WHEN 6 THEN 2
                        WHEN 7 THEN 2
                        WHEN 8 THEN 2
                        WHEN 9 THEN 2
                        WHEN 10 THEN 2
                        WHEN 11 THEN 2
                        WHEN 12 THEN 2
                        WHEN 13 THEN 2
                        WHEN 14 THEN 2
                        WHEN 15 THEN 2
                        WHEN 16 THEN 2
                        WHEN 17 THEN 2
                        WHEN 18 THEN 2
                        WHEN 19 THEN 2
                        WHEN 20 THEN 2
                        WHEN 21 THEN 2
                        WHEN 22 THEN 2
                        WHEN 23 THEN 2
                        WHEN 24 THEN 2
                        ELSE 1
                    END;

                    v_cost_per_unit := ROUND((10 + random() * 5)::NUMERIC, 2);
                    v_expiry := v_current_date + (30 + floor(random() * 60)::INT);

                    v_batch_count := v_batch_count + 1;

                    -- Insert batch
                    INSERT INTO stock_batches (
                        item_id, location_id, supplier_id, trip_id,
                        initial_qty, remaining_qty, received_at, expiry_date,
                        quality_score, cost_per_unit, is_depleted,
                        defect_pct, quality_notes
                    ) VALUES (
                        v_item_id, v_to_loc, v_supplier_id, v_trip_id,
                        v_qty, v_qty, v_arrival, v_expiry,
                        v_quality, v_cost_per_unit, FALSE,
                        CASE WHEN v_quality > 1 THEN ROUND((3 + random() * 10)::NUMERIC, 1) ELSE NULL END,
                        CASE WHEN v_quality > 1 THEN 'Quality inspection notes' ELSE NULL END
                    )
                    RETURNING id INTO v_batch_id;

                    -- Insert receive transaction
                    v_transaction_count := v_transaction_count + 1;
                    INSERT INTO stock_transactions (
                        created_by, created_at, location_id_to, item_id, batch_id,
                        qty, unit, type, trip_id, notes
                    ) VALUES (
                        v_system_user_id, v_arrival, v_to_loc, v_item_id, v_batch_id,
                        v_qty, 'kg', 'receive', v_trip_id,
                        'Received via ' || v_trip_number
                    );

                    -- Insert trip cargo
                    INSERT INTO trip_cargo (
                        trip_id, batch_id, item_id, quantity_kg, to_location_id, created_at
                    ) VALUES (
                        v_trip_id, v_batch_id, v_item_id, v_qty, v_to_loc, v_arrival
                    );
                END LOOP;
            END IF;

        END LOOP;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    RAISE NOTICE 'Generated % trips, % batches, % transactions', v_trip_count, v_batch_count, v_transaction_count;

    -- ============================================
    -- GENERATE IN-PROGRESS TRIPS
    -- ============================================

    FOR i IN 1..4 LOOP
        v_year_count := v_year_count + 1;
        v_trip_number := 'TRP-' || EXTRACT(YEAR FROM CURRENT_DATE)::INT || '-' || LPAD(v_year_count::TEXT, 4, '0');

        v_trip_type := CASE i
            WHEN 1 THEN 'supplier_to_warehouse'
            WHEN 2 THEN 'warehouse_to_shop'
            WHEN 3 THEN 'supplier_to_shop'
            ELSE 'warehouse_to_shop'
        END;

        v_vehicle_id := v_vehicle_ids[1 + floor(random() * array_length(v_vehicle_ids, 1))::INT];
        v_driver_id := v_driver_ids[1 + floor(random() * array_length(v_driver_ids, 1))::INT];
        SELECT full_name INTO v_driver_name FROM drivers WHERE id = v_driver_id;

        v_from_loc := NULL;
        v_to_loc := NULL;
        v_supplier_id := NULL;

        IF v_trip_type = 'supplier_to_warehouse' THEN
            v_supplier_id := v_supplier_ids[1 + floor(random() * array_length(v_supplier_ids, 1))::INT];
            v_to_loc := v_warehouse_id;
        ELSIF v_trip_type = 'supplier_to_shop' THEN
            v_supplier_id := v_supplier_ids[1 + floor(random() * array_length(v_supplier_ids, 1))::INT];
            v_to_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
        ELSE
            v_from_loc := v_warehouse_id;
            v_to_loc := v_shop_ids[1 + floor(random() * array_length(v_shop_ids, 1))::INT];
        END IF;

        v_departure := NOW() - INTERVAL '1 hour' * (i);

        INSERT INTO trips (
            trip_number, vehicle_id, driver_id, driver_name, status, trip_type,
            from_location_id, to_location_id, supplier_id,
            origin_description, destination_description,
            departure_time,
            created_by, created_at,
            notes
        ) VALUES (
            v_trip_number, v_vehicle_id, v_driver_id, v_driver_name, 'in_progress', v_trip_type::trip_type,
            v_from_loc, v_to_loc, v_supplier_id,
            CASE WHEN v_supplier_id IS NOT NULL THEN (SELECT name FROM suppliers WHERE id = v_supplier_id) ELSE (SELECT name FROM locations WHERE id = v_from_loc) END,
            (SELECT name FROM locations WHERE id = v_to_loc),
            v_departure,
            v_system_user_id, v_departure,
            'Currently in transit'
        );

        v_trip_count := v_trip_count + 1;
    END LOOP;

    RAISE NOTICE 'Added 4 in-progress trips';

    RETURN 'SUCCESS: Generated ' || v_trip_count || ' trips, ' || v_batch_count || ' batches, ' || v_transaction_count || ' transactions';
END;
$$;

-- ============================================
-- EXECUTE DATA GENERATION
-- ============================================

-- Only run if no trips exist
DO $$
DECLARE
    trip_count INTEGER;
    result TEXT;
BEGIN
    SELECT COUNT(*) INTO trip_count FROM trips;

    IF trip_count > 10 THEN
        RAISE NOTICE 'Trips already exist (% found), skipping generation', trip_count;
    ELSE
        RAISE NOTICE 'Starting comprehensive mock data generation...';
        SELECT generate_comprehensive_mock_data() INTO result;
        RAISE NOTICE '%', result;
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- These can be run manually to verify the data

-- Trip distribution
-- SELECT trip_type, status, COUNT(*) as count,
--        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct
-- FROM trips
-- GROUP BY trip_type, status
-- ORDER BY count DESC;

-- Batch linkage
-- SELECT COUNT(*) as total_batches,
--        COUNT(trip_id) as linked_to_trip,
--        ROUND(COUNT(trip_id) * 100.0 / COUNT(*), 1) as linkage_pct
-- FROM stock_batches;

-- Monthly volumes
-- SELECT DATE_TRUNC('month', created_at) as month,
--        COUNT(*) as trips,
--        SUM(fuel_cost + toll_cost + other_cost) as total_cost
-- FROM trips
-- WHERE status = 'completed'
-- GROUP BY 1
-- ORDER BY 1;
