-- Migration: Location Stock Thresholds
-- Date: 2026-01-27
-- Description: Add stock threshold settings to locations table for location managers to configure

-- =====================================================
-- Add threshold columns to locations table
-- =====================================================

-- Critical threshold: below this level triggers critical alerts (red)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS critical_stock_threshold INTEGER DEFAULT 20;

-- Low threshold: below this level triggers low stock warnings (amber)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 50;

-- Add comment explaining the thresholds
COMMENT ON COLUMN locations.critical_stock_threshold IS 'Stock level (in bags) below which triggers critical alerts';
COMMENT ON COLUMN locations.low_stock_threshold IS 'Stock level (in bags) below which triggers low stock warnings';

-- =====================================================
-- Update reorder_policies to reference location thresholds
-- (The alert system will now check location thresholds first,
-- then fall back to reorder_policies if set)
-- =====================================================

-- Index for efficient threshold lookups
CREATE INDEX IF NOT EXISTS idx_locations_thresholds ON locations(critical_stock_threshold, low_stock_threshold)
    WHERE critical_stock_threshold IS NOT NULL OR low_stock_threshold IS NOT NULL;
