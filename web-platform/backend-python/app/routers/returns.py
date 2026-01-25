from fastapi import APIRouter, HTTPException, Depends
from uuid import uuid4
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth
from ..routers.stock import convert_to_kg, get_conversion_factor
from ..models.requests import ReturnStockRequest

router = APIRouter(prefix="/returns", tags=["Stock Returns"])


@router.post("")
async def return_stock(request: ReturnStockRequest, user_data: dict = Depends(require_auth)):
    """Process stock return - returns to original batch or creates new batch.

    When creating a new batch from returns, it defaults to 'quarantine' status
    for inspection before being made available.
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
                raise HTTPException(status_code=400, detail="Location required for return")

        # Convert to kg
        conversion_factor = get_conversion_factor(supabase, request.item_id)
        qty_kg = convert_to_kg(request.quantity, request.unit, conversion_factor)

        batch_id = None
        supplier_id = None

        if request.return_to_original and request.original_batch_id:
            # Return to original batch
            batch = supabase.table("stock_batches").select(
                "remaining_qty, supplier_id, status, location_id"
            ).eq("id", request.original_batch_id).single().execute()

            if not batch.data:
                raise HTTPException(status_code=404, detail="Original batch not found")

            supplier_id = batch.data["supplier_id"]

            # Update batch remaining qty
            new_remaining = batch.data["remaining_qty"] + qty_kg

            # Determine new status
            new_status = batch.data["status"]
            if batch.data["status"] == "depleted":
                new_status = "available"  # Restore to available when stock returned

            supabase.table("stock_batches").eq("id", request.original_batch_id).update({
                "remaining_qty": new_remaining,
                "status": new_status
            }).execute()

            batch_id = request.original_batch_id

        else:
            # Create new batch for returned stock
            if not request.quality_score:
                raise HTTPException(
                    status_code=400,
                    detail="Quality score required when creating new batch from return"
                )

            # Get supplier from original batch if available
            if request.original_batch_id:
                orig = supabase.table("stock_batches").select("supplier_id").eq(
                    "id", request.original_batch_id
                ).single().execute()
                supplier_id = orig.data.get("supplier_id") if orig.data else None

            if not supplier_id:
                raise HTTPException(
                    status_code=400,
                    detail="Original batch required to determine supplier for new batch"
                )

            batch_id = str(uuid4())
            supabase.table("stock_batches").insert({
                "id": batch_id,
                "item_id": request.item_id,
                "location_id": location_id,
                "supplier_id": supplier_id,
                "initial_qty": qty_kg,
                "remaining_qty": qty_kg,
                "quality_score": request.quality_score,
                "quality_notes": f"Returned stock: {request.return_reason}",
                "status": "quarantine"  # Returns go to quarantine by default for inspection
            }).execute()

        # Create return transaction
        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_to": location_id,
            "item_id": request.item_id,
            "batch_id": batch_id,
            "original_batch_id": request.original_batch_id,
            "qty": qty_kg,
            "unit": "kg",
            "type": "return",
            "return_reason": request.return_reason,
            "notes": request.notes,
            "metadata": {
                "original_unit": request.unit,
                "original_qty": request.quantity,
                "return_reason": request.return_reason,
                "returned_to_original": request.return_to_original,
                "created_new_batch": not request.return_to_original
            }
        }

        transaction = supabase.table("stock_transactions").insert(transaction_data).execute()

        return_message = "Returned to original batch" if request.return_to_original else "Created new batch (quarantine)"

        return {
            "success": True,
            "message": f"Returned {qty_kg:.2f} kg - {return_message}",
            "transaction_id": transaction.data["id"] if transaction.data else None,
            "batch_id": batch_id,
            "batch_status": "available" if request.return_to_original else "quarantine"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_returns(limit: int = 10, user_data: dict = Depends(require_auth)):
    """Get recent return transactions."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("location_id, role").eq(
            "user_id", user.id
        ).single().execute()

        location_id = profile.data.get("location_id") if profile.data else None

        # Build query
        query = supabase.table("stock_transactions").select(
            "id, created_at, qty, return_reason, notes, batch_id, original_batch_id, "
            "items(name), profiles!stock_transactions_created_by_fkey(full_name)"
        ).eq("type", "return").order("created_at", desc=True).limit(limit)

        if location_id and profile.data.get("role") not in ("admin", "zone_manager"):
            query = query.eq("location_id_to", location_id)

        returns = query.execute()

        return {"returns": returns.data or []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
