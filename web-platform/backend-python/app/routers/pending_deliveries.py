"""Pending Deliveries Router - Handles delivery confirmation workflow."""

from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Optional
import logging
import jwt
import os

logger = logging.getLogger(__name__)
from ..config import get_supabase_admin_client, get_settings
from ..routers.auth import require_auth, require_manager, get_current_user
from ..models.requests import ConfirmDeliveryRequest, RejectDeliveryRequest, SubmitClosingKmRequest, CorrectClosingKmRequest
from ..email import send_delivery_arrived_notification, send_delivery_confirmed_notification, send_driver_km_submission_request, send_km_submitted_notification

# Secret key for JWT tokens (use environment variable in production)
KM_SUBMISSION_SECRET = os.environ.get("KM_SUBMISSION_SECRET", "km-submission-secret-key-change-in-production")

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

        # Note: odometer_end is now submitted by the driver via email link, not by the manager

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
                    }).execute()

            # Calculate total delivered across ALL trips for this request
            all_trip_requests = supabase.table("trip_requests").select(
                "delivered_qty_bags"
            ).eq("request_id", request_id).execute()

            total_delivered_bags = sum(
                (tr.get("delivered_qty_bags") or 0)
                for tr in (all_trip_requests.data or [])
            )

            # Determine request status based on total delivered
            if total_delivered_bags >= requested_bags * 0.95:  # 95% threshold for "delivered"
                request_status = "delivered"
                supabase.table("stock_requests").eq("id", request_id).update({
                    "status": "delivered"
                }).execute()
            else:
                request_status = "partially_fulfilled"
                supabase.table("stock_requests").eq("id", request_id).update({
                    "status": "partially_fulfilled"
                }).execute()

        # Feature 5: Track km email status
        km_email_status = {"sent": False, "reason": None}

        # Send notifications to driver and store manager
        try:
            print(f"[NOTIFICATION] Starting notification process for delivery {delivery_id}")
            print(f"[NOTIFICATION] Delivery data keys: {list(delivery.data.keys()) if delivery.data else 'None'}")
            print(f"[NOTIFICATION] trip_id in delivery: {delivery.data.get('trip_id')}")

            trip_data = delivery.data.get("trip", {})
            location_data = delivery.data.get("location", {})
            trip_number = trip_data.get("trip_number", "N/A") if trip_data else "N/A"
            location_name = location_data.get("name", "Unknown Location") if location_data else "Unknown Location"
            confirmed_by_name = profile.data.get("full_name", "Store Manager")

            # Get driver info and vehicle info from trip
            if delivery.data.get("trip_id"):
                # First get the trip details
                trip_details = supabase.table("trips").select(
                    "driver_id, vehicle_id, odometer_start"
                ).eq("id", delivery.data["trip_id"]).single().execute()

                print(f"[NOTIFICATION] Trip details: {trip_details.data}")

                driver_id = trip_details.data.get("driver_id") if trip_details.data else None
                vehicle_id = trip_details.data.get("vehicle_id") if trip_details.data else None
                starting_km = trip_details.data.get("odometer_start") if trip_details.data else None

                # Get driver profile separately (same pattern as manager)
                driver_name = "Driver"
                driver_user_id = None
                if driver_id:
                    driver_profile = supabase.table("profiles").select(
                        "id, full_name, user_id"
                    ).eq("id", driver_id).single().execute()
                    print(f"[NOTIFICATION] Driver profile: {driver_profile.data}")
                    if driver_profile.data:
                        driver_name = driver_profile.data.get("full_name", "Driver")
                        driver_user_id = driver_profile.data.get("user_id")

                # Get vehicle info separately
                vehicle_reg = "Unknown"
                if vehicle_id:
                    vehicle_info = supabase.table("vehicles").select(
                        "registration_number"
                    ).eq("id", vehicle_id).single().execute()
                    if vehicle_info.data:
                        vehicle_reg = vehicle_info.data.get("registration_number", "Unknown")

                print(f"[NOTIFICATION] Driver info - user_id: {driver_user_id}, name: {driver_name}, starting_km: {starting_km}")

                # Get driver email and send km submission request (same pattern as manager)
                if driver_user_id:
                    try:
                        driver_auth = supabase.auth.admin.get_user_by_id(driver_user_id)
                        driver_email = driver_auth.user.email if driver_auth and driver_auth.user else None
                        print(f"[NOTIFICATION] Driver email: {driver_email}")

                        if driver_email and starting_km is not None:
                            # Generate JWT token for km submission (valid for 7 days)
                            km_token_payload = {
                                "trip_id": delivery.data["trip_id"],
                                "delivery_id": delivery_id,
                                "driver_id": driver_id,
                                "driver_name": driver_name,
                                "vehicle_id": vehicle_id,
                                "starting_km": starting_km,
                                "exp": datetime.utcnow() + timedelta(days=7)
                            }
                            km_submission_token = jwt.encode(km_token_payload, KM_SUBMISSION_SECRET, algorithm="HS256")

                            # Send km submission request email
                            print(f"[NOTIFICATION] Sending km submission email to driver: {driver_email}")
                            email_sent = send_driver_km_submission_request(
                                to_email=driver_email,
                                driver_name=driver_name,
                                location_name=location_name,
                                vehicle_reg=vehicle_reg,
                                trip_number=trip_number,
                                starting_km=starting_km,
                                submission_token=km_submission_token
                            )
                            km_email_status["sent"] = email_sent
                            if not email_sent:
                                km_email_status["reason"] = "Email delivery failed"
                        elif driver_email:
                            km_email_status["reason"] = "Trip has no starting odometer reading"
                            # If no starting km, send regular confirmation
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
                        else:
                            km_email_status["reason"] = "Driver has no email address"
                    except Exception as driver_email_err:
                        print(f"[NOTIFICATION ERROR] Failed to notify driver: {driver_email_err}")
                        km_email_status["reason"] = f"Error: {str(driver_email_err)}"
                else:
                    print(f"[NOTIFICATION WARNING] No driver_user_id found for trip")
                    km_email_status["reason"] = "Driver has no linked user account"
            else:
                print(f"[NOTIFICATION WARNING] No trip_id in delivery data - cannot send driver email")
                km_email_status["reason"] = "No trip linked to this delivery"

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
            "remaining_bags": max(0, requested_bags - total_delivered_bags),
            "km_email_status": km_email_status  # Feature 5: Email status tracking
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


