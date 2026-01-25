#!/usr/bin/env python
"""Quick script to check transactions in database."""
import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.config import get_supabase_admin_client

def main():
    print("Checking transactions in database...")
    supabase = get_supabase_admin_client()

    # Get all transactions
    result = supabase.table("stock_transactions").select(
        "id, type, location_id_from, location_id_to, qty, created_at"
    ).order("created_at", desc=True).limit(20).execute()

    print(f"\nTotal transactions found: {len(result.data or [])}")

    if result.data:
        print("\nRecent transactions:")
        for t in result.data:
            print(f"  - Type: {t['type']}, From: {t['location_id_from']}, To: {t['location_id_to']}, Qty: {t['qty']}")
    else:
        print("\nNo transactions found in database!")

    # Check the specific location
    location_id = "b0000000-0000-0000-0000-000000000005"
    print(f"\n\nChecking for location_id: {location_id}")

    result_from = supabase.table("stock_transactions").select("id, type").eq(
        "location_id_from", location_id
    ).execute()
    print(f"Transactions FROM this location: {len(result_from.data or [])}")

    result_to = supabase.table("stock_transactions").select("id, type").eq(
        "location_id_to", location_id
    ).execute()
    print(f"Transactions TO this location: {len(result_to.data or [])}")

if __name__ == "__main__":
    main()
