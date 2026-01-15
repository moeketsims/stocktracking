"""
Comprehensive Mock Data Seed Script for Stock Tracking Platform
Generates 1 year of realistic operational data with full trip-batch linkages

Run with: python scripts/seed_comprehensive_data.py

Requires environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Data volume targets:
- ~1,000 completed trips
- ~3,000 stock batches
- ~15,000 stock transactions
- ~120,000 bag usage logs
- 3-5 in-progress trips
"""
import os
import sys
import random
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Dict, Any, Optional
import uuid

# Add the backend path to import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'web-platform', 'backend-python'))

from app.config import get_supabase_admin_client

# ============================================
# CONFIGURATION
# ============================================

# Time period for data generation
END_DATE = date(2026, 1, 15)  # Today
START_DATE = date(2025, 1, 15)  # 1 year ago
DAYS_OF_DATA = (END_DATE - START_DATE).days

# Trip type distribution (percentages)
TRIP_TYPE_DISTRIBUTION = {
    'supplier_to_warehouse': 25,
    'supplier_to_shop': 15,
    'warehouse_to_shop': 45,
    'shop_to_shop': 10,
    'shop_to_warehouse': 5,
}

# Weekly trip pattern (trips per day)
WEEKLY_PATTERN = {
    0: (3, 4),   # Monday
    1: (2, 3),   # Tuesday
    2: (2, 3),   # Wednesday
    3: (2, 3),   # Thursday
    4: (3, 4),   # Friday
    5: (1, 2),   # Saturday
    6: (0, 1),   # Sunday
}

# Seasonal multipliers (South African context)
SEASONAL_MULTIPLIERS = {
    1: 0.85,   # January - summer holidays
    2: 0.85,   # February - summer
    3: 1.00,   # March
    4: 1.00,   # April
    5: 1.35,   # May - winter starts
    6: 1.35,   # June - winter peak
    7: 1.35,   # July - winter peak
    8: 1.35,   # August - winter
    9: 1.00,   # September
    10: 1.00,  # October
    11: 1.15,  # November - festive prep
    12: 1.15,  # December - festive season
}

# Quality score distribution
QUALITY_DISTRIBUTION = {
    1: 75,  # Good - 75%
    2: 20,  # Acceptable - 20%
    3: 5,   # Poor - 5%
}

# Cost models (South African Rands)
SUPPLIER_COSTS = {
    'FreshFarm Potatoes': {'base': 12.50, 'variation': 1.50},
    'Golden Harvest Ltd': {'base': 13.00, 'variation': 1.00},
    'Valley Produce': {'base': 11.50, 'variation': 2.00},
}

# Default supplier cost if not in map
DEFAULT_SUPPLIER_COST = {'base': 12.00, 'variation': 1.50}

# Business hours for usage (peak hours pattern)
USAGE_HOURS = {
    8: 10, 9: 15, 10: 20, 11: 20, 12: 15,  # Morning peak
    13: 5, 14: 10, 15: 15, 16: 15, 17: 10,  # Afternoon peak
    18: 5, 19: 3, 20: 2  # Evening taper
}

# ============================================
# HELPER FUNCTIONS
# ============================================

def weighted_choice(choices_with_weights: Dict[Any, int]) -> Any:
    """Select a random item based on weights."""
    items = list(choices_with_weights.keys())
    weights = list(choices_with_weights.values())
    return random.choices(items, weights=weights, k=1)[0]


def generate_trip_number(year: int, count: int) -> str:
    """Generate a trip number in format TRP-YYYY-NNNN."""
    return f"TRP-{year}-{str(count).zfill(4)}"


def random_time_in_range(base_date: date, start_hour: int, end_hour: int) -> datetime:
    """Generate a random datetime within the given hour range."""
    hour = random.randint(start_hour, end_hour)
    minute = random.randint(0, 59)
    return datetime.combine(base_date, datetime.min.time()) + timedelta(hours=hour, minutes=minute)


