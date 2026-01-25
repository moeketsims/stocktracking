from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from uuid import uuid4
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, require_manager, get_view_location_id
from ..models.requests import (
    ReceiveStockRequest,
    IssueStockRequest,
    TransferStockRequest,
    WasteStockRequest
)
from ..models.responses import (
    StockScreenResponse, StockOverview, BatchInfo, FIFOSuggestion
)

router = APIRouter(prefix="/stock", tags=["Stock Operations"])


@router.get("/debug")
async def debug_stock_state(user_data: dict = Depends(require_auth)):
    """Debug endpoint to check actual database state."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]
    
    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()
        
        location_id = profile.data.get("location_id") if profile.data else None
        
        # Get stock_batches
        batches_query = supabase.table("stock_batches").select("id, item_id, location_id, initial_qty, remaining_qty, status").gt("remaining_qty", 0)
        if location_id:
            batches_query = batches_query.eq("location_id", location_id)
        batches = batches_query.limit(10).execute()
        
        # Get stock_balance view
        balance_query = supabase.table("stock_balance").select("*")
        if location_id:
            balance_query = balance_query.eq("location_id", location_id)
        balance = balance_query.limit(10).execute()
        
        # Get items
        items = supabase.table("items").select("id, name").limit(5).execute()
        
        # Get recent receive transactions
        txns_query = supabase.table("stock_transactions").select("id, type, qty, location_id_to, created_at").eq("type", "receive").order("created_at", desc=True)
        txns = txns_query.limit(5).execute()
        
        return {
            "user_location_id": location_id,
            "batches": batches.data or [],
            "balance_view": balance.data or [],
            "items": items.data or [],
            "recent_receives": txns.data or [],
            "message": "Debug data retrieved successfully"
        }
    except Exception as e:
        return {"error": str(e)}


# Cache for default item (potatoes)
_default_item_cache = {"item": None, "cached_at": None}


def get_default_item(supabase) -> dict:
    """Get the default 'Potatoes' item. Caches the result for 10 minutes."""
    global _default_item_cache

    now = datetime.utcnow()
    if (_default_item_cache["item"] and
        _default_item_cache["cached_at"] and
        (now - _default_item_cache["cached_at"]).seconds < 600):
        return _default_item_cache["item"]

    # Fetch the default item (first item or one named 'Potatoes')
    result = supabase.table("items").select("*").limit(1).execute()
    if result.data:
        _default_item_cache["item"] = result.data[0]
        _default_item_cache["cached_at"] = now
        return result.data[0]

    raise HTTPException(status_code=500, detail="No items configured in the system")


def get_conversion_factor(supabase, item_id: str) -> float:
    """Get item's conversion factor for bag to kg conversion."""
    item = supabase.table("items").select("conversion_factor").eq("id", item_id).single().execute()
    return item.data.get("conversion_factor", 10.0) if item.data else 10.0


def convert_to_kg(quantity: float, unit: str, conversion_factor: float) -> float:
    """Convert quantity to kg based on unit."""
    if unit == "bag":
        return quantity * conversion_factor
    return quantity


