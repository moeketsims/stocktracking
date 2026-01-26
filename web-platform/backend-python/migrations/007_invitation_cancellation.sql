-- ============================================
-- Migration: Add cancellation tracking and driver metadata to user_invitations
-- ============================================
-- This migration adds support for:
-- 1. Flagging invitations as cancelled instead of deleting them
-- 2. Storing driver-specific details in invitations (created on acceptance)
-- ============================================

-- Add cancelled_at column to track when invitation was cancelled
ALTER TABLE user_invitations
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add cancelled_by column to track who cancelled the invitation
ALTER TABLE user_invitations
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add driver_metadata column to store driver details until invitation is accepted
-- This stores: phone, license_number, license_expiry, notes
ALTER TABLE user_invitations
ADD COLUMN IF NOT EXISTS driver_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN user_invitations.cancelled_at IS 'Timestamp when invitation was cancelled (null if not cancelled)';
COMMENT ON COLUMN user_invitations.cancelled_by IS 'UUID of the profile that cancelled this invitation';
COMMENT ON COLUMN user_invitations.driver_metadata IS 'JSON object storing driver-specific details (phone, license_number, license_expiry, notes) until invitation is accepted';

-- Create index for filtering cancelled invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_cancelled_at ON user_invitations(cancelled_at);

-- Remove driver_id foreign key constraint if it exists (drivers are now created on acceptance)
ALTER TABLE user_invitations
DROP COLUMN IF EXISTS driver_id;
