from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel

from ..config import get_supabase_admin_client
from ..routers.auth import require_manager, get_view_location_id

router = APIRouter(prefix="/stock-takes", tags=["Stock Takes"])


# ---------- Request models ----------

class CreateStockTakeRequest(BaseModel):
    location_id: Optional[str] = None
    notes: Optional[str] = None


class UpdateLineCountRequest(BaseModel):
    counted_qty: float
    notes: Optional[str] = None


class CompleteStockTakeRequest(BaseModel):
    notes: Optional[str] = None


# ---------- Endpoints ----------

@router.post("")
async def create_stock_take(
    request: CreateStockTakeRequest,
    user_data: dict = Depends(require_manager),
):
    """Start a new stock take for a location. Creates lines from current stock balance."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]
    profile = user_data.get("profile", {})

    location_id = request.location_id or profile.get("location_id")
    if not location_id:
        raise HTTPException(status_code=400, detail="Location required")

    # Prevent multiple in-progress stock takes for the same location
    existing = supabase.table("stock_takes").select("id").eq(
        "location_id", location_id
    ).eq("status", "in_progress").execute()

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="A stock take is already in progress for this location"
        )

    try:
        stock_take_id = str(uuid4())
        supabase.table("stock_takes").insert({
            "id": stock_take_id,
            "location_id": location_id,
            "initiated_by": user.id,
            "status": "in_progress",
            "notes": request.notes,
        }).execute()

        # Get current stock balance for this location (only items with stock)
        stock_balance = supabase.table("stock_balance").select(
            "item_id, on_hand_qty"
        ).eq("location_id", location_id).execute()

        balance_map = {
            row["item_id"]: float(row["on_hand_qty"] or 0)
            for row in (stock_balance.data or [])
        }

        # Only include items that have stock at this location
        lines = []
        for item_id, qty in balance_map.items():
            lines.append({
                "id": str(uuid4()),
                "stock_take_id": stock_take_id,
                "item_id": item_id,
                "expected_qty": qty,
            })

        if lines:
            supabase.table("stock_take_lines").insert(lines).execute()

        supabase.table("stock_takes").update({
            "total_lines": len(lines),
        }).eq("id", stock_take_id).execute()

        return {
            "success": True,
            "stock_take_id": stock_take_id,
            "lines_created": len(lines),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_stock_takes(
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    view_location_id: Optional[str] = None,
    user_data: dict = Depends(require_manager),
):
    """List stock takes."""
    supabase = get_supabase_admin_client()
    profile = user_data.get("profile", {})
    location_id = get_view_location_id(profile, view_location_id)

    query = supabase.table("stock_takes").select(
        "*, locations(name)"
    ).order("started_at", desc=True).limit(limit)

    if location_id:
        query = query.eq("location_id", location_id)
    if status:
        query = query.eq("status", status)

    result = query.execute()

    # Fetch initiator names
    stock_takes = result.data or []
    if stock_takes:
        initiator_ids = list({st["initiated_by"] for st in stock_takes if st.get("initiated_by")})
        if initiator_ids:
            profiles = supabase.table("profiles").select(
                "user_id, full_name"
            ).in_("user_id", initiator_ids).execute()
            name_map = {p["user_id"]: p["full_name"] for p in (profiles.data or [])}
            for st in stock_takes:
                st["initiated_by_name"] = name_map.get(st["initiated_by"], "Unknown")

    return {"stock_takes": stock_takes}


@router.get("/{stock_take_id}")
async def get_stock_take(
    stock_take_id: str,
    user_data: dict = Depends(require_manager),
):
    """Get stock take details with all lines."""
    supabase = get_supabase_admin_client()
    profile = user_data.get("profile", {})

    header = supabase.table("stock_takes").select(
        "*, locations(name)"
    ).eq("id", stock_take_id).single().execute()

    if not header.data:
        raise HTTPException(status_code=404, detail="Stock take not found")

    # Verify user has access to this stock take's location
    allowed_location = get_view_location_id(profile, None)
    if allowed_location and header.data["location_id"] != allowed_location:
        raise HTTPException(status_code=403, detail="Not authorized for this location")

    # Attach initiator name
    if header.data.get("initiated_by"):
        profile = supabase.table("profiles").select("full_name").eq(
            "user_id", header.data["initiated_by"]
        ).single().execute()
        header.data["initiated_by_name"] = (profile.data or {}).get("full_name", "Unknown")

    lines = supabase.table("stock_take_lines").select(
        "*, items(name, unit, sku, conversion_factor)"
    ).eq("stock_take_id", stock_take_id).execute()

    return {
        "stock_take": header.data,
        "lines": lines.data or [],
    }


@router.patch("/{stock_take_id}/lines/{line_id}")
async def update_line_count(
    stock_take_id: str,
    line_id: str,
    request: UpdateLineCountRequest,
    user_data: dict = Depends(require_manager),
):
    """Save a counted quantity for a stock take line."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    # Verify stock take is in progress
    stock_take = supabase.table("stock_takes").select("status").eq(
        "id", stock_take_id
    ).single().execute()
    if not stock_take.data or stock_take.data["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Stock take is not in progress")

    # Get line
    line = supabase.table("stock_take_lines").select(
        "expected_qty, counted_qty"
    ).eq("id", line_id).eq("stock_take_id", stock_take_id).single().execute()

    if not line.data:
        raise HTTPException(status_code=404, detail="Line not found")

    expected = float(line.data["expected_qty"])
    counted = float(request.counted_qty)
    variance = round(counted - expected, 2)
    variance_pct = round((variance / expected * 100), 2) if expected != 0 else (
        100.0 if counted > 0 else 0.0
    )

    was_previously_counted = line.data["counted_qty"] is not None

    supabase.table("stock_take_lines").update({
        "counted_qty": counted,
        "variance": variance,
        "variance_pct": variance_pct,
        "notes": request.notes,
        "counted_at": datetime.utcnow().isoformat(),
        "counted_by": user.id,
    }).eq("id", line_id).execute()

    # Update stock take progress counters
    all_lines = supabase.table("stock_take_lines").select(
        "counted_qty, variance"
    ).eq("stock_take_id", stock_take_id).execute()

    lines_counted = sum(1 for l in (all_lines.data or []) if l["counted_qty"] is not None)
    variance_count = sum(
        1 for l in (all_lines.data or [])
        if l["variance"] is not None and abs(float(l["variance"])) > 0.01
    )

    supabase.table("stock_takes").update({
        "lines_counted": lines_counted,
        "variance_count": variance_count,
    }).eq("id", stock_take_id).execute()

    return {
        "success": True,
        "variance": variance,
        "variance_pct": variance_pct,
        "lines_counted": lines_counted,
    }


