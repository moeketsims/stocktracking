


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."adjustment_reason" AS ENUM (
    'count_error',
    'theft',
    'found_stock',
    'damage_write_off',
    'system_correction',
    'other'
);


ALTER TYPE "public"."adjustment_reason" OWNER TO "postgres";


CREATE TYPE "public"."barcode_format" AS ENUM (
    'ean13',
    'ean8',
    'gs1_128',
    'itf14',
    'code128',
    'qrcode',
    'custom'
);


ALTER TYPE "public"."barcode_format" OWNER TO "postgres";


CREATE TYPE "public"."batch_status" AS ENUM (
    'available',
    'quarantine',
    'hold',
    'depleted'
);


ALTER TYPE "public"."batch_status" OWNER TO "postgres";


CREATE TYPE "public"."location_type" AS ENUM (
    'shop',
    'warehouse'
);


ALTER TYPE "public"."location_type" OWNER TO "postgres";


CREATE TYPE "public"."quality_score" AS ENUM (
    'good',
    'acceptable',
    'poor'
);


ALTER TYPE "public"."quality_score" OWNER TO "postgres";


CREATE TYPE "public"."stop_type" AS ENUM (
    'pickup',
    'dropoff'
);


ALTER TYPE "public"."stop_type" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'receive',
    'issue',
    'transfer',
    'waste',
    'adjustment',
    'return'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."trip_status" AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."trip_status" OWNER TO "postgres";


CREATE TYPE "public"."trip_type" AS ENUM (
    'supplier_to_warehouse',
    'supplier_to_shop',
    'warehouse_to_shop',
    'shop_to_shop',
    'shop_to_warehouse',
    'other'
);


