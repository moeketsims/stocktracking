import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

try:
    # Query to get column names from information_schema
    # This might not work if the user is using a restricted key, 
    # but since it's the SERVICE_KEY it should work if we use an RPC or direct SQL.
    # However, Supabase client doesn't support direct SQL easily.
    # We can try to select one row and look at keys.
    result = supabase.table("trips").select("*").limit(1).execute()
    if result.data:
        print(f"Columns in 'trips': {list(result.data[0].keys())}")
    else:
        print("No rows in 'trips' table to check columns.")
except Exception as e:
    print(f"Error checking schema: {e}")