@router.post("/{stock_take_id}/complete")
async def complete_stock_take(
    stock_take_id: str,
    request: CompleteStockTakeRequest,
    user_data: dict = Depends(require_manager),
):
    """Complete stock take and create adjustment transactions for variances."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    stock_take = supabase.table("stock_takes").select(
        "location_id, status, total_lines, lines_counted"
    ).eq("id", stock_take_id).single().execute()

    if not stock_take.data:
        raise HTTPException(status_code=404, detail="Stock take not found")
    if stock_take.data["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Stock take is not in progress")
    if stock_take.data["lines_counted"] < stock_take.data["total_lines"]:
        raise HTTPException(status_code=400, detail="Not all items have been counted yet")

    location_id = stock_take.data["location_id"]

    # Get all lines with non-zero variance
    lines = supabase.table("stock_take_lines").select(
        "item_id, expected_qty, counted_qty, variance"
    ).eq("stock_take_id", stock_take_id).execute()

    adjustments_created = 0
    for line in (lines.data or []):
        variance = float(line.get("variance") or 0)
        if abs(variance) < 0.01:
            continue

        is_positive = variance > 0

        transaction_data = {
            "id": str(uuid4()),
            "created_by": user.id,
            "location_id_to": location_id if is_positive else None,
            "location_id_from": location_id if not is_positive else None,
            "item_id": line["item_id"],
            "qty": abs(variance),
            "unit": "kg",
            "type": "adjustment",
            "notes": f"Stock take adjustment (expected: {line['expected_qty']}, counted: {line['counted_qty']})",
            "adjustment_reason": "count_error",
            "metadata": {
                "source": "stock_take",
                "stock_take_id": stock_take_id,
                "expected_qty": float(line["expected_qty"]),
                "counted_qty": float(line["counted_qty"]),
                "is_positive": is_positive,
            },
        }
        supabase.table("stock_transactions").insert(transaction_data).execute()
        adjustments_created += 1

    # Mark stock take as completed
    supabase.table("stock_takes").update({
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "completed_by": user.id,
        "notes": request.notes or stock_take.data.get("notes"),
    }).eq("id", stock_take_id).execute()

    return {
        "success": True,
        "adjustments_created": adjustments_created,
    }


@router.post("/{stock_take_id}/cancel")
async def cancel_stock_take(
    stock_take_id: str,
    user_data: dict = Depends(require_manager),
):
    """Cancel a stock take without creating adjustments."""
    supabase = get_supabase_admin_client()

    stock_take = supabase.table("stock_takes").select("status").eq(
        "id", stock_take_id
    ).single().execute()

    if not stock_take.data:
        raise HTTPException(status_code=404, detail="Stock take not found")
    if stock_take.data["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Only in-progress stock takes can be cancelled")

    supabase.table("stock_takes").update({
        "status": "cancelled",
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", stock_take_id).execute()

    return {"success": True}
