from fastapi import APIRouter, HTTPException, Depends
from uuid import uuid4
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager
from ..routers.stock import convert_to_kg, get_conversion_factor
from ..models.requests import AdjustmentRequest

router = APIRouter(prefix="/adjustments", tags=["Inventory Adjustments"])


@router.post("")
async def create_adjustment(request: AdjustmentRequest, user_data: dict = Depends(require_manager)):
    """Create inventory adjustment - managers only.

    Supports both positive (found stock) and negative (theft, count error) adjustments.
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile for location
        profile = supabase.table("profiles").select("location_id, role").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=400, detail="User profile not found")

        # Get location: from profile first, then from request
        location_id = profile.data.get("location_id")
        if not location_id:
            if profile.data["role"] in ("admin", "zone_manager") and request.location_id:
                location_id = request.location_id
            else:
                raise HTTPException(status_code=400, detail="Location required for adjustment")

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, request.item_id)
        qty_kg = convert_to_kg(abs(request.quantity), request.unit, conversion_factor)

        # Apply sign from original quantity
        if request.quantity < 0:
            qty_kg = -qty_kg

        # Determine transaction direction
        is_positive = qty_kg > 0

        # If negative adjustment, validate we have enough stock
        if not is_positive:
            batches = supabase.table("stock_batches").select("remaining_qty").eq(
                "location_id", location_id
            ).eq("item_id", request.item_id).eq("status", "available").gt("remaining_qty", 0).execute()

            current_qty = sum(b.get("remaining_qty", 0) for b in (batches.data or []))

            if current_qty < abs(qty_kg):
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot adjust below zero. Current stock: {current_qty:.2f} kg, Adjustment: {qty_kg:.2f} kg"
                )

        # Create transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_to": location_id if is_positive else None,
            "location_id_from": location_id if not is_positive else None,
            "item_id": request.item_id,
            "batch_id": request.batch_id,
            "qty": abs(qty_kg),
            "unit": "kg",
            "type": "adjustment",
            "notes": request.notes,
            "adjustment_reason": request.reason,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity,
                "reason": request.reason,
                "is_positive": is_positive
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data).execute()

        # Update batch if specified
        if request.batch_id:
            batch = supabase.table("stock_batches").select("remaining_qty, status").eq(
                "id", request.batch_id
            ).single().execute()

            if batch.data:
                new_remaining = max(0, batch.data["remaining_qty"] + qty_kg)
                update_data = {"remaining_qty": new_remaining}

                # Update status if depleted or restored
                if new_remaining == 0:
                    update_data["status"] = "depleted"
                elif batch.data["status"] == "depleted" and new_remaining > 0:
                    update_data["status"] = "available"

                supabase.table("stock_batches").eq("id", request.batch_id).update(update_data).execute()

        return {
            "success": True,
            "message": f"Adjustment recorded: {'+' if is_positive else ''}{qty_kg:.2f} kg ({request.reason})",
            "transaction_id": transaction.data[0]["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reasons")
async def get_adjustment_reasons():
    """Get list of valid adjustment reasons."""
    return {
        "reasons": [
            {"value": "count_error", "label": "Counting Error", "description": "Physical count differs from system"},
            {"value": "theft", "label": "Theft/Loss", "description": "Stock missing or stolen"},
            {"value": "found_stock", "label": "Found Stock", "description": "Unrecorded stock discovered"},
            {"value": "damage_write_off", "label": "Damage Write-off", "description": "Stock damaged beyond use"},
            {"value": "system_correction", "label": "System Correction", "description": "Correcting system error"},
            {"value": "other", "label": "Other", "description": "Other reason - specify in notes"}
        ]
    }
