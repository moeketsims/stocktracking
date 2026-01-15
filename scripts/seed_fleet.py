"""
Seed script to add mock vehicles and drivers data.
Run with: python scripts/seed_fleet.py

Requires environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)
"""
import os
import sys

# Add the backend path to import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web-platform', 'backend-python'))

from app.config import get_supabase_admin_client

# SQL to create the drivers table if it doesn't exist
DRIVERS_TABLE_SQL = """
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') THEN
        CREATE TABLE drivers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name VARCHAR(200) NOT NULL,
            phone VARCHAR(20),
            license_number VARCHAR(50),
            license_expiry DATE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            notes TEXT
        );

        CREATE INDEX idx_drivers_active ON drivers(is_active) WHERE is_active = true;

        ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Service role bypass for drivers" ON drivers FOR ALL TO service_role USING (true);
    END IF;

    -- Add driver_id column to trips if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'trips'
        AND column_name = 'driver_id'
    ) THEN
        ALTER TABLE trips ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;
        CREATE INDEX idx_trips_driver_id ON trips(driver_id) WHERE driver_id IS NOT NULL;
    END IF;
END $$;
"""


def ensure_tables(supabase):
    """Ensure drivers table and trip.driver_id column exist."""
    try:
        # Execute raw SQL via the postgrest-py rpc call
        result = supabase.rpc('exec_sql', {'query': DRIVERS_TABLE_SQL}).execute()
        print("  Tables ensured")
        return True
    except Exception as e:
        print(f"  Note: Could not run setup SQL via RPC (this is expected): {e}")
        # Tables might already exist, continue anyway
        return False


def seed_vehicles(supabase):
    """Insert sample vehicles."""
    vehicles = [
        {
            'registration_number': 'CF 123 456',
            'make': 'Toyota',
            'model': 'Hilux',
            'fuel_type': 'diesel',
            'is_active': True,
            'notes': 'Primary delivery vehicle'
        },
        {
            'registration_number': 'GP 789 012',
            'make': 'Isuzu',
            'model': 'KB250',
            'fuel_type': 'diesel',
            'is_active': True,
            'notes': 'Secondary delivery vehicle'
        },
        {
            'registration_number': 'NW 345 678',
            'make': 'Ford',
            'model': 'Ranger',
            'fuel_type': 'diesel',
            'is_active': True,
            'notes': 'Long distance trips'
        },
        {
            'registration_number': 'FS 901 234',
            'make': 'Nissan',
            'model': 'NP300',
            'fuel_type': 'diesel',
            'is_active': True,
            'notes': 'Backup vehicle'
        },
        {
            'registration_number': 'MP 567 890',
            'make': 'Toyota',
            'model': 'Quantum',
            'fuel_type': 'diesel',
            'is_active': False,
            'notes': 'Under maintenance'
        },
    ]

    inserted = 0
    for vehicle in vehicles:
        try:
            # Check if vehicle already exists
            existing = supabase.table('vehicles').select('id').eq(
                'registration_number', vehicle['registration_number']
            ).execute()

            if not existing.data:
                supabase.table('vehicles').insert(vehicle).execute()
                print(f"  + Added vehicle: {vehicle['registration_number']} ({vehicle['make']} {vehicle['model']})")
                inserted += 1
            else:
                print(f"  - Vehicle already exists: {vehicle['registration_number']}")
        except Exception as e:
            print(f"  ! Error adding vehicle {vehicle['registration_number']}: {e}")

    return inserted


def seed_drivers(supabase):
    """Insert sample drivers."""
    drivers = [
        {
            'full_name': 'Thabo Mokoena',
            'phone': '082 123 4567',
            'license_number': 'DL2024001234',
            'license_expiry': '2027-06-15',
            'is_active': True,
            'notes': 'Senior driver, 5 years experience'
        },
        {
            'full_name': 'Sipho Ndlovu',
            'phone': '083 234 5678',
            'license_number': 'DL2023005678',
            'license_expiry': '2026-03-20',
            'is_active': True,
            'notes': 'Experienced in long-distance routes'
        },
        {
            'full_name': 'Johannes van der Merwe',
            'phone': '084 345 6789',
            'license_number': 'DL2022009012',
            'license_expiry': '2025-12-01',
            'is_active': True,
            'notes': 'Specializes in warehouse deliveries'
        },
        {
            'full_name': 'Blessing Mthembu',
            'phone': '085 456 7890',
            'license_number': 'DL2024003456',
            'license_expiry': '2028-01-10',
            'is_active': True,
            'notes': 'New driver, completed training'
        },
        {
            'full_name': 'Peter Molefe',
            'phone': '086 567 8901',
            'license_number': 'DL2021007890',
            'license_expiry': '2025-02-28',
            'is_active': False,
            'notes': 'On extended leave'
        },
    ]

    inserted = 0
    for driver in drivers:
        try:
            # Check if driver already exists by name
            existing = supabase.table('drivers').select('id').eq(
                'full_name', driver['full_name']
            ).execute()

            if not existing.data:
                supabase.table('drivers').insert(driver).execute()
                print(f"  + Added driver: {driver['full_name']} ({driver['phone']})")
                inserted += 1
            else:
                print(f"  - Driver already exists: {driver['full_name']}")
        except Exception as e:
            print(f"  ! Error adding driver {driver['full_name']}: {e}")

    return inserted


def main():
    print("\n=== Fleet Seed Data Script ===\n")

    try:
        supabase = get_supabase_admin_client()
        print("Connected to Supabase\n")
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

    print("Ensuring tables exist...")
    ensure_tables(supabase)

    print("\nAdding vehicles...")
    vehicles_added = seed_vehicles(supabase)

    print("\nAdding drivers...")
    drivers_added = seed_drivers(supabase)

    print(f"\n=== Done ===")
    print(f"Vehicles added: {vehicles_added}")
    print(f"Drivers added: {drivers_added}")
    print()


if __name__ == '__main__':
    main()