@router.get("/km-submission/{token}")
async def get_km_submission_info(token: str):
    """Get info for km submission form (no auth required, uses token)."""
    try:
        # Decode and verify the token
        payload = jwt.decode(token, KM_SUBMISSION_SECRET, algorithms=["HS256"])

        return {
            "trip_id": payload.get("trip_id"),
            "delivery_id": payload.get("delivery_id"),
            "driver_name": payload.get("driver_name"),
            "vehicle_id": payload.get("vehicle_id"),
            "starting_km": payload.get("starting_km"),
            "valid": True
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="This link has expired. Please contact your manager.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid link. Please use the link from your email.")


@router.post("/km-submission/{token}")
async def submit_closing_km(token: str, request: SubmitClosingKmRequest):
    """Submit closing odometer reading (no auth required, uses token).

    This endpoint:
    1. Validates the token
    2. Updates the trip's odometer_end
    3. Calculates trip distance and updates vehicle.kilometers_traveled
    4. Updates vehicle health with last_driver info
    """
    supabase = get_supabase_admin_client()

    try:
        # Decode and verify the token
        try:
            payload = jwt.decode(token, KM_SUBMISSION_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=400, detail="This link has expired. Please contact your manager.")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=400, detail="Invalid link. Please use the link from your email.")

        trip_id = payload.get("trip_id")
        delivery_id = payload.get("delivery_id")
        driver_id = payload.get("driver_id")
        driver_name = payload.get("driver_name")
        vehicle_id = payload.get("vehicle_id")
        starting_km = payload.get("starting_km")

        if not all([trip_id, vehicle_id, starting_km is not None]):
            raise HTTPException(status_code=400, detail="Invalid token data")

        closing_km = request.closing_km

        # Validate closing km is greater than starting km
        if closing_km < starting_km:
            raise HTTPException(
                status_code=400,
                detail=f"Closing km ({closing_km:,}) cannot be less than starting km ({starting_km:,})"
            )

        # Feature 3: Upper bound validation - max 2000 km per trip
        MAX_SINGLE_TRIP_DISTANCE_KM = 2000
        max_allowed_km = starting_km + MAX_SINGLE_TRIP_DISTANCE_KM
        if closing_km > max_allowed_km:
            raise HTTPException(
                status_code=400,
                detail=f"Closing km ({closing_km:,}) exceeds maximum expected ({max_allowed_km:,} km). Contact your manager if this is correct."
            )

        # Calculate trip distance
        trip_distance = closing_km - starting_km

        # Check if already submitted (trip has odometer_end)
        trip_check = supabase.table("trips").select("odometer_end").eq("id", trip_id).single().execute()
        if trip_check.data and trip_check.data.get("odometer_end"):
            raise HTTPException(status_code=400, detail="Closing km has already been submitted for this trip")

        # 1. Update trip with odometer_end and km_submitted status (Feature 6)
        supabase.table("trips").eq("id", trip_id).update({
            "odometer_end": closing_km
        })

        # 2. Get current vehicle data and update kilometers_traveled
        logger.info(f"[KM_SUBMISSION] Looking up vehicle_id: {vehicle_id}")

        try:
            vehicle_result = supabase.table("vehicles").select(
                "kilometers_traveled, health"
            ).eq("id", vehicle_id).single().execute()
        except Exception as vehicle_err:
            logger.error(f"[KM_SUBMISSION] Vehicle query error: {vehicle_err}")
            raise HTTPException(status_code=404, detail=f"Vehicle not found (id: {vehicle_id})")

        logger.info(f"[KM_SUBMISSION] Vehicle result: {vehicle_result.data}")

        if vehicle_result.data:
            current_km = vehicle_result.data.get("kilometers_traveled") or 0
            current_health = vehicle_result.data.get("health") or {}

            # Update kilometers_traveled
            new_total_km = current_km + trip_distance

            # Update last_driver info in health (flat fields to match frontend types)
            if isinstance(current_health, dict):
                current_health["last_driver_id"] = driver_id
                current_health["last_driver_name"] = driver_name
                current_health["last_trip_at"] = datetime.now().isoformat()
            else:
                current_health = {
                    "last_driver_id": driver_id,
                    "last_driver_name": driver_name,
                    "last_trip_at": datetime.now().isoformat()
                }

            # Update vehicle
            supabase.table("vehicles").eq("id", vehicle_id).update({
                "kilometers_traveled": new_total_km,
                "health": current_health
            })

            logger.info(f"[KM_SUBMISSION] Trip {trip_id}: {starting_km} -> {closing_km} = {trip_distance} km. Vehicle total: {new_total_km} km")

            # Feature 1: Notify vehicle managers and admins
            try:
                # Get trip number and vehicle reg for notification
                trip_info = supabase.table("trips").select("trip_number").eq("id", trip_id).single().execute()
                vehicle_info = supabase.table("vehicles").select("registration_number").eq("id", vehicle_id).single().execute()

                trip_number = trip_info.data.get("trip_number", "N/A") if trip_info.data else "N/A"
                vehicle_reg = vehicle_info.data.get("registration_number", "Unknown") if vehicle_info.data else "Unknown"

                # Get all vehicle managers and admins
                managers = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("is_active", True).in_(
                    "role", ["vehicle_manager", "admin"]
                ).execute()

                for manager in (managers.data or []):
                    if manager.get("email"):
                        send_km_submitted_notification(
                            to_email=manager["email"],
                            manager_name=manager.get("full_name", "Manager"),
                            driver_name=driver_name,
                            vehicle_reg=vehicle_reg,
                            trip_number=trip_number,
                            starting_km=starting_km,
                            closing_km=closing_km,
                            trip_distance=trip_distance
                        )
                        logger.info(f"[KM_SUBMISSION] Notified {manager['email']} about km submission")
            except Exception as notify_err:
                logger.error(f"[KM_SUBMISSION] Failed to notify managers: {notify_err}")

            return {
                "success": True,
                "message": f"Thank you! Your closing km of {closing_km:,} has been recorded.",
                "trip_distance": trip_distance,
                "new_vehicle_total_km": new_total_km,
                "starting_km": starting_km,
                "closing_km": closing_km
            }

        # Vehicle data was empty
        logger.error(f"[KM_SUBMISSION] No vehicle data found for id: {vehicle_id}")
        raise HTTPException(status_code=404, detail=f"Vehicle not found (id: {vehicle_id})")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[KM_SUBMISSION] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{delivery_id}/resend-km-email")
