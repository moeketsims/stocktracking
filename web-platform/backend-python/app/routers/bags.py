"""
Per-Bag Barcode Tracking API Router
Handles individual bag registration (receive) and issuing via barcode scan.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, get_current_user
import logging

router = APIRouter(prefix="/bags", tags=["Bag Tracking"])
logger = logging.getLogger(__name__)

UNDO_WINDOW_MINUTES = 5


# ============================================
# REQUEST MODELS
# ============================================

class RegisterBagRequest(BaseModel):
    barcode: str = Field(min_length=1, max_length=200)
    batch_id: str
    weight_kg: Optional[float] = Field(None, gt=0)


class BulkRegisterBagsRequest(BaseModel):
    barcodes: List[str] = Field(min_length=1)
    batch_id: str
    weight_kg: Optional[float] = Field(None, gt=0)


class IssueBagRequest(BaseModel):
    barcode: str = Field(min_length=1, max_length=200)


# ============================================
# HELPERS
# ============================================

def _get_user_location(supabase, user_id: str) -> Optional[str]:
    """Get user's assigned location from profile."""
    profile = supabase.table("profiles").select(
        "location_id, role"
    ).eq("user_id", user_id).single().execute()
    if profile.data:
        return profile.data.get("location_id")
    return None


def _get_fifo_warning(supabase, bag: dict) -> Optional[dict]:
    """Check if this bag is from the oldest batch for FIFO compliance."""
    oldest = supabase.table("stock_batches").select(
        "id, received_at"
    ).eq(
        "location_id", bag["location_id"]
    ).eq(
        "item_id", bag["item_id"]
    ).gt(
        "remaining_qty", 0
    ).eq(
        "status", "available"
    ).order(
        "received_at", desc=False
    ).limit(1).execute()

    if not oldest.data:
        return None

    oldest_batch = oldest.data[0]
    if oldest_batch["id"] == bag["batch_id"]:
        return None  # This bag IS from the oldest batch — no warning

    return {
        "is_oldest_batch": False,
        "bag_batch_id": bag["batch_id"],
        "oldest_batch_id": oldest_batch["id"],
        "oldest_batch_received_at": oldest_batch["received_at"],
        "message": "Older stock should be used first (FIFO)"
    }


# ============================================
# REGISTER BAG (Scan on Receive)
# ============================================