def get_batch_totals(supabase, location_id: str = None) -> list:
    """Calculate stock totals from active batches using cursor pagination to get ALL batches."""
    try:
        all_batches = []
        last_id = None
        page_size = 1000  # PostgREST default max
        page_count = 0

        # Paginate through ALL batches using cursor-based pagination (id > last_id)
        while page_count < 50:  # Safety limit: max 50 pages = 50,000 batches
            query = supabase.table("stock_batches").select(
                "id, location_id, item_id, remaining_qty, items(name)"
            ).gt("remaining_qty", 0)

            if location_id:
                query = query.eq("location_id", location_id)

            # For pages after the first, only get batches with id > last_id
            if last_id:
                query = query.gt("id", last_id)

            batches = query.order("id").limit(page_size).execute()

            if not batches.data:
                break

            all_batches.extend(batches.data)
            page_count += 1

            # If we got fewer than page_size, we've reached the end
            if len(batches.data) < page_size:
                break

            # Set cursor for next page
            last_id = batches.data[-1]["id"]

        print(f"[BATCH_TOTALS] Found {len(all_batches)} total batches ({page_count} pages)")

        # Aggregate by location + item
        totals = {}
        for b in all_batches:
            key = (b["location_id"], b["item_id"])
            if key not in totals:
                totals[key] = {
                    "location_id": b["location_id"],
                    "item_id": b["item_id"],
                    "on_hand_qty": 0,
                    "item_name": b.get("items", {}).get("name") if b.get("items") else None
                }
            totals[key]["on_hand_qty"] += b["remaining_qty"]

        total_kg = sum(t["on_hand_qty"] for t in totals.values())
        print(f"[BATCH_TOTALS] Total: {total_kg} kg ({int(total_kg/10)} bags)")

        return list(totals.values())
    except Exception as e:
        print(f"[BATCH_TOTALS] ERROR: {e}")
        return []