def calculate_fuel_cost(distance_km: float) -> float:
    """Calculate fuel cost based on distance (R12/km average)."""
    return round(distance_km * 12, 2)


def get_shop_distance(shop_index: int) -> float:
    """Get approximate distance for a shop from warehouse."""
    distances = [15, 25, 35, 45, 60]  # km
    return distances[shop_index % len(distances)]


# ============================================
# DATA FETCHING
# ============================================

def fetch_reference_data(supabase) -> Dict[str, Any]:
    """Fetch all reference data needed for generation."""
    print("Fetching reference data...")

    data = {}

    # Locations
    result = supabase.table('locations').select('*').execute()
    data['locations'] = result.data
    data['warehouse'] = next((l for l in data['locations'] if l['type'] == 'warehouse'), None)
    data['shops'] = [l for l in data['locations'] if l['type'] == 'shop']
    print(f"  Found {len(data['locations'])} locations ({1 if data['warehouse'] else 0} warehouse, {len(data['shops'])} shops)")

    # Suppliers
    result = supabase.table('suppliers').select('*').execute()
    data['suppliers'] = result.data
    print(f"  Found {len(data['suppliers'])} suppliers")

    # Items
    result = supabase.table('items').select('*').execute()
    data['items'] = result.data
    print(f"  Found {len(data['items'])} items")

    # Vehicles
    result = supabase.table('vehicles').select('*').eq('is_active', True).execute()
    data['vehicles'] = result.data
    print(f"  Found {len(data['vehicles'])} active vehicles")

    # Drivers
    result = supabase.table('drivers').select('*').eq('is_active', True).execute()
    data['drivers'] = result.data
    print(f"  Found {len(data['drivers'])} active drivers")

    # Get a system user for created_by fields
    result = supabase.table('profiles').select('user_id').limit(1).execute()
    if result.data:
        data['system_user_id'] = result.data[0]['user_id']
    else:
        # If no profiles exist, we need to handle this
        print("  WARNING: No profiles found. Will need a system user.")
        data['system_user_id'] = None

    return data


# ============================================
# TRIP GENERATION
# ============================================

def generate_trips_for_period(
    supabase,
    ref_data: Dict[str, Any],
    start_date: date,
    end_date: date
) -> List[Dict]:
    """Generate all trips for the given period."""
    print(f"\nGenerating trips from {start_date} to {end_date}...")

    trips = []
    trip_counter = {}  # Track trip numbers per year

    current_date = start_date
    while current_date <= end_date:
        year = current_date.year
        if year not in trip_counter:
            trip_counter[year] = 0

        # Get seasonal multiplier
        seasonal_mult = SEASONAL_MULTIPLIERS.get(current_date.month, 1.0)

        # Get day of week pattern
        dow = current_date.weekday()
        min_trips, max_trips = WEEKLY_PATTERN.get(dow, (2, 3))

        # Calculate trips for this day
        base_trips = random.randint(min_trips, max_trips)
        day_trips = max(0, int(base_trips * seasonal_mult))

        # Generate trips for the day
        for _ in range(day_trips):
            trip_type = weighted_choice(TRIP_TYPE_DISTRIBUTION)
            trip_counter[year] += 1

            trip = generate_single_trip(
                ref_data=ref_data,
                trip_date=current_date,
                trip_type=trip_type,
                trip_number=generate_trip_number(year, trip_counter[year])
            )

            if trip:
                trips.append(trip)

        current_date += timedelta(days=1)

    print(f"  Generated {len(trips)} trips")
    return trips