async def resend_km_submission_email(
    delivery_id: str,
    user_data: dict = Depends(require_auth)
):
    """Resend KM submission email to driver. Admin/vehicle_manager only.

    Feature 2: Allows resending the km submission link if driver lost the email.
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Verify user role
        profile = supabase.table("profiles").select("role").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data or profile.data["role"] not in ("admin", "vehicle_manager"):
            raise HTTPException(status_code=403, detail="Only admins and vehicle managers can resend km emails")

        # Get delivery with trip info
        delivery = supabase.table("pending_deliveries").select(
            "*, trip:trips(id, trip_number, driver_id, vehicle_id, odometer_start, odometer_end, km_submitted)"
        ).eq("id", delivery_id).single().execute()

        if not delivery.data:
            raise HTTPException(status_code=404, detail="Delivery not found")

        if delivery.data["status"] != "confirmed":
            raise HTTPException(status_code=400, detail="Can only resend km email for confirmed deliveries")

        trip = delivery.data.get("trip")
        if not trip:
            raise HTTPException(status_code=400, detail="No trip linked to this delivery")

        if trip.get("km_submitted") or trip.get("odometer_end"):
            raise HTTPException(status_code=400, detail="Closing km has already been submitted for this trip")

        if trip.get("odometer_start") is None:
            raise HTTPException(status_code=400, detail="Trip has no starting odometer reading")

        # Get driver info
        driver_id = trip.get("driver_id")
        if not driver_id:
            raise HTTPException(status_code=400, detail="Trip has no assigned driver")

        driver_profile = supabase.table("profiles").select(
            "id, full_name, user_id"
        ).eq("id", driver_id).single().execute()

        if not driver_profile.data or not driver_profile.data.get("user_id"):
            raise HTTPException(status_code=400, detail="Driver has no linked user account")

        driver_name = driver_profile.data.get("full_name", "Driver")
        driver_user_id = driver_profile.data["user_id"]

        # Get driver email
        driver_auth = supabase.auth.admin.get_user_by_id(driver_user_id)
        driver_email = driver_auth.user.email if driver_auth and driver_auth.user else None

        if not driver_email:
            raise HTTPException(status_code=400, detail="Driver has no email address")

        # Get vehicle info
        vehicle_id = trip.get("vehicle_id")
        vehicle_reg = "Unknown"
        if vehicle_id:
            vehicle_info = supabase.table("vehicles").select(
                "registration_number"
            ).eq("id", vehicle_id).single().execute()
            if vehicle_info.data:
                vehicle_reg = vehicle_info.data.get("registration_number", "Unknown")

        # Get location name
        location_name = "Unknown Location"
        if delivery.data.get("location_id"):
            location = supabase.table("locations").select("name").eq(
                "id", delivery.data["location_id"]
            ).single().execute()
            if location.data:
                location_name = location.data.get("name", "Unknown Location")

        starting_km = trip["odometer_start"]
        trip_number = trip.get("trip_number", "N/A")

        # Generate new JWT token for km submission (valid for 7 days)
        km_token_payload = {
            "trip_id": trip["id"],
            "delivery_id": delivery_id,
            "driver_id": driver_id,
            "driver_name": driver_name,
            "vehicle_id": vehicle_id,
            "starting_km": starting_km,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        km_submission_token = jwt.encode(km_token_payload, KM_SUBMISSION_SECRET, algorithm="HS256")

        # Send email
        email_sent = send_driver_km_submission_request(
            to_email=driver_email,
            driver_name=driver_name,
            location_name=location_name,
            vehicle_reg=vehicle_reg,
            trip_number=trip_number,
            starting_km=starting_km,
            submission_token=km_submission_token
        )

        if not email_sent:
            raise HTTPException(status_code=500, detail="Failed to send email")

        logger.info(f"[RESEND_KM_EMAIL] Resent km submission email to {driver_email} for delivery {delivery_id}")

        return {
            "success": True,
            "message": f"KM submission email resent to {driver_email}",
            "driver_email": driver_email,
            "driver_name": driver_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RESEND_KM_EMAIL] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trips/{trip_id}/correct-km")
async def correct_closing_km(
    trip_id: str,
    request: CorrectClosingKmRequest,
    user_data: dict = Depends(require_auth)
):
    """Correct a submitted closing km reading. Admin/vehicle_manager only.

    Feature 4: Allows correction of wrong closing km with audit trail.
    Updates vehicle total km and logs the correction.
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Verify user role
        profile = supabase.table("profiles").select("id, role, full_name").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data or profile.data["role"] not in ("admin", "vehicle_manager"):
            raise HTTPException(status_code=403, detail="Only admins and vehicle managers can correct km readings")

        # Get trip with current odometer readings
        trip = supabase.table("trips").select(
            "id, trip_number, odometer_start, odometer_end, vehicle_id, km_submitted"
        ).eq("id", trip_id).single().execute()

        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        if not trip.data.get("odometer_end"):
            raise HTTPException(status_code=400, detail="Trip has no closing km to correct")

        old_odometer_end = trip.data["odometer_end"]
        starting_km = trip.data.get("odometer_start")
        vehicle_id = trip.data["vehicle_id"]
        new_closing_km = request.new_closing_km

        if not starting_km:
            raise HTTPException(status_code=400, detail="Trip has no starting km")

        if not vehicle_id:
            raise HTTPException(status_code=400, detail="Trip has no vehicle assigned")

        # Validate new closing km
        if new_closing_km < starting_km:
            raise HTTPException(
                status_code=400,
                detail=f"New closing km ({new_closing_km:,}) cannot be less than starting km ({starting_km:,})"
            )

        # Upper bound validation
        MAX_SINGLE_TRIP_DISTANCE_KM = 2000
        if new_closing_km > starting_km + MAX_SINGLE_TRIP_DISTANCE_KM:
            raise HTTPException(
                status_code=400,
                detail=f"New closing km ({new_closing_km:,}) exceeds maximum expected ({starting_km + MAX_SINGLE_TRIP_DISTANCE_KM:,} km)"
            )

        if new_closing_km == old_odometer_end:
            raise HTTPException(status_code=400, detail="New closing km is the same as current value")

        # Get current vehicle km
        vehicle = supabase.table("vehicles").select(
            "kilometers_traveled"
        ).eq("id", vehicle_id).single().execute()

        if not vehicle.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        old_vehicle_total_km = vehicle.data.get("kilometers_traveled") or 0

        # Calculate the difference and new totals
        old_trip_distance = old_odometer_end - starting_km
        new_trip_distance = new_closing_km - starting_km
        distance_difference = new_trip_distance - old_trip_distance
        new_vehicle_total_km = old_vehicle_total_km + distance_difference

        # Update trip with new closing km
        supabase.table("trips").eq("id", trip_id).update({
            "odometer_end": new_closing_km
        })

        # Update vehicle total km
        supabase.table("vehicles").eq("id", vehicle_id).update({
            "kilometers_traveled": new_vehicle_total_km
        })

        # Log the correction
        correction_record = {
            "trip_id": trip_id,
            "vehicle_id": vehicle_id,
            "corrected_by": profile.data["id"],
            "old_odometer_end": old_odometer_end,
            "old_vehicle_total_km": old_vehicle_total_km,
            "new_odometer_end": new_closing_km,
            "new_vehicle_total_km": new_vehicle_total_km,
            "distance_difference": distance_difference,
            "reason": request.reason
        }

        supabase.table("km_corrections").insert(correction_record).execute()

        logger.info(
            f"[KM_CORRECTION] Trip {trip_id}: {old_odometer_end} -> {new_closing_km} "
            f"(diff: {distance_difference:+} km) by {profile.data['full_name']}. "
            f"Reason: {request.reason}"
        )

        return {
            "success": True,
            "message": f"Closing km corrected from {old_odometer_end:,} to {new_closing_km:,} km",
            "old_closing_km": old_odometer_end,
            "new_closing_km": new_closing_km,
            "distance_difference": distance_difference,
            "old_vehicle_total_km": old_vehicle_total_km,
            "new_vehicle_total_km": new_vehicle_total_km,
            "corrected_by": profile.data["full_name"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[KM_CORRECTION] Error: {e}")
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