ALTER TYPE "public"."trip_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'zone_manager',
    'location_manager',
    'staff',
    'driver'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_location_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'location_created',
            'locations',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'location_updated',
            'locations',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'location_deleted',
            'locations',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            '{}'::jsonb
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_location_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_profile_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Only log if role changed
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            PERFORM log_audit(
                'role_change',
                'profiles',
                NEW.id,
                jsonb_build_object('role', OLD.role, 'zone_id', OLD.zone_id, 'location_id', OLD.location_id),
                jsonb_build_object('role', NEW.role, 'zone_id', NEW.zone_id, 'location_id', NEW.location_id),
                jsonb_build_object('user_id', NEW.user_id)
            );
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'profile_created',
            'profiles',
            NEW.id,
            NULL,
            jsonb_build_object('role', NEW.role, 'zone_id', NEW.zone_id, 'location_id', NEW.location_id),
            jsonb_build_object('user_id', NEW.user_id)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'profile_deleted',
            'profiles',
            OLD.id,
            jsonb_build_object('role', OLD.role, 'zone_id', OLD.zone_id, 'location_id', OLD.location_id),
            NULL,
            jsonb_build_object('user_id', OLD.user_id)
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_profile_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_reorder_policy_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'policy_updated',
            'reorder_policies',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'policy_created',
            'reorder_policies',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'policy_deleted',
            'reorder_policies',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            '{}'::jsonb
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_reorder_policy_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_stock_adjustments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.type = 'adjustment' THEN
        PERFORM log_audit(
            'stock_adjustment',
            'stock_transactions',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            jsonb_build_object('notes', NEW.notes)
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_stock_adjustments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_zone_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'zone_created',
            'zones',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'zone_updated',
            'zones',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'zone_deleted',
            'zones',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            '{}'::jsonb
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_zone_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_trip_delivery_cost"("p_trip_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_cost DECIMAL;
    v_total_kg DECIMAL;
    v_cost_per_kg DECIMAL;
BEGIN
    -- Get total trip cost
    SELECT (fuel_cost + toll_cost + other_cost) INTO v_total_cost
    FROM trips
    WHERE id = p_trip_id AND status = 'completed';

    IF v_total_cost IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get total kg carried on this trip
    SELECT COALESCE(SUM(quantity_kg), 0) INTO v_total_kg
    FROM trip_cargo
    WHERE trip_id = p_trip_id;

    IF v_total_kg = 0 THEN
        -- Fall back to checking linked batches
        SELECT COALESCE(SUM(initial_qty), 0) INTO v_total_kg
        FROM stock_batches
        WHERE trip_id = p_trip_id;
    END IF;

    IF v_total_kg > 0 THEN
        v_cost_per_kg := ROUND(v_total_cost / v_total_kg, 4);

        -- Update batches with delivery cost
        UPDATE stock_batches
        SET delivery_cost_per_kg = v_cost_per_kg
        WHERE trip_id = p_trip_id;

        RETURN v_cost_per_kg;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."calculate_trip_delivery_cost"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_trip_stop"("p_stop_id" "uuid", "p_actual_qty_kg" numeric DEFAULT NULL::numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_trip_id UUID;
    v_all_completed BOOLEAN;
BEGIN
    -- Update the stop
    UPDATE trip_stops
    SET
        is_completed = TRUE,
        actual_qty_kg = COALESCE(p_actual_qty_kg, planned_qty_kg),
        arrived_at = COALESCE(arrived_at, NOW()),
        departed_at = NOW(),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_stop_id
    RETURNING trip_id INTO v_trip_id;

    IF v_trip_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if all stops are completed
    SELECT NOT EXISTS (
        SELECT 1 FROM trip_stops
        WHERE trip_id = v_trip_id AND is_completed = FALSE
    ) INTO v_all_completed;

    -- If all stops completed, mark trip as completed
    IF v_all_completed THEN
        UPDATE trips
        SET
            status = 'completed',
            completed_at = NOW(),
            arrival_time = NOW()
        WHERE id = v_trip_id;
    END IF;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."complete_trip_stop"("p_stop_id" "uuid", "p_actual_qty_kg" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_multi_stop_trip"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_driver_name" "text", "p_created_by" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_stops" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_trip_id UUID;
    v_trip_number TEXT;
    v_year INT;
    v_count INT;
    v_stop JSONB;
    v_stop_order INT := 0;
    v_first_stop JSONB;
    v_last_stop JSONB;
    v_origin_desc TEXT;
    v_dest_desc TEXT;
BEGIN
    -- Generate trip number
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COUNT(*) + 1 INTO v_count FROM trips WHERE EXTRACT(YEAR FROM created_at) = v_year;
    v_trip_number := 'TRP-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

    -- Get first and last stops for descriptions
    SELECT p_stops->0 INTO v_first_stop;
    SELECT p_stops->(jsonb_array_length(p_stops) - 1) INTO v_last_stop;

    v_origin_desc := v_first_stop->>'location_name';
    v_dest_desc := v_last_stop->>'location_name';

    -- Create the trip
    INSERT INTO trips (
        trip_number,
        vehicle_id,
        driver_id,
        driver_name,
        status,
        trip_type,
        is_multi_stop,
        origin_description,
        destination_description,
        created_by,
        notes
    ) VALUES (
        v_trip_number,
        p_vehicle_id,
        p_driver_id,
        p_driver_name,
        'planned',
        'other', -- Multi-stop trips use 'other' type
        TRUE,
        v_origin_desc,
        v_dest_desc,
        p_created_by,
        p_notes
    )
    RETURNING id INTO v_trip_id;

    -- Create stops
    FOR v_stop IN SELECT * FROM jsonb_array_elements(p_stops)
    LOOP
        v_stop_order := v_stop_order + 1;

        INSERT INTO trip_stops (
            trip_id,
            stop_order,
            location_id,
            supplier_id,
            stop_type,
            location_name,
            planned_qty_kg,
            notes
        ) VALUES (
            v_trip_id,
            v_stop_order,
            CASE WHEN v_stop->>'location_id' != '' THEN (v_stop->>'location_id')::UUID ELSE NULL END,
            CASE WHEN v_stop->>'supplier_id' != '' THEN (v_stop->>'supplier_id')::UUID ELSE NULL END,
            (v_stop->>'stop_type')::stop_type,
            v_stop->>'location_name',
            CASE WHEN v_stop->>'planned_qty_kg' != '' THEN (v_stop->>'planned_qty_kg')::DECIMAL ELSE NULL END,
            v_stop->>'notes'
        );
    END LOOP;

    RETURN v_trip_id;
END;
$$;


ALTER FUNCTION "public"."create_multi_stop_trip"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_driver_name" "text", "p_created_by" "uuid", "p_notes" "text", "p_stops" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_comprehensive_mock_data"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."generate_comprehensive_mock_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_five_year_demo_data"() RETURNS TABLE("total_transactions" bigint, "total_batches" bigint, "total_usage_logs" bigint, "date_range" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_five_year_demo_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_five_year_demo_data"() IS 'Generates 5 years of realistic demo data for the potato stock tracking system.
Includes: seasonal variations, YoY growth, supplier rotation, quality scoring, and waste.
Run with: SELECT * FROM generate_five_year_demo_data();';



CREATE OR REPLACE FUNCTION "public"."generate_historical_mock_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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

    -- Clear existing usage data
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
                v_daily_bags := 5 + floor(random() * 15);
                v_kg := v_daily_bags * v_item.conversion_factor;

                SELECT id INTO v_batch_id FROM stock_batches 
                WHERE location_id = v_location.id AND item_id = v_item.id AND remaining_qty >= v_kg
                ORDER BY received_at ASC LIMIT 1;

                IF v_batch_id IS NOT NULL THEN
                    INSERT INTO stock_transactions (
                        created_by, location_id_from, item_id, batch_id, qty, unit, type, notes, created_at
                    ) VALUES (
                        v_admin_id, v_location.id, v_item.id, v_batch_id, v_kg, 'kg', 'issue', 'Daily bag usage', v_curr_date + time '14:00'
                    ) RETURNING id INTO v_trans_id;

                    INSERT INTO bag_usage_logs (
                        location_id, item_id, batch_id, logged_by, bag_count, kg_equivalent, logged_at, stock_transaction_id
                    ) VALUES (
                        v_location.id, v_item.id, v_batch_id, v_admin_id, v_daily_bags, v_kg, v_curr_date + time '14:00', v_trans_id
                    );

                    UPDATE stock_batches 
                    SET remaining_qty = remaining_qty - v_kg,
                        is_depleted = (remaining_qty - v_kg) <= 0
                    WHERE id = v_batch_id;
                END IF;
            END LOOP;
        END LOOP;

        v_curr_date := v_curr_date + 1;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_historical_mock_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_trip_number"() RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_year INT;
    v_count INT;
    v_trip_number VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Count trips this year
    SELECT COUNT(*) + 1 INTO v_count
    FROM trips
    WHERE EXTRACT(YEAR FROM created_at) = v_year;

    v_trip_number := 'TRP-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

    RETURN v_trip_number;
END;
$$;


ALTER FUNCTION "public"."generate_trip_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fifo_batch"("p_location_id" "uuid", "p_item_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- First try to find batches expiring within 7 days (soonest first)
    SELECT id INTO v_batch_id
    FROM stock_batches
    WHERE location_id = p_location_id
      AND item_id = p_item_id
      AND status = 'available'
      AND remaining_qty > 0
      AND expiry_date IS NOT NULL
      AND expiry_date > CURRENT_DATE
      AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY expiry_date ASC, received_at ASC
    LIMIT 1;

    -- If no expiring batches, fall back to oldest received
    IF v_batch_id IS NULL THEN
        SELECT id INTO v_batch_id
        FROM stock_batches
        WHERE location_id = p_location_id
          AND item_id = p_item_id
          AND status = 'available'
          AND remaining_qty > 0
        ORDER BY received_at ASC
        LIMIT 1;
    END IF;

    RETURN v_batch_id;
END;
$$;


ALTER FUNCTION "public"."get_fifo_batch"("p_location_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_notification_recipients"("p_location_id" "uuid") RETURNS TABLE("user_id" "uuid", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_notification_recipients"("p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_cost_summary"("p_from_date" "date" DEFAULT NULL::"date", "p_to_date" "date" DEFAULT NULL::"date", "p_vehicle_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("total_trips" bigint, "total_fuel_cost" numeric, "total_toll_cost" numeric, "total_other_cost" numeric, "total_cost" numeric, "total_distance" numeric, "avg_cost_per_trip" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_trips,
        COALESCE(SUM(t.fuel_cost), 0)::DECIMAL AS total_fuel_cost,
        COALESCE(SUM(t.toll_cost), 0)::DECIMAL AS total_toll_cost,
        COALESCE(SUM(t.other_cost), 0)::DECIMAL AS total_other_cost,
        COALESCE(SUM(t.fuel_cost + t.toll_cost + t.other_cost), 0)::DECIMAL AS total_cost,
        COALESCE(SUM(CASE
            WHEN t.odometer_start IS NOT NULL AND t.odometer_end IS NOT NULL
            THEN t.odometer_end - t.odometer_start
            ELSE 0
        END), 0)::DECIMAL AS total_distance,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(COALESCE(SUM(t.fuel_cost + t.toll_cost + t.other_cost), 0) / COUNT(*), 2)
            ELSE 0
        END::DECIMAL AS avg_cost_per_trip
    FROM trips t
    WHERE t.status = 'completed'
      AND (p_from_date IS NULL OR t.created_at::DATE >= p_from_date)
      AND (p_to_date IS NULL OR t.created_at::DATE <= p_to_date)
      AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id);
END;
$$;


ALTER FUNCTION "public"."get_trip_cost_summary"("p_from_date" "date", "p_to_date" "date", "p_vehicle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_location_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN (SELECT location_id FROM profiles WHERE user_id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."get_user_location_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"() RETURNS TABLE("id" "uuid", "role" "public"."user_role", "zone_id" "uuid", "location_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.role, p.zone_id, p.location_id
    FROM profiles p
    WHERE p.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_zone_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN (SELECT zone_id FROM profiles WHERE user_id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."get_user_zone_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_location_access"("check_location_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role TEXT;
    user_zone_id UUID;
    user_location_id UUID;
    location_zone_id UUID;
BEGIN
    SELECT role, zone_id, location_id INTO user_role, user_zone_id, user_location_id
    FROM profiles
    WHERE user_id = auth.uid();

    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    IF user_role = 'zone_manager' THEN
        SELECT zone_id INTO location_zone_id
        FROM locations
        WHERE id = check_location_id;
        RETURN user_zone_id = location_zone_id;
    END IF;

    IF user_role IN ('location_manager', 'driver', 'staff') THEN
        RETURN user_location_id = check_location_id;
    END IF;

    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."has_location_access"("check_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_zone_manager"("check_zone_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR (role = 'zone_manager' AND zone_id = check_zone_id))
    );
END;
$$;


ALTER FUNCTION "public"."is_zone_manager"("check_zone_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit"("p_action_type" character varying, "p_entity_type" character varying, "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_before_data" "jsonb" DEFAULT NULL::"jsonb", "p_after_data" "jsonb" DEFAULT NULL::"jsonb", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_audit_id UUID;
    v_actor_email TEXT;
BEGIN
    -- Get actor email
    SELECT email INTO v_actor_email
    FROM auth.users
    WHERE id = auth.uid();

    INSERT INTO audit_logs (
        actor_id,
        actor_email,
        action_type,
        entity_type,
        entity_id,
        before_data,
        after_data,
        metadata
    ) VALUES (
        auth.uid(),
        v_actor_email,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_before_data,
        p_after_data,
        p_metadata
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;


ALTER FUNCTION "public"."log_audit"("p_action_type" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_bag_usage"("p_location_id" "uuid", "p_item_id" "uuid", "p_logged_by" "uuid", "p_bag_count" integer DEFAULT 1) RETURNS TABLE("bag_log_id" "uuid", "transaction_id" "uuid", "batch_used_id" "uuid", "kg_deducted" numeric, "bags_remaining" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_bag_usage"("p_location_id" "uuid", "p_item_id" "uuid", "p_logged_by" "uuid", "p_bag_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_bag_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."notify_bag_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_audit_modification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$;


ALTER FUNCTION "public"."prevent_audit_modification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_batch_edit"("p_batch_id" "uuid", "p_edited_by" "uuid", "p_field_changed" character varying, "p_old_value" "text", "p_new_value" "text", "p_edit_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO batch_edit_history (batch_id, edited_by, field_changed, old_value, new_value, edit_reason)
    VALUES (p_batch_id, p_edited_by, p_field_changed, p_old_value, p_new_value, p_edit_reason)
    RETURNING id INTO v_history_id;

    -- Update the batch's last edited fields
    UPDATE stock_batches
    SET last_edited_by = p_edited_by,
        last_edited_at = NOW()
    WHERE id = p_batch_id;

    RETURN v_history_id;
END;
$$;


ALTER FUNCTION "public"."record_batch_edit"("p_batch_id" "uuid", "p_edited_by" "uuid", "p_field_changed" character varying, "p_old_value" "text", "p_new_value" "text", "p_edit_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."undo_bag_usage"("p_bag_log_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."undo_bag_usage"("p_bag_log_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alert_acknowledgments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alert_type" character varying(50) NOT NULL,
    "location_id" "uuid" NOT NULL,
    "item_id" "uuid",
    "acknowledged_by" "uuid" NOT NULL,
    "acknowledged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."alert_acknowledgments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor_id" "uuid",
    "actor_email" "text",
    "action_type" character varying(50) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid",
    "before_data" "jsonb",
    "after_data" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_batches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "receive_transaction_id" "uuid",
    "initial_qty" numeric(10,2) NOT NULL,
    "remaining_qty" numeric(10,2) NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expiry_date" "date",
    "quality_score" integer NOT NULL,
    "defect_pct" numeric(5,2),
    "quality_notes" "text",
    "photo_url" "text",
    "is_depleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."batch_status" DEFAULT 'available'::"public"."batch_status" NOT NULL,
    "cost_per_unit" numeric(10,4),
    "total_cost" numeric(12,2),
    "delivery_note_number" character varying(100),
    "last_edited_by" "uuid",
    "last_edited_at" timestamp with time zone,
    "delivery_cost_per_kg" numeric(10,4),
    "trip_id" "uuid",
    "scan_session_id" "uuid",
    "scanned_barcode" character varying(200),
    CONSTRAINT "stock_batches_defect_pct_check" CHECK ((("defect_pct" IS NULL) OR (("defect_pct" >= (0)::numeric) AND ("defect_pct" <= (100)::numeric)))),
    CONSTRAINT "stock_batches_initial_qty_check" CHECK (("initial_qty" > (0)::numeric)),
    CONSTRAINT "stock_batches_quality_score_check" CHECK ((("quality_score" >= 1) AND ("quality_score" <= 3))),
    CONSTRAINT "stock_batches_remaining_qty_check" CHECK (("remaining_qty" >= (0)::numeric))
);


ALTER TABLE "public"."stock_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "contact_name" character varying(255),
    "contact_phone" character varying(50),
    "contact_email" character varying(255),
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."available_batches" AS
 SELECT "b"."id" AS "batch_id",
    "b"."item_id",
    "b"."location_id",
    "b"."supplier_id",
    "b"."initial_qty",
    "b"."remaining_qty",
    "b"."received_at",
    "b"."expiry_date",
    "b"."quality_score",
    "b"."status",
    "b"."cost_per_unit",
    "s"."name" AS "supplier_name",
        CASE
            WHEN ("b"."expiry_date" IS NULL) THEN 999999
            WHEN ("b"."expiry_date" <= CURRENT_DATE) THEN '-1'::integer
            ELSE ("b"."expiry_date" - CURRENT_DATE)
        END AS "days_until_expiry"
   FROM ("public"."stock_batches" "b"
     JOIN "public"."suppliers" "s" ON (("s"."id" = "b"."supplier_id")))
  WHERE (("b"."status" = 'available'::"public"."batch_status") AND ("b"."remaining_qty" > (0)::numeric))
  ORDER BY
        CASE
            WHEN (("b"."expiry_date" IS NOT NULL) AND ("b"."expiry_date" > CURRENT_DATE) AND ("b"."expiry_date" <= (CURRENT_DATE + '7 days'::interval))) THEN 0
            ELSE 1
        END, "b"."expiry_date", "b"."received_at";


ALTER VIEW "public"."available_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bag_usage_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "logged_by" "uuid" NOT NULL,
    "bag_count" integer DEFAULT 1 NOT NULL,
    "kg_equivalent" numeric(10,2) NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_undone" boolean DEFAULT false,
    "undone_at" timestamp with time zone,
    "stock_transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bag_usage_logs_bag_count_check" CHECK (("bag_count" > 0))
);


ALTER TABLE "public"."bag_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sku" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "unit" character varying(20) DEFAULT 'kg'::character varying NOT NULL,
    "conversion_factor" numeric(10,4) DEFAULT 1.0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variety" character varying(100)
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "location_id_from" "uuid",
    "location_id_to" "uuid",
    "item_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "qty" numeric(10,2) NOT NULL,
    "unit" character varying(20) DEFAULT 'kg'::character varying NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "original_batch_id" "uuid",
    "return_reason" character varying(255),
    "adjustment_reason" "public"."adjustment_reason",
    "trip_id" "uuid",
    CONSTRAINT "stock_transactions_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "valid_locations" CHECK (((("type" = 'receive'::"public"."transaction_type") AND ("location_id_to" IS NOT NULL)) OR (("type" = 'issue'::"public"."transaction_type") AND ("location_id_from" IS NOT NULL)) OR (("type" = 'transfer'::"public"."transaction_type") AND ("location_id_from" IS NOT NULL) AND ("location_id_to" IS NOT NULL)) OR (("type" = 'waste'::"public"."transaction_type") AND ("location_id_from" IS NOT NULL)) OR (("type" = 'adjustment'::"public"."transaction_type") AND (("location_id_from" IS NOT NULL) OR ("location_id_to" IS NOT NULL))) OR (("type" = 'return'::"public"."transaction_type") AND ("location_id_to" IS NOT NULL))))
);


ALTER TABLE "public"."stock_transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_balance" AS
 SELECT COALESCE("t"."location_id_to", "t"."location_id_from") AS "location_id",
    "t"."item_id",
    "sum"(
        CASE
            WHEN ("t"."type" = 'receive'::"public"."transaction_type") THEN "t"."qty"
            WHEN ("t"."type" = 'issue'::"public"."transaction_type") THEN (- "t"."qty")
            WHEN ("t"."type" = 'waste'::"public"."transaction_type") THEN (- "t"."qty")
            WHEN ("t"."type" = 'return'::"public"."transaction_type") THEN "t"."qty"
            WHEN (("t"."type" = 'transfer'::"public"."transaction_type") AND ("t"."location_id_to" = COALESCE("t"."location_id_to", "t"."location_id_from"))) THEN "t"."qty"
            WHEN (("t"."type" = 'transfer'::"public"."transaction_type") AND ("t"."location_id_from" = COALESCE("t"."location_id_to", "t"."location_id_from"))) THEN (- "t"."qty")
            WHEN (("t"."type" = 'adjustment'::"public"."transaction_type") AND ("t"."location_id_to" IS NOT NULL)) THEN "t"."qty"
            WHEN (("t"."type" = 'adjustment'::"public"."transaction_type") AND ("t"."location_id_from" IS NOT NULL)) THEN (- "t"."qty")
            ELSE (0)::numeric
        END) AS "on_hand_qty"
   FROM "public"."stock_transactions" "t"
  GROUP BY COALESCE("t"."location_id_to", "t"."location_id_from"), "t"."item_id";


ALTER VIEW "public"."stock_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."stock_balance" IS 'Real-time stock balance by location and item, calculated from transaction history';



CREATE OR REPLACE VIEW "public"."today_bag_usage" WITH ("security_invoker"='true') AS
 SELECT "bag_usage_logs"."location_id",
    "bag_usage_logs"."item_id",
    (COALESCE("sum"("bag_usage_logs"."bag_count"), (0)::bigint))::integer AS "bags_used_today",
    (COALESCE("sum"("bag_usage_logs"."kg_equivalent"), (0)::numeric))::numeric(10,2) AS "kg_used_today",
    ("count"(*))::integer AS "log_count",
    "max"("bag_usage_logs"."logged_at") AS "last_logged_at",
    "min"("bag_usage_logs"."logged_at") AS "first_logged_at"
   FROM "public"."bag_usage_logs"
  WHERE (("bag_usage_logs"."logged_at" >= CURRENT_DATE) AND ("bag_usage_logs"."is_undone" = false))
  GROUP BY "bag_usage_logs"."location_id", "bag_usage_logs"."item_id";


ALTER VIEW "public"."today_bag_usage" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."yesterday_bag_usage" WITH ("security_invoker"='true') AS
 SELECT "bag_usage_logs"."location_id",
    "bag_usage_logs"."item_id",
    (COALESCE("sum"("bag_usage_logs"."bag_count"), (0)::bigint))::integer AS "bags_used_yesterday",
    (COALESCE("sum"("bag_usage_logs"."kg_equivalent"), (0)::numeric))::numeric(10,2) AS "kg_used_yesterday"
   FROM "public"."bag_usage_logs"
  WHERE (("bag_usage_logs"."logged_at" >= (CURRENT_DATE - '1 day'::interval)) AND ("bag_usage_logs"."logged_at" < CURRENT_DATE) AND ("bag_usage_logs"."is_undone" = false))
  GROUP BY "bag_usage_logs"."location_id", "bag_usage_logs"."item_id";


ALTER VIEW "public"."yesterday_bag_usage" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."bag_usage_stats" WITH ("security_invoker"='true') AS
 SELECT "sb"."location_id",
    "sb"."item_id",
    "i"."name" AS "item_name",
    "i"."conversion_factor",
    "sb"."on_hand_qty" AS "kg_remaining",
    ("floor"(("sb"."on_hand_qty" / NULLIF("i"."conversion_factor", (0)::numeric))))::integer AS "bags_remaining",
    COALESCE("t"."bags_used_today", 0) AS "bags_used_today",
    COALESCE("t"."kg_used_today", (0)::numeric) AS "kg_used_today",
    "t"."last_logged_at",
    COALESCE("y"."bags_used_yesterday", 0) AS "bags_used_yesterday",
        CASE
            WHEN (COALESCE("y"."bags_used_yesterday", 0) = 0) THEN NULL::numeric
            ELSE "round"(((((COALESCE("t"."bags_used_today", 0) - "y"."bags_used_yesterday"))::numeric / ("y"."bags_used_yesterday")::numeric) * (100)::numeric), 1)
        END AS "usage_vs_yesterday_pct"
   FROM ((("public"."stock_balance" "sb"
     JOIN "public"."items" "i" ON (("i"."id" = "sb"."item_id")))
     LEFT JOIN "public"."today_bag_usage" "t" ON ((("t"."location_id" = "sb"."location_id") AND ("t"."item_id" = "sb"."item_id"))))
     LEFT JOIN "public"."yesterday_bag_usage" "y" ON ((("y"."location_id" = "sb"."location_id") AND ("y"."item_id" = "sb"."item_id"))));


ALTER VIEW "public"."bag_usage_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."barcode_scan_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "raw_barcode" character varying(200) NOT NULL,
    "barcode_format" "public"."barcode_format",
    "mapping_id" "uuid",
    "item_id" "uuid",
    "supplier_id" "uuid",
    "extracted_weight_kg" numeric(10,2),
    "extracted_batch_number" character varying(50),
    "extracted_date" "date",
    "final_quantity_kg" numeric(10,2) NOT NULL,
    "variety_name" character varying(100),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "rejection_reason" "text",
    "batch_id" "uuid",
    "transaction_id" "uuid",
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "confirmed_by" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."barcode_scan_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."barcode_scan_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "supplier_id" "uuid",
    "session_type" character varying(50) DEFAULT 'receive'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "total_scans" integer DEFAULT 0,
    "successful_scans" integer DEFAULT 0,
    "failed_scans" integer DEFAULT 0,
    "total_quantity_kg" numeric(10,2) DEFAULT 0,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."barcode_scan_sessions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."batch_balance" AS
 SELECT "b"."id" AS "batch_id",
    "b"."item_id",
    "b"."location_id",
    "b"."supplier_id",
    "b"."initial_qty",
    "b"."remaining_qty",
    "b"."received_at",
    "b"."expiry_date",
    "b"."quality_score",
    "b"."defect_pct",
    "b"."is_depleted",
    "b"."status",
    "b"."cost_per_unit",
    "b"."delivery_note_number",
    "s"."name" AS "supplier_name",
        CASE
            WHEN ("b"."expiry_date" IS NULL) THEN NULL::integer
            WHEN ("b"."expiry_date" <= CURRENT_DATE) THEN 0
            ELSE ("b"."expiry_date" - CURRENT_DATE)
        END AS "days_until_expiry"
   FROM ("public"."stock_batches" "b"
     JOIN "public"."suppliers" "s" ON (("s"."id" = "b"."supplier_id")))
  WHERE ("b"."status" <> 'depleted'::"public"."batch_status")
  ORDER BY
        CASE
            WHEN (("b"."expiry_date" IS NOT NULL) AND ("b"."expiry_date" <= (CURRENT_DATE + '7 days'::interval))) THEN 0
            ELSE 1
        END, "b"."expiry_date", "b"."received_at";


ALTER VIEW "public"."batch_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_edit_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "edited_by" "uuid" NOT NULL,
    "edited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "field_changed" character varying(100) NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "edit_reason" "text"
);


ALTER TABLE "public"."batch_edit_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_usage_summary" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "summary_date" "date" NOT NULL,
    "total_bags_used" integer DEFAULT 0 NOT NULL,
    "total_kg_used" numeric(10,2) DEFAULT 0 NOT NULL,
    "bags_remaining" integer,
    "kg_remaining" numeric(10,2),
    "usage_vs_yesterday_pct" numeric(5,2),
    "avg_bags_per_hour" numeric(5,2),
    "peak_usage_hour" integer,
    "first_log_at" timestamp with time zone,
    "last_log_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_usage_summary_peak_usage_hour_check" CHECK ((("peak_usage_hour" >= 0) AND ("peak_usage_hour" <= 23)))
);


ALTER TABLE "public"."daily_usage_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "zone_id" "uuid" NOT NULL,
    "type" "public"."location_type" NOT NULL,
    "name" character varying(255) NOT NULL,
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."demo_data_stats" AS
 SELECT 'Transactions'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    (((("min"("stock_transactions"."created_at"))::"date")::"text" || ' - '::"text") || (("max"("stock_transactions"."created_at"))::"date")::"text") AS "date_range"
   FROM "public"."stock_transactions"
UNION ALL
 SELECT 'Batches'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    (((("min"("stock_batches"."received_at"))::"date")::"text" || ' - '::"text") || (("max"("stock_batches"."received_at"))::"date")::"text") AS "date_range"
   FROM "public"."stock_batches"
UNION ALL
 SELECT 'Usage Logs'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    (((("min"("bag_usage_logs"."logged_at"))::"date")::"text" || ' - '::"text") || (("max"("bag_usage_logs"."logged_at"))::"date")::"text") AS "date_range"
   FROM "public"."bag_usage_logs"
UNION ALL
 SELECT 'Items'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    NULL::"text" AS "date_range"
   FROM "public"."items"
UNION ALL
 SELECT 'Locations'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    NULL::"text" AS "date_range"
   FROM "public"."locations";


ALTER VIEW "public"."demo_data_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200) NOT NULL,
    "phone" character varying(20),
    "license_number" character varying(50),
    "license_expiry" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."hourly_usage_breakdown" WITH ("security_invoker"='true') AS
 SELECT "bag_usage_logs"."location_id",
    "bag_usage_logs"."item_id",
    "date_trunc"('hour'::"text", "bag_usage_logs"."logged_at") AS "hour",
    "date"("bag_usage_logs"."logged_at") AS "usage_date",
    (EXTRACT(hour FROM "bag_usage_logs"."logged_at"))::integer AS "hour_of_day",
    ("sum"("bag_usage_logs"."bag_count"))::integer AS "bags_used",
    ("sum"("bag_usage_logs"."kg_equivalent"))::numeric(10,2) AS "kg_used",
    ("count"(*))::integer AS "log_count"
   FROM "public"."bag_usage_logs"
  WHERE ("bag_usage_logs"."is_undone" = false)
  GROUP BY "bag_usage_logs"."location_id", "bag_usage_logs"."item_id", ("date_trunc"('hour'::"text", "bag_usage_logs"."logged_at")), ("date"("bag_usage_logs"."logged_at")), (EXTRACT(hour FROM "bag_usage_logs"."logged_at"))
  ORDER BY ("date_trunc"('hour'::"text", "bag_usage_logs"."logged_at")) DESC;


ALTER VIEW "public"."hourly_usage_breakdown" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "lead_time_days" integer DEFAULT 1 NOT NULL,
    "min_order_qty" numeric(10,2) DEFAULT 0,
    "price_per_unit" numeric(10,2),
    "is_preferred" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "trip_stop_id" "uuid",
    "request_id" "uuid",
    "location_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "driver_claimed_qty_kg" double precision NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "confirmed_qty_kg" double precision,
    "confirmed_by" "uuid",
    "confirmed_at" timestamp with time zone,
    "discrepancy_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pending_deliveries_driver_claimed_qty_kg_check" CHECK (("driver_claimed_qty_kg" >= (0)::double precision))
);


ALTER TABLE "public"."pending_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'staff'::"public"."user_role" NOT NULL,
    "zone_id" "uuid",
    "location_id" "uuid",
    "full_name" character varying(255),
    "phone" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."is_active" IS 'Soft delete flag - false means user is deactivated';



COMMENT ON COLUMN "public"."profiles"."created_by" IS 'UUID of the profile that created this user (via invitation)';



CREATE OR REPLACE VIEW "public"."profiles_with_email" AS
 SELECT "p"."id",
    "p"."user_id",
    "p"."role",
    "p"."zone_id",
    "p"."location_id",
    "p"."full_name",
    "p"."phone",
    "p"."created_at",
    "p"."updated_at",
    "p"."is_active",
    "p"."created_by",
    "u"."email"
   FROM ("public"."profiles" "p"
     JOIN "auth"."users" "u" ON (("p"."user_id" = "u"."id")));


ALTER VIEW "public"."profiles_with_email" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reorder_policies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "safety_stock_qty" numeric(10,2) DEFAULT 20 NOT NULL,
    "reorder_point_qty" numeric(10,2) DEFAULT 50 NOT NULL,
    "target_days_of_cover" integer DEFAULT 7,
    "preferred_supplier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reorder_policies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_balance_detail" AS
 SELECT "sb"."location_id",
    "l"."name" AS "location_name",
    "l"."type" AS "location_type",
    "sb"."item_id",
    "i"."name" AS "item_name",
    "i"."sku",
    "sb"."on_hand_qty",
    "i"."unit"
   FROM (("public"."stock_balance" "sb"
     JOIN "public"."locations" "l" ON (("l"."id" = "sb"."location_id")))
     JOIN "public"."items" "i" ON (("i"."id" = "sb"."item_id")))
  ORDER BY "l"."type", "l"."name", "i"."name";


ALTER VIEW "public"."stock_balance_detail" OWNER TO "postgres";


COMMENT ON VIEW "public"."stock_balance_detail" IS 'Stock balance with location and item details for debugging';



CREATE TABLE IF NOT EXISTS "public"."stock_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "quantity_bags" integer NOT NULL,
    "urgency" character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "trip_id" "uuid",
    "notes" "text",
    "current_stock_kg" double precision,
    "target_stock_kg" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stock_requests_quantity_bags_check" CHECK (("quantity_bags" > 0))
);


ALTER TABLE "public"."stock_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_barcode_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "barcode_pattern" character varying(100) NOT NULL,
    "barcode_prefix" character varying(50),
    "barcode_format" "public"."barcode_format" DEFAULT 'ean13'::"public"."barcode_format" NOT NULL,
    "weight_embedded" boolean DEFAULT false,
    "weight_start_position" integer,
    "weight_length" integer,
    "weight_decimal_places" integer DEFAULT 3,
    "weight_unit" character varying(10) DEFAULT 'kg'::character varying,
    "default_quantity_kg" numeric(10,2),
    "default_bag_size" character varying(20),
    "variety_name" character varying(100),
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."supplier_barcode_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_cargo" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "transaction_id" "uuid",
    "batch_id" "uuid",
    "item_id" "uuid" NOT NULL,
    "quantity_kg" numeric(10,2) NOT NULL,
    "from_location_id" "uuid",
    "to_location_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_cargo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "stop_id" "uuid",
    "stop_sequence" integer DEFAULT 1 NOT NULL,
    "planned_qty_bags" integer NOT NULL,
    "delivered_qty_bags" integer,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trip_requests_planned_qty_bags_check" CHECK (("planned_qty_bags" > 0)),
    CONSTRAINT "trip_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'in_transit'::character varying, 'delivered'::character varying, 'confirmed'::character varying, 'partial'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."trip_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."trip_requests" IS 'Junction table linking multiple stock requests to a single trip';



COMMENT ON COLUMN "public"."trip_requests"."stop_sequence" IS 'Order of this delivery in the trip (1 = first stop after pickup)';



COMMENT ON COLUMN "public"."trip_requests"."planned_qty_bags" IS 'Quantity planned for this specific request/delivery';



COMMENT ON COLUMN "public"."trip_requests"."delivered_qty_bags" IS 'Actual quantity delivered (filled after delivery)';



COMMENT ON COLUMN "public"."trip_requests"."status" IS 'Delivery status for this specific request';



CREATE TABLE IF NOT EXISTS "public"."trip_stops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "stop_order" integer NOT NULL,
    "location_id" "uuid",
    "supplier_id" "uuid",
    "stop_type" "public"."stop_type" NOT NULL,
    "location_name" "text",
    "planned_qty_kg" numeric(10,2),
    "actual_qty_kg" numeric(10,2),
    "arrived_at" timestamp with time zone,
    "departed_at" timestamp with time zone,
    "is_completed" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trip_stops_stop_order_check" CHECK (("stop_order" > 0)),
    CONSTRAINT "valid_stop_location" CHECK (((("location_id" IS NOT NULL) AND ("supplier_id" IS NULL)) OR (("location_id" IS NULL) AND ("supplier_id" IS NOT NULL))))
);


ALTER TABLE "public"."trip_stops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_number" character varying(50) NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "driver_name" character varying(200) NOT NULL,
    "status" "public"."trip_status" DEFAULT 'planned'::"public"."trip_status" NOT NULL,
    "origin_description" "text",
    "destination_description" "text",
    "departure_time" timestamp with time zone,
    "arrival_time" timestamp with time zone,
    "fuel_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "fuel_litres" numeric(10,2),
    "toll_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "other_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "other_cost_description" "text",
    "odometer_start" numeric(10,1),
    "odometer_end" numeric(10,1),
    "linked_batch_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "trip_type" "public"."trip_type" DEFAULT 'other'::"public"."trip_type",
    "from_location_id" "uuid",
    "to_location_id" "uuid",
    "supplier_id" "uuid",
    "driver_id" "uuid",
    "is_multi_stop" boolean DEFAULT false
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trips_with_stops" AS
 SELECT "t"."id",
    "t"."trip_number",
    "t"."vehicle_id",
    "t"."driver_name",
    "t"."status",
    "t"."origin_description",
    "t"."destination_description",
    "t"."departure_time",
    "t"."arrival_time",
    "t"."fuel_cost",
    "t"."fuel_litres",
    "t"."toll_cost",
    "t"."other_cost",
    "t"."other_cost_description",
    "t"."odometer_start",
    "t"."odometer_end",
    "t"."linked_batch_ids",
    "t"."created_by",
    "t"."created_at",
    "t"."completed_at",
    "t"."notes",
    "t"."trip_type",
    "t"."from_location_id",
    "t"."to_location_id",
    "t"."supplier_id",
    "t"."driver_id",
    "t"."is_multi_stop",
    ( SELECT "count"(*) AS "count"
           FROM "public"."trip_stops" "ts"
          WHERE ("ts"."trip_id" = "t"."id")) AS "total_stops",
    ( SELECT "count"(*) AS "count"
           FROM "public"."trip_stops" "ts"
          WHERE (("ts"."trip_id" = "t"."id") AND ("ts"."is_completed" = true))) AS "completed_stops",
    ( SELECT COALESCE("sum"("ts"."planned_qty_kg"), (0)::numeric) AS "coalesce"
           FROM "public"."trip_stops" "ts"
          WHERE (("ts"."trip_id" = "t"."id") AND ("ts"."stop_type" = 'pickup'::"public"."stop_type"))) AS "total_pickup_kg",
    ( SELECT COALESCE("sum"("ts"."planned_qty_kg"), (0)::numeric) AS "coalesce"
           FROM "public"."trip_stops" "ts"
          WHERE (("ts"."trip_id" = "t"."id") AND ("ts"."stop_type" = 'dropoff'::"public"."stop_type"))) AS "total_dropoff_kg",
    ( SELECT "string_agg"(COALESCE("ts"."location_name", ("l"."name")::"text", ("s"."name")::"text"), ' → '::"text" ORDER BY "ts"."stop_order") AS "string_agg"
           FROM (("public"."trip_stops" "ts"
             LEFT JOIN "public"."locations" "l" ON (("l"."id" = "ts"."location_id")))
             LEFT JOIN "public"."suppliers" "s" ON (("s"."id" = "ts"."supplier_id")))
          WHERE ("ts"."trip_id" = "t"."id")) AS "route_summary"
   FROM "public"."trips" "t";


ALTER VIEW "public"."trips_with_stops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "registration_number" character varying(20) NOT NULL,
    "make" character varying(100),
    "model" character varying(100),
    "fuel_type" character varying(20) DEFAULT 'diesel'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trips_with_totals" AS
 SELECT "t"."id",
    "t"."trip_number",
    "t"."vehicle_id",
    "t"."driver_name",
    "t"."status",
    "t"."origin_description",
    "t"."destination_description",
    "t"."departure_time",
    "t"."arrival_time",
    "t"."fuel_cost",
    "t"."fuel_litres",
    "t"."toll_cost",
    "t"."other_cost",
    "t"."other_cost_description",
    "t"."odometer_start",
    "t"."odometer_end",
    "t"."linked_batch_ids",
    "t"."created_by",
    "t"."created_at",
    "t"."completed_at",
    "t"."notes",
    "t"."trip_type",
    "t"."from_location_id",
    "t"."to_location_id",
    "t"."supplier_id",
    (("t"."fuel_cost" + "t"."toll_cost") + "t"."other_cost") AS "total_cost",
        CASE
            WHEN (("t"."odometer_start" IS NOT NULL) AND ("t"."odometer_end" IS NOT NULL)) THEN ("t"."odometer_end" - "t"."odometer_start")
            ELSE NULL::numeric
        END AS "distance_km",
    "v"."registration_number" AS "vehicle_registration",
    "v"."make" AS "vehicle_make",
    "v"."model" AS "vehicle_model",
    "fl"."name" AS "from_location_name",
    "tl"."name" AS "to_location_name",
    "s"."name" AS "supplier_name",
    ( SELECT COALESCE("sum"("tc"."quantity_kg"), (0)::numeric) AS "coalesce"
           FROM "public"."trip_cargo" "tc"
          WHERE ("tc"."trip_id" = "t"."id")) AS "total_cargo_kg"
   FROM (((("public"."trips" "t"
     LEFT JOIN "public"."vehicles" "v" ON (("v"."id" = "t"."vehicle_id")))
     LEFT JOIN "public"."locations" "fl" ON (("fl"."id" = "t"."from_location_id")))
     LEFT JOIN "public"."locations" "tl" ON (("tl"."id" = "t"."to_location_id")))
     LEFT JOIN "public"."suppliers" "s" ON (("s"."id" = "t"."supplier_id")));


ALTER VIEW "public"."trips_with_totals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "bag_usage_log_id" "uuid",
    "recipient_user_id" "uuid" NOT NULL,
    "notification_type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_sent" boolean DEFAULT false,
    "sent_at" timestamp with time zone,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_notifications_notification_type_check" CHECK ((("notification_type")::"text" = ANY ((ARRAY['bag_used'::character varying, 'threshold_alert'::character varying, 'daily_summary'::character varying])::"text"[])))
);


ALTER TABLE "public"."usage_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(50) NOT NULL,
    "zone_id" "uuid",
    "location_id" "uuid",
    "full_name" character varying(255),
    "invited_by" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_invitations_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['admin'::character varying, 'zone_manager'::character varying, 'location_manager'::character varying, 'driver'::character varying, 'staff'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_invitations" IS 'Stores pending user invitations with tokens for invite-only signup flow';



COMMENT ON COLUMN "public"."user_invitations"."role" IS 'User role: admin, zone_manager, location_manager, driver, or staff. Drivers are responsible for accepting stock requests and making deliveries.';



COMMENT ON COLUMN "public"."user_invitations"."token" IS 'Unique token sent via email for accepting invitation';



COMMENT ON COLUMN "public"."user_invitations"."expires_at" IS 'Invitation expiry time (default 7 days from creation)';



COMMENT ON COLUMN "public"."user_invitations"."accepted_at" IS 'Timestamp when user accepted the invitation and created account';



CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "device_id" "text",
    "platform" character varying(20),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_push_tokens_platform_check" CHECK ((("platform")::"text" = ANY ((ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zones" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alert_acknowledgments"
    ADD CONSTRAINT "alert_acknowledgments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bag_usage_logs"
    ADD CONSTRAINT "bag_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barcode_scan_sessions"
    ADD CONSTRAINT "barcode_scan_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_edit_history"
    ADD CONSTRAINT "batch_edit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_usage_summary"
    ADD CONSTRAINT "daily_usage_summary_location_id_item_id_summary_date_key" UNIQUE ("location_id", "item_id", "summary_date");



ALTER TABLE ONLY "public"."daily_usage_summary"
    ADD CONSTRAINT "daily_usage_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_suppliers"
    ADD CONSTRAINT "item_suppliers_item_id_supplier_id_key" UNIQUE ("item_id", "supplier_id");



ALTER TABLE ONLY "public"."item_suppliers"
    ADD CONSTRAINT "item_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."reorder_policies"
    ADD CONSTRAINT "reorder_policies_location_id_item_id_key" UNIQUE ("location_id", "item_id");



ALTER TABLE ONLY "public"."reorder_policies"
    ADD CONSTRAINT "reorder_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_barcode_mappings"
    ADD CONSTRAINT "supplier_barcode_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_barcode_mappings"
    ADD CONSTRAINT "supplier_barcode_mappings_supplier_id_barcode_pattern_key" UNIQUE ("supplier_id", "barcode_pattern");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_requests"
    ADD CONSTRAINT "trip_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_requests"
    ADD CONSTRAINT "trip_requests_trip_id_request_id_key" UNIQUE ("trip_id", "request_id");



ALTER TABLE ONLY "public"."trip_stops"
    ADD CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_stops"
    ADD CONSTRAINT "trip_stops_trip_id_stop_order_key" UNIQUE ("trip_id", "stop_order");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_trip_number_key" UNIQUE ("trip_number");



ALTER TABLE ONLY "public"."usage_notifications"
    ADD CONSTRAINT "usage_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_expo_push_token_key" UNIQUE ("user_id", "expo_push_token");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_registration_number_key" UNIQUE ("registration_number");



ALTER TABLE ONLY "public"."zones"
    ADD CONSTRAINT "zones_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action_type");



CREATE INDEX "idx_audit_logs_actor" ON "public"."audit_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_bag_usage_item" ON "public"."bag_usage_logs" USING "btree" ("item_id", "logged_at" DESC);



CREATE INDEX "idx_bag_usage_location_date" ON "public"."bag_usage_logs" USING "btree" ("location_id", "logged_at" DESC);



CREATE INDEX "idx_bag_usage_user" ON "public"."bag_usage_logs" USING "btree" ("logged_by", "logged_at" DESC);



CREATE INDEX "idx_barcode_mappings_pattern" ON "public"."supplier_barcode_mappings" USING "btree" ("barcode_pattern");



CREATE INDEX "idx_barcode_mappings_prefix" ON "public"."supplier_barcode_mappings" USING "btree" ("barcode_prefix") WHERE (("is_active" = true) AND ("barcode_prefix" IS NOT NULL));



CREATE INDEX "idx_barcode_mappings_supplier" ON "public"."supplier_barcode_mappings" USING "btree" ("supplier_id") WHERE ("is_active" = true);



CREATE INDEX "idx_batch_edit_history_batch" ON "public"."batch_edit_history" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_edit_history_edited_at" ON "public"."batch_edit_history" USING "btree" ("edited_at" DESC);



CREATE INDEX "idx_batches_expiry" ON "public"."stock_batches" USING "btree" ("expiry_date") WHERE ("expiry_date" IS NOT NULL);



CREATE INDEX "idx_batches_fifo_expiry_priority" ON "public"."stock_batches" USING "btree" ("location_id", "item_id", "status", "expiry_date", "received_at") WHERE ("remaining_qty" > (0)::numeric);



CREATE INDEX "idx_batches_location_item" ON "public"."stock_batches" USING "btree" ("location_id", "item_id");



CREATE INDEX "idx_batches_not_depleted" ON "public"."stock_batches" USING "btree" ("location_id", "item_id") WHERE ("is_depleted" = false);



CREATE INDEX "idx_batches_received_at" ON "public"."stock_batches" USING "btree" ("location_id", "item_id", "received_at");



CREATE INDEX "idx_batches_scan_session" ON "public"."stock_batches" USING "btree" ("scan_session_id") WHERE ("scan_session_id" IS NOT NULL);



CREATE INDEX "idx_daily_summary_lookup" ON "public"."daily_usage_summary" USING "btree" ("location_id", "item_id", "summary_date" DESC);



CREATE INDEX "idx_locations_type" ON "public"."locations" USING "btree" ("type");



CREATE INDEX "idx_locations_zone" ON "public"."locations" USING "btree" ("zone_id");



CREATE INDEX "idx_notifications_unread" ON "public"."usage_notifications" USING "btree" ("recipient_user_id", "created_at" DESC) WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_unsent" ON "public"."usage_notifications" USING "btree" ("is_sent", "created_at") WHERE ("is_sent" = false);



CREATE INDEX "idx_notifications_user" ON "public"."usage_notifications" USING "btree" ("recipient_user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_profiles_location" ON "public"."profiles" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_profiles_user" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_zone" ON "public"."profiles" USING "btree" ("zone_id") WHERE ("zone_id" IS NOT NULL);



CREATE INDEX "idx_push_tokens_user" ON "public"."user_push_tokens" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_scan_logs_barcode" ON "public"."barcode_scan_logs" USING "btree" ("raw_barcode");



CREATE INDEX "idx_scan_logs_item" ON "public"."barcode_scan_logs" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_scan_logs_session" ON "public"."barcode_scan_logs" USING "btree" ("session_id");



CREATE INDEX "idx_scan_logs_status" ON "public"."barcode_scan_logs" USING "btree" ("status");



CREATE INDEX "idx_scan_sessions_location" ON "public"."barcode_scan_sessions" USING "btree" ("location_id");



CREATE INDEX "idx_scan_sessions_status" ON "public"."barcode_scan_sessions" USING "btree" ("status");



CREATE INDEX "idx_scan_sessions_trip" ON "public"."barcode_scan_sessions" USING "btree" ("trip_id") WHERE ("trip_id" IS NOT NULL);



CREATE INDEX "idx_transactions_batch" ON "public"."stock_transactions" USING "btree" ("batch_id") WHERE ("batch_id" IS NOT NULL);



CREATE INDEX "idx_transactions_created" ON "public"."stock_transactions" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_item" ON "public"."stock_transactions" USING "btree" ("item_id");



CREATE INDEX "idx_transactions_location_from" ON "public"."stock_transactions" USING "btree" ("location_id_from") WHERE ("location_id_from" IS NOT NULL);



CREATE INDEX "idx_transactions_location_to" ON "public"."stock_transactions" USING "btree" ("location_id_to") WHERE ("location_id_to" IS NOT NULL);



CREATE INDEX "idx_transactions_lookup" ON "public"."stock_transactions" USING "btree" ("location_id_from", "location_id_to", "item_id", "created_at");



CREATE INDEX "idx_transactions_trip_id" ON "public"."stock_transactions" USING "btree" ("trip_id") WHERE ("trip_id" IS NOT NULL);



CREATE INDEX "idx_transactions_type" ON "public"."stock_transactions" USING "btree" ("type");



CREATE INDEX "idx_trip_cargo_trip_id" ON "public"."trip_cargo" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_requests_request" ON "public"."trip_requests" USING "btree" ("request_id");



CREATE INDEX "idx_trip_requests_status" ON "public"."trip_requests" USING "btree" ("status");



CREATE INDEX "idx_trip_requests_stop" ON "public"."trip_requests" USING "btree" ("stop_id");



CREATE INDEX "idx_trip_requests_trip" ON "public"."trip_requests" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_stops_location" ON "public"."trip_stops" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_trip_stops_supplier" ON "public"."trip_stops" USING "btree" ("supplier_id") WHERE ("supplier_id" IS NOT NULL);



CREATE INDEX "idx_trip_stops_trip_id" ON "public"."trip_stops" USING "btree" ("trip_id");



CREATE INDEX "idx_trips_created_at" ON "public"."trips" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_trips_driver" ON "public"."trips" USING "btree" ("driver_name");



CREATE INDEX "idx_trips_status" ON "public"."trips" USING "btree" ("status");



CREATE INDEX "idx_trips_vehicle_id" ON "public"."trips" USING "btree" ("vehicle_id");



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_token" ON "public"."user_invitations" USING "btree" ("token");



CREATE INDEX "idx_vehicles_active" ON "public"."vehicles" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "audit_adjustments" AFTER INSERT ON "public"."stock_transactions" FOR EACH ROW WHEN (("new"."type" = 'adjustment'::"public"."transaction_type")) EXECUTE FUNCTION "public"."audit_stock_adjustments"();



CREATE OR REPLACE TRIGGER "audit_locations" AFTER INSERT OR DELETE OR UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_location_changes"();



CREATE OR REPLACE TRIGGER "audit_logs_immutable_delete" BEFORE DELETE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_modification"();



CREATE OR REPLACE TRIGGER "audit_logs_immutable_update" BEFORE UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_modification"();



CREATE OR REPLACE TRIGGER "audit_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_profile_changes"();



CREATE OR REPLACE TRIGGER "audit_reorder_policies" AFTER INSERT OR DELETE OR UPDATE ON "public"."reorder_policies" FOR EACH ROW EXECUTE FUNCTION "public"."audit_reorder_policy_changes"();



CREATE OR REPLACE TRIGGER "audit_zones" AFTER INSERT OR DELETE OR UPDATE ON "public"."zones" FOR EACH ROW EXECUTE FUNCTION "public"."audit_zone_changes"();



CREATE OR REPLACE TRIGGER "trg_notify_bag_usage" AFTER INSERT ON "public"."bag_usage_logs" FOR EACH ROW WHEN (("new"."is_undone" = false)) EXECUTE FUNCTION "public"."notify_bag_usage"();



CREATE OR REPLACE TRIGGER "update_batches_updated_at" BEFORE UPDATE ON "public"."stock_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_items_updated_at" BEFORE UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reorder_policies_updated_at" BEFORE UPDATE ON "public"."reorder_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_trip_requests_updated_at" BEFORE UPDATE ON "public"."trip_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_zones_updated_at" BEFORE UPDATE ON "public"."zones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."alert_acknowledgments"
    ADD CONSTRAINT "alert_acknowledgments_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."alert_acknowledgments"
    ADD CONSTRAINT "alert_acknowledgments_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_acknowledgments"
    ADD CONSTRAINT "alert_acknowledgments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bag_usage_logs"
    ADD CONSTRAINT "bag_usage_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bag_usage_logs"
    ADD CONSTRAINT "bag_usage_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bag_usage_logs"
    ADD CONSTRAINT "bag_usage_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bag_usage_logs"
    ADD CONSTRAINT "bag_usage_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bag_usage_logs"
    ADD CONSTRAINT "bag_usage_logs_stock_transaction_id_fkey" FOREIGN KEY ("stock_transaction_id") REFERENCES "public"."stock_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "public"."supplier_barcode_mappings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."barcode_scan_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_logs"
    ADD CONSTRAINT "barcode_scan_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."stock_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_sessions"
    ADD CONSTRAINT "barcode_scan_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."barcode_scan_sessions"
    ADD CONSTRAINT "barcode_scan_sessions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."barcode_scan_sessions"
    ADD CONSTRAINT "barcode_scan_sessions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batch_edit_history"
    ADD CONSTRAINT "batch_edit_history_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_edit_history"
    ADD CONSTRAINT "batch_edit_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."daily_usage_summary"
    ADD CONSTRAINT "daily_usage_summary_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_usage_summary"
    ADD CONSTRAINT "daily_usage_summary_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "fk_receive_transaction" FOREIGN KEY ("receive_transaction_id") REFERENCES "public"."stock_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_suppliers"
    ADD CONSTRAINT "item_suppliers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_suppliers"
    ADD CONSTRAINT "item_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."stock_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_deliveries"
    ADD CONSTRAINT "pending_deliveries_trip_stop_id_fkey" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reorder_policies"
    ADD CONSTRAINT "reorder_policies_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reorder_policies"
    ADD CONSTRAINT "reorder_policies_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reorder_policies"
    ADD CONSTRAINT "reorder_policies_preferred_supplier_id_fkey" FOREIGN KEY ("preferred_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_scan_session_id_fkey" FOREIGN KEY ("scan_session_id") REFERENCES "public"."barcode_scan_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_location_id_from_fkey" FOREIGN KEY ("location_id_from") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_location_id_to_fkey" FOREIGN KEY ("location_id_to") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_original_batch_id_fkey" FOREIGN KEY ("original_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_transactions"
    ADD CONSTRAINT "stock_transactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_barcode_mappings"
    ADD CONSTRAINT "supplier_barcode_mappings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_barcode_mappings"
    ADD CONSTRAINT "supplier_barcode_mappings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."stock_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_cargo"
    ADD CONSTRAINT "trip_cargo_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_requests"
    ADD CONSTRAINT "trip_requests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."stock_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_requests"
    ADD CONSTRAINT "trip_requests_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_requests"
    ADD CONSTRAINT "trip_requests_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_stops"
    ADD CONSTRAINT "trip_stops_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_stops"
    ADD CONSTRAINT "trip_stops_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_stops"
    ADD CONSTRAINT "trip_stops_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id");



ALTER TABLE ONLY "public"."usage_notifications"
    ADD CONSTRAINT "usage_notifications_bag_usage_log_id_fkey" FOREIGN KEY ("bag_usage_log_id") REFERENCES "public"."bag_usage_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_notifications"
    ADD CONSTRAINT "usage_notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all for service role" ON "public"."user_invitations" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view barcode mappings" ON "public"."supplier_barcode_mappings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view scan logs" ON "public"."barcode_scan_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view scan sessions" ON "public"."barcode_scan_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view trip cargo" ON "public"."trip_cargo" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view trip stops" ON "public"."trip_stops" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view trips" ON "public"."trips" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view vehicles" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Managers can insert batch edit history" ON "public"."batch_edit_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage barcode mappings" ON "public"."supplier_barcode_mappings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage scan logs" ON "public"."barcode_scan_logs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage scan sessions" ON "public"."barcode_scan_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage trip cargo" ON "public"."trip_cargo" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage trip stops" ON "public"."trip_stops" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage trips" ON "public"."trips" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can manage vehicles" ON "public"."vehicles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Managers can view batch edit history" ON "public"."batch_edit_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"]))))));



CREATE POLICY "Service role bypass for barcode_mappings" ON "public"."supplier_barcode_mappings" TO "service_role" USING (true);



CREATE POLICY "Service role bypass for scan_logs" ON "public"."barcode_scan_logs" TO "service_role" USING (true);



CREATE POLICY "Service role bypass for scan_sessions" ON "public"."barcode_scan_sessions" TO "service_role" USING (true);



CREATE POLICY "Service role full access" ON "public"."pending_deliveries" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."stock_requests" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to trip_requests" ON "public"."trip_requests" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Staff can log at their location" ON "public"."bag_usage_logs" FOR INSERT WITH CHECK ((("location_id" = ( SELECT "profiles"."location_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'zone_manager'::"public"."user_role"])))))));



CREATE POLICY "System can insert notifications" ON "public"."usage_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can undo their own logs" ON "public"."bag_usage_logs" FOR UPDATE USING (("logged_by" = "auth"."uid"())) WITH CHECK (("logged_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."usage_notifications" FOR UPDATE USING (("recipient_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view logs at their location/zone" ON "public"."bag_usage_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."locations" "l" ON (("l"."zone_id" = "p"."zone_id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("p"."location_id" = "bag_usage_logs"."location_id") OR (("p"."role" = 'zone_manager'::"public"."user_role") AND ("l"."id" = "bag_usage_logs"."location_id")))))));



CREATE POLICY "Users can view summaries for their location/zone" ON "public"."daily_usage_summary" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."locations" "l" ON (("l"."zone_id" = "p"."zone_id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR ("p"."location_id" = "daily_usage_summary"."location_id") OR (("p"."role" = 'zone_manager'::"public"."user_role") AND ("l"."id" = "daily_usage_summary"."location_id")))))));



CREATE POLICY "Users manage their own tokens" ON "public"."user_push_tokens" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users see their own notifications" ON "public"."usage_notifications" FOR SELECT USING (("recipient_user_id" = "auth"."uid"()));



CREATE POLICY "alert_ack_delete" ON "public"."alert_acknowledgments" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "alert_ack_insert" ON "public"."alert_acknowledgments" FOR INSERT WITH CHECK ((("acknowledged_by" = "auth"."uid"()) AND "public"."has_location_access"("location_id")));



CREATE POLICY "alert_ack_select" ON "public"."alert_acknowledgments" FOR SELECT USING ("public"."has_location_access"("location_id"));



CREATE POLICY "alert_ack_update" ON "public"."alert_acknowledgments" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."alert_acknowledgments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "audit_logs_select" ON "public"."audit_logs" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."bag_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."barcode_scan_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."barcode_scan_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_edit_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batches_delete" ON "public"."stock_batches" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])) AND (("profiles"."location_id" = "stock_batches"."location_id") OR ("profiles"."zone_id" = ( SELECT "locations"."zone_id"
           FROM "public"."locations"
          WHERE ("locations"."id" = "stock_batches"."location_id")))))))));



CREATE POLICY "batches_insert" ON "public"."stock_batches" FOR INSERT WITH CHECK ("public"."has_location_access"("location_id"));



CREATE POLICY "batches_select" ON "public"."stock_batches" FOR SELECT USING ("public"."has_location_access"("location_id"));



CREATE POLICY "batches_update" ON "public"."stock_batches" FOR UPDATE USING ("public"."has_location_access"("location_id"));



ALTER TABLE "public"."daily_usage_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_suppliers_delete" ON "public"."item_suppliers" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "item_suppliers_insert" ON "public"."item_suppliers" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "item_suppliers_select" ON "public"."item_suppliers" FOR SELECT USING (true);



CREATE POLICY "item_suppliers_update" ON "public"."item_suppliers" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "items_delete" ON "public"."items" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "items_insert" ON "public"."items" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "items_select" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "items_update" ON "public"."items" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations_delete" ON "public"."locations" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "locations_insert" ON "public"."locations" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "locations_select" ON "public"."locations" FOR SELECT USING (("public"."is_admin"() OR ("zone_id" = "public"."get_user_zone_id"()) OR ("id" = "public"."get_user_location_id"())));



CREATE POLICY "locations_update" ON "public"."locations" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."pending_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"() OR (("zone_id" = "public"."get_user_zone_id"()) AND ("public"."get_user_zone_id"() IS NOT NULL))));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."reorder_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reorder_policies_delete" ON "public"."reorder_policies" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "reorder_policies_insert" ON "public"."reorder_policies" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])) AND (("profiles"."location_id" = "reorder_policies"."location_id") OR ("profiles"."zone_id" = ( SELECT "locations"."zone_id"
           FROM "public"."locations"
          WHERE ("locations"."id" = "reorder_policies"."location_id")))))))));



