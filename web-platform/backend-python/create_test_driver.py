"""Create a test driver member."""
import sys
sys.path.insert(0, '/app')

from app.config import get_settings, get_supabase_admin_client
import httpx

settings = get_settings()

# Test driver details
EMAIL = "testdriver@potatostock.com"
PASSWORD = "TestDriver123!"
FULL_NAME = "Test Driver"
ZONE_ID = "a0000000-0000-0000-0000-000000000001"  # Free State zone

print(f"Creating test driver: {EMAIL}")

try:
    # Create auth user via Supabase Auth Admin API
    auth_url = f"{settings.supabase_url}/auth/v1/admin/users"
    headers = {
        "apikey": settings.supabase_service_key,
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "Content-Type": "application/json"
    }

    user_data = {
        "email": EMAIL,
        "password": PASSWORD,
        "email_confirm": True,
        "user_metadata": {
            "full_name": FULL_NAME
        }
    }

    with httpx.Client() as client:
        response = client.post(auth_url, json=user_data, headers=headers)

        if response.status_code == 200:
            user = response.json()
            user_id = user["id"]
            print(f"Created auth user: {user_id}")
        elif response.status_code == 422 and "already been registered" in response.text:
            print("User already exists, fetching existing user...")
            # Get existing user
            list_url = f"{settings.supabase_url}/auth/v1/admin/users"
            list_response = client.get(list_url, headers=headers)
            users = list_response.json().get("users", [])
            user = next((u for u in users if u["email"] == EMAIL), None)
            if user:
                user_id = user["id"]
                print(f"Found existing user: {user_id}")
            else:
                raise Exception("Could not find existing user")
        else:
            raise Exception(f"Failed to create user: {response.status_code} - {response.text}")

    # Create/update profile using the existing client
    supabase = get_supabase_admin_client()

    # Check if profile exists
    existing = supabase.table("profiles").select("id").eq("user_id", user_id).execute()

    profile_data = {
        "user_id": user_id,
        "full_name": FULL_NAME,
        "role": "driver",
        "zone_id": ZONE_ID,
        "is_active": True
    }

    if existing.data:
        # Update existing profile
        result = supabase.table("profiles").eq("user_id", user_id).update(profile_data)
        print(f"Update result: {result.data}, error: {result.error}")
        print("Updated existing profile")
    else:
        # Insert new profile
        result = supabase.table("profiles").insert(profile_data)
        print(f"Insert result: {result.data}, error: {result.error}")
        if result.error:
            raise Exception(f"Failed to create profile: {result.error}")
        print("Created new profile")

    print("\n" + "="*50)
    print("TEST DRIVER CREATED SUCCESSFULLY!")
    print("="*50)
    print(f"Email: {EMAIL}")
    print(f"Password: {PASSWORD}")
    print(f"Role: driver")
    print(f"Zone: Free State")
    print("="*50)

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
