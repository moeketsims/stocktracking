"""
Demo Data Seeder - Creates realistic mock data for demonstration purposes.
This populates stock transactions, completes trips, and creates activity history.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from uuid import uuid4
import random
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth

router = APIRouter(prefix="/demo", tags=["Demo Data"])


@router.post("/seed")
async def seed_demo_data(user_data: dict = Depends(require_auth)):
    """
    Seed comprehensive demo data for all dashboard features.
    Creates 30 days of transaction history for realistic trends.
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        results = {
            "receive_transactions": 0,
            "issue_transactions": 0,
            "waste_transactions": 0,
            "transfer_transactions": 0,
            "completed_trips": 0,
            "errors": []
        }

        # 1. Get all potato items (SKU starts with POT-)
        items_result = supabase.table("items").select("id, name, sku").ilike("sku", "POT-%").execute()
        potato_items = items_result.data or []

        if not potato_items:
            raise HTTPException(status_code=400, detail="No potato items found. Please seed items first.")

        # 2. Get all locations
        locations_result = supabase.table("locations").select("id, name, type").execute()
        locations = locations_result.data or []

        if not locations:
            raise HTTPException(status_code=400, detail="No locations found. Please seed locations first.")

        warehouse = next((loc for loc in locations if loc["type"] == "warehouse"), None)
        shops = [loc for loc in locations if loc["type"] == "shop"]

        if not warehouse:
            raise HTTPException(status_code=400, detail="No warehouse found.")

        if not shops:
            raise HTTPException(status_code=400, detail="No shops found.")

        # 3. Get existing batches to create receive transactions for
        batches_result = supabase.table("stock_batches").select(
            "id, item_id, location_id, initial_qty, received_at, supplier_id"
        ).gt("remaining_qty", 0).execute()
        batches = batches_result.data or []

        # 4. Get suppliers
        suppliers_result = supabase.table("suppliers").select("id, name").execute()
        suppliers = suppliers_result.data or []

        now = datetime.now()

        # ============================================
        # STEP 1: Create receive transactions for existing batches
        # ============================================
        for batch in batches:
            # Check if receive transaction already exists
            existing = supabase.table("stock_transactions").select("id").eq(
                "batch_id", batch["id"]
            ).eq("type", "receive").execute()

            if not existing.data:
                # Parse received_at or use random date in last 30 days
                received_at = batch.get("received_at")
                if received_at:
                    tx_date = received_at
                else:
                    days_ago = random.randint(1, 30)
                    tx_date = (now - timedelta(days=days_ago)).isoformat()

                tx_data = {
                    "id": str(uuid4()),
                    "created_by": user.id,
                    "location_id_to": batch["location_id"],
                    "item_id": batch["item_id"],
                    "batch_id": batch["id"],
                    "qty": batch["initial_qty"],
                    "unit": "kg",
                    "type": "receive",
                    "notes": "Initial stock receive (demo data)",
                    "created_at": tx_date,
                    "metadata": {
                        "demo_data": True,
                        "supplier_id": batch.get("supplier_id")
                    }
                }

                try:
                    supabase.table("stock_transactions").insert(tx_data).execute()
                    results["receive_transactions"] += 1
                except Exception as e:
                    results["errors"].append(f"Receive tx error: {str(e)}")

        # ============================================
        # STEP 2: Create issue transactions (daily sales at shops)
        # ============================================
        # Simulate daily issues from each shop over 30 days
        for shop in shops:
            for days_ago in range(30):
                # Skip some days randomly for variety
                if random.random() < 0.1:  # 10% chance to skip a day
                    continue

                tx_date = (now - timedelta(days=days_ago, hours=random.randint(8, 18))).isoformat()

                # 2-5 issue transactions per day per shop
                num_issues = random.randint(2, 5)
                for _ in range(num_issues):
                    item = random.choice(potato_items)
                    # Issue between 5 and 50 kg per transaction
                    qty = round(random.uniform(5, 50), 1)

                    tx_data = {
                        "id": str(uuid4()),
                        "created_by": user.id,
                        "location_id_from": shop["id"],
                        "item_id": item["id"],
                        "qty": qty,
                        "unit": "kg",
                        "type": "issue",
                        "notes": f"Daily sales - {item['name']} (demo data)",
                        "created_at": tx_date,
                        "metadata": {"demo_data": True}
                    }

                    try:
                        supabase.table("stock_transactions").insert(tx_data).execute()
                        results["issue_transactions"] += 1
                    except Exception as e:
                        results["errors"].append(f"Issue tx error: {str(e)}")

        # ============================================
        # STEP 3: Create waste transactions (spoilage)
        # ============================================
        waste_reasons = ["spoiled", "damaged", "expired", "quality_issue"]

        for shop in shops:
            # Waste happens less frequently - every few days
            for days_ago in range(0, 30, random.randint(2, 5)):
                if random.random() < 0.3:  # 30% chance to skip
                    continue

                tx_date = (now - timedelta(days=days_ago, hours=random.randint(10, 16))).isoformat()

                item = random.choice(potato_items)
                # Waste is smaller quantities - 1 to 10 kg
                qty = round(random.uniform(1, 10), 1)
                reason = random.choice(waste_reasons)

                tx_data = {
                    "id": str(uuid4()),
                    "created_by": user.id,
                    "location_id_from": shop["id"],
                    "item_id": item["id"],
                    "qty": qty,
                    "unit": "kg",
                    "type": "waste",
                    "notes": f"Waste: {reason} (demo data)",
                    "created_at": tx_date,
                    "metadata": {"demo_data": True, "reason": reason}
                }

                try:
                    supabase.table("stock_transactions").insert(tx_data).execute()
                    results["waste_transactions"] += 1
                except Exception as e:
                    results["errors"].append(f"Waste tx error: {str(e)}")

        # Also add some warehouse waste
        for days_ago in range(0, 30, 7):
            tx_date = (now - timedelta(days=days_ago, hours=12)).isoformat()
            item = random.choice(potato_items)
            qty = round(random.uniform(2, 15), 1)

            tx_data = {
                "id": str(uuid4()),
                "created_by": user.id,
                "location_id_from": warehouse["id"],
                "item_id": item["id"],
                "qty": qty,
                "unit": "kg",
                "type": "waste",
                "notes": "Warehouse waste - quality control (demo data)",
                "created_at": tx_date,
                "metadata": {"demo_data": True, "reason": "quality_control"}
            }

            try:
                supabase.table("stock_transactions").insert(tx_data).execute()
                results["waste_transactions"] += 1
            except Exception as e:
                results["errors"].append(f"Warehouse waste tx error: {str(e)}")

        # ============================================
        # STEP 4: Create transfer transactions (warehouse to shops)
        # ============================================
        for days_ago in range(0, 30, 2):  # Every 2 days
            tx_date = (now - timedelta(days=days_ago, hours=random.randint(6, 10))).isoformat()

            # Transfer to 2-3 random shops
            transfer_shops = random.sample(shops, min(len(shops), random.randint(2, 3)))

            for shop in transfer_shops:
                item = random.choice(potato_items)
                # Transfer larger quantities - 50 to 200 kg
                qty = round(random.uniform(50, 200), 1)

                tx_data = {
                    "id": str(uuid4()),
                    "created_by": user.id,
                    "location_id_from": warehouse["id"],
                    "location_id_to": shop["id"],
                    "item_id": item["id"],
                    "qty": qty,
                    "unit": "kg",
                    "type": "transfer",
                    "notes": f"Stock replenishment to {shop['name']} (demo data)",
                    "created_at": tx_date,
                    "metadata": {"demo_data": True}
                }

                try:
                    supabase.table("stock_transactions").insert(tx_data).execute()
                    results["transfer_transactions"] += 1
                except Exception as e:
                    results["errors"].append(f"Transfer tx error: {str(e)}")

        # ============================================
        # STEP 5: Add TODAY's transactions for immediate visibility
        # ============================================
        today_str = now.isoformat()

        # Today's receives at warehouse
        for _ in range(3):
            item = random.choice(potato_items)
            supplier = random.choice(suppliers) if suppliers else None
            qty = round(random.uniform(100, 500), 1)

            tx_data = {
                "id": str(uuid4()),
                "created_by": user.id,
                "location_id_to": warehouse["id"],
                "item_id": item["id"],
                "qty": qty,
                "unit": "kg",
                "type": "receive",
                "notes": f"Today's delivery - {item['name']} (demo data)",
                "created_at": today_str,
                "metadata": {
                    "demo_data": True,
                    "supplier_id": supplier["id"] if supplier else None
                }
            }

            try:
                supabase.table("stock_transactions").insert(tx_data).execute()
                results["receive_transactions"] += 1
            except Exception as e:
                results["errors"].append(f"Today receive tx error: {str(e)}")

        # Today's issues at each shop
        for shop in shops:
            for _ in range(random.randint(3, 6)):
                item = random.choice(potato_items)
                qty = round(random.uniform(10, 40), 1)

                tx_data = {
                    "id": str(uuid4()),
                    "created_by": user.id,
                    "location_id_from": shop["id"],
                    "item_id": item["id"],
                    "qty": qty,
                    "unit": "kg",
                    "type": "issue",
                    "notes": f"Today's sales - {item['name']} (demo data)",
                    "created_at": today_str,
                    "metadata": {"demo_data": True}
                }

                try:
                    supabase.table("stock_transactions").insert(tx_data).execute()
                    results["issue_transactions"] += 1
                except Exception as e:
                    results["errors"].append(f"Today issue tx error: {str(e)}")

        # Today's waste at a couple shops
        waste_shops = random.sample(shops, min(len(shops), 2))
        for shop in waste_shops:
            item = random.choice(potato_items)
            qty = round(random.uniform(2, 8), 1)

            tx_data = {
                "id": str(uuid4()),
                "created_by": user.id,
                "location_id_from": shop["id"],
                "item_id": item["id"],
                "qty": qty,
                "unit": "kg",
                "type": "waste",
                "notes": "Today's waste - damaged stock (demo data)",
                "created_at": today_str,
                "metadata": {"demo_data": True, "reason": "damaged"}
            }

            try:
                supabase.table("stock_transactions").insert(tx_data).execute()
                results["waste_transactions"] += 1
            except Exception as e:
                results["errors"].append(f"Today waste tx error: {str(e)}")

        # Today's transfers
        for shop in random.sample(shops, min(len(shops), 3)):
            item = random.choice(potato_items)
            qty = round(random.uniform(80, 150), 1)

            tx_data = {
                "id": str(uuid4()),
                "created_by": user.id,
                "location_id_from": warehouse["id"],
                "location_id_to": shop["id"],
                "item_id": item["id"],
                "qty": qty,
                "unit": "kg",
                "type": "transfer",
                "notes": f"Today's replenishment to {shop['name']} (demo data)",
                "created_at": today_str,
                "metadata": {"demo_data": True}
            }

            try:
                supabase.table("stock_transactions").insert(tx_data).execute()
                results["transfer_transactions"] += 1
            except Exception as e:
                results["errors"].append(f"Today transfer tx error: {str(e)}")

        # ============================================
        # STEP 6: Complete some trips
        # ============================================
        # Get in_progress trips and complete a couple
        trips_result = supabase.table("trips").select("*").eq("status", "in_progress").limit(2).execute()
        trips_to_complete = trips_result.data or []

        for trip in trips_to_complete:
            try:
                completed_at = (now - timedelta(hours=random.randint(1, 4))).isoformat()

                update_data = {
                    "status": "completed",
                    "completed_at": completed_at,
                    "fuel_cost": round(random.uniform(200, 500), 2),
                    "toll_cost": round(random.uniform(20, 80), 2),
                    "other_cost": round(random.uniform(0, 50), 2),
                    "odometer_start": random.randint(50000, 100000),
                    "odometer_end": random.randint(100050, 100200),
                    "arrival_time": completed_at
                }

                supabase.table("trips").update(update_data).eq("id", trip["id"]).execute()
                results["completed_trips"] += 1

                # If trip has from/to locations, create a transfer transaction
                if trip.get("from_location_id") and trip.get("to_location_id"):
                    item = random.choice(potato_items)
                    qty = round(random.uniform(100, 300), 1)

                    tx_data = {
                        "id": str(uuid4()),
                        "created_by": user.id,
                        "location_id_from": trip["from_location_id"],
                        "location_id_to": trip["to_location_id"],
                        "item_id": item["id"],
                        "qty": qty,
                        "unit": "kg",
                        "type": "transfer",
                        "trip_id": trip["id"],
                        "notes": f"Trip {trip.get('trip_number', '')} delivery (demo data)",
                        "created_at": completed_at,
                        "metadata": {"demo_data": True, "trip_id": trip["id"]}
                    }

                    supabase.table("stock_transactions").insert(tx_data).execute()
                    results["transfer_transactions"] += 1

            except Exception as e:
                results["errors"].append(f"Trip completion error: {str(e)}")

        # Summary
        total_transactions = (
            results["receive_transactions"] +
            results["issue_transactions"] +
            results["waste_transactions"] +
            results["transfer_transactions"]
        )

        return {
            "success": True,
            "message": f"Demo data seeded successfully! Created {total_transactions} transactions.",
            "details": results,
            "summary": {
                "potato_items_found": len(potato_items),
                "locations_found": len(locations),
                "shops": len(shops),
                "warehouse": warehouse["name"] if warehouse else None,
                "existing_batches": len(batches)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear")
async def clear_demo_data(user_data: dict = Depends(require_auth)):
    """
    Clear all demo data (transactions with demo_data metadata).
    Use with caution!
    """
    supabase = get_supabase_admin_client()

    try:
        # Delete transactions with demo_data metadata
        # Note: Supabase doesn't support JSONB contains in basic queries,
        # so we'll delete transactions with specific notes pattern
        result = supabase.table("stock_transactions").delete().ilike(
            "notes", "%(demo data)%"
        ).execute()

        deleted_count = len(result.data) if result.data else 0

        # Reset completed trips back to in_progress
        trips_result = supabase.table("trips").update({
            "status": "in_progress",
            "completed_at": None,
            "fuel_cost": 0,
            "toll_cost": 0,
            "other_cost": 0
        }).eq("status", "completed").execute()

        reset_trips = len(trips_result.data) if trips_result.data else 0

        return {
            "success": True,
            "message": f"Cleared {deleted_count} demo transactions and reset {reset_trips} trips."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_demo_status(user_data: dict = Depends(require_auth)):
    """
    Check current demo data status.
    """
    supabase = get_supabase_admin_client()

    try:
        # Count demo transactions
        demo_tx = supabase.table("stock_transactions").select(
            "id", count="exact"
        ).ilike("notes", "%(demo data)%").execute()

        # Count all transactions
        all_tx = supabase.table("stock_transactions").select(
            "id", count="exact"
        ).execute()

        # Count by type
        types = ["receive", "issue", "transfer", "waste"]
        type_counts = {}
        for t in types:
            result = supabase.table("stock_transactions").select(
                "id", count="exact"
            ).eq("type", t).execute()
            type_counts[t] = result.count or 0

        # Today's transactions
        today = datetime.now().date().isoformat()
        today_tx = supabase.table("stock_transactions").select(
            "id", count="exact"
        ).gte("created_at", f"{today}T00:00:00").execute()

        return {
            "demo_transactions": demo_tx.count or 0,
            "total_transactions": all_tx.count or 0,
            "today_transactions": today_tx.count or 0,
            "by_type": type_counts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
