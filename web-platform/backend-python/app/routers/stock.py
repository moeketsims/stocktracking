from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from uuid import uuid4
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, require_manager, get_view_location_id
from ..models.requests import (
    ReceiveStockRequest,
    IssueStockRequest,
    TransferStockRequest,
    WasteStockRequest
)
from ..models.responses import StockScreenResponse, StockOverview, BatchInfo, FIFOSuggestion

router = APIRouter(prefix="/stock", tags=["Stock Operations"])


def get_conversion_factor(supabase, item_id: str) -> float:
    """Get item's conversion factor for bag to kg conversion."""
    item = supabase.table("items").select("conversion_factor").eq("id", item_id).single().execute()
    return item.data.get("conversion_factor", 10.0) if item.data else 10.0


def convert_to_kg(quantity: float, unit: str, conversion_factor: float) -> float:
    """Convert quantity to kg based on unit."""
    if unit == "bag":
        return quantity * conversion_factor
    return quantity


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

        # Convert to kg if needed
        conversion_factor = get_conversion_factor(supabase, request.item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Create batch
        batch_id = str(uuid4())
        batch_data = {
            "id": batch_id,
            "item_id": request.item_id,
            "location_id": location_id,
            "supplier_id": request.supplier_id,
            "initial_qty": qty_kg,
            "remaining_qty": qty_kg,
            "quality_score": request.quality_score,
            "defect_pct": request.defect_pct,
            "quality_notes": request.quality_notes,
            "expiry_date": request.expiry_date,
            "photo_url": request.photo_url
        }

        batch = supabase.table("stock_batches").insert(batch_data)

        # Create transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_to": location_id,
            "item_id": request.item_id,
            "batch_id": batch_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "receive",
            "notes": request.notes,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity,
                "supplier_id": request.supplier_id,
                "quality_score": request.quality_score
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data)

        # Update batch with transaction id
        supabase.table("stock_batches").update({
            "receive_transaction_id": transaction.data["id"]
        }).eq("id", batch_id).execute()

        return {
            "success": True,
            "message": f"Received {qty_kg:.2f} kg",
            "batch_id": batch_id,
            "transaction_id": transaction.data[0]["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issue")
async def issue_stock(request: IssueStockRequest, user_data: dict = Depends(require_auth)):
    """Issue stock - deducts from batch using FIFO if no batch specified."""
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

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, request.item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Get current balance
        balance = supabase.table("stock_balance").select("on_hand_qty").eq(
            "location_id", location_id
        ).eq("item_id", request.item_id).single().execute()

        current_qty = balance.data.get("on_hand_qty", 0) if balance.data else 0

        # Check if staff trying to go negative
        if current_qty < qty_kg and profile.data["role"] == "staff":
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Current: {current_qty:.2f} kg, Requested: {qty_kg:.2f} kg"
            )

        # Determine which batch to use
        batch_id = request.batch_id
        if not batch_id:
            # Use FIFO - get oldest batch with remaining qty
            oldest = supabase.table("stock_batches").select("id, remaining_qty").eq(
                "location_id", location_id
            ).eq("item_id", request.item_id).gt("remaining_qty", 0).order(
                "received_at", desc=False
            ).limit(1).execute()

            if oldest.data:
                batch_id = oldest.data[0]["id"]

        # Deduct from batch if specified
        if batch_id:
            batch = supabase.table("stock_batches").select("remaining_qty").eq(
                "id", batch_id
            ).single().execute()

            if batch.data:
                new_remaining = max(0, batch.data["remaining_qty"] - qty_kg)
                supabase.table("stock_batches").update({
                    "remaining_qty": new_remaining
                }).eq("id", batch_id).execute()

        # Create transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_from": location_id,
            "item_id": request.item_id,
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

        return {
            "success": True,
            "message": f"Issued {qty_kg:.2f} kg",
            "transaction_id": transaction.data["id"],
            "batch_id": batch_id
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

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, request.item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Check source balance
        source_balance = supabase.table("stock_balance").select("on_hand_qty").eq(
            "location_id", request.from_location_id
        ).eq("item_id", request.item_id).single().execute()

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
            "item_id": request.item_id,
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
            "transaction_id": transaction.data["id"]
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

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, request.item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        # Create waste transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_from": location_id,
            "item_id": request.item_id,
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
            "transaction_id": transaction.data["id"]
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
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        query = supabase.table("stock_balance").select(
            "*, locations(name), items(name, sku, unit)"
        )
        if location_id:
            query = query.eq("location_id", location_id)

        balance = query.execute()

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
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