@router.post("/register")
async def register_bag(
    request: RegisterBagRequest,
    user_data: dict = Depends(require_auth)
):
    """Register a single bag by scanning its barcode during receiving."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Look up the batch
        batch = supabase.table("stock_batches").select(
            "id, item_id, location_id, status"
        ).eq("id", request.batch_id).single().execute()

        if not batch.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        if batch.data["status"] == "depleted":
            raise HTTPException(status_code=400, detail="Cannot register bags on a depleted batch")

        item_id = batch.data["item_id"]
        location_id = batch.data["location_id"]

        # Check for duplicate active barcode at this location
        existing = supabase.table("bags").select("id").eq(
            "barcode", request.barcode
        ).eq(
            "location_id", location_id
        ).eq(
            "status", "registered"
        ).execute()

        if existing.data:
            raise HTTPException(
                status_code=409,
                detail=f"Barcode '{request.barcode}' is already registered at this location"
            )

        # Determine weight: use override or item's conversion_factor
        weight_kg = request.weight_kg
        if not weight_kg:
            item = supabase.table("items").select(
                "conversion_factor"
            ).eq("id", item_id).single().execute()
            weight_kg = float(item.data["conversion_factor"]) if item.data else 10.0

        # Create bag record
        bag_data = {
            "id": str(uuid4()),
            "barcode": request.barcode,
            "batch_id": request.batch_id,
            "item_id": item_id,
            "location_id": location_id,
            "weight_kg": weight_kg,
            "status": "registered",
            "received_by": user.id,
        }

        result = supabase.table("bags").insert(bag_data)

        logger.info(f"[BAG] Registered bag {request.barcode} → batch {request.batch_id} ({weight_kg}kg)")

        return {
            "success": True,
            "message": f"Bag registered ({weight_kg}kg)",
            "bag": result.data[0] if result.data else bag_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BAG] Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BULK REGISTER (Multiple barcodes at once)
# ============================================

@router.post("/register-bulk")
async def register_bags_bulk(
    request: BulkRegisterBagsRequest,
    user_data: dict = Depends(require_auth)
):
    """Register multiple bags at once for a single batch."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Look up the batch
        batch = supabase.table("stock_batches").select(
            "id, item_id, location_id, status"
        ).eq("id", request.batch_id).single().execute()

        if not batch.data:
            raise HTTPException(status_code=404, detail="Batch not found")

        item_id = batch.data["item_id"]
        location_id = batch.data["location_id"]

        # Determine weight
        weight_kg = request.weight_kg
        if not weight_kg:
            item = supabase.table("items").select(
                "conversion_factor"
            ).eq("id", item_id).single().execute()
            weight_kg = float(item.data["conversion_factor"]) if item.data else 10.0

        # Check for existing active barcodes at this location
        existing = supabase.table("bags").select("barcode").eq(
            "location_id", location_id
        ).eq(
            "status", "registered"
        ).in_("barcode", request.barcodes).execute()

        existing_barcodes = {b["barcode"] for b in (existing.data or [])}

        registered = []
        skipped = []

        for barcode in request.barcodes:
            if barcode in existing_barcodes:
                skipped.append({"barcode": barcode, "reason": "Already registered"})
                continue

            bag_data = {
                "id": str(uuid4()),
                "barcode": barcode,
                "batch_id": request.batch_id,
                "item_id": item_id,
                "location_id": location_id,
                "weight_kg": weight_kg,
                "status": "registered",
                "received_by": user.id,
            }

            result = supabase.table("bags").insert(bag_data)
            registered.append(result.data[0] if result.data else bag_data)

        logger.info(f"[BAG] Bulk registered {len(registered)} bags, skipped {len(skipped)}")

        return {
            "success": True,
            "message": f"{len(registered)} bags registered, {len(skipped)} skipped",
            "registered": registered,
            "skipped": skipped,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BAG] Bulk register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ISSUE BAG (Scan on Issue)
# ============================================

