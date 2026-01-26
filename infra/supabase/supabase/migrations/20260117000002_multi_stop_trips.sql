-- ============================================
-- Multi-Stop Trips Feature
-- Allows trips with multiple pickup/dropoff locations
-- ============================================

-- ============================================
-- TRIP STOPS TABLE
-- ============================================

CREATE TYPE stop_type AS ENUM ('pickup', 'dropoff');

CREATE TABLE trip_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL CHECK (stop_order > 0),

    -- Location (either supplier or internal location)
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

    -- Stop details
    stop_type stop_type NOT NULL,
    location_name TEXT, -- Cached name for display

    -- Quantities (in kg)
    planned_qty_kg DECIMAL(10,2),
    actual_qty_kg DECIMAL(10,2),

    -- Timing
    arrived_at TIMESTAMPTZ,
    departed_at TIMESTAMPTZ,

    -- Status
    is_completed BOOLEAN DEFAULT FALSE,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure either location_id or supplier_id is set
    CONSTRAINT valid_stop_location CHECK (
        (location_id IS NOT NULL AND supplier_id IS NULL) OR
        (location_id IS NULL AND supplier_id IS NOT NULL)
    ),

    -- Unique stop order per trip
    UNIQUE(trip_id, stop_order)
);

-- Indexes
CREATE INDEX idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX idx_trip_stops_location ON trip_stops(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_trip_stops_supplier ON trip_stops(supplier_id) WHERE supplier_id IS NOT NULL;

-- ============================================
-- ADD is_multi_stop FLAG TO TRIPS
-- ============================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_multi_stop BOOLEAN DEFAULT FALSE;

-- ============================================
-- HELPER VIEW: Trips with stops summary
-- ============================================

CREATE OR REPLACE VIEW trips_with_stops AS
SELECT
    t.*,
    (SELECT COUNT(*) FROM trip_stops ts WHERE ts.trip_id = t.id) AS total_stops,
    (SELECT COUNT(*) FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.is_completed = true) AS completed_stops,
    (SELECT COALESCE(SUM(ts.planned_qty_kg), 0) FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.stop_type = 'pickup') AS total_pickup_kg,
    (SELECT COALESCE(SUM(ts.planned_qty_kg), 0) FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.stop_type = 'dropoff') AS total_dropoff_kg,
    (SELECT STRING_AGG(
        COALESCE(ts.location_name, l.name, s.name), ' → ' ORDER BY ts.stop_order
    ) FROM trip_stops ts
    LEFT JOIN locations l ON l.id = ts.location_id
    LEFT JOIN suppliers s ON s.id = ts.supplier_id
    WHERE ts.trip_id = t.id) AS route_summary
FROM trips t;

-- ============================================
-- FUNCTION: Create multi-stop trip
-- ============================================

CREATE OR REPLACE FUNCTION create_multi_stop_trip(
    p_vehicle_id UUID,
    p_driver_id UUID,
    p_driver_name TEXT,
    p_created_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_stops JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- FUNCTION: Complete a stop
-- ============================================

CREATE OR REPLACE FUNCTION complete_trip_stop(
    p_stop_id UUID,
    p_actual_qty_kg DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trip stops" ON trip_stops
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Managers can manage trip stops" ON trip_stops
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );

-- ============================================
-- GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION create_multi_stop_trip TO authenticated;
GRANT EXECUTE ON FUNCTION complete_trip_stop TO authenticated;
