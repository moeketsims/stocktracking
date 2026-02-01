-- Migration: Add proposal-related columns to stock_requests table
-- Required for the driver counter-proposal feature (Phase 3)

-- Add proposed_delivery_time column (driver's proposed alternative time)
ALTER TABLE stock_requests
ADD COLUMN IF NOT EXISTS proposed_delivery_time TIMESTAMPTZ;

-- Add agreed_delivery_time column (final agreed time after proposal accepted)
ALTER TABLE stock_requests
ADD COLUMN IF NOT EXISTS agreed_delivery_time TIMESTAMPTZ;

-- Add proposal_reason column (why driver proposed different time)
ALTER TABLE stock_requests
ADD COLUMN IF NOT EXISTS proposal_reason TEXT;

-- Add time_confirmed_at column (when time was confirmed)
ALTER TABLE stock_requests
ADD COLUMN IF NOT EXISTS time_confirmed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN stock_requests.proposed_delivery_time IS 'Alternative delivery time proposed by the driver';
COMMENT ON COLUMN stock_requests.agreed_delivery_time IS 'Final agreed delivery time after proposal is accepted';
COMMENT ON COLUMN stock_requests.proposal_reason IS 'Reason code: vehicle_issue, another_urgent_request, route_conditions, schedule_conflict, other';
COMMENT ON COLUMN stock_requests.time_confirmed_at IS 'Timestamp when the delivery time was confirmed';
