from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from uuid import uuid4
from typing import Optional
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager
from ..models.requests import BatchEditRequest

router = APIRouter(prefix="/batch-management", tags=["Batch Management"])


@router.patch("/{batch_id}")
async def edit_batch(batch_id: str, request: BatchEditRequest, user_data: dict = Depends(require_manager)):
    """Edit batch details - managers only. All changes are tracked in edit history."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get current batch
        batch = supabase.table("stock_batches").select("*").eq("id", batch_id).single().execute()
        if not batch.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        updates = {}
        edit_records = []

        # Track each change
        if request.expiry_date is not None:
            old_value = batch.data.get("expiry_date")
            if request.expiry_date != old_value:
                edit_records.append({
                    "id": str(uuid4()),
                    "batch_id": batch_id,
                    "edited_by": user.id,
                    "field_changed": "expiry_date",
                    "old_value": old_value,
                    "new_value": request.expiry_date,
                    "edit_reason": request.edit_reason
                })
                updates["expiry_date"] = request.expiry_date

        if request.quality_notes is not None:
            old_value = batch.data.get("quality_notes")
            if request.quality_notes != old_value:
                edit_records.append({
                    "id": str(uuid4()),
                    "batch_id": batch_id,
                    "edited_by": user.id,
                    "field_changed": "quality_notes",
                    "old_value": old_value,
                    "new_value": request.quality_notes,
                    "edit_reason": request.edit_reason
                })
                updates["quality_notes"] = request.quality_notes

        if request.quality_score is not None:
            old_value = batch.data.get("quality_score")
            if request.quality_score != old_value:
                edit_records.append({
                    "id": str(uuid4()),
                    "batch_id": batch_id,
                    "edited_by": user.id,
                    "field_changed": "quality_score",
                    "old_value": str(old_value) if old_value else None,
                    "new_value": str(request.quality_score),
                    "edit_reason": request.edit_reason
                })
                updates["quality_score"] = request.quality_score

        if request.status is not None:
            old_value = batch.data.get("status")
            if request.status != old_value:
                # Don't allow changing from depleted to available without stock
                if old_value == "depleted" and request.status == "available":
                    if batch.data.get("remaining_qty", 0) == 0:
                        raise HTTPException(
                            status_code=400,
                            detail="Cannot set depleted batch to available. Use adjustment to add stock first."
                        )

                edit_records.append({
                    "id": str(uuid4()),
                    "batch_id": batch_id,
                    "edited_by": user.id,
                    "field_changed": "status",
                    "old_value": old_value,
                    "new_value": request.status,
                    "edit_reason": request.edit_reason
                })
                updates["status"] = request.status

        if not updates:
            return {"success": True, "message": "No changes detected", "changes": []}

        # Update batch
        updates["last_edited_by"] = user.id
        updates["last_edited_at"] = datetime.utcnow().isoformat()

        supabase.table("stock_batches").update(updates).eq("id", batch_id).execute()

        # Record edit history
        if edit_records:
            for record in edit_records:
                supabase.table("batch_edit_history").insert(record).execute()

        return {
            "success": True,
            "message": f"Updated {len(edit_records)} field(s)",
            "changes": [r["field_changed"] for r in edit_records]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{batch_id}/history")
async def get_batch_edit_history(batch_id: str, user_data: dict = Depends(require_manager)):
    """Get edit history for a batch - shows all changes with who made them."""
    supabase = get_supabase_admin_client()

    try:
        # Verify batch exists
        batch = supabase.table("stock_batches").select("id").eq("id", batch_id).single().execute()
        if not batch.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Get edit history with editor names
        history = supabase.table("batch_edit_history").select(
            "id, batch_id, edited_at, field_changed, old_value, new_value, edit_reason, edited_by"
        ).eq("batch_id", batch_id).order("edited_at", desc=True).execute()

        # Get editor names
        history_with_names = []
        editor_ids = list(set(h["edited_by"] for h in (history.data or [])))

        if editor_ids:
            profiles = supabase.table("profiles").select("user_id, full_name").in_(
                "user_id", editor_ids
            ).execute()
            name_map = {p["user_id"]: p["full_name"] for p in (profiles.data or [])}

            for h in (history.data or []):
                h["editor_name"] = name_map.get(h["edited_by"], "Unknown")
                history_with_names.append(h)
        else:
            history_with_names = history.data or []

        return {"history": history_with_names}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{batch_id}")
async def get_batch_details(batch_id: str, user_data: dict = Depends(require_manager)):
    """Get full batch details including edit history summary."""
    supabase = get_supabase_admin_client()

    try:
        batch = supabase.table("stock_batches").select(
            "*, suppliers(name, contact_name, contact_phone), items(name, sku)"
        ).eq("id", batch_id).single().execute()

        if not batch.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Get edit count
        history_count = supabase.table("batch_edit_history").select(
            "id", count="exact"
        ).eq("batch_id", batch_id).execute()

        batch_data = batch.data
        batch_data["edit_count"] = history_count.count if hasattr(history_count, 'count') else 0

        return batch_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statuses/list")
async def get_batch_statuses():
    """Get list of valid batch statuses with descriptions."""
    return {
        "statuses": [
            {"value": "available", "label": "Available", "description": "Ready to be issued", "color": "green"},
            {"value": "quarantine", "label": "Quarantine", "description": "Under inspection, cannot be issued", "color": "amber"},
            {"value": "hold", "label": "On Hold", "description": "Reserved or temporarily unavailable", "color": "gray"},
            {"value": "depleted", "label": "Depleted", "description": "No remaining stock", "color": "red"}
        ]
    }
