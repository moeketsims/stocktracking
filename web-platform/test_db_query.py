import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend-python'))

from app.config import get_supabase_admin_client

def test_query():
    supabase = get_supabase_admin_client()
    driver_id = "f4baec05-5581-4b7c-8baf-873bd1938a3b"
    
    print(f"Querying drivers for id: {driver_id}")
    result = supabase.table("drivers").select("*").eq("id", driver_id).execute()
    print(f"Drivers result: {result.data}")
    
    print(f"Querying profiles for id: {driver_id}")
    result_p = supabase.table("profiles").select("*").eq("id", driver_id).execute()
    print(f"Profiles result: {result_p.data}")

if __name__ == "__main__":
    test_query()