CREATE POLICY "reorder_policies_select" ON "public"."reorder_policies" FOR SELECT USING ("public"."has_location_access"("location_id"));



CREATE POLICY "reorder_policies_update" ON "public"."reorder_policies" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['zone_manager'::"public"."user_role", 'location_manager'::"public"."user_role"])) AND (("profiles"."location_id" = "reorder_policies"."location_id") OR ("profiles"."zone_id" = ( SELECT "locations"."zone_id"
           FROM "public"."locations"
          WHERE ("locations"."id" = "reorder_policies"."location_id")))))))));



ALTER TABLE "public"."stock_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_barcode_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_delete" ON "public"."suppliers" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "suppliers_insert" ON "public"."suppliers" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "suppliers_select" ON "public"."suppliers" FOR SELECT USING (true);



CREATE POLICY "suppliers_update" ON "public"."suppliers" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "transactions_delete" ON "public"."stock_transactions" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "transactions_insert" ON "public"."stock_transactions" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."has_location_access"("location_id_from") OR "public"."has_location_access"("location_id_to"))));



CREATE POLICY "transactions_select" ON "public"."stock_transactions" FOR SELECT USING (("public"."has_location_access"("location_id_from") OR "public"."has_location_access"("location_id_to")));



CREATE POLICY "transactions_update" ON "public"."stock_transactions" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."trip_cargo" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_stops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zones_delete" ON "public"."zones" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "zones_insert" ON "public"."zones" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "zones_select" ON "public"."zones" FOR SELECT USING (("public"."is_admin"() OR ("id" IN ( SELECT "profiles"."zone_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("id" IN ( SELECT "locations"."zone_id"
   FROM "public"."locations"
  WHERE ("locations"."id" IN ( SELECT "profiles"."location_id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"())))))));



