#!/usr/bin/env python3
"""Add driver role to user_role enum via direct SQL execution."""

import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY not found in environment")
    exit(1)

# The SQL to add driver role
sql = "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver'"

# Try via RPC (if exec_sql function exists)
url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

try:
    response = httpx.post(url, headers=headers, json={"sql_query": sql}, timeout=30)
    print(f"RPC Response: {response.status_code}")
    print(response.text)
except Exception as e:
    print(f"RPC Error: {e}")
    print("The exec_sql function may not exist. Please run the SQL manually in Supabase Studio.")
    print(f"\nSQL to run:\n{sql}")
