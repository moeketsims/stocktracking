"""Test script to check stock_batches state in Supabase"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(url, key)

print("=" * 50)
print("Checking stock_batches table...")
print("=" * 50)

try:
    batches = supabase.table("stock_batches").select("*").limit(10).execute()
    if batches.data:
        print(f"Found {len(batches.data)} batches:")
        for b in batches.data:
            print(f"  - ID: {b['id'][:8]}... | Location: {b.get('location_id', 'N/A')[:8]}... | Qty: {b.get('remaining_qty', 0)} | Item: {b.get('item_id', 'N/A')[:8]}...")
    else:
        print("No batches found in stock_batches table!")
except Exception as e:
    print(f"Error querying stock_batches: {e}")

print("\n" + "=" * 50)
print("Checking stock_transactions table...")
print("=" * 50)

try:
    txns = supabase.table("stock_transactions").select("*").eq("type", "receive").order("created_at", desc=True).limit(5).execute()
    if txns.data:
        print(f"Found {len(txns.data)} receive transactions:")
        for t in txns.data:
            print(f"  - ID: {t['id'][:8]}... | Location TO: {t.get('location_id_to', 'N/A')} | Qty: {t.get('qty', 0)} | Created: {t.get('created_at', 'N/A')}")
    else:
        print("No receive transactions found!")
except Exception as e:
    print(f"Error querying stock_transactions: {e}")

print("\n" + "=" * 50)
print("Checking items table...")
print("=" * 50)

try:
    items = supabase.table("items").select("id, name").limit(5).execute()
    if items.data:
        print(f"Found {len(items.data)} items:")
        for i in items.data:
            print(f"  - {i['name']} (ID: {i['id'][:8]}...)")
    else:
        print("No items found! Stock receive will fail without items.")
except Exception as e:
    print(f"Error querying items: {e}")

print("\n" + "=" * 50)
print("Checking stock_balance view...")
print("=" * 50)

try:
    balance = supabase.table("stock_balance").select("*").limit(10).execute()
    if balance.data:
        print(f"Found {len(balance.data)} balance records:")
        for b in balance.data:
            print(f"  - Location: {b.get('location_id', 'N/A')[:8]}... | Item: {b.get('item_id', 'N/A')[:8]}... | On Hand: {b.get('on_hand_qty', 0)}")
    else:
        print("No data in stock_balance view!")
except Exception as e:
    print(f"Error querying stock_balance: {e}")

print("\nDone!")