CREATE POLICY "zones_update" ON "public"."zones" FOR UPDATE USING ("public"."is_admin"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."audit_location_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_location_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_location_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_profile_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_profile_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_profile_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_reorder_policy_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_reorder_policy_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_reorder_policy_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_stock_adjustments"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_stock_adjustments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_stock_adjustments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_zone_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_zone_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_zone_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_trip_delivery_cost"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_trip_delivery_cost"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_trip_delivery_cost"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_trip_stop"("p_stop_id" "uuid", "p_actual_qty_kg" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_trip_stop"("p_stop_id" "uuid", "p_actual_qty_kg" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_trip_stop"("p_stop_id" "uuid", "p_actual_qty_kg" numeric, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_multi_stop_trip"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_driver_name" "text", "p_created_by" "uuid", "p_notes" "text", "p_stops" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_multi_stop_trip"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_driver_name" "text", "p_created_by" "uuid", "p_notes" "text", "p_stops" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_multi_stop_trip"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_driver_name" "text", "p_created_by" "uuid", "p_notes" "text", "p_stops" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_comprehensive_mock_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_comprehensive_mock_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_comprehensive_mock_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_five_year_demo_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_five_year_demo_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_five_year_demo_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_historical_mock_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_historical_mock_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_historical_mock_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_trip_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_trip_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_trip_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fifo_batch"("p_location_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_fifo_batch"("p_location_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fifo_batch"("p_location_id" "uuid", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_notification_recipients"("p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_notification_recipients"("p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_notification_recipients"("p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_cost_summary"("p_from_date" "date", "p_to_date" "date", "p_vehicle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_cost_summary"("p_from_date" "date", "p_to_date" "date", "p_vehicle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_cost_summary"("p_from_date" "date", "p_to_date" "date", "p_vehicle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_location_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_location_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_location_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_zone_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_zone_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_zone_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_location_access"("check_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_location_access"("check_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_location_access"("check_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_zone_manager"("check_zone_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_zone_manager"("check_zone_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_zone_manager"("check_zone_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit"("p_action_type" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit"("p_action_type" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit"("p_action_type" character varying, "p_entity_type" character varying, "p_entity_id" "uuid", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_bag_usage"("p_location_id" "uuid", "p_item_id" "uuid", "p_logged_by" "uuid", "p_bag_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."log_bag_usage"("p_location_id" "uuid", "p_item_id" "uuid", "p_logged_by" "uuid", "p_bag_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_bag_usage"("p_location_id" "uuid", "p_item_id" "uuid", "p_logged_by" "uuid", "p_bag_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_bag_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_bag_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_bag_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_audit_modification"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_audit_modification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_audit_modification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_batch_edit"("p_batch_id" "uuid", "p_edited_by" "uuid", "p_field_changed" character varying, "p_old_value" "text", "p_new_value" "text", "p_edit_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_batch_edit"("p_batch_id" "uuid", "p_edited_by" "uuid", "p_field_changed" character varying, "p_old_value" "text", "p_new_value" "text", "p_edit_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_batch_edit"("p_batch_id" "uuid", "p_edited_by" "uuid", "p_field_changed" character varying, "p_old_value" "text", "p_new_value" "text", "p_edit_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."undo_bag_usage"("p_bag_log_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."undo_bag_usage"("p_bag_log_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."undo_bag_usage"("p_bag_log_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."alert_acknowledgments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."alert_acknowledgments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."alert_acknowledgments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_batches" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_batches" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_batches" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."suppliers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."suppliers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."suppliers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."available_batches" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."available_batches" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."available_batches" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bag_usage_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bag_usage_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bag_usage_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."items" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transactions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transactions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_transactions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_balance" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_balance" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_balance" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."today_bag_usage" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."today_bag_usage" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."today_bag_usage" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."yesterday_bag_usage" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."yesterday_bag_usage" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."yesterday_bag_usage" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bag_usage_stats" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bag_usage_stats" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bag_usage_stats" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."barcode_scan_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."barcode_scan_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."barcode_scan_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."barcode_scan_sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."barcode_scan_sessions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."barcode_scan_sessions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."batch_balance" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."batch_balance" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."batch_balance" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."batch_edit_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."batch_edit_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."batch_edit_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_usage_summary" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_usage_summary" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_usage_summary" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."locations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."locations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."locations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."demo_data_stats" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."demo_data_stats" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."demo_data_stats" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."drivers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."drivers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."drivers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hourly_usage_breakdown" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hourly_usage_breakdown" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hourly_usage_breakdown" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."item_suppliers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."item_suppliers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."item_suppliers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_deliveries" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_deliveries" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_deliveries" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles_with_email" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles_with_email" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles_with_email" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reorder_policies" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reorder_policies" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reorder_policies" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_balance_detail" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_balance_detail" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_balance_detail" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_requests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_requests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."stock_requests" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_barcode_mappings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_barcode_mappings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."supplier_barcode_mappings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_cargo" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_cargo" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_cargo" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_requests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_requests" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_requests" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_stops" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_stops" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trip_stops" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips_with_stops" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips_with_stops" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips_with_stops" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."vehicles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."vehicles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."vehicles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips_with_totals" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips_with_totals" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trips_with_totals" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."usage_notifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."usage_notifications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."usage_notifications" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_invitations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_invitations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_invitations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_push_tokens" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."zones" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."zones" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."zones" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";































