-- Trip-Stock Integration Schema
-- Version: 1.0
-- Date: 2026-01-15
-- Features: Link trips to stock movements, delivery cost tracking

-- ============================================
-- TRIP TYPE ENUM
-- ============================================

-- Define the type of trip for better categorization
CREATE TYPE trip_type AS ENUM (
    'supplier_to_warehouse',    -- Collecting from supplier to warehouse
    'supplier_to_shop',         -- Direct delivery from supplier to shop
    'warehouse_to_shop',        -- Distribution from warehouse to shops
    'shop_to_shop',             -- Rebalancing between shops
    'shop_to_warehouse',        -- Returning excess stock to warehouse
    'other'                     -- Miscellaneous trips
);

-- Add trip_type column to trips table
ALTER TABLE trips ADD COLUMN trip_type trip_type DEFAULT 'other';

-- Add from/to location references for better tracking
ALTER TABLE trips ADD COLUMN from_location_id UUID REFERENCES locations(id);
ALTER TABLE trips ADD COLUMN to_location_id UUID REFERENCES locations(id);
ALTER TABLE trips ADD COLUMN supplier_id UUID REFERENCES suppliers(id);

-- ============================================
-- LINK TRIPS TO STOCK TRANSACTIONS
-- ============================================

-- Add trip reference to stock transactions
ALTER TABLE stock_transactions ADD COLUMN trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_transactions_trip_id ON stock_transactions(trip_id) WHERE trip_id IS NOT NULL;

-- ============================================
-- DELIVERY COST TRACKING ON BATCHES
-- ============================================

-- Add delivery cost per kg to batches (calculated from trip)
ALTER TABLE stock_batches ADD COLUMN delivery_cost_per_kg DECIMAL(10,4);
ALTER TABLE stock_batches ADD COLUMN trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- ============================================
-- TRIP CARGO TRACKING
-- ============================================

-- Table to track what was carried on each trip (for multi-stop trips)
CREATE TABLE trip_cargo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES stock_transactions(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity_kg DECIMAL(10,2) NOT NULL,
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_trip_cargo_trip_id ON trip_cargo(trip_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate and update delivery cost per kg for a trip
CREATE OR REPLACE FUNCTION calculate_trip_delivery_cost(p_trip_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- UPDATED VIEWS
-- ============================================

-- Drop and recreate trips_with_totals to include new fields
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
    (SELECT COALESCE(SUM(tc.quantity_kg), 0) FROM trip_cargo tc WHERE tc.trip_id = t.id) AS total_cargo_kg
FROM trips t
LEFT JOIN vehicles v ON v.id = t.vehicle_id
LEFT JOIN locations fl ON fl.id = t.from_location_id
LEFT JOIN locations tl ON tl.id = t.to_location_id
LEFT JOIN suppliers s ON s.id = t.supplier_id;

-- ============================================
-- RLS POLICIES FOR NEW TABLE
-- ============================================

ALTER TABLE trip_cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trip cargo" ON trip_cargo
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Managers can manage trip cargo" ON trip_cargo
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