def generate_single_trip(
    ref_data: Dict[str, Any],
    trip_date: date,
    trip_type: str,
    trip_number: str
) -> Optional[Dict]:
    """Generate a single trip with appropriate route."""

    warehouse = ref_data['warehouse']
    shops = ref_data['shops']
    suppliers = ref_data['suppliers']
    vehicles = ref_data['vehicles']
    drivers = ref_data['drivers']

    if not warehouse or not shops or not suppliers or not vehicles or not drivers:
        return None

    # Select vehicle and driver
    vehicle = random.choice(vehicles)
    driver = random.choice(drivers)

    # Determine route based on trip type
    from_location_id = None
    to_location_id = None
    supplier_id = None
    origin_desc = None
    dest_desc = None
    distance_km = 0

    if trip_type == 'supplier_to_warehouse':
        supplier = random.choice(suppliers)
        supplier_id = supplier['id']
        to_location_id = warehouse['id']
        origin_desc = f"Supplier: {supplier['name']}"
        dest_desc = warehouse['name']
        distance_km = random.uniform(20, 80)

    elif trip_type == 'supplier_to_shop':
        supplier = random.choice(suppliers)
        shop = random.choice(shops)
        supplier_id = supplier['id']
        to_location_id = shop['id']
        origin_desc = f"Supplier: {supplier['name']}"
        dest_desc = shop['name']
        distance_km = random.uniform(30, 100)

    elif trip_type == 'warehouse_to_shop':
        shop = random.choice(shops)
        from_location_id = warehouse['id']
        to_location_id = shop['id']
        origin_desc = warehouse['name']
        dest_desc = shop['name']
        distance_km = get_shop_distance(shops.index(shop))

    elif trip_type == 'shop_to_shop':
        shop_from, shop_to = random.sample(shops, min(2, len(shops)))
        from_location_id = shop_from['id']
        to_location_id = shop_to['id']
        origin_desc = shop_from['name']
        dest_desc = shop_to['name']
        distance_km = random.uniform(10, 40)

    elif trip_type == 'shop_to_warehouse':
        shop = random.choice(shops)
        from_location_id = shop['id']
        to_location_id = warehouse['id']
        origin_desc = shop['name']
        dest_desc = warehouse['name']
        distance_km = get_shop_distance(shops.index(shop))

    # Generate times
    departure = random_time_in_range(trip_date, 6, 10)
    travel_time = timedelta(minutes=int(distance_km * 1.5 + random.randint(10, 30)))
    arrival = departure + travel_time

    # Calculate costs
    fuel_cost = calculate_fuel_cost(distance_km)
    toll_cost = round(random.uniform(0, 50) if distance_km > 30 else 0, 2)
    other_cost = round(random.uniform(0, 30), 2)

    # Odometer readings
    odometer_start = round(random.uniform(50000, 150000), 1)
    odometer_end = round(odometer_start + distance_km, 1)

    return {
        'trip_number': trip_number,
        'vehicle_id': vehicle['id'],
        'driver_id': driver['id'],
        'driver_name': driver['full_name'],
        'status': 'completed',
        'trip_type': trip_type,
        'from_location_id': from_location_id,
        'to_location_id': to_location_id,
        'supplier_id': supplier_id,
        'origin_description': origin_desc,
        'destination_description': dest_desc,
        'departure_time': departure.isoformat(),
        'arrival_time': arrival.isoformat(),
        'fuel_cost': fuel_cost,
        'fuel_litres': round(fuel_cost / 23, 2),  # ~R23/litre
        'toll_cost': toll_cost,
        'other_cost': other_cost,
        'odometer_start': odometer_start,
        'odometer_end': odometer_end,
        'created_by': ref_data['system_user_id'],
        'created_at': departure.isoformat(),
        'completed_at': arrival.isoformat(),
        'notes': None,
    }


def insert_trips(supabase, trips: List[Dict]) -> List[Dict]:
    """Insert trips in batches and return inserted trips with IDs."""
    print(f"\nInserting {len(trips)} trips...")

    inserted = []
    batch_size = 100

    for i in range(0, len(trips), batch_size):
        batch = trips[i:i + batch_size]
        try:
            result = supabase.table('trips').insert(batch).execute()
            inserted.extend(result.data)
            print(f"  Inserted batch {i // batch_size + 1}/{(len(trips) + batch_size - 1) // batch_size}")
        except Exception as e:
            print(f"  Error inserting batch: {e}")

    print(f"  Total inserted: {len(inserted)} trips")
    return inserted


