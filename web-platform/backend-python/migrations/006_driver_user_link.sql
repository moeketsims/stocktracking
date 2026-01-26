-- Migration: 006_driver_user_link.sql
-- Description: Links drivers table with user accounts for unified onboarding

-- 1. Add email column to drivers table (required for sending invitations)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add user_id column to link driver to their user profile after invitation acceptance
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Add invitation_id column to link driver to their pending invitation
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES user_invitations(id);

-- 4. Add driver_id column to user_invitations to link back to driver record
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id);

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_driver_id ON user_invitations(driver_id);

-- 6. Add comments for documentation
COMMENT ON COLUMN drivers.email IS 'Email address for sending invitation and linking to user account';
COMMENT ON COLUMN drivers.user_id IS 'Links to auth.users after driver accepts invitation and creates account';
COMMENT ON COLUMN drivers.invitation_id IS 'Links to pending invitation before acceptance';
COMMENT ON COLUMN user_invitations.driver_id IS 'Links invitation to driver record for automatic linking on acceptance';
