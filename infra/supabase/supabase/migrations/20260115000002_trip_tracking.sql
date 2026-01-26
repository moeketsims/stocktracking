-- Trip/Delivery Tracking Schema
-- Version: 1.0
-- Date: 2026-01-15
-- Features: Vehicle management, Trip logging, Cost tracking (fuel, tolls)

-- ============================================
-- NEW ENUMS
-- ============================================

-- Trip status enum
CREATE TYPE trip_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- ============================================
-- VEHICLES TABLE
-- ============================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    make VARCHAR(100),
    model VARCHAR(100),
    fuel_type VARCHAR(20) DEFAULT 'diesel',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT
);

-- ============================================
-- TRIPS TABLE
-- ============================================

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_name VARCHAR(200) NOT NULL,
    status trip_status DEFAULT 'planned' NOT NULL,

    -- Route info
    origin_description TEXT,
    destination_description TEXT,

    -- Timing
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,

    -- Costs
    fuel_cost DECIMAL(10,2) DEFAULT 0 NOT NULL,
    fuel_litres DECIMAL(10,2),
    toll_cost DECIMAL(10,2) DEFAULT 0 NOT NULL,
    other_cost DECIMAL(10,2) DEFAULT 0 NOT NULL,
    other_cost_description TEXT,

    -- Distance tracking
    odometer_start DECIMAL(10,1),
    odometer_end DECIMAL(10,1),

    -- Links to received batches
    linked_batch_ids UUID[] DEFAULT '{}',

    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT
);

-- ============================================
-- COMPUTED COLUMNS VIA VIEW
-- ============================================

CREATE VIEW trips_with_totals AS
SELECT
    t.*,
    (t.fuel_cost + t.toll_cost + t.other_cost) AS total_cost,
    CASE
        WHEN t.odometer_start IS NOT NULL AND t.odometer_end IS NOT NULL
        THEN t.odometer_end - t.odometer_start
        ELSE NULL
    END AS distance_km,
    v.registration_number AS vehicle_registration,
    v.make AS vehicle_make,
    v.model AS vehicle_model
FROM trips t
LEFT JOIN vehicles v ON v.id = t.vehicle_id;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_vehicles_active ON vehicles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX idx_trips_driver ON trips(driver_name);

-- ============================================
-- HELPER FUNCTION: Generate Trip Number
-- ============================================

CREATE OR REPLACE FUNCTION generate_trip_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- COST SUMMARY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_trip_cost_summary(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_vehicle_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_trips BIGINT,
    total_fuel_cost DECIMAL,
    total_toll_cost DECIMAL,
    total_other_cost DECIMAL,
    total_cost DECIMAL,
    total_distance DECIMAL,
    avg_cost_per_trip DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Vehicles: Everyone can view active vehicles
CREATE POLICY "Authenticated users can view vehicles" ON vehicles
    FOR SELECT TO authenticated
    USING (true);

-- Vehicles: Managers can manage vehicles
CREATE POLICY "Managers can manage vehicles" ON vehicles
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

-- Trips: Everyone can view trips
CREATE POLICY "Authenticated users can view trips" ON trips
    FOR SELECT TO authenticated
    USING (true);

-- Trips: Managers can manage trips
CREATE POLICY "Managers can manage trips" ON trips
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
-- SAMPLE VEHICLES (for quick start)
-- ============================================

-- INSERT INTO vehicles (registration_number, make, model, fuel_type, notes)
-- VALUES
--     ('ABC-123-GP', 'Toyota', 'Hilux', 'diesel', 'Primary delivery vehicle'),
--     ('XYZ-456-GP', 'Isuzu', 'KB250', 'diesel', 'Backup vehicle');