# ============================================
# STOCK BATCH GENERATION
# ============================================

def generate_batches_for_trips(
    supabase,
    ref_data: Dict[str, Any],
    inserted_trips: List[Dict]
) -> List[Dict]:
    """Generate stock batches for supplier trips."""
    print("\nGenerating stock batches for supplier trips...")

    batches = []
    transactions = []

    # Filter trips that receive stock (supplier_to_*)
    receive_trips = [
        t for t in inserted_trips
        if t.get('trip_type') in ('supplier_to_warehouse', 'supplier_to_shop')
    ]

    print(f"  Found {len(receive_trips)} receive trips")

    suppliers_by_id = {s['id']: s for s in ref_data['suppliers']}
    items = ref_data['items']

    for trip in receive_trips:
        supplier = suppliers_by_id.get(trip['supplier_id'])
        if not supplier:
            continue

        # Get cost model for supplier
        cost_model = SUPPLIER_COSTS.get(supplier['name'], DEFAULT_SUPPLIER_COST)

        # Generate 1-4 batches per trip (different items)
        num_batches = random.randint(1, min(4, len(items)))
        selected_items = random.sample(items, num_batches)

        for item in selected_items:
            # Generate batch quantity (100-500 kg)
            initial_qty = round(random.uniform(100, 500), 2)

            # Quality score
            quality = weighted_choice(QUALITY_DISTRIBUTION)
            defect_pct = None
            quality_notes = None

            if quality == 2:
                defect_pct = round(random.uniform(3, 8), 1)
                quality_notes = random.choice([
                    'Minor surface blemishes',
                    'Slightly irregular shapes',
                    'Small spots detected',
                ])
            elif quality == 3:
                defect_pct = round(random.uniform(9, 15), 1)
                quality_notes = random.choice([
                    'Visible damage on several units',
                    'Signs of early sprouting',
                    'Some soft spots detected',
                ])

            # Cost per kg
            cost_per_kg = round(
                cost_model['base'] + random.uniform(-cost_model['variation'], cost_model['variation']),
                2
            )

            # Expiry date (30-90 days from receipt)
            trip_date = datetime.fromisoformat(trip['arrival_time'].replace('Z', '+00:00'))
            expiry_date = (trip_date + timedelta(days=random.randint(30, 90))).date()

            batch = {
                'item_id': item['id'],
                'location_id': trip['to_location_id'],
                'supplier_id': trip['supplier_id'],
                'trip_id': trip['id'],
                'initial_qty': initial_qty,
                'remaining_qty': initial_qty,  # Will be updated by usage
                'received_at': trip['arrival_time'],
                'expiry_date': expiry_date.isoformat(),
                'quality_score': quality,
                'defect_pct': defect_pct,
                'quality_notes': quality_notes,
                'cost_per_unit': cost_per_kg,  # cost per kg stored in cost_per_unit
                'is_depleted': False,
            }
            batches.append(batch)

            # Create corresponding receive transaction
            transaction = {
                'created_by': ref_data['system_user_id'],
                'created_at': trip['arrival_time'],
                'location_id_to': trip['to_location_id'],
                'item_id': item['id'],
                'qty': initial_qty,
                'unit': 'kg',
                'type': 'receive',
                'trip_id': trip['id'],
                'notes': f"Received from {supplier['name']} via trip {trip['trip_number']}",
                'metadata': {
                    'supplier_id': trip['supplier_id'],
                    'cost_per_kg': cost_per_kg,
                    'quality_score': quality,
                },
            }
            transactions.append(transaction)

    print(f"  Generated {len(batches)} batches and {len(transactions)} receive transactions")
    return batches, transactions


