-- Drivers Management
-- Version: 1.0
-- Date: 2026-01-15
-- Features: Add drivers table for trip assignment

-- ============================================
-- DRIVERS TABLE
-- ============================================

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    license_number VARCHAR(50),
    license_expiry DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT
);

-- Create index for active drivers lookup
CREATE INDEX idx_drivers_active ON drivers(is_active) WHERE is_active = true;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drivers" ON drivers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Managers can manage drivers" ON drivers
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
-- UPDATE TRIPS TABLE
-- ============================================

-- Add driver_id foreign key to trips (keep driver_name for backward compatibility)
ALTER TABLE trips ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;

-- Create index for driver lookup
CREATE INDEX idx_trips_driver_id ON trips(driver_id) WHERE driver_id IS NOT NULL;

-- ============================================
-- UPDATE TRIPS VIEW
-- ============================================

-- Drop and recreate trips_with_totals to include driver info
DROP VIEW IF EXISTS trips_with_totals;
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
    v.model AS vehicle_model,
    fl.name AS from_location_name,
    tl.name AS to_location_name,
    s.name AS supplier_name,
    d.full_name AS driver_full_name,
    d.phone AS driver_phone,
    (SELECT COALESCE(SUM(tc.quantity_kg), 0) FROM trip_cargo tc WHERE tc.trip_id = t.id) AS total_cargo_kg
FROM trips t
LEFT JOIN vehicles v ON v.id = t.vehicle_id
LEFT JOIN locations fl ON fl.id = t.from_location_id
LEFT JOIN locations tl ON tl.id = t.to_location_id
LEFT JOIN suppliers s ON s.id = t.supplier_id
LEFT JOIN drivers d ON d.id = t.driver_id;
