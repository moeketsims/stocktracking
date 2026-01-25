#!/usr/bin/env python
"""Diagnostic script to identify why transactions aren't showing in Kitchen page."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.config import get_supabase_admin_client

def main():
    print("=" * 60)
    print("TRANSACTION TRACKING DIAGNOSTIC")
    print("=" * 60)

    supabase = get_supabase_admin_client()

    # 1. Check all transactions
    print("\n1. CHECKING ALL TRANSACTIONS IN DATABASE...")
    all_txns = supabase.table("stock_transactions").select(
        "id, type, location_id_from, location_id_to, qty, created_at"
    ).order("created_at", desc=True).limit(50).execute()

    print(f"   Total transactions: {len(all_txns.data or [])}")

    # Count by type
    types = {}
    for t in (all_txns.data or []):
        types[t['type']] = types.get(t['type'], 0) + 1
    print(f"   By type: {types}")

    # 2. Get unique locations
    locations = set()
    for t in (all_txns.data or []):
        if t.get('location_id_from'):
            locations.add(t['location_id_from'])
        if t.get('location_id_to'):
            locations.add(t['location_id_to'])
    print(f"   Locations with transactions: {locations}")

    # 3. Check user profiles
    print("\n2. CHECKING USER PROFILES...")
    profiles = supabase.table("profiles").select("id, user_id, role, location_id, full_name").execute()
    print(f"   Total profiles: {len(profiles.data or [])}")

    for p in (profiles.data or []):
        loc = p.get('location_id') or 'NULL'
        print(f"   - {p.get('full_name') or 'Unknown'} ({p['role']}): location_id = {loc}")

    # 4. For each location, test the query
    print("\n3. TESTING TRANSACTIONS QUERY PER LOCATION...")
    for location_id in locations:
        print(f"\n   Location: {location_id}")

        # Query FROM
        result_from = supabase.table("stock_transactions").select("id, type").eq(
            "location_id_from", location_id
        ).execute()

        # Query TO
        result_to = supabase.table("stock_transactions").select("id, type").eq(
            "location_id_to", location_id
        ).execute()

        from_count = len(result_from.data or [])
        to_count = len(result_to.data or [])

        # Count types
        from_types = {}
        for t in (result_from.data or []):
            from_types[t['type']] = from_types.get(t['type'], 0) + 1

        to_types = {}
        for t in (result_to.data or []):
            to_types[t['type']] = to_types.get(t['type'], 0) + 1

        print(f"      FROM this location: {from_count} - types: {from_types}")
        print(f"      TO this location: {to_count} - types: {to_types}")

        # Combined (like the API does)
        combined = {t["id"]: t for t in (result_from.data or [])}
        for t in (result_to.data or []):
            combined[t["id"]] = t

        # Filter for kitchen (issue/return only)
        kitchen_txns = [t for t in combined.values() if t['type'] in ('issue', 'return')]
        print(f"      Kitchen transactions (issue+return): {len(kitchen_txns)}")

    # 5. Check if user's location matches transaction locations
    print("\n4. LOCATION MATCHING CHECK...")
    for p in (profiles.data or []):
        user_loc = p.get('location_id')
        if user_loc:
            matching = user_loc in locations
            print(f"   User '{p.get('full_name')}' location {user_loc}: {'✓ HAS transactions' if matching else '✗ NO transactions'}")
        else:
            print(f"   User '{p.get('full_name')}': ✗ NO location_id assigned!")

    # 6. Test the exact API query (without auth)
    print("\n5. TESTING FULL TRANSACTION API QUERY...")
    if locations:
        test_loc = list(locations)[0]
        print(f"   Testing with location_id: {test_loc}")

        select_fields = "*, items(name), profiles!stock_transactions_created_by_fkey(full_name)"

        # Query FROM
        query_from = supabase.table("stock_transactions").select(select_fields)
        query_from = query_from.eq("location_id_from", test_loc)
        result_from = query_from.order("created_at", desc=True).limit(50).execute()

        # Query TO
        query_to = supabase.table("stock_transactions").select(select_fields)
        query_to = query_to.eq("location_id_to", test_loc)
        result_to = query_to.order("created_at", desc=True).limit(50).execute()

        print(f"   FROM query returned: {len(result_from.data or [])} rows")
        print(f"   TO query returned: {len(result_to.data or [])} rows")

        if result_from.data:
            t = result_from.data[0]
            print(f"   Sample transaction: type={t.get('type')}, qty={t.get('qty')}, item={t.get('items')}, profile={t.get('profiles')}")

    print("\n" + "=" * 60)
    print("DIAGNOSIS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