def insert_batches_and_transactions(
    supabase,
    batches: List[Dict],
    transactions: List[Dict]
) -> tuple:
    """Insert batches and transactions, linking them properly."""
    print("\nInserting batches and transactions...")

    inserted_batches = []
    inserted_transactions = []
    batch_size = 100

    # Insert batches first
    for i in range(0, len(batches), batch_size):
        batch = batches[i:i + batch_size]
        try:
            result = supabase.table('stock_batches').insert(batch).execute()
            inserted_batches.extend(result.data)
        except Exception as e:
            print(f"  Error inserting batches: {e}")

    print(f"  Inserted {len(inserted_batches)} batches")

    # Insert transactions
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i + batch_size]
        try:
            result = supabase.table('stock_transactions').insert(batch).execute()
            inserted_transactions.extend(result.data)
        except Exception as e:
            print(f"  Error inserting transactions: {e}")

    print(f"  Inserted {len(inserted_transactions)} transactions")

    return inserted_batches, inserted_transactions


# ============================================
# TRANSFER GENERATION
# ============================================

def generate_transfers(
    supabase,
    ref_data: Dict[str, Any],
    inserted_trips: List[Dict],
    inserted_batches: List[Dict]
) -> List[Dict]:
    """Generate transfer transactions for warehouse_to_shop trips."""
    print("\nGenerating transfer transactions...")

    transfers = []
    cargo_records = []

    # Filter warehouse_to_shop trips
    transfer_trips = [
        t for t in inserted_trips
        if t.get('trip_type') == 'warehouse_to_shop'
    ]

    print(f"  Found {len(transfer_trips)} transfer trips")

    # Group batches by location
    warehouse_batches = [
        b for b in inserted_batches
        if b['location_id'] == ref_data['warehouse']['id']
    ]

    for trip in transfer_trips:
        if not warehouse_batches:
            continue

        # Select 1-3 batches to transfer
        num_to_transfer = min(random.randint(1, 3), len(warehouse_batches))
        selected = random.sample(warehouse_batches, num_to_transfer)

        for batch in selected:
            # Transfer 30-80% of batch quantity
            transfer_qty = round(batch['initial_qty'] * random.uniform(0.3, 0.8), 2)

            transfer = {
                'created_by': ref_data['system_user_id'],
                'created_at': trip['arrival_time'],
                'location_id_from': trip['from_location_id'],
                'location_id_to': trip['to_location_id'],
                'item_id': batch['item_id'],
                'batch_id': batch['id'],
                'qty': transfer_qty,
                'unit': 'kg',
                'type': 'transfer',
                'trip_id': trip['id'],
                'notes': f"Transfer via trip {trip['trip_number']}",
            }
            transfers.append(transfer)

            # Cargo record
            cargo = {
                'trip_id': trip['id'],
                'batch_id': batch['id'],
                'item_id': batch['item_id'],
                'quantity_kg': transfer_qty,
                'from_location_id': trip['from_location_id'],
                'to_location_id': trip['to_location_id'],
                'created_at': trip['departure_time'],
            }
            cargo_records.append(cargo)

    print(f"  Generated {len(transfers)} transfer transactions")
    return transfers, cargo_records


def insert_transfers_and_cargo(
    supabase,
    transfers: List[Dict],
    cargo_records: List[Dict]
) -> tuple:
    """Insert transfer transactions and cargo records."""
    print("\nInserting transfers and cargo records...")

    inserted_transfers = []
    inserted_cargo = []
    batch_size = 100

    # Insert transfers
    for i in range(0, len(transfers), batch_size):
        batch = transfers[i:i + batch_size]
        try:
            result = supabase.table('stock_transactions').insert(batch).execute()
            inserted_transfers.extend(result.data)
        except Exception as e:
            print(f"  Error inserting transfers: {e}")

    print(f"  Inserted {len(inserted_transfers)} transfers")

    # Insert cargo
    for i in range(0, len(cargo_records), batch_size):
        batch = cargo_records[i:i + batch_size]
        try:
            result = supabase.table('trip_cargo').insert(batch).execute()
            inserted_cargo.extend(result.data)
        except Exception as e:
            print(f"  Error inserting cargo: {e}")

    print(f"  Inserted {len(inserted_cargo)} cargo records")

    return inserted_transfers, inserted_cargo


# ============================================
# USAGE GENERATION
# ============================================