@router.get("/by-location")
async def get_stock_by_location(user_data: dict = Depends(require_auth)):
    """Get stock overview grouped by location - simplified view for potato tracking."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        user_role = profile.data.get("role") if profile.data else "staff"
        user_location_id = profile.data.get("location_id") if profile.data else None
        user_zone_id = profile.data.get("zone_id") if profile.data else None

        # Get all locations based on user role
        locations_query = supabase.table("locations").select("*")

        # Filter locations based on role
        if user_role == "staff" and user_location_id:
            locations_query = locations_query.eq("id", user_location_id)
        elif user_role == "location_manager" and user_zone_id:
            locations_query = locations_query.eq("zone_id", user_zone_id)
        # admin and zone_manager see all locations

        locations_result = locations_query.order("type", desc=True).order("name").execute()
        locations = locations_result.data or []

        # Fetch batch totals PER LOCATION to avoid 1000-row limit cutting off data
        # This ensures each location gets its complete stock data
        balance_map = {}
        for loc in locations:
            loc_id = loc["id"]
            loc_batch_totals = get_batch_totals(supabase, loc_id)
            total_kg = sum(bt.get("on_hand_qty", 0) or 0 for bt in loc_batch_totals)
            balance_map[loc_id] = total_kg

        # Get recent transactions for activity timestamps (last 7 days)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        transactions_result = supabase.table("stock_transactions").select(
            "id, type, qty, created_at, location_id_from, location_id_to, created_by, notes"
        ).gte("created_at", seven_days_ago).order("created_at", desc=True).limit(200).execute()

        # Build activity map per location
        activity_map = {}  # {location_id: {last_activity: str, activities: [...]}}
        for tx in (transactions_result.data or []):
            loc_from = tx.get("location_id_from")
            loc_to = tx.get("location_id_to")

            for loc_id in [loc_from, loc_to]:
                if loc_id:
                    if loc_id not in activity_map:
                        activity_map[loc_id] = {"last_activity": tx["created_at"], "activities": []}
                    # Keep up to 5 recent activities per location
                    if len(activity_map[loc_id]["activities"]) < 5:
                        activity_map[loc_id]["activities"].append({
                            "id": tx["id"],
                            "type": tx["type"],
                            "qty": tx["qty"],
                            "created_at": tx["created_at"],
                            "notes": tx.get("notes")
                        })

        # Build location stock items
        location_items = []
        total_stock_kg = 0

        for loc in locations:
            loc_id = loc["id"]
            stock_qty = balance_map.get(loc_id, 0)
            total_stock_kg += stock_qty

            # Determine status
            if stock_qty <= 0:
                status = "out"
            elif stock_qty < 100:
                status = "low"
            else:
                status = "in_stock"

            # Get activity info
            loc_activity = activity_map.get(loc_id, {})
            last_activity = loc_activity.get("last_activity")
            recent_activities = loc_activity.get("activities", [])

            location_items.append({
                "location_id": loc_id,
                "location_name": loc["name"],
                "location_type": loc["type"],
                "on_hand_qty": stock_qty,
                "status": status,
                "last_activity": last_activity,
                "recent_activity": [
                    {
                        "id": a["id"],
                        "type": a["type"],
                        "qty": a["qty"],
                        "created_at": a["created_at"],
                        "notes": a.get("notes")
                    }
                    for a in recent_activities
                ]
            })

        return {
            "locations": location_items,
            "total_stock_kg": total_stock_kg
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=StockScreenResponse)
async def get_stock_overview(
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    user_data: dict = Depends(require_auth)
):
    """Get stock overview for the stock screen."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile for location
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()
        if profile.error:
            raise HTTPException(status_code=500, detail=f"Profile query failed: {profile.error}")

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        # Get all items first (for lookup)
        items_result = supabase.table("items").select("*").execute()
        if items_result.error:
            raise HTTPException(status_code=500, detail=f"Items query failed: {items_result.error}")
        items_map = {item["id"]: item for item in (items_result.data or [])}

        # Get stock balance (view - can't do joins on views in PostgREST)
        balance_query = supabase.table("stock_balance").select("*")
        if location_id:
            balance_query = balance_query.eq("location_id", location_id)
        balance = balance_query.execute()
        if balance.error:
            raise HTTPException(status_code=500, detail=f"Stock balance query failed: {balance.error}")

        # Build overview by aggregating stock per item (across all locations if admin)
        item_totals = {}
        for row in (balance.data or []):
            item_id = row.get("item_id")
            on_hand = row.get("on_hand_qty", 0) or 0

            if item_id not in item_totals:
                item_totals[item_id] = 0
            item_totals[item_id] += on_hand

        # Build overview list
        overview_list = []
        for item_id, total_qty in item_totals.items():
            item_data = items_map.get(item_id, {})

            # Determine status
            if total_qty <= 0:
                status = "out"
            elif total_qty < 100:  # Adjusted threshold for aggregated view
                status = "low"
            else:
                status = "in_stock"

            # Count active batches for this item
            batches_query = supabase.table("stock_batches").select(
                "id"
            ).eq("item_id", item_id).gt("remaining_qty", 0)
            if location_id:
                batches_query = batches_query.eq("location_id", location_id)
            batches = batches_query.execute()
            batch_count = len(batches.data or [])

            overview_list.append(StockOverview(
                item_id=item_id,
                item_name=item_data.get("name", "Unknown"),
                sku=item_data.get("sku", ""),
                on_hand_qty=total_qty,
                unit=item_data.get("unit", "kg"),
                status=status,
                active_batch_count=batch_count
            ))

        # Get active batches (top 5, ordered by received_at for FIFO)
        batches_query = supabase.table("stock_batches").select(
            "*, suppliers(name)"
        ).gt("remaining_qty", 0).order("received_at", desc=False).limit(5)
        if location_id:
            batches_query = batches_query.eq("location_id", location_id)
        batches = batches_query.execute()
        if batches.error:
            raise HTTPException(status_code=500, detail=f"Batches query failed: {batches.error}")

        batch_list = []
        for i, batch in enumerate(batches.data or []):
            batch_list.append(BatchInfo(
                id=batch["id"],
                batch_id_display=batch["id"][:8],
                supplier_name=batch.get("suppliers", {}).get("name", "Unknown") if batch.get("suppliers") else "Unknown",
                received_at=batch["received_at"],
                expiry_date=batch.get("expiry_date"),
                initial_qty=batch["initial_qty"],
                remaining_qty=batch["remaining_qty"],
                quality_score=batch["quality_score"],
                defect_pct=batch.get("defect_pct"),
                is_oldest=(i == 0)
            ))

        # FIFO suggestion (oldest batch)
        fifo_suggestion = None
        if batch_list:
            oldest = batch_list[0]
            fifo_suggestion = FIFOSuggestion(
                batch_id=oldest.id,
                batch_id_display=oldest.batch_id_display,
                received_at=oldest.received_at,
                remaining_qty=oldest.remaining_qty
            )

        return StockScreenResponse(
            overview=overview_list,
            active_batches=batch_list,
            fifo_suggestion=fifo_suggestion
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/receive")
async def receive_stock(request: ReceiveStockRequest, user_data: dict = Depends(require_auth)):
    """Receive new stock - creates batch and transaction."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=400, detail="User profile not found")

        location_id = profile.data.get("location_id")
        if not location_id:
            raise HTTPException(status_code=400, detail="User has no assigned location")

        # Auto-detect item if not provided
        item_id = request.item_id
        if not item_id:
            default_item = get_default_item(supabase)
            item_id = default_item["id"]

        # Convert to kg if needed
        conversion_factor = get_conversion_factor(supabase, item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Create batch (no expiry_date for potatoes, quality scoring removed)
        batch_id = str(uuid4())
        batch_data = {
            "id": batch_id,
            "item_id": item_id,
            "location_id": location_id,
            "supplier_id": request.supplier_id,
            "initial_qty": qty_kg,
            "remaining_qty": qty_kg,
            "received_at": datetime.utcnow().isoformat(),
            "quality_score": 1,  # Default to good quality (field kept for backwards compatibility)
            "status": "available",
            "last_edited_by": user.id,
            "photo_url": request.photo_url
        }

        batch = supabase.table("stock_batches").insert(batch_data)

        # Create transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_to": location_id,
            "item_id": item_id,
            "batch_id": batch_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "receive",
            "notes": request.notes,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity,
                "supplier_id": request.supplier_id
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data)

        # Update batch with transaction id
        supabase.table("stock_batches").eq("id", batch_id).update({
            "receive_transaction_id": transaction.data["id"]
        })

        return {
            "success": True,
            "message": f"Received {qty_kg:.2f} kg",
            "batch_id": batch_id,
            "transaction_id": transaction.data["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issue")
async def issue_stock(request: IssueStockRequest, user_data: dict = Depends(require_auth)):
    """Issue stock - deducts from batch using FIFO automatically."""
    print(f"[ISSUE] ===== WITHDRAWAL REQUEST =====")
    supabase = get_supabase_admin_client()
    user = user_data["user"]
    print(f"[ISSUE] User ID: {user.id}")

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=400, detail="User profile not found")

        location_id = profile.data.get("location_id")
        print(f"[ISSUE] Profile location_id from DB: {location_id}")
        if not location_id:
            raise HTTPException(status_code=400, detail="User has no assigned location")

        # Auto-detect item if not provided
        item_id = request.item_id
        if not item_id:
            default_item = get_default_item(supabase)
            item_id = default_item["id"]

        # Convert to kg (1 bag = 10kg for potatoes)
        conversion_factor = get_conversion_factor(supabase, item_id)
        # Force 10kg per bag for kitchen operations
        if request.unit == "bag":
            conversion_factor = 10.0
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)
        print(f"[ISSUE] Converting {request.quantity} {request.unit} with factor {conversion_factor} = {qty_kg} kg")

        # Get current balance
        balance = supabase.table("stock_balance").select("on_hand_qty").eq(
            "location_id", location_id
        ).eq("item_id", item_id).single().execute()

        current_qty = balance.data.get("on_hand_qty", 0) if balance.data else 0

        # Check if staff trying to go negative
        if current_qty < qty_kg and profile.data["role"] == "staff":
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Current: {current_qty:.2f} kg, Requested: {qty_kg:.2f} kg"
            )

        # Get most recent batch for this location/item to deduct from
        # (mirrors the return logic which works correctly)
        recent_batch = supabase.table("stock_batches").select("id, remaining_qty").eq(
            "location_id", location_id
        ).eq("item_id", item_id).order(
            "received_at", desc=True
        ).limit(1).execute()

        batch_id = None
        if recent_batch.data:
            batch_id = recent_batch.data[0]["id"]
            # Subtract quantity from batch (mirror of return logic which adds)
            old_remaining = recent_batch.data[0]["remaining_qty"]
            new_remaining = old_remaining - qty_kg
            print(f"[ISSUE] Batch {batch_id}: {old_remaining} - {qty_kg} = {new_remaining}")
            update_result = supabase.table("stock_batches").eq("id", batch_id).update({
                "remaining_qty": new_remaining
            })
            print(f"[ISSUE] Update result: {update_result.data}")
        else:
            print(f"[ISSUE] WARNING: No batch found to deduct from!")

        # Create transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_from": location_id,
            "item_id": item_id,
            "batch_id": batch_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "issue",
            "notes": request.notes,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data)
        print(f"[ISSUE] Created transaction: id={transaction.data['id'] if transaction.data else 'NONE'}, location_id_from={location_id}, type=issue")

        # Calculate new total for verification
        new_total_batches = get_batch_totals(supabase, location_id)
        new_total_kg = sum(bt.get("on_hand_qty", 0) or 0 for bt in new_total_batches)
        print(f"[ISSUE] New total after withdrawal: {new_total_kg} kg ({new_total_kg/10:.0f} bags)")

        return {
            "success": True,
            "message": f"Issued {qty_kg:.2f} kg",
            "transaction_id": transaction.data["id"] if transaction.data else None,
            "batch_id": batch_id,
            "debug": {
                "qty_deducted_kg": qty_kg,
                "new_total_kg": new_total_kg,
                "new_total_bags": int(new_total_kg / 10)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transfer")
async def transfer_stock(request: TransferStockRequest, user_data: dict = Depends(require_manager)):
    """Transfer stock between locations - managers only."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        if request.from_location_id == request.to_location_id:
            raise HTTPException(status_code=400, detail="Source and destination must be different")

        # Auto-detect item if not provided
        item_id = request.item_id
        if not item_id:
            default_item = get_default_item(supabase)
            item_id = default_item["id"]

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Check source balance
        source_balance = supabase.table("stock_balance").select("on_hand_qty").eq(
            "location_id", request.from_location_id
        ).eq("item_id", item_id).single().execute()

        source_qty = source_balance.data.get("on_hand_qty", 0) if source_balance.data else 0

        if source_qty < qty_kg:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock at source. Available: {source_qty:.2f} kg"
            )

        # Create transfer transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_from": request.from_location_id,
            "location_id_to": request.to_location_id,
            "item_id": item_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "transfer",
            "notes": request.notes,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data)

        return {
            "success": True,
            "message": f"Transferred {qty_kg:.2f} kg",
            "transaction_id": transaction.data["id"] if transaction.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/waste")
async def record_waste(request: WasteStockRequest, user_data: dict = Depends(require_auth)):
    """Record stock waste."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=400, detail="User profile not found")

        location_id = profile.data.get("location_id")
        if not location_id:
            raise HTTPException(status_code=400, detail="User has no assigned location")

        # Auto-detect item if not provided
        item_id = request.item_id
        if not item_id:
            default_item = get_default_item(supabase)
            item_id = default_item["id"]

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Create waste transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_from": location_id,
            "item_id": item_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "waste",
            "notes": request.notes,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity,
                "reason": request.reason
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data)

        return {
            "success": True,
            "message": f"Recorded {qty_kg:.2f} kg waste",
            "transaction_id": transaction.data["id"] if transaction.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/return")
async def return_stock(request: IssueStockRequest, user_data: dict = Depends(require_auth)):
    """Return unused stock - adds back to the most recent batch."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=400, detail="User profile not found")

        location_id = profile.data.get("location_id")
        if not location_id:
            raise HTTPException(status_code=400, detail="User has no assigned location")

        # Auto-detect item if not provided
        item_id = request.item_id
        if not item_id:
            default_item = get_default_item(supabase)
            item_id = default_item["id"]

        # Convert to kg (1 bag = 10kg for potatoes)
        conversion_factor = get_conversion_factor(supabase, item_id)
        # Force 10kg per bag for kitchen operations
        if request.unit == "bag":
            conversion_factor = 10.0
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)
        print(f"[RETURN] Converting {request.quantity} {request.unit} with factor {conversion_factor} = {qty_kg} kg")

        # Get most recent batch for this location/item to add back to
        recent_batch = supabase.table("stock_batches").select("id, remaining_qty").eq(
            "location_id", location_id
        ).eq("item_id", item_id).order(
            "received_at", desc=True
        ).limit(1).execute()

        batch_id = None
        if recent_batch.data:
            batch_id = recent_batch.data[0]["id"]
            # Add quantity back to batch
            old_remaining = recent_batch.data[0]["remaining_qty"]
            new_remaining = old_remaining + qty_kg
            print(f"[RETURN] Batch {batch_id}: {old_remaining} + {qty_kg} = {new_remaining}")
            update_result = supabase.table("stock_batches").eq("id", batch_id).update({
                "remaining_qty": new_remaining
            })
            print(f"[RETURN] Update result: {update_result.data}")
        else:
            # No existing batch, create a new one for the return
            batch_id = str(uuid4())
            batch_data = {
                "id": batch_id,
                "item_id": item_id,
                "location_id": location_id,
                "initial_qty": qty_kg,
                "remaining_qty": qty_kg,
                "received_at": datetime.utcnow().isoformat(),
                "quality_score": 1,
                "status": "available",
                "last_edited_by": user.id
            }
            supabase.table("stock_batches").insert(batch_data)

        # Create return transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_to": location_id,
            "item_id": item_id,
            "batch_id": batch_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "return",
            "notes": request.notes or "Kitchen return - unused stock",
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data)
        print(f"[RETURN] Created transaction: id={transaction.data['id'] if transaction.data else 'NONE'}, location_id_to={location_id}, type=return")

        return {
            "success": True,
            "message": f"Returned {qty_kg:.2f} kg to stock",
            "transaction_id": transaction.data["id"] if transaction.data else None,
            "batch_id": batch_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balance")
async def get_stock_balance(
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    user_data: dict = Depends(require_auth)
):
    """Get current stock balance."""
    print(f"[BALANCE] ===== FETCHING STOCK BALANCE =====")
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None
        print(f"[BALANCE] Location ID: {location_id}")

        query = supabase.table("stock_balance").select(
            "*, locations(name), items(name, sku, unit)"
        )
        if location_id:
            query = query.eq("location_id", location_id)

        balance = query.execute()

        # Calculate batch totals
        batch_totals = get_batch_totals(supabase, location_id)

        # Log the totals for debugging
        balance_total = sum(item.get("on_hand_qty", 0) or 0 for item in (balance.data or []))
        batch_total = sum(bt.get("on_hand_qty", 0) or 0 for bt in batch_totals)
        print(f"[BALANCE] stock_balance view total: {balance_total} kg ({balance_total/10:.0f} bags)")
        print(f"[BALANCE] batch_totals calculation: {batch_total} kg ({batch_total/10:.0f} bags)")

        return {
            "balance": [
                {
                    "location_id": item["location_id"],
                    "item_id": item["item_id"],
                    "on_hand_qty": item["on_hand_qty"],
                    "location_name": item.get("locations", {}).get("name") if item.get("locations") else None,
                    "item_name": item.get("items", {}).get("name") if item.get("items") else None,
                    "unit": item.get("items", {}).get("unit", "kg") if item.get("items") else "kg"
                }
                for item in (balance.data or [])
            ],
            # Fallback: also return batch totals for locations where view may not have data
            "batch_totals": batch_totals
        }


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
