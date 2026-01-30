-- Migration: Add estimated_arrival_time column to trips table
-- This allows drivers to provide an estimated time of arrival when starting a trip

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS estimated_arrival_time TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN trips.estimated_arrival_time IS 'Estimated time of arrival at destination, set by driver when starting trip';