def generate_usage_logs(
    supabase,
    ref_data: Dict[str, Any],
    start_date: date,
    end_date: date
) -> tuple:
    """Generate bag usage logs for all shops."""
    print(f"\nGenerating usage logs from {start_date} to {end_date}...")

    usage_logs = []
    issue_transactions = []

    shops = ref_data['shops']
    items = ref_data['items']

    # Limit items for usage (main potatoes)
    usage_items = [i for i in items if 'potato' in i['name'].lower()][:3]
    if not usage_items:
        usage_items = items[:3]

    current_date = start_date
    total_days = (end_date - start_date).days
    day_count = 0

    while current_date <= end_date:
        day_count += 1
        if day_count % 30 == 0:
            print(f"  Processing day {day_count}/{total_days}...")

        # Get seasonal multiplier
        seasonal_mult = SEASONAL_MULTIPLIERS.get(current_date.month, 1.0)

        # Skip Sundays (reduced operations)
        if current_date.weekday() == 6:
            current_date += timedelta(days=1)
            continue

        for shop in shops:
            for item in usage_items:
                # Generate usage for business hours
                for hour, weight in USAGE_HOURS.items():
                    # Probability of usage this hour
                    if random.random() > weight / 20 * seasonal_mult:
                        continue

                    # Number of bags used (1-5)
                    bag_count = random.randint(1, 3)

                    # Random minute within the hour
                    logged_at = datetime.combine(current_date, datetime.min.time()) + \
                                timedelta(hours=hour, minutes=random.randint(0, 59))

                    # Calculate kg equivalent
                    kg_equivalent = bag_count * item.get('conversion_factor', 10)

                    usage_log = {
                        'location_id': shop['id'],
                        'item_id': item['id'],
                        'logged_by': ref_data['system_user_id'],
                        'bag_count': bag_count,
                        'kg_equivalent': kg_equivalent,
                        'logged_at': logged_at.isoformat(),
                        'is_undone': False,
                        'created_at': logged_at.isoformat(),
                    }
                    usage_logs.append(usage_log)

                    # Corresponding issue transaction
                    issue_txn = {
                        'created_by': ref_data['system_user_id'],
                        'created_at': logged_at.isoformat(),
                        'location_id_from': shop['id'],
                        'item_id': item['id'],
                        'qty': kg_equivalent,
                        'unit': 'kg',
                        'type': 'issue',
                        'notes': 'Quick bag log',
                        'metadata': {
                            'source': 'quick_log',
                            'bag_count': bag_count,
                        },
                    }
                    issue_transactions.append(issue_txn)

        current_date += timedelta(days=1)

    print(f"  Generated {len(usage_logs)} usage logs and {len(issue_transactions)} issue transactions")
    return usage_logs, issue_transactions


