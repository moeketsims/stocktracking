-- Migration: Add proposal_reason column to stock_requests table
-- This column stores the reason why a driver proposed a different delivery time

-- Add proposal_reason column if it doesn't exist
ALTER TABLE stock_requests
ADD COLUMN IF NOT EXISTS proposal_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN stock_requests.proposal_reason IS 'Reason code for why driver proposed different time: vehicle_issue, another_urgent_request, route_conditions, schedule_conflict, other';
