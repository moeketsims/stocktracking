-- Add Driver Role Migration
-- This migration adds 'driver' as a new user role in the system

-- ============================================
-- 1. Update user_invitations table constraint
-- ============================================

-- Drop the old constraint
ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_role_check;

-- Add new constraint that includes 'driver'
ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check
    CHECK (role IN ('admin', 'zone_manager', 'location_manager', 'driver', 'staff'));

-- ============================================
-- 2. Update is_zone_manager function to recognize driver role
-- ============================================

CREATE OR REPLACE FUNCTION is_zone_manager(check_zone_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_zone_id UUID;
BEGIN
    -- Get the current user's role and zone
    SELECT role, zone_id INTO user_role, user_zone_id
    FROM profiles
    WHERE user_id = auth.uid();

    -- Admin has access to everything
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Zone manager has access to their zone
    IF user_role = 'zone_manager' THEN
        IF check_zone_id IS NULL THEN
            RETURN TRUE;
        END IF;
        RETURN user_zone_id = check_zone_id;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Update has_location_access function
-- ============================================

CREATE OR REPLACE FUNCTION has_location_access(check_location_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_zone_id UUID;
    user_location_id UUID;
    location_zone_id UUID;
BEGIN
    -- Get the current user's profile
    SELECT role, zone_id, location_id INTO user_role, user_zone_id, user_location_id
    FROM profiles
    WHERE user_id = auth.uid();

    -- Admin has access to all locations
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Zone manager has access to all locations in their zone
    IF user_role = 'zone_manager' THEN
        SELECT zone_id INTO location_zone_id
        FROM locations
        WHERE id = check_location_id;

        RETURN user_zone_id = location_zone_id;
    END IF;

    -- Location manager, driver, and staff have access to their assigned location
    IF user_role IN ('location_manager', 'driver', 'staff') THEN
        RETURN user_location_id = check_location_id;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Add comment for documentation
-- ============================================

COMMENT ON COLUMN user_invitations.role IS 'User role: admin, zone_manager, location_manager, driver, or staff. Drivers are responsible for accepting stock requests and making deliveries.';
