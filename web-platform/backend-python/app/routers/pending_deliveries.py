"""Pending Deliveries Router - Handles delivery confirmation workflow."""

from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, require_manager, get_current_user
from ..models.requests import ConfirmDeliveryRequest, RejectDeliveryRequest
from ..email import send_delivery_arrived_notification, send_delivery_confirmed_notification

router = APIRouter(prefix="/pending-deliveries", tags=["Pending Deliveries"])

# Conversion factor: 1 bag = 10 kg
KG_PER_BAG = 10


@router.get("")
async def list_pending_deliveries(
    status: Optional[str] = Query(None, description="Filter by status"),
    location_id: Optional[str] = Query(None, description="Filter by location"),
    limit: int = Query(50, ge=1, le=200),
    user_data: dict = Depends(get_current_user)
):
    """List pending deliveries. Filters by user's location if not admin/zone_manager."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile for role-based filtering
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        query = supabase.table("pending_deliveries").select(
            "*, "
            "location:locations(id, name, type), "
            "supplier:suppliers(id, name), "
            "trip:trips(id, trip_number, status, driver_name, driver_id, vehicles(registration_number, make, model)), "
            "stock_request:stock_requests(id, quantity_bags, urgency), "
            "confirmer:profiles!pending_deliveries_confirmed_by_fkey(id, full_name)"
        ).order("created_at", desc=True).limit(limit)

        # Apply role-based filtering
        if profile.data["role"] in ("staff", "location_manager"):
            if profile.data.get("location_id"):
                query = query.eq("location_id", profile.data["location_id"])

        if status:
            query = query.eq("status", status)
        if location_id:
            query = query.eq("location_id", location_id)

        result = query.execute()

        # Calculate bags from kg for display
        deliveries = []
        for delivery in (result.data or []):
            claimed_bags = delivery.get("driver_claimed_qty_kg", 0) / KG_PER_BAG
            confirmed_kg = delivery.get("confirmed_qty_kg")
            confirmed_bags = confirmed_kg / KG_PER_BAG if confirmed_kg else None

            delivery["driver_claimed_bags"] = round(claimed_bags, 1)
            delivery["confirmed_bags"] = round(confirmed_bags, 1) if confirmed_bags else None
            deliveries.append(delivery)

        return {
            "deliveries": deliveries,
            "total": len(deliveries)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def list_pending_only(
    location_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user_data: dict = Depends(get_current_user)
):
    """Get only pending (unconfirmed) deliveries for the user's location."""
    if not user_data or "user" not in user_data:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Determine location filter
        filter_location = location_id or profile.data.get("location_id")

        query = supabase.table("pending_deliveries").select(
            "*, "
            "location:locations(id, name), "
            "supplier:suppliers(id, name), "
            "trip:trips(id, trip_number, driver_name, vehicles(registration_number, make, model)), "
            "stock_request:stock_requests(id, quantity_bags, urgency)"
        ).eq("status", "pending").order("created_at", desc=True).limit(limit)

        if filter_location:
            query = query.eq("location_id", filter_location)

        result = query.execute()

        deliveries = []
        for delivery in (result.data or []):
            claimed_bags = delivery.get("driver_claimed_qty_kg", 0) / KG_PER_BAG
            delivery["driver_claimed_bags"] = round(claimed_bags, 1)
            deliveries.append(delivery)

        return {
            "deliveries": deliveries,
            "total": len(deliveries)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{delivery_id}")
async def get_pending_delivery(
    delivery_id: str,
    user_data: dict = Depends(get_current_user)
):
    """Get a specific pending delivery."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("pending_deliveries").select(
            "*, "
            "location:locations(id, name, type), "
            "supplier:suppliers(id, name), "
            "trip:trips(id, trip_number, status, driver_name, driver_id, vehicles(registration_number, make, model), "
            "fuel_cost, toll_cost, other_cost), "
            "stock_request:stock_requests(id, quantity_bags, urgency, notes), "
            "confirmer:profiles!pending_deliveries_confirmed_by_fkey(id, full_name)"
        ).eq("id", delivery_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Pending delivery not found")

        delivery = result.data
        delivery["driver_claimed_bags"] = round(delivery.get("driver_claimed_qty_kg", 0) / KG_PER_BAG, 1)
        if delivery.get("confirmed_qty_kg"):
            delivery["confirmed_bags"] = round(delivery["confirmed_qty_kg"] / KG_PER_BAG, 1)

        return delivery

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{delivery_id}/confirm")
async def confirm_delivery(
    delivery_id: str,
    request: ConfirmDeliveryRequest,
    user_data: dict = Depends(require_auth)
):
    """Confirm a pending delivery and create stock batch."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Get the pending delivery
        delivery = supabase.table("pending_deliveries").select(
            "*, "
            "location:locations(id, name, type), "
            "supplier:suppliers(id, name), "
            "trip:trips(id, trip_number, fuel_cost, toll_cost, other_cost), "
            "stock_request:stock_requests(id, quantity_bags)"
        ).eq("id", delivery_id).single().execute()

        if not delivery.data:
            raise HTTPException(status_code=404, detail="Pending delivery not found")

        if delivery.data["status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Delivery cannot be confirmed (status: {delivery.data['status']})"
            )

        # Verify user has access to this location
        is_admin = profile.data["role"] in ("admin", "zone_manager")
        is_location_match = profile.data.get("location_id") == delivery.data["location_id"]

        if not is_admin and not is_location_match:
            raise HTTPException(status_code=403, detail="Not authorized to confirm this delivery")

        # Calculate discrepancy
        claimed_kg = delivery.data["driver_claimed_qty_kg"]
        confirmed_kg = request.confirmed_qty_kg
        discrepancy_kg = abs(claimed_kg - confirmed_kg)
        has_discrepancy = discrepancy_kg > 0.1  # Allow 0.1 kg tolerance

        discrepancy_notes = request.notes
        if has_discrepancy and not discrepancy_notes:
            discrepancy_pct = round((discrepancy_kg / claimed_kg) * 100, 1) if claimed_kg > 0 else 0
            discrepancy_notes = f"Discrepancy of {discrepancy_kg:.1f} kg ({discrepancy_pct}%)"

        # Prepare delivery status update (don't execute yet)
        update_data = {
            "status": "confirmed",
            "confirmed_qty_kg": confirmed_kg,
            "confirmed_by": profile.data["id"],
            "confirmed_at": datetime.now().isoformat(),
            "discrepancy_notes": discrepancy_notes
        }

        # Get default item (Potatoes) - try common SKUs or get first item
        item_result = supabase.table("items").select("id, sku").ilike("sku", "POT-%").limit(1).execute()
        
        # Fallback if no POT- item found
        if not item_result.data:
            item_result = supabase.table("items").select("id, sku").limit(1).execute()

        item_id = None
        if item_result.data:
            if isinstance(item_result.data, list) and len(item_result.data) > 0:
                item_id = item_result.data[0]["id"]
            elif isinstance(item_result.data, dict):
                item_id = item_result.data.get("id")

        if not item_id:
            logger.error("[ERROR] No items found in system. Cannot create batch.")
            raise HTTPException(status_code=500, detail="No items found in system")

        # Calculate delivery cost per kg from trip costs
        trip = delivery.data.get("trip")
        total_trip_cost = 0
        if trip:
            total_trip_cost = (trip.get("fuel_cost") or 0) + (trip.get("toll_cost") or 0) + (trip.get("other_cost") or 0)

        delivery_cost_per_kg = round(total_trip_cost / confirmed_kg, 4) if confirmed_kg > 0 else 0

        # Create stock batch
        batch_data = {
            "id": str(uuid4()),
            "item_id": item_id,
            "location_id": delivery.data["location_id"],
            "supplier_id": delivery.data.get("supplier_id"),
            "trip_id": delivery.data.get("trip_id"),
            "initial_qty": confirmed_kg,
            "remaining_qty": confirmed_kg,
            "received_at": datetime.now().isoformat(),
            "quality_score": 1,  # Default to good quality
            "status": "available",
            "last_edited_by": user.id, # Must use auth.users.id
            "delivery_cost_per_kg": delivery_cost_per_kg if total_trip_cost > 0 else None
        }

        batch_result = supabase.table("stock_batches").insert(batch_data)

        if not batch_result.data:
            logger.error(f"[ERROR] Failed to create stock batch: {batch_result.error}")
            raise HTTPException(status_code=500, detail="Failed to create stock batch")

        # Handle both list and dict responses
        if isinstance(batch_result.data, list) and len(batch_result.data) > 0:
            batch = batch_result.data[0]
        elif isinstance(batch_result.data, dict):
            batch = batch_result.data
        else:
            raise HTTPException(status_code=500, detail="Failed to create stock batch")

        # Create stock transaction
        transaction_data = {
            "id": str(uuid4()),
            "item_id": item_id,
            "location_id_to": delivery.data["location_id"],
            "batch_id": batch["id"],
            "trip_id": delivery.data.get("trip_id"),
            "type": "receive",
            "qty": confirmed_kg,
            "unit": "kg",
            "created_by": user.id, # Must use auth.users.id
            "notes": f"Delivery confirmed. {discrepancy_notes or 'No discrepancy.'}"
        }

        supabase.table("stock_transactions").insert(transaction_data)

        # FINALLY: Update delivery status after everything else succeeded
        update_result = supabase.table("pending_deliveries").eq(
            "id", delivery_id
        ).update(update_data)

        if not update_result.data:
            logger.error(f"[ERROR] Failed to update delivery status: {update_result.error}")
            # Note: At this point batch/transaction are created, but status is not updated.
            # This is still better than status updated but no batch.

        # Update trip's odometer_end if provided
        if request.odometer_end is not None and delivery.data.get("trip_id"):
            supabase.table("trips").eq("id", delivery.data["trip_id"]).update({
                "odometer_end": request.odometer_end
            })

        # Update stock request status if linked
        request_id = delivery.data.get("request_id")
        request_status = None
        total_delivered_bags = 0
        requested_bags = 0

        if request_id:
            stock_request = delivery.data.get("stock_request")
            requested_bags = stock_request.get("quantity_bags", 0) if stock_request else 0
            confirmed_bags = confirmed_kg / KG_PER_BAG

            # Update trip_requests junction table with delivered quantity
            trip_id = delivery.data.get("trip_id")
            if trip_id:
                # Find the trip_request record for this delivery
                trip_request = supabase.table("trip_requests").select("id").eq(
                    "trip_id", trip_id
                ).eq("request_id", request_id).execute()

                if trip_request.data:
                    # Update the delivered quantity for this trip
                    supabase.table("trip_requests").eq("id", trip_request.data[0]["id"]).update({
                        "delivered_qty_bags": int(confirmed_bags),
                        "status": "delivered"
                    })

            # Calculate total delivered across ALL trips for this request
            all_trip_requests = supabase.table("trip_requests").select(
                "delivered_qty_bags"
            ).eq("request_id", request_id).execute()

            total_delivered_bags = sum(
                (tr.get("delivered_qty_bags") or 0)
                for tr in (all_trip_requests.data or [])
            )

            # Determine request status based on total delivered
            if total_delivered_bags >= requested_bags * 0.95:  # 95% threshold for "fulfilled"
                request_status = "fulfilled"
                supabase.table("stock_requests").eq("id", request_id).update({
                    "status": "fulfilled"
                })
            else:
                request_status = "partially_fulfilled"
                supabase.table("stock_requests").eq("id", request_id).update({
                    "status": "partially_fulfilled"
                })

        # Send notifications to driver and store manager
        try:
            trip_data = delivery.data.get("trip", {})
            location_data = delivery.data.get("location", {})
            trip_number = trip_data.get("trip_number", "N/A") if trip_data else "N/A"
            location_name = location_data.get("name", "Unknown Location") if location_data else "Unknown Location"
            confirmed_by_name = profile.data.get("full_name", "Store Manager")
            
            # Get driver info from trip
            if delivery.data.get("trip_id"):
                trip_details = supabase.table("trips").select(
                    "driver:driver_id(id, full_name, user_id)"
                ).eq("id", delivery.data["trip_id"]).single().execute()
                
                driver_profile = trip_details.data.get("driver", {}) if trip_details.data else {}
                driver_name = driver_profile.get("full_name", "Driver") if driver_profile else "Driver"
                driver_user_id = driver_profile.get("user_id") if driver_profile else None
                
                # Get driver email
                if driver_user_id:
                    try:
                        driver_auth = supabase.auth.admin.get_user_by_id(driver_user_id)
                        driver_email = driver_auth.user.email if driver_auth and driver_auth.user else None
                        
                        if driver_email:
                            send_delivery_confirmed_notification(
                                to_email=driver_email,
                                recipient_name=driver_name,
                                recipient_type="driver",
                                location_name=location_name,
                                quantity_bags=confirmed_kg / KG_PER_BAG,
                                quantity_kg=confirmed_kg,
                                trip_number=trip_number,
                                has_discrepancy=has_discrepancy,
                                discrepancy_kg=discrepancy_kg,
                                confirmed_by_name=confirmed_by_name
                            )
                    except Exception as driver_email_err:
                        logger.error(f"[NOTIFICATION] Failed to notify driver: {driver_email_err}")
            
            # Get store manager email (the person who confirmed)
            try:
                confirmer_auth = supabase.auth.admin.get_user_by_id(user.id)
                manager_email = confirmer_auth.user.email if confirmer_auth and confirmer_auth.user else None
                
                if manager_email:
                    send_delivery_confirmed_notification(
                        to_email=manager_email,
                        recipient_name=confirmed_by_name,
                        recipient_type="manager",
                        location_name=location_name,
                        quantity_bags=confirmed_kg / KG_PER_BAG,
                        quantity_kg=confirmed_kg,
                        trip_number=trip_number,
                        has_discrepancy=has_discrepancy,
                        discrepancy_kg=discrepancy_kg,
                        confirmed_by_name=confirmed_by_name
                    )
            except Exception as manager_email_err:
                logger.error(f"[NOTIFICATION] Failed to notify manager: {manager_email_err}")
                
        except Exception as notify_err:
            logger.error(f"[NOTIFICATION] Error sending delivery confirmation notifications: {notify_err}")

        return {
            "success": True,
            "message": f"Delivery confirmed: {confirmed_kg:.1f} kg ({confirmed_kg / KG_PER_BAG:.1f} bags)",
            "batch_id": batch["id"],
            "has_discrepancy": has_discrepancy,
            "discrepancy_kg": discrepancy_kg if has_discrepancy else 0,
            "request_status": request_status,
            "total_delivered_bags": total_delivered_bags,
            "requested_bags": requested_bags,
            "remaining_bags": max(0, requested_bags - total_delivered_bags)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{delivery_id}/reject")
async def reject_delivery(
    delivery_id: str,
    request: RejectDeliveryRequest,
    user_data: dict = Depends(require_auth)
):
    """Reject a pending delivery."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Get the pending delivery
        delivery = supabase.table("pending_deliveries").select("*").eq(
            "id", delivery_id
        ).single().execute()

        if not delivery.data:
            raise HTTPException(status_code=404, detail="Pending delivery not found")

        if delivery.data["status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Delivery cannot be rejected (status: {delivery.data['status']})"
            )

        # Verify user has access to this location
        is_admin = profile.data["role"] in ("admin", "zone_manager")
        is_location_match = profile.data.get("location_id") == delivery.data["location_id"]

        if not is_admin and not is_location_match:
            raise HTTPException(status_code=403, detail="Not authorized to reject this delivery")

        # Update delivery status
        supabase.table("pending_deliveries").eq("id", delivery_id).update({
            "status": "rejected",
            "confirmed_by": profile.data["id"],
            "confirmed_at": datetime.now().isoformat(),
            "discrepancy_notes": f"REJECTED: {request.reason}"
        })

        # Update stock request status if linked
        request_id = delivery.data.get("request_id")
        if request_id:
            supabase.table("stock_requests").eq("id", request_id).update({
                "status": "cancelled"
            })

        return {
            "success": True,
            "message": "Delivery rejected",
            "reason": request.reason
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def create_pending_delivery(
    supabase,
    trip_id: str,
    trip_stop_id: str,
    location_id: str,
    supplier_id: str,
    quantity_kg: float,
    request_id: str = None
) -> dict:
    """Helper function to create a pending delivery record.

    Called from trips router when a dropoff stop is completed.
    """
    delivery_data = {
        "id": str(uuid4()),
        "trip_id": trip_id,
        "trip_stop_id": trip_stop_id,
        "location_id": location_id,
        "supplier_id": supplier_id,
        "driver_claimed_qty_kg": quantity_kg,
        "status": "pending",
        "request_id": request_id
    }

    result = supabase.table("pending_deliveries").insert(delivery_data)

    if result.data:
        # Handle both list and dict responses
        if isinstance(result.data, list) and len(result.data) > 0:
            delivery = result.data[0]
        elif isinstance(result.data, dict):
            delivery = result.data
        else:
            return None

        # Get location manager to notify (use profiles_with_email view to get email)
        managers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("location_id", location_id).eq("is_active", True).in_(
            "role", ["location_manager", "admin", "zone_manager"]
        ).execute()

        # Get trip info for notification
        trip = supabase.table("trips").select(
            "trip_number, driver_name, vehicles(registration_number)"
        ).eq("id", trip_id).single().execute()

        # Get supplier name
        supplier = supabase.table("suppliers").select("name").eq(
            "id", supplier_id
        ).single().execute()

        if trip.data:
            for manager in (managers.data or []):
                if manager.get("email"):
                    send_delivery_arrived_notification(
                        to_email=manager["email"],
                        manager_name=manager.get("full_name", "Manager"),
                        trip_number=trip.data.get("trip_number", "Unknown"),
                        driver_name=trip.data.get("driver_name", "Driver"),
                        quantity_bags=round(quantity_kg / KG_PER_BAG, 1),
                        supplier_name=supplier.data.get("name", "Supplier") if supplier.data else "Supplier",
                        delivery_id=delivery["id"]
                    )

        return delivery

    return None