def insert_usage_logs(
    supabase,
    usage_logs: List[Dict],
    issue_transactions: List[Dict]
) -> tuple:
    """Insert usage logs and issue transactions in batches."""
    print("\nInserting usage logs and issue transactions...")
    print(f"  This may take a while ({len(usage_logs)} logs, {len(issue_transactions)} transactions)...")

    inserted_logs = []
    inserted_issues = []
    batch_size = 500  # Larger batches for efficiency

    # Insert usage logs
    print("  Inserting usage logs...")
    for i in range(0, len(usage_logs), batch_size):
        batch = usage_logs[i:i + batch_size]
        try:
            result = supabase.table('bag_usage_logs').insert(batch).execute()
            inserted_logs.extend(result.data)
            if (i // batch_size + 1) % 10 == 0:
                print(f"    Progress: {i + len(batch)}/{len(usage_logs)} logs")
        except Exception as e:
            print(f"  Error inserting usage logs: {e}")

    print(f"  Inserted {len(inserted_logs)} usage logs")

    # Insert issue transactions
    print("  Inserting issue transactions...")
    for i in range(0, len(issue_transactions), batch_size):
        batch = issue_transactions[i:i + batch_size]
        try:
            result = supabase.table('stock_transactions').insert(batch).execute()
            inserted_issues.extend(result.data)
            if (i // batch_size + 1) % 10 == 0:
                print(f"    Progress: {i + len(batch)}/{len(issue_transactions)} transactions")
        except Exception as e:
            print(f"  Error inserting issue transactions: {e}")

    print(f"  Inserted {len(inserted_issues)} issue transactions")

    return inserted_logs, inserted_issues


# ============================================
# IN-PROGRESS TRIPS
# ============================================

def generate_in_progress_trips(
    supabase,
    ref_data: Dict[str, Any]
) -> List[Dict]:
    """Generate 3-5 in-progress trips for current operations."""
    print("\nGenerating in-progress trips...")

    trips = []
    today = date.today()

    vehicles = ref_data['vehicles']
    drivers = ref_data['drivers']
    warehouse = ref_data['warehouse']
    shops = ref_data['shops']
    suppliers = ref_data['suppliers']

    if not all([vehicles, drivers, warehouse, shops, suppliers]):
        print("  Missing required reference data")
        return []

    # Get next trip number
    result = supabase.table('trips').select('trip_number').order('created_at', desc=True).limit(1).execute()
    if result.data:
        last_num = int(result.data[0]['trip_number'].split('-')[-1])
    else:
        last_num = 0

    trip_configs = [
        ('supplier_to_warehouse', 'started 2 hours ago'),
        ('warehouse_to_shop', 'started 1 hour ago'),
        ('supplier_to_shop', 'started 3 hours ago'),
        ('warehouse_to_shop', 'started 30 minutes ago'),
    ]

    for i, (trip_type, note) in enumerate(trip_configs):
        last_num += 1
        vehicle = random.choice(vehicles)
        driver = random.choice(drivers)

        # Determine route
        if trip_type == 'supplier_to_warehouse':
            supplier = random.choice(suppliers)
            origin = f"Supplier: {supplier['name']}"
            dest = warehouse['name']
            to_loc = warehouse['id']
            from_loc = None
            sup_id = supplier['id']
        elif trip_type == 'supplier_to_shop':
            supplier = random.choice(suppliers)
            shop = random.choice(shops)
            origin = f"Supplier: {supplier['name']}"
            dest = shop['name']
            to_loc = shop['id']
            from_loc = None
            sup_id = supplier['id']
        else:  # warehouse_to_shop
            shop = random.choice(shops)
            origin = warehouse['name']
            dest = shop['name']
            from_loc = warehouse['id']
            to_loc = shop['id']
            sup_id = None

        departure = datetime.now() - timedelta(hours=random.randint(1, 3))

        trip = {
            'trip_number': generate_trip_number(today.year, last_num),
            'vehicle_id': vehicle['id'],
            'driver_id': driver['id'],
            'driver_name': driver['full_name'],
            'status': 'in_progress',
            'trip_type': trip_type,
            'from_location_id': from_loc,
            'to_location_id': to_loc,
            'supplier_id': sup_id,
            'origin_description': origin,
            'destination_description': dest,
            'departure_time': departure.isoformat(),
            'created_by': ref_data['system_user_id'],
            'created_at': departure.isoformat(),
            'notes': note,
        }
        trips.append(trip)

    # Insert trips
    try:
        result = supabase.table('trips').insert(trips).execute()
        print(f"  Created {len(result.data)} in-progress trips")
        return result.data
    except Exception as e:
        print(f"  Error creating in-progress trips: {e}")
        return []


# ============================================
# VERIFICATION
# ============================================

def verify_data(supabase):
    """Run verification queries to check data quality."""
    print("\n" + "=" * 50)
    print("DATA VERIFICATION")
    print("=" * 50)

    # Trip distribution
    print("\nTrip Distribution:")
    result = supabase.rpc('exec_sql', {
        'query': """
            SELECT trip_type, status, COUNT(*) as count
            FROM trips
            GROUP BY trip_type, status
            ORDER BY count DESC
        """
    }).execute()
    if result.data:
        for row in result.data:
            print(f"  {row.get('trip_type', 'N/A'):<25} {row.get('status', 'N/A'):<12} {row.get('count', 0)}")

    # Monthly summary
    print("\nMonthly Trip Summary (Last 6 Months):")
    result = supabase.table('trips').select('created_at, fuel_cost, toll_cost, other_cost').execute()
    if result.data:
        from collections import defaultdict
        monthly = defaultdict(lambda: {'count': 0, 'total_cost': 0})
        for trip in result.data:
            month = trip['created_at'][:7]  # YYYY-MM
            monthly[month]['count'] += 1
            monthly[month]['total_cost'] += float(trip.get('fuel_cost', 0) or 0) + \
                                             float(trip.get('toll_cost', 0) or 0) + \
                                             float(trip.get('other_cost', 0) or 0)

        for month in sorted(monthly.keys())[-6:]:
            data = monthly[month]
            print(f"  {month}: {data['count']} trips, R{data['total_cost']:,.2f}")

    # Batch counts
    print("\nStock Batches:")
    result = supabase.table('stock_batches').select('id', count='exact').execute()
    print(f"  Total batches: {result.count if hasattr(result, 'count') else len(result.data)}")

    result = supabase.table('stock_batches').select('id', count='exact').eq('is_depleted', False).execute()
    print(f"  Active batches: {result.count if hasattr(result, 'count') else len(result.data)}")

    # Transaction counts
    print("\nStock Transactions:")
    result = supabase.table('stock_transactions').select('type').execute()
    if result.data:
        from collections import Counter
        type_counts = Counter(t['type'] for t in result.data)
        for tx_type, count in type_counts.most_common():
            print(f"  {tx_type:<12} {count}")

    # Usage logs
    print("\nBag Usage Logs:")
    result = supabase.table('bag_usage_logs').select('id', count='exact').execute()
    print(f"  Total logs: {result.count if hasattr(result, 'count') else len(result.data)}")


# ============================================
# MAIN
# ============================================

def main():
    print("\n" + "=" * 60)
    print("COMPREHENSIVE MOCK DATA GENERATION")
    print("=" * 60)
    print(f"\nTarget period: {START_DATE} to {END_DATE} ({DAYS_OF_DATA} days)")

    # Connect to Supabase
    try:
        supabase = get_supabase_admin_client()
        print("Connected to Supabase")
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Fetch reference data
    ref_data = fetch_reference_data(supabase)

    if not ref_data['system_user_id']:
        print("\nERROR: No system user found. Please create a user profile first.")
        sys.exit(1)

    if not ref_data['warehouse'] or not ref_data['shops']:
        print("\nERROR: Missing warehouse or shops. Please run seed_fleet.py first.")
        sys.exit(1)

    # Generate and insert trips
    trips = generate_trips_for_period(
        supabase, ref_data, START_DATE, END_DATE
    )
    inserted_trips = insert_trips(supabase, trips)

    # Generate and insert batches
    batches, receive_txns = generate_batches_for_trips(
        supabase, ref_data, inserted_trips
    )
    inserted_batches, _ = insert_batches_and_transactions(
        supabase, batches, receive_txns
    )

    # Generate and insert transfers
    transfers, cargo = generate_transfers(
        supabase, ref_data, inserted_trips, inserted_batches
    )
    insert_transfers_and_cargo(supabase, transfers, cargo)

    # Generate usage logs (limited to last 90 days for performance)
    usage_start = END_DATE - timedelta(days=90)
    usage_logs, issue_txns = generate_usage_logs(
        supabase, ref_data, usage_start, END_DATE
    )
    insert_usage_logs(supabase, usage_logs, issue_txns)

    # Generate in-progress trips
    generate_in_progress_trips(supabase, ref_data)

    # Verify data
    verify_data(supabase)

    print("\n" + "=" * 60)
    print("DATA GENERATION COMPLETE")
    print("=" * 60 + "\n")


if __name__ == '__main__':
    main()
