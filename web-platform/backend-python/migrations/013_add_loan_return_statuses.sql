-- Migration: Add new loan return statuses
-- These support the enhanced return flow with driver assignment and acceptance

-- Add new enum values for the return flow
-- return_initiated: Borrower clicked "Start Return"
-- return_assigned: Driver assigned to return trip (trip is 'planned')
-- return_in_progress: Driver accepted the return assignment and is en route

ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'return_initiated' AFTER 'active';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'return_assigned' AFTER 'return_initiated';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'return_in_progress' AFTER 'return_assigned';

-- Add driver_confirmed_at column to track when driver accepted the return
ALTER TABLE loans ADD COLUMN IF NOT EXISTS driver_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN loans.driver_confirmed_at IS 'Timestamp when the driver accepted the return assignment';