@router.post("/issue")
async def issue_bag(
    request: IssueBagRequest,
    user_data: dict = Depends(require_auth)
):
    """Issue a bag by scanning its barcode. Deducts from the batch and checks FIFO."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user's location
        user_location = _get_user_location(supabase, user.id)

        # Find the bag by barcode at user's location
        query = supabase.table("bags").select("*").eq(
            "barcode", request.barcode
        ).eq(
            "status", "registered"
        )

        if user_location:
            query = query.eq("location_id", user_location)

        bag_result = query.execute()

        if not bag_result.data:
            raise HTTPException(
                status_code=404,
                detail="Bag not found or already issued. Check the barcode and try again."
            )

        bag = bag_result.data[0]

        # FIFO check
        fifo_warning = _get_fifo_warning(supabase, bag)

        # Deduct weight from batch
        batch = supabase.table("stock_batches").select(
            "id, remaining_qty"
        ).eq("id", bag["batch_id"]).single().execute()

        if batch.data:
            new_remaining = max(0, float(batch.data["remaining_qty"]) - bag["weight_kg"])
            supabase.table("stock_batches").update({
                "remaining_qty": new_remaining
            }).eq("id", bag["batch_id"]).execute()

            logger.debug(f"[BAG] Batch {bag['batch_id']}: {batch.data['remaining_qty']} - {bag['weight_kg']} = {new_remaining}")

        # Create stock transaction
        transaction_id = str(uuid4())
        transaction_data = {
            "id": transaction_id,
            "created_by": user.id,
            "location_id_from": bag["location_id"],
            "item_id": bag["item_id"],
            "batch_id": bag["batch_id"],
            "bag_id": bag["id"],
            "qty": bag["weight_kg"],
            "unit": "kg",
            "type": "issue",
            "notes": f"Bag scan: {request.barcode}",
            "metadata": {
                "barcode": request.barcode,
                "bag_id": bag["id"],
                "scan_issue": True
            }
        }

        supabase.table("stock_transactions").insert(transaction_data).execute()

        # Update bag status
        supabase.table("bags").update({
            "status": "issued",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "issued_by": user.id,
            "issue_transaction_id": transaction_id,
        }).eq("id", bag["id"]).execute()

        logger.info(f"[BAG] Issued bag {request.barcode} ({bag['weight_kg']}kg) from batch {bag['batch_id']}")

        return {
            "success": True,
            "message": f"Bag issued — {bag['weight_kg']}kg deducted",
            "bag": {
                "id": bag["id"],
                "barcode": bag["barcode"],
                "weight_kg": bag["weight_kg"],
                "batch_id": bag["batch_id"],
                "status": "issued",
            },
            "transaction_id": transaction_id,
            "kg_deducted": bag["weight_kg"],
            "fifo_warning": fifo_warning,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BAG] Issue error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LIST BAGS
# ============================================

@router.get("")
async def list_bags(
    status: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user_data: dict = Depends(require_auth)
):
    """List bags with optional filters."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("bags").select(
            "*, stock_batches(id, received_at, status)"
        ).order("received_at", desc=True).limit(limit)

        if status:
            query = query.eq("status", status)
        if batch_id:
            query = query.eq("batch_id", batch_id)
        if location_id:
            query = query.eq("location_id", location_id)

        result = query.execute()

        return {
            "bags": result.data or [],
            "total": len(result.data or []),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LOOKUP BAG BY BARCODE
# ============================================

@router.get("/lookup/{barcode}")
async def lookup_bag(
    barcode: str,
    user_data: dict = Depends(require_auth)
):
    """Look up a bag by its barcode."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("bags").select(
            "*, stock_batches(id, received_at, status, item_id), items(id, name, sku)"
        ).eq("barcode", barcode).order("created_at", desc=True).limit(5).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="No bag found with this barcode")

        return {
            "bags": result.data,
            "total": len(result.data),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# UNDO ISSUE
# ============================================

@router.post("/{bag_id}/undo-issue")
async def undo_issue_bag(
    bag_id: str,
    user_data: dict = Depends(require_auth)
):
    """Undo a bag issue within the 5-minute window."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get the bag
        bag_result = supabase.table("bags").select("*").eq(
            "id", bag_id
        ).single().execute()

        if not bag_result.data:
            raise HTTPException(status_code=404, detail="Bag not found")

        bag = bag_result.data

        if bag["status"] != "issued":
            raise HTTPException(status_code=400, detail="Bag is not in issued state")

        # Check undo window
        issued_at = datetime.fromisoformat(bag["issued_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if now - issued_at > timedelta(minutes=UNDO_WINDOW_MINUTES):
            raise HTTPException(
                status_code=400,
                detail=f"Undo window expired ({UNDO_WINDOW_MINUTES} minutes)"
            )

        # Restore bag to registered
        supabase.table("bags").update({
            "status": "registered",
            "issued_at": None,
            "issued_by": None,
            "issue_transaction_id": None,
        }).eq("id", bag_id).execute()

        # Add weight back to batch
        batch = supabase.table("stock_batches").select(
            "id, remaining_qty"
        ).eq("id", bag["batch_id"]).single().execute()

        if batch.data:
            new_remaining = float(batch.data["remaining_qty"]) + bag["weight_kg"]
            supabase.table("stock_batches").update({
                "remaining_qty": new_remaining
            }).eq("id", bag["batch_id"]).execute()

        # Mark the transaction as reversed
        if bag.get("issue_transaction_id"):
            tx = supabase.table("stock_transactions").select(
                "id, metadata"
            ).eq("id", bag["issue_transaction_id"]).single().execute()

            if tx.data:
                metadata = tx.data.get("metadata") or {}
                metadata["reversed"] = True
                metadata["reversed_at"] = now.isoformat()
                metadata["reversed_by"] = user.id
                supabase.table("stock_transactions").update({
                    "metadata": metadata
                }).eq("id", tx.data["id"]).execute()

        logger.info(f"[BAG] Undid issue for bag {bag['barcode']} ({bag['weight_kg']}kg)")

        return {
            "success": True,
            "message": f"Issue undone — {bag['weight_kg']}kg restored",
            "bag_id": bag_id,
            "barcode": bag["barcode"],
            "kg_restored": bag["weight_kg"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BAG] Undo issue error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
