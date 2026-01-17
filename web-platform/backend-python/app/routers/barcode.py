"""
Barcode Scanning API Router
Handles barcode lookup, scan sessions, and bulk receiving
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager, get_current_user
import re

router = APIRouter(prefix="/barcode", tags=["Barcode Scanning"])


# ============================================
# REQUEST MODELS
# ============================================

class BarcodeLookupRequest(BaseModel):
    barcode: str = Field(min_length=1, max_length=200)
    supplier_id: Optional[str] = None


class CreateScanSessionRequest(BaseModel):
    location_id: str
    trip_id: Optional[str] = None
    supplier_id: Optional[str] = None
    session_type: str = "receive"
    notes: Optional[str] = None


class RecordScanRequest(BaseModel):
    barcode: str = Field(min_length=1, max_length=200)
    override_quantity_kg: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None


class ConfirmScansRequest(BaseModel):
    scan_ids: List[str]


class BulkReceiveRequest(BaseModel):
    quality_score: int = Field(default=1, ge=1, le=3)
    defect_pct: Optional[float] = Field(None, ge=0, le=100)
    quality_notes: Optional[str] = None
    expiry_date: Optional[str] = None
    delivery_note_number: Optional[str] = None
    cost_per_unit: Optional[float] = Field(None, ge=0)
    auto_confirm_pending: bool = True


class CreateBarcodeMappingRequest(BaseModel):
    supplier_id: str
    item_id: str
    barcode_pattern: str = Field(min_length=1, max_length=100)
    barcode_format: str = "ean13"
    barcode_prefix: Optional[str] = None
    weight_embedded: bool = False
    weight_start_position: Optional[int] = None
    weight_length: Optional[int] = None
    weight_decimal_places: int = 3
    default_quantity_kg: Optional[float] = Field(None, gt=0)
    default_bag_size: Optional[str] = None
    variety_name: Optional[str] = None
    description: Optional[str] = None


class UpdateBarcodeMappingRequest(BaseModel):
    barcode_pattern: Optional[str] = None
    barcode_format: Optional[str] = None
    barcode_prefix: Optional[str] = None
    weight_embedded: Optional[bool] = None
    weight_start_position: Optional[int] = None
    weight_length: Optional[int] = None
    weight_decimal_places: Optional[int] = None
    default_quantity_kg: Optional[float] = None
    default_bag_size: Optional[str] = None
    variety_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ============================================
# HELPER FUNCTIONS
# ============================================

def extract_weight_from_barcode(barcode: str, mapping: dict) -> Optional[float]:
    """Extract weight from GS1-128 or weight-embedded barcode."""
    if not mapping.get("weight_embedded"):
        return None

    start = mapping.get("weight_start_position", 0)
    length = mapping.get("weight_length", 5)
    decimals = mapping.get("weight_decimal_places", 3)

    try:
        weight_str = barcode[start:start + length]
        weight_value = int(weight_str) / (10 ** decimals)
        return round(weight_value, 3)
    except (ValueError, IndexError):
        return None


def match_barcode_to_mapping(barcode: str, mappings: list) -> Optional[dict]:
    """Find the best matching mapping for a barcode."""
    best_match = None
    best_score = 0

    for mapping in mappings:
        pattern = mapping.get("barcode_pattern", "")
        prefix = mapping.get("barcode_prefix")

        # Exact match
        if pattern == barcode:
            return mapping

        # Prefix match
        if prefix and barcode.startswith(prefix):
            score = len(prefix)
            if score > best_score:
                best_score = score
                best_match = mapping

        # Regex match
        try:
            if re.match(pattern, barcode):
                score = len(pattern)
                if score > best_score:
                    best_score = score
                    best_match = mapping
        except re.error:
            pass

    return best_match


# ============================================
# BARCODE LOOKUP
# ============================================

@router.post("/lookup")
async def lookup_barcode(
    request: BarcodeLookupRequest,
    user_data: dict = Depends(get_current_user)
):
    """Look up a barcode and return matching item(s)."""
    supabase = get_supabase_admin_client()

    try:
        # Build query for mappings
        query = supabase.table("supplier_barcode_mappings").select(
            "*, items(id, sku, name, unit, conversion_factor, variety), "
            "suppliers(id, name)"
        ).eq("is_active", True)

        if request.supplier_id:
            query = query.eq("supplier_id", request.supplier_id)

        result = query.execute()
        mappings = result.data or []

        # Find matches
        matches = []
        for mapping in mappings:
            pattern = mapping.get("barcode_pattern", "")
            prefix = mapping.get("barcode_prefix")

            is_match = False
            confidence = 0.0

            # Exact match
            if pattern == request.barcode:
                is_match = True
                confidence = 1.0
            # Prefix match
            elif prefix and request.barcode.startswith(prefix):
                is_match = True
                confidence = 0.9
            # Regex match
            else:
                try:
                    if re.match(pattern, request.barcode):
                        is_match = True
                        confidence = 0.8
                except re.error:
                    pass

            if is_match:
                # Extract weight if applicable
                extracted_weight = extract_weight_from_barcode(request.barcode, mapping)

                item = mapping.get("items") or {}
                supplier = mapping.get("suppliers") or {}

                matches.append({
                    "mapping_id": mapping["id"],
                    "item_id": item.get("id"),
                    "item_name": item.get("name"),
                    "item_sku": item.get("sku"),
                    "supplier_id": supplier.get("id"),
                    "supplier_name": supplier.get("name"),
                    "barcode_format": mapping.get("barcode_format"),
                    "weight_embedded": mapping.get("weight_embedded", False),
                    "extracted_weight_kg": extracted_weight,
                    "default_quantity_kg": mapping.get("default_quantity_kg"),
                    "default_bag_size": mapping.get("default_bag_size"),
                    "variety_name": mapping.get("variety_name"),
                    "confidence_score": confidence
                })

        # Sort by confidence
        matches.sort(key=lambda x: x["confidence_score"], reverse=True)

        return {
            "success": True,
            "matches": matches[:5],  # Top 5 matches
            "raw_barcode": request.barcode,
            "detected_format": matches[0]["barcode_format"] if matches else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SCAN SESSIONS
# ============================================

@router.post("/sessions")
async def create_scan_session(
    request: CreateScanSessionRequest,
    user_data: dict = Depends(require_manager)
):
    """Start a new barcode scanning session."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        session_data = {
            "id": str(uuid4()),
            "location_id": request.location_id,
            "trip_id": request.trip_id,
            "supplier_id": request.supplier_id,
            "session_type": request.session_type,
            "status": "in_progress",
            "total_scans": 0,
            "successful_scans": 0,
            "failed_scans": 0,
            "total_quantity_kg": 0,
            "created_by": user.id,
            "notes": request.notes
        }

        result = supabase.table("barcode_scan_sessions").insert(session_data)

        return {
            "success": True,
            "message": "Scan session started",
            "session": result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def list_scan_sessions(
    status: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user_data: dict = Depends(get_current_user)
):
    """List scan sessions."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("barcode_scan_sessions").select(
            "*, locations(id, name), trips(id, trip_number), suppliers(id, name)"
        ).order("started_at", desc=True).limit(limit)

        if status:
            query = query.eq("status", status)
        if location_id:
            query = query.eq("location_id", location_id)

        result = query.execute()

        return {
            "sessions": result.data or [],
            "total": len(result.data or [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_scan_session(
    session_id: str,
    user_data: dict = Depends(get_current_user)
):
    """Get scan session with all scans."""
    supabase = get_supabase_admin_client()

    try:
        # Get session
        session_result = supabase.table("barcode_scan_sessions").select(
            "*, locations(id, name), trips(id, trip_number), suppliers(id, name)"
        ).eq("id", session_id).single().execute()

        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get scans
        scans_result = supabase.table("barcode_scan_logs").select(
            "*, items(id, sku, name, variety)"
        ).eq("session_id", session_id).order("scanned_at", desc=False).execute()

        session = session_result.data
        session["scans"] = scans_result.data or []

        return session

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/scan")
async def record_scan(
    session_id: str,
    request: RecordScanRequest,
    user_data: dict = Depends(require_manager)
):
    """Record a barcode scan within a session."""
    supabase = get_supabase_admin_client()

    try:
        # Verify session exists and is in progress
        session = supabase.table("barcode_scan_sessions").select(
            "id, status, supplier_id"
        ).eq("id", session_id).single().execute()

        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.data["status"] != "in_progress":
            raise HTTPException(status_code=400, detail="Session is not in progress")

        # Look up barcode
        lookup_result = await lookup_barcode(
            BarcodeLookupRequest(
                barcode=request.barcode,
                supplier_id=session.data.get("supplier_id")
            ),
            user_data
        )

        matches = lookup_result.get("matches", [])
        best_match = matches[0] if matches else None

        # Determine quantity
        if request.override_quantity_kg:
            final_quantity = request.override_quantity_kg
        elif best_match:
            final_quantity = best_match.get("extracted_weight_kg") or best_match.get("default_quantity_kg") or 0
        else:
            final_quantity = 0

        # Check for duplicates (same barcode in same session)
        existing = supabase.table("barcode_scan_logs").select("id").eq(
            "session_id", session_id
        ).eq("raw_barcode", request.barcode).eq("status", "pending").execute()

        status = "duplicate" if existing.data else ("pending" if best_match else "pending")

        # Create scan log
        scan_data = {
            "id": str(uuid4()),
            "session_id": session_id,
            "raw_barcode": request.barcode,
            "barcode_format": best_match.get("barcode_format") if best_match else None,
            "mapping_id": best_match.get("mapping_id") if best_match else None,
            "item_id": best_match.get("item_id") if best_match else None,
            "supplier_id": best_match.get("supplier_id") if best_match else None,
            "extracted_weight_kg": best_match.get("extracted_weight_kg") if best_match else None,
            "final_quantity_kg": final_quantity,
            "variety_name": best_match.get("variety_name") if best_match else None,
            "status": status,
            "notes": request.notes
        }

        scan_result = supabase.table("barcode_scan_logs").insert(scan_data)

        # Update session totals
        update_data = {
            "total_scans": session.data.get("total_scans", 0) + 1
        }
        if best_match and final_quantity > 0:
            update_data["successful_scans"] = session.data.get("successful_scans", 0) + 1
            update_data["total_quantity_kg"] = float(session.data.get("total_quantity_kg", 0)) + final_quantity
        else:
            update_data["failed_scans"] = session.data.get("failed_scans", 0) + 1

        # Re-fetch current values to avoid race conditions
        current_session = supabase.table("barcode_scan_sessions").select("*").eq("id", session_id).single().execute()
        if current_session.data:
            update_data = {
                "total_scans": current_session.data.get("total_scans", 0) + 1,
                "successful_scans": current_session.data.get("successful_scans", 0) + (1 if best_match else 0),
                "failed_scans": current_session.data.get("failed_scans", 0) + (0 if best_match else 1),
                "total_quantity_kg": float(current_session.data.get("total_quantity_kg", 0)) + (final_quantity if best_match else 0)
            }

        supabase.table("barcode_scan_sessions").update(update_data).eq("id", session_id).execute()

        return {
            "success": True,
            "scan": scan_result.data[0],
            "matched": best_match is not None,
            "item_name": best_match.get("item_name") if best_match else None,
            "quantity_kg": final_quantity
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/receive")
async def bulk_receive_from_session(
    session_id: str,
    request: BulkReceiveRequest,
    user_data: dict = Depends(require_manager)
):
    """Convert confirmed scans into stock batches."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]
    profile = user_data.get("profile", {})

    try:
        # Get session
        session = supabase.table("barcode_scan_sessions").select("*").eq(
            "id", session_id
        ).single().execute()

        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.data["status"] == "completed":
            raise HTTPException(status_code=400, detail="Session already completed")

        location_id = session.data["location_id"]
        trip_id = session.data.get("trip_id")

        # Get scans to process
        scans_query = supabase.table("barcode_scan_logs").select("*").eq(
            "session_id", session_id
        ).is_("batch_id", "null")  # Only unprocessed scans

        if request.auto_confirm_pending:
            scans_query = scans_query.in_("status", ["pending", "confirmed"])
        else:
            scans_query = scans_query.eq("status", "confirmed")

        scans_result = scans_query.execute()
        scans = [s for s in (scans_result.data or []) if s.get("item_id") and s.get("final_quantity_kg", 0) > 0]

        if not scans:
            raise HTTPException(status_code=400, detail="No valid scans to receive")

        # Group scans by item_id and variety
        grouped = {}
        for scan in scans:
            key = (scan["item_id"], scan.get("variety_name"))
            if key not in grouped:
                grouped[key] = {
                    "item_id": scan["item_id"],
                    "variety_name": scan.get("variety_name"),
                    "supplier_id": scan.get("supplier_id"),
                    "total_qty": 0,
                    "scans": []
                }
            grouped[key]["total_qty"] += scan["final_quantity_kg"]
            grouped[key]["scans"].append(scan)

        created_batches = []
        created_transactions = []

        for (item_id, variety), group in grouped.items():
            batch_id = str(uuid4())
            transaction_id = str(uuid4())
            qty_kg = round(group["total_qty"], 2)

            # Calculate total cost
            total_cost = None
            if request.cost_per_unit:
                total_cost = round(request.cost_per_unit * qty_kg, 2)

            # Create batch
            batch_data = {
                "id": batch_id,
                "item_id": item_id,
                "location_id": location_id,
                "supplier_id": group["supplier_id"],
                "initial_qty": qty_kg,
                "remaining_qty": qty_kg,
                "quality_score": request.quality_score,
                "defect_pct": request.defect_pct,
                "quality_notes": request.quality_notes,
                "expiry_date": request.expiry_date,
                "status": "available",
                "cost_per_unit": request.cost_per_unit,
                "total_cost": total_cost,
                "delivery_note_number": request.delivery_note_number,
                "trip_id": trip_id,
                "scan_session_id": session_id
            }

            batch_result = supabase.table("stock_batches").insert(batch_data)
            created_batches.append(batch_result.data)

            # Create transaction
            transaction_data = {
                "id": transaction_id,
                "location_id_to": location_id,
                "item_id": item_id,
                "batch_id": batch_id,
                "qty": qty_kg,
                "unit": "kg",
                "type": "receive",
                "created_by": user.id,
                "trip_id": trip_id,
                "metadata": {
                    "scan_session_id": session_id,
                    "scan_count": len(group["scans"]),
                    "variety_name": variety,
                    "supplier_id": group["supplier_id"],
                    "quality_score": request.quality_score,
                    "cost_per_unit": request.cost_per_unit
                }
            }

            trans_result = supabase.table("stock_transactions").insert(transaction_data)
            created_transactions.append(trans_result.data)

            # Update batch with transaction reference
            supabase.table("stock_batches").update({
                "receive_transaction_id": transaction_id
            }).eq("id", batch_id).execute()

            # Update scan logs with batch reference
            for scan in group["scans"]:
                supabase.table("barcode_scan_logs").update({
                    "batch_id": batch_id,
                    "transaction_id": transaction_id,
                    "status": "confirmed",
                    "confirmed_at": datetime.now().isoformat(),
                    "confirmed_by": user.id
                }).eq("id", scan["id"]).execute()

        # Mark session as completed
        supabase.table("barcode_scan_sessions").update({
            "status": "completed",
            "completed_at": datetime.now().isoformat()
        }).eq("id", session_id).execute()

        total_qty = sum(b["initial_qty"] for b in created_batches)

        return {
            "success": True,
            "message": f"Received {total_qty:.2f} kg from {len(scans)} scans",
            "batches_created": len(created_batches),
            "transactions_created": len(created_transactions),
            "total_quantity_kg": total_qty,
            "batches": created_batches
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/cancel")
async def cancel_scan_session(
    session_id: str,
    user_data: dict = Depends(require_manager)
):
    """Cancel a scan session."""
    supabase = get_supabase_admin_client()

    try:
        session = supabase.table("barcode_scan_sessions").select("id, status").eq(
            "id", session_id
        ).single().execute()

        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.data["status"] == "completed":
            raise HTTPException(status_code=400, detail="Cannot cancel completed session")

        supabase.table("barcode_scan_sessions").update({
            "status": "cancelled",
            "completed_at": datetime.now().isoformat()
        }).eq("id", session_id).execute()

        return {
            "success": True,
            "message": "Session cancelled"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}/scans/{scan_id}")
async def delete_scan(
    session_id: str,
    scan_id: str,
    user_data: dict = Depends(require_manager)
):
    """Delete a scan from a session."""
    supabase = get_supabase_admin_client()

    try:
        # Verify scan belongs to session and not yet processed
        scan = supabase.table("barcode_scan_logs").select("*").eq(
            "id", scan_id
        ).eq("session_id", session_id).single().execute()

        if not scan.data:
            raise HTTPException(status_code=404, detail="Scan not found")

        if scan.data.get("batch_id"):
            raise HTTPException(status_code=400, detail="Cannot delete processed scan")

        # Delete scan
        supabase.table("barcode_scan_logs").delete().eq("id", scan_id).execute()

        # Update session totals
        session = supabase.table("barcode_scan_sessions").select("*").eq(
            "id", session_id
        ).single().execute()

        if session.data:
            qty = scan.data.get("final_quantity_kg", 0)
            was_successful = scan.data.get("item_id") is not None

            update_data = {
                "total_scans": max(0, session.data.get("total_scans", 1) - 1),
                "total_quantity_kg": max(0, float(session.data.get("total_quantity_kg", 0)) - qty)
            }
            if was_successful:
                update_data["successful_scans"] = max(0, session.data.get("successful_scans", 1) - 1)
            else:
                update_data["failed_scans"] = max(0, session.data.get("failed_scans", 1) - 1)

            supabase.table("barcode_scan_sessions").update(update_data).eq("id", session_id).execute()

        return {
            "success": True,
            "message": "Scan deleted"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BARCODE MAPPINGS MANAGEMENT
# ============================================

@router.get("/mappings")
async def list_barcode_mappings(
    supplier_id: Optional[str] = Query(None),
    item_id: Optional[str] = Query(None),
    active_only: bool = Query(True),
    user_data: dict = Depends(get_current_user)
):
    """List barcode mappings."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("supplier_barcode_mappings").select(
            "*, items(id, sku, name, variety), suppliers(id, name)"
        ).order("created_at", desc=True)

        if supplier_id:
            query = query.eq("supplier_id", supplier_id)
        if item_id:
            query = query.eq("item_id", item_id)
        if active_only:
            query = query.eq("is_active", True)

        result = query.execute()

        return {
            "mappings": result.data or [],
            "total": len(result.data or [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mappings")
async def create_barcode_mapping(
    request: CreateBarcodeMappingRequest,
    user_data: dict = Depends(require_manager)
):
    """Create a new barcode mapping."""
    supabase = get_supabase_admin_client()

    try:
        # Verify supplier and item exist
        supplier = supabase.table("suppliers").select("id").eq("id", request.supplier_id).single().execute()
        if not supplier.data:
            raise HTTPException(status_code=404, detail="Supplier not found")

        item = supabase.table("items").select("id").eq("id", request.item_id).single().execute()
        if not item.data:
            raise HTTPException(status_code=404, detail="Item not found")

        mapping_data = {
            "id": str(uuid4()),
            "supplier_id": request.supplier_id,
            "item_id": request.item_id,
            "barcode_pattern": request.barcode_pattern,
            "barcode_format": request.barcode_format,
            "barcode_prefix": request.barcode_prefix,
            "weight_embedded": request.weight_embedded,
            "weight_start_position": request.weight_start_position,
            "weight_length": request.weight_length,
            "weight_decimal_places": request.weight_decimal_places,
            "default_quantity_kg": request.default_quantity_kg,
            "default_bag_size": request.default_bag_size,
            "variety_name": request.variety_name,
            "description": request.description,
            "is_active": True
        }

        result = supabase.table("supplier_barcode_mappings").insert(mapping_data)

        return {
            "success": True,
            "message": "Barcode mapping created",
            "mapping": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Barcode pattern already exists for this supplier")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/mappings/{mapping_id}")
async def update_barcode_mapping(
    mapping_id: str,
    request: UpdateBarcodeMappingRequest,
    user_data: dict = Depends(require_manager)
):
    """Update a barcode mapping."""
    supabase = get_supabase_admin_client()

    try:
        existing = supabase.table("supplier_barcode_mappings").select("id").eq(
            "id", mapping_id
        ).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Mapping not found")

        update_data = {}
        if request.barcode_pattern is not None:
            update_data["barcode_pattern"] = request.barcode_pattern
        if request.barcode_format is not None:
            update_data["barcode_format"] = request.barcode_format
        if request.barcode_prefix is not None:
            update_data["barcode_prefix"] = request.barcode_prefix
        if request.weight_embedded is not None:
            update_data["weight_embedded"] = request.weight_embedded
        if request.weight_start_position is not None:
            update_data["weight_start_position"] = request.weight_start_position
        if request.weight_length is not None:
            update_data["weight_length"] = request.weight_length
        if request.weight_decimal_places is not None:
            update_data["weight_decimal_places"] = request.weight_decimal_places
        if request.default_quantity_kg is not None:
            update_data["default_quantity_kg"] = request.default_quantity_kg
        if request.default_bag_size is not None:
            update_data["default_bag_size"] = request.default_bag_size
        if request.variety_name is not None:
            update_data["variety_name"] = request.variety_name
        if request.description is not None:
            update_data["description"] = request.description
        if request.is_active is not None:
            update_data["is_active"] = request.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_data["updated_at"] = datetime.now().isoformat()

        result = supabase.table("supplier_barcode_mappings").update(update_data).eq(
            "id", mapping_id
        ).execute()

        return {
            "success": True,
            "message": "Mapping updated",
            "mapping": result.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/mappings/{mapping_id}")
async def delete_barcode_mapping(
    mapping_id: str,
    user_data: dict = Depends(require_manager)
):
    """Delete (deactivate) a barcode mapping."""
    supabase = get_supabase_admin_client()

    try:
        existing = supabase.table("supplier_barcode_mappings").select("id").eq(
            "id", mapping_id
        ).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Mapping not found")

        # Soft delete
        supabase.table("supplier_barcode_mappings").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", mapping_id).execute()

        return {
            "success": True,
            "message": "Mapping deactivated"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
