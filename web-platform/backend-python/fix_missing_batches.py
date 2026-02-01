"""
Fix missing stock batches.

This script creates stock_batches records for any stock_balance entries
that don't have corresponding batches. This fixes the issue where withdrawals
are logged but don't decrease the stock total.
"""
import sys
sys.path.insert(0, '/app')

from uuid import uuid4
from datetime import datetime
from app.config import get_supabase_admin_client

print("="*60)
print("FIX MISSING STOCK BATCHES")
print("="*60)

supabase = get_supabase_admin_client()

# 1. Get all stock_balance entries
print("\n[1] Fetching stock_balance entries...")
balances = supabase.table("stock_balance").select("*").execute()

if not balances.data:
    print("No stock_balance entries found. Nothing to fix.")
    sys.exit(0)

print(f"Found {len(balances.data)} stock_balance entries")

# 2. Check each balance for missing batches
fixes_needed = []

for balance in balances.data:
    location_id = balance["location_id"]
    item_id = balance["item_id"]
    on_hand_qty = balance.get("on_hand_qty", 0)

    if on_hand_qty <= 0:
        continue  # Skip zero balances

    # Check if batches exist for this location/item
    batches = supabase.table("stock_batches").select("id, remaining_qty").eq(
        "location_id", location_id
    ).eq("item_id", item_id).gt("remaining_qty", 0).execute()

    batch_total = sum(b["remaining_qty"] for b in (batches.data or []))

    if batch_total == 0:
        # No batches - need to create one
        fixes_needed.append({
            "location_id": location_id,
            "item_id": item_id,
            "on_hand_qty": on_hand_qty
        })
        print(f"  - Location {location_id[:8]}... Item {item_id[:8]}...: {on_hand_qty} kg in balance, NO batches")
    else:
        print(f"  - Location {location_id[:8]}... Item {item_id[:8]}...: OK ({batch_total} kg in batches)")

if not fixes_needed:
    print("\n" + "="*60)
    print("ALL GOOD! No missing batches found.")
    print("="*60)
    sys.exit(0)

# 3. Create missing batches
print(f"\n[2] Creating {len(fixes_needed)} missing batches...")

for fix in fixes_needed:
    batch_id = str(uuid4())
    batch_data = {
        "id": batch_id,
        "item_id": fix["item_id"],
        "location_id": fix["location_id"],
        "initial_qty": fix["on_hand_qty"],
        "remaining_qty": fix["on_hand_qty"],
        "received_at": datetime.utcnow().isoformat(),
        "quality_score": 1,
        "status": "available",
        "notes": "Auto-created to fix missing batch data"
    }

    result = supabase.table("stock_batches").insert(batch_data).execute()

    if result.data:
        print(f"  Created batch {batch_id[:8]}... for location {fix['location_id'][:8]}... with {fix['on_hand_qty']} kg")
    else:
        print(f"  ERROR creating batch for location {fix['location_id'][:8]}...")

print("\n" + "="*60)
print(f"DONE! Created {len(fixes_needed)} batches.")
print("Kitchen withdrawals should now decrease stock correctly.")
print("="*60)
