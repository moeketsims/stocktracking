-- Migration: KM Submission Enhancements
-- Date: 2026-01-27
-- Description: Add km submission tracking and correction history

-- =====================================================
-- Feature 6: Add km submission tracking to trips table
-- =====================================================

-- Add columns for tracking km submission status
ALTER TABLE trips ADD COLUMN IF NOT EXISTS km_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS km_submitted_at TIMESTAMPTZ;

-- Index for efficiently querying trips awaiting km submission
CREATE INDEX IF NOT EXISTS idx_trips_km_pending ON trips(status, km_submitted)
    WHERE status = 'completed' AND km_submitted = FALSE;

-- =====================================================
-- Feature 4: KM Correction History Table
-- =====================================================

-- Create table for tracking km corrections
CREATE TABLE IF NOT EXISTS km_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    corrected_by UUID NOT NULL REFERENCES profiles(id),
    old_odometer_end DECIMAL(10,1),
    old_vehicle_total_km DECIMAL(10,1),
    new_odometer_end DECIMAL(10,1) NOT NULL,
    new_vehicle_total_km DECIMAL(10,1) NOT NULL,
    distance_difference DECIMAL(10,1) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for querying corrections by trip
CREATE INDEX IF NOT EXISTS idx_km_corrections_trip ON km_corrections(trip_id);

-- Index for querying corrections by vehicle
CREATE INDEX IF NOT EXISTS idx_km_corrections_vehicle ON km_corrections(vehicle_id);

-- Index for querying corrections by corrector
CREATE INDEX IF NOT EXISTS idx_km_corrections_corrected_by ON km_corrections(corrected_by);

-- =====================================================
-- Row Level Security for km_corrections
-- =====================================================

ALTER TABLE km_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and vehicle managers can view all corrections
CREATE POLICY "Admins and vehicle managers can view corrections" ON km_corrections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'vehicle_manager')
        )
    );

-- Policy: Admins and vehicle managers can insert corrections
CREATE POLICY "Admins and vehicle managers can insert corrections" ON km_corrections
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'vehicle_manager')
        )
    );

-- =====================================================
-- Update existing completed trips that have odometer_end
-- to mark them as having km submitted
-- =====================================================

UPDATE trips
SET km_submitted = TRUE,
    km_submitted_at = updated_at
WHERE status = 'completed'
    AND odometer_end IS NOT NULL
    AND km_submitted IS NOT TRUE;
