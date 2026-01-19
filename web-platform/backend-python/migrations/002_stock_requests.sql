-- Stock Requests & Pending Deliveries Migration
-- Implements the stock replenishment workflow

-- ============================================
-- 1. Create stock_requests table
-- ============================================

CREATE TABLE IF NOT EXISTS stock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quantity_bags INT NOT NULL CHECK (quantity_bags > 0),
    urgency VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'trip_created', 'in_delivery', 'fulfilled', 'cancelled', 'partially_fulfilled', 'expired')),
    accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    notes TEXT,
    current_stock_kg FLOAT,
    target_stock_kg FLOAT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_requests_location ON stock_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);
CREATE INDEX IF NOT EXISTS idx_stock_requests_requested_by ON stock_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_stock_requests_accepted_by ON stock_requests(accepted_by);
CREATE INDEX IF NOT EXISTS idx_stock_requests_created_at ON stock_requests(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_stock_requests_updated_at
    BEFORE UPDATE ON stock_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Create pending_deliveries table
-- ============================================

CREATE TABLE IF NOT EXISTS pending_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    trip_stop_id UUID REFERENCES trip_stops(id) ON DELETE SET NULL,
    request_id UUID REFERENCES stock_requests(id) ON DELETE SET NULL,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    driver_claimed_qty_kg FLOAT NOT NULL CHECK (driver_claimed_qty_kg >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    confirmed_qty_kg FLOAT,
    confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    discrepancy_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for pending_deliveries
CREATE INDEX IF NOT EXISTS idx_pending_deliveries_trip ON pending_deliveries(trip_id);
CREATE INDEX IF NOT EXISTS idx_pending_deliveries_location ON pending_deliveries(location_id);
CREATE INDEX IF NOT EXISTS idx_pending_deliveries_status ON pending_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_pending_deliveries_request ON pending_deliveries(request_id);

-- Create trigger for updated_at
CREATE TRIGGER update_pending_deliveries_updated_at
    BEFORE UPDATE ON pending_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Add request_id to trips table
-- ============================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES stock_requests(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_trips_request ON trips(request_id);

-- ============================================
-- 4. Add request_id to stock_batches table
-- ============================================

ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES stock_requests(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_stock_batches_request ON stock_batches(request_id);

-- ============================================
-- 5. RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access to stock_requests
CREATE POLICY "Service role has full access to stock_requests" ON stock_requests
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role has full access to pending_deliveries
CREATE POLICY "Service role has full access to pending_deliveries" ON pending_deliveries
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 6. Add comments for documentation
-- ============================================

COMMENT ON TABLE stock_requests IS 'Stores stock replenishment requests from store managers';
COMMENT ON COLUMN stock_requests.quantity_bags IS 'Number of bags requested (1 bag = 10 kg)';
COMMENT ON COLUMN stock_requests.urgency IS 'Request urgency: urgent (today) or normal (within 3 days)';
COMMENT ON COLUMN stock_requests.status IS 'Request lifecycle status';
COMMENT ON COLUMN stock_requests.accepted_by IS 'Driver who accepted the request';
COMMENT ON COLUMN stock_requests.trip_id IS 'Linked trip once created by driver';

COMMENT ON TABLE pending_deliveries IS 'Tracks deliveries awaiting confirmation from store managers';
COMMENT ON COLUMN pending_deliveries.driver_claimed_qty_kg IS 'Quantity the driver claims to have delivered';
COMMENT ON COLUMN pending_deliveries.confirmed_qty_kg IS 'Quantity confirmed by store manager';
COMMENT ON COLUMN pending_deliveries.discrepancy_notes IS 'Notes explaining any difference between claimed and confirmed quantities';
