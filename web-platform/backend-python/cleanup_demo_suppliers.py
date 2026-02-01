"""
Cleanup script to remove demo suppliers and keep only one.
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def main():
    # Get all suppliers
    result = supabase.table("suppliers").select("*").order("created_at").execute()
    suppliers = result.data or []

    print(f"\nFound {len(suppliers)} suppliers:")
    for i, s in enumerate(suppliers):
        print(f"  {i+1}. {s['name']} (ID: {s['id'][:8]}...)")

    if len(suppliers) <= 1:
        print("\nOnly one or zero suppliers exist. Nothing to clean up.")
        return

    # Keep the first supplier (oldest), delete the rest
    keep = suppliers[0]
    to_delete = suppliers[1:]

    print(f"\nWill KEEP: {keep['name']}")
    print(f"Will DELETE: {', '.join([s['name'] for s in to_delete])}")

    confirm = input("\nProceed with deletion? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled.")
        return

    # Delete the demo suppliers
    for s in to_delete:
        try:
            supabase.table("suppliers").delete().eq("id", s["id"]).execute()
            print(f"  Deleted: {s['name']}")
        except Exception as e:
            print(f"  Error deleting {s['name']}: {e}")

    print("\nCleanup complete!")

    # Verify
    result = supabase.table("suppliers").select("*").execute()
    print(f"Remaining suppliers: {len(result.data or [])}")

if __name__ == "__main__":
    main()
