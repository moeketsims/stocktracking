"""Create a test manager for Bethlehem shop."""
import sys
sys.path.insert(0, '/app')

from app.config import get_supabase_admin_client
from uuid import uuid4
from datetime import datetime

TEST_EMAIL = "bethlehem.manager@test.com"
TEST_PASSWORD = "Test123!"

def main():
    supabase = get_supabase_admin_client()

    # Find Bethlehem shop
    locations = supabase.table("locations").select("id, name, zone_id").ilike("name", "%bethlehem%").execute()

    if not locations.data:
        print("ERROR: Bethlehem shop not found!")
        # List all locations
        all_locs = supabase.table("locations").select("id, name").execute()
        print("\nAvailable locations:")
        for loc in (all_locs.data or []):
            print(f"  - {loc['name']} ({loc['id']})")
        return

    bethlehem = locations.data[0]
    print(f"Found Bethlehem shop: {bethlehem['name']} (ID: {bethlehem['id']})")

    # Check if user already exists by trying to sign in
    try:
        auth = supabase.auth.sign_in_with_password({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if auth.session:
            print(f"\nTest manager already exists!")
            print(f"  Email: {TEST_EMAIL}")
            print(f"  Password: {TEST_PASSWORD}")
            return
    except Exception:
        pass  # User doesn't exist

    # Create auth user
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "email_confirm": True
        })

        if not auth_response.user:
            print(f"ERROR: Failed to create auth user: {auth_response.error}")
            return

        new_user_id = auth_response.user.id
        print(f"Created auth user: {new_user_id}")

        # Create profile
        profile_data = {
            "id": str(uuid4()),
            "user_id": new_user_id,
            "role": "location_manager",
            "zone_id": bethlehem.get("zone_id"),
            "location_id": bethlehem["id"],
            "full_name": "Bethlehem Test Manager",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
        }

        result = supabase.table("profiles").insert(profile_data).execute()
        if result.error:
            print(f"ERROR creating profile: {result.error}")
            return

        print(f"Created profile for Bethlehem manager")

        print(f"\n========================================")
        print(f"Test manager created successfully!")
        print(f"========================================")
        print(f"  Email: {TEST_EMAIL}")
        print(f"  Password: {TEST_PASSWORD}")
        print(f"  Location: {bethlehem['name']}")
        print(f"========================================")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
