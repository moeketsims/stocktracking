from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Literal
from datetime import datetime, timedelta
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth
from ..models.responses import BatchInfo

router = APIRouter(prefix="/batches", tags=["Batch Management"])


@router.get("")
async def get_batches(
    filter_type: Optional[Literal["all", "expiring_soon", "poor_quality"]] = "all",
    item_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    user_data: dict = Depends(require_auth)
):
    """Get batches with optional filtering."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("location_id").eq(
            "user_id", user.id
        ).single().execute()

        location_id = profile.data.get("location_id") if profile.data else None

        # Build query - include locations for owner dashboard expiring batches view
        query = supabase.table("stock_batches").select(
            "*, suppliers(name), items(name), locations(name)"
        ).gt("remaining_qty", 0)

        if location_id:
            query = query.eq("location_id", location_id)

        if item_id:
            query = query.eq("item_id", item_id)

        # Apply filters
        if filter_type == "expiring_soon":
            expiry_threshold = (datetime.now() + timedelta(days=7)).date().isoformat()
            query = query.lte("expiry_date", expiry_threshold)
        elif filter_type == "poor_quality":
            query = query.eq("quality_score", 3)

        # Order by received_at for FIFO
        query = query.order("received_at", desc=False).limit(limit)

        result = query.execute()

        # Get counts for each filter
        all_count_query = supabase.table("stock_batches").select("id").gt("remaining_qty", 0)
        if location_id:
            all_count_query = all_count_query.eq("location_id", location_id)
        all_count_result = all_count_query.execute()
        all_count = len(all_count_result.data or [])

        expiry_threshold = (datetime.now() + timedelta(days=7)).date().isoformat()
        expiring_count_query = supabase.table("stock_batches").select(
            "id"
        ).gt("remaining_qty", 0).lte("expiry_date", expiry_threshold)
        if location_id:
            expiring_count_query = expiring_count_query.eq("location_id", location_id)
        expiring_count_result = expiring_count_query.execute()
        expiring_count = len(expiring_count_result.data or [])

        poor_count_query = supabase.table("stock_batches").select(
            "id"
        ).gt("remaining_qty", 0).eq("quality_score", 3)
        if location_id:
            poor_count_query = poor_count_query.eq("location_id", location_id)
        poor_count_result = poor_count_query.execute()
        poor_count = len(poor_count_result.data or [])

        # Format batches
        batches = []
        for i, batch in enumerate(result.data or []):
            supplier_name = "Unknown"
            if batch.get("suppliers"):
                supplier_name = batch["suppliers"].get("name", "Unknown")

            item_name = "Unknown"
            if batch.get("items"):
                item_name = batch["items"].get("name", "Unknown")

            location_name = "Unknown"
            if batch.get("locations"):
                location_name = batch["locations"].get("name", "Unknown")

            batches.append({
                "id": batch["id"],
                "batch_id_display": batch["id"][:8],
                "item_id": batch["item_id"],
                "item_name": item_name,
                "supplier_name": supplier_name,
                "location_name": location_name,
                "received_at": batch["received_at"],
                "expiry_date": batch.get("expiry_date"),
                "initial_qty": batch["initial_qty"],
                "remaining_qty": batch["remaining_qty"],
                "used_qty": batch["initial_qty"] - batch["remaining_qty"],
                "quality_score": batch["quality_score"],
                "defect_pct": batch.get("defect_pct"),
                "quality_notes": batch.get("quality_notes"),
                "is_oldest": (i == 0)
            })

        return {
            "batches": batches,
            "counts": {
                "all": all_count,
                "expiring_soon": expiring_count,
                "poor_quality": poor_count
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{batch_id}")
async def get_batch(batch_id: str, user_data: dict = Depends(require_auth)):
    """Get single batch details."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("stock_batches").select(
            "*, suppliers(name, contact_name, contact_phone), items(name, sku)"
        ).eq("id", batch_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        batch = result.data
        return {
            "id": batch["id"],
            "batch_id_display": batch["id"][:8],
            "item": batch.get("items"),
            "supplier": batch.get("suppliers"),
            "received_at": batch["received_at"],
            "expiry_date": batch.get("expiry_date"),
            "initial_qty": batch["initial_qty"],
            "remaining_qty": batch["remaining_qty"],
            "used_qty": batch["initial_qty"] - batch["remaining_qty"],
            "quality_score": batch["quality_score"],
            "defect_pct": batch.get("defect_pct"),
            "quality_notes": batch.get("quality_notes"),
            "photo_url": batch.get("photo_url")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oldest/{item_id}")
async def get_oldest_batch(item_id: str, user_data: dict = Depends(require_auth)):
    """Get oldest batch for FIFO suggestion."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("location_id").eq(
            "user_id", user.id
        ).single().execute()

        location_id = profile.data.get("location_id") if profile.data else None

        query = supabase.table("stock_batches").select(
            "id, remaining_qty, received_at"
        ).eq("item_id", item_id).gt("remaining_qty", 0).order(
            "received_at", desc=False
        ).limit(1)

        if location_id:
            query = query.eq("location_id", location_id)

        result = query.execute()

        if not result.data:
            return {"suggestion": None}

        batch = result.data[0]
        return {
            "suggestion": {
                "batch_id": batch["id"],
                "batch_id_display": batch["id"][:8],
                "remaining_qty": batch["remaining_qty"],
                "received_at": batch["received_at"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
