"""
Verification script to check mock data quality.
Run with: python scripts/verify_mock_data.py
"""
import os
import sys
from collections import defaultdict, Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web-platform', 'backend-python'))

from app.config import get_supabase_admin_client


def main():
    print("\n" + "=" * 60)
    print("MOCK DATA VERIFICATION REPORT")
    print("=" * 60)

    supabase = get_supabase_admin_client()

    # 1. Trip Statistics
    print("\n1. TRIP STATISTICS")
    print("-" * 40)

    trips = supabase.table('trips').select('*').execute()
    if trips.data:
        print(f"   Total trips: {len(trips.data)}")

        # By status
        status_counts = Counter(t['status'] for t in trips.data)
        print("\n   By Status:")
        for status, count in status_counts.most_common():
            print(f"      {status}: {count}")

        # By type
        type_counts = Counter(t.get('trip_type', 'unknown') for t in trips.data)
        print("\n   By Type:")
        for trip_type, count in type_counts.most_common():
            pct = count / len(trips.data) * 100
            print(f"      {trip_type or 'unknown'}: {count} ({pct:.1f}%)")

        # Cost summary for completed trips
        completed = [t for t in trips.data if t['status'] == 'completed']
        if completed:
            total_fuel = sum(float(t.get('fuel_cost') or 0) for t in completed)
            total_toll = sum(float(t.get('toll_cost') or 0) for t in completed)
            total_other = sum(float(t.get('other_cost') or 0) for t in completed)
            print(f"\n   Completed Trip Costs:")
            print(f"      Fuel: R{total_fuel:,.2f}")
            print(f"      Tolls: R{total_toll:,.2f}")
            print(f"      Other: R{total_other:,.2f}")
            print(f"      Total: R{total_fuel + total_toll + total_other:,.2f}")
    else:
        print("   No trips found!")

    # 2. Stock Batch Statistics
    print("\n2. STOCK BATCH STATISTICS")
    print("-" * 40)

    batches = supabase.table('stock_batches').select('*').execute()
    if batches.data:
        print(f"   Total batches: {len(batches.data)}")

        # With trip linkage
        linked = len([b for b in batches.data if b.get('trip_id')])
        print(f"   Linked to trips: {linked} ({linked/len(batches.data)*100:.1f}%)")

        # By quality score
        quality_counts = Counter(b.get('quality_score', 0) for b in batches.data)
        print("\n   By Quality Score:")
        for score, count in sorted(quality_counts.items()):
            label = {1: 'Good', 2: 'Acceptable', 3: 'Poor'}.get(score, 'Unknown')
            pct = count / len(batches.data) * 100
            print(f"      {score} ({label}): {count} ({pct:.1f}%)")

        # Inventory summary
        active = [b for b in batches.data if not b.get('is_depleted', True)]
        total_remaining = sum(float(b.get('remaining_qty') or 0) for b in active)
        print(f"\n   Active batches: {len(active)}")
        print(f"   Total remaining stock: {total_remaining:,.2f} kg")
    else:
        print("   No batches found!")

    # 3. Transaction Statistics
    print("\n3. TRANSACTION STATISTICS")
    print("-" * 40)

    transactions = supabase.table('stock_transactions').select('*').execute()
    if transactions.data:
        print(f"   Total transactions: {len(transactions.data)}")

        type_counts = Counter(t['type'] for t in transactions.data)
        print("\n   By Type:")
        for tx_type, count in type_counts.most_common():
            pct = count / len(transactions.data) * 100
            print(f"      {tx_type}: {count} ({pct:.1f}%)")

        # With trip linkage
        linked = len([t for t in transactions.data if t.get('trip_id')])
        print(f"\n   Linked to trips: {linked} ({linked/len(transactions.data)*100:.1f}%)")
    else:
        print("   No transactions found!")

    # 4. Usage Log Statistics
    print("\n4. BAG USAGE LOG STATISTICS")
    print("-" * 40)

    # Get count only to avoid large data transfer
    logs_result = supabase.table('bag_usage_logs').select('id, bag_count, kg_equivalent, is_undone').execute()
    if logs_result.data:
        logs = logs_result.data
        print(f"   Total logs: {len(logs)}")

        active_logs = [l for l in logs if not l.get('is_undone', False)]
        total_bags = sum(l.get('bag_count', 0) for l in active_logs)
        total_kg = sum(float(l.get('kg_equivalent') or 0) for l in active_logs)

        print(f"   Active logs: {len(active_logs)}")
        print(f"   Total bags used: {total_bags:,}")
        print(f"   Total kg used: {total_kg:,.2f}")
    else:
        print("   No usage logs found!")

    # 5. Trip Cargo Statistics
    print("\n5. TRIP CARGO STATISTICS")
    print("-" * 40)

    cargo = supabase.table('trip_cargo').select('*').execute()
    if cargo.data:
        print(f"   Total cargo records: {len(cargo.data)}")
        total_cargo_kg = sum(float(c.get('quantity_kg') or 0) for c in cargo.data)
        print(f"   Total cargo transported: {total_cargo_kg:,.2f} kg")
    else:
        print("   No cargo records found!")

    # 6. Data Integrity Checks
    print("\n6. DATA INTEGRITY CHECKS")
    print("-" * 40)

    issues = []

    # Check for orphaned batches (no supplier)
    if batches.data:
        orphaned = len([b for b in batches.data if not b.get('supplier_id')])
        if orphaned:
            issues.append(f"Batches without supplier: {orphaned}")

    # Check for trips without required fields
    if trips.data:
        no_vehicle = len([t for t in trips.data if not t.get('vehicle_id')])
        if no_vehicle:
            issues.append(f"Trips without vehicle: {no_vehicle}")

    if issues:
        print("   Issues found:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("   All integrity checks passed!")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    print(f"""
   Trips:        {len(trips.data) if trips.data else 0}
   Batches:      {len(batches.data) if batches.data else 0}
   Transactions: {len(transactions.data) if transactions.data else 0}
   Usage Logs:   {len(logs_result.data) if logs_result.data else 0}
   Cargo:        {len(cargo.data) if cargo.data else 0}
    """)

    print("=" * 60 + "\n")


if __name__ == '__main__':
    main()
