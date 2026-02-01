-- Migration: Add delivery time scheduling fields to stock_requests
-- Date: 2026-01-31
-- Purpose: Enable managers to specify requested delivery time and support time negotiation

-- Add new columns to stock_requests table
ALTER TABLE stock_requests
ADD COLUMN IF NOT EXISTS requested_delivery_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proposed_delivery_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agreed_delivery_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proposal_reason TEXT,
ADD COLUMN IF NOT EXISTS time_confirmed_at TIMESTAMPTZ;

-- Add comment descriptions
COMMENT ON COLUMN stock_requests.requested_delivery_time IS 'When the manager wants the delivery to arrive';
COMMENT ON COLUMN stock_requests.proposed_delivery_time IS 'Alternative time proposed by driver (if they cannot meet requested time)';
COMMENT ON COLUMN stock_requests.agreed_delivery_time IS 'Final agreed delivery time (either original or negotiated)';
COMMENT ON COLUMN stock_requests.proposal_reason IS 'Reason provided by driver for proposing alternative time';
COMMENT ON COLUMN stock_requests.time_confirmed_at IS 'When the delivery time was confirmed/agreed upon';

-- Note: The 'time_proposed' status will be added to the application code
-- as statuses are typically enforced at the application level, not database level
