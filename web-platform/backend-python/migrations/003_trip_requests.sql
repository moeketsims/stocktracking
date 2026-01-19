-- Trip Requests Junction Table Migration
-- Supports many-to-one relationship: Multiple stock requests → One trip

-- ============================================
-- 1. Create trip_requests junction table
-- ============================================

CREATE TABLE IF NOT EXISTS trip_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES trip_stops(id) ON DELETE SET NULL,
    stop_sequence INT NOT NULL DEFAULT 1,
    planned_qty_bags INT NOT NULL CHECK (planned_qty_bags > 0),
    delivered_qty_bags INT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'confirmed', 'partial', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Ensure unique request per trip
    UNIQUE(trip_id, request_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trip_requests_trip ON trip_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_request ON trip_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_stop ON trip_requests(stop_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);

-- Create trigger for updated_at
CREATE TRIGGER update_trip_requests_updated_at
    BEFORE UPDATE ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to trip_requests" ON trip_requests
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON TABLE trip_requests IS 'Junction table linking multiple stock requests to a single trip';
COMMENT ON COLUMN trip_requests.stop_sequence IS 'Order of this delivery in the trip (1 = first stop after pickup)';
COMMENT ON COLUMN trip_requests.planned_qty_bags IS 'Quantity planned for this specific request/delivery';
COMMENT ON COLUMN trip_requests.delivered_qty_bags IS 'Actual quantity delivered (filled after delivery)';
COMMENT ON COLUMN trip_requests.status IS 'Delivery status for this specific request';
