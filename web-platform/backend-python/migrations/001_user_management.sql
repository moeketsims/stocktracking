-- User Management System Migration
-- Run this migration against your Supabase database

-- ============================================
-- 1. Add new columns to profiles table
-- ============================================

-- Add is_active column for soft delete (default true for existing users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add created_by column to track who created the user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add updated_at column for tracking modifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add phone column for contact info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Update existing rows to have is_active = true
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- ============================================
-- 2. Create user_invitations table
-- ============================================

CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'zone_manager', 'location_manager', 'staff')),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    invited_by UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);

-- Create index on email for checking existing invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);

-- ============================================
-- 3. Create function to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. RLS Policies for user_invitations
-- ============================================

-- Enable RLS on the table
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend API)
CREATE POLICY "Service role has full access to invitations" ON user_invitations
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 5. Add comment for documentation
-- ============================================

COMMENT ON TABLE user_invitations IS 'Stores pending user invitations with tokens for invite-only signup flow';
COMMENT ON COLUMN user_invitations.token IS 'Unique token sent via email for accepting invitation';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation expiry time (default 7 days from creation)';
COMMENT ON COLUMN user_invitations.accepted_at IS 'Timestamp when user accepted the invitation and created account';
COMMENT ON COLUMN profiles.is_active IS 'Soft delete flag - false means user is deactivated';
COMMENT ON COLUMN profiles.created_by IS 'UUID of the profile that created this user (via invitation)';
