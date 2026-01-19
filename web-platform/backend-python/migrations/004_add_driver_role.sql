-- Migration: Add 'driver' to user_role enum
-- This allows drivers to have proper auth accounts and receive notifications
--
-- Current roles: admin, zone_manager, location_manager, staff
-- Adding: driver

-- Add 'driver' to the user_role enum if using PostgreSQL enum type
-- Note: PostgreSQL requires using ALTER TYPE to add values to an existing enum

-- First, check if the value already exists to make this idempotent
DO $$
BEGIN
    -- Check if 'driver' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'driver' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        -- Add 'driver' to the user_role enum
        ALTER TYPE user_role ADD VALUE 'driver';
    END IF;
END
$$;

-- Alternative: If user_role is stored as VARCHAR with CHECK constraint
-- Uncomment the following if your profiles table uses VARCHAR for role:
/*
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'zone_manager', 'location_manager', 'staff', 'driver'));
*/

COMMENT ON TYPE user_role IS 'User roles: admin, zone_manager, location_manager, staff, driver';
