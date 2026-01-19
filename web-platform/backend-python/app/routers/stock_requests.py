"""Stock Requests Router - Handles stock replenishment workflow."""

from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from datetime import datetime
from typing import Optional, List
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, require_manager, get_current_user
from ..models.requests import (
    CreateStockRequestRequest,
    CreateTripFromRequestRequest,
    CreateTripFromMultipleRequestsRequest,
    CancelStockRequestRequest,
    UpdateStockRequestRequest,
    FulfillRemainingRequest
)
from ..email import (
    send_stock_request_notification,
    send_request_accepted_notification,
    send_request_accepted_by_driver_notification,
    send_request_cancelled_notification,
    send_request_updated_notification
)

router = APIRouter(prefix="/stock-requests", tags=["Stock Requests"])

# Conversion factor: 1 bag = 10 kg
KG_PER_BAG = 10

# Target stock levels
TARGET_STOCK_KG = {
    "warehouse": 1500000,  # 1,500 tons
    "shop": 150000,        # 150 tons
}


def generate_request_number(supabase) -> str:
    """Generate a unique request number like REQ-2026-0001."""
    year = datetime.now().year

    result = supabase.table("stock_requests").select("id", count="exact").gte(
        "created_at", f"{year}-01-01"
    ).lt("created_at", f"{year + 1}-01-01").execute()

    count = (result.count or 0) + 1
    return f"REQ-{year}-{count:04d}"


@router.get("")
async def list_stock_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    location_id: Optional[str] = Query(None, description="Filter by location"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    limit: int = Query(50, ge=1, le=200),
    user_data: dict = Depends(get_current_user)
):
    """List stock requests. Managers see all, staff see their location only."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile for role-based filtering
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        query = supabase.table("stock_requests").select(
            "*, "
            "location:locations(id, name, type), "
            "trips(id, trip_number, status)"
        ).order("created_at", desc=True).limit(limit)

        # Apply role-based filtering
        if profile.data["role"] == "staff" or profile.data["role"] == "location_manager":
            if profile.data.get("location_id"):
                query = query.eq("location_id", profile.data["location_id"])

        if status:
            query = query.eq("status", status)
        if location_id:
            query = query.eq("location_id", location_id)
        if urgency:
            query = query.eq("urgency", urgency)

        result = query.execute()

        requests = result.data or []

        # Fetch profile info for requesters and acceptors
        if requests:
            profile_ids = set()
            for req in requests:
                if req.get("requested_by"):
                    profile_ids.add(req["requested_by"])
                if req.get("accepted_by"):
                    profile_ids.add(req["accepted_by"])

            if profile_ids:
                profiles_result = supabase.table("profiles").select(
                    "id, full_name"
                ).in_("id", list(profile_ids)).execute()

                profiles_map = {p["id"]: p for p in (profiles_result.data or [])}

                for req in requests:
                    req["requester"] = profiles_map.get(req.get("requested_by"))
                    req["acceptor"] = profiles_map.get(req.get("accepted_by"))

        return {
            "requests": requests,
            "total": len(requests)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available")
async def list_available_requests(
    limit: int = Query(50, ge=1, le=200),
    user_data: dict = Depends(get_current_user)
):
    """List available (pending) stock requests for drivers to accept."""
    supabase = get_supabase_admin_client()

    try:
        # Only show pending requests ordered by urgency then creation time
        result = supabase.table("stock_requests").select(
            "*, "
            "location:locations(id, name, type)"
        ).eq("status", "pending").order(
            "urgency", desc=True  # urgent first
        ).order("created_at").limit(limit).execute()

        requests = result.data or []

        # Fetch profile info for requesters
        if requests:
            profile_ids = set()
            for req in requests:
                if req.get("requested_by"):
                    profile_ids.add(req["requested_by"])

            if profile_ids:
                profiles_result = supabase.table("profiles").select(
                    "id, full_name"
                ).in_("id", list(profile_ids)).execute()

                profiles_map = {p["id"]: p for p in (profiles_result.data or [])}

                for req in requests:
                    req["requester"] = profiles_map.get(req.get("requested_by"))

        # Calculate capacity percent for each request
        for req in requests:
            location_type = req.get("location", {}).get("type", "shop")
            target = TARGET_STOCK_KG.get(location_type, TARGET_STOCK_KG["shop"])
            current = req.get("current_stock_kg") or 0
            req["capacity_percent"] = round((current / target) * 100, 1) if target > 0 else 0

        return {
            "requests": requests,
            "total": len(requests)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{request_id}")
async def get_stock_request(
    request_id: str,
    user_data: dict = Depends(get_current_user)
):
    """Get a specific stock request."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("stock_requests").select(
            "*, "
            "location:locations(id, name, type), "
            "trips(id, trip_number, status, vehicles(registration_number, make, model))"
        ).eq("id", request_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Stock request not found")

        request_data = result.data

        # Fetch profile info for requester and acceptor
        profile_ids = []
        if request_data.get("requested_by"):
            profile_ids.append(request_data["requested_by"])
        if request_data.get("accepted_by"):
            profile_ids.append(request_data["accepted_by"])

        if profile_ids:
            profiles_result = supabase.table("profiles").select(
                "id, full_name"
            ).in_("id", profile_ids).execute()

            profiles_map = {p["id"]: p for p in (profiles_result.data or [])}
            request_data["requester"] = profiles_map.get(request_data.get("requested_by"))
            request_data["acceptor"] = profiles_map.get(request_data.get("accepted_by"))

        return {"request": request_data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_stock_request(
    request: CreateStockRequestRequest,
    user_data: dict = Depends(require_auth)
):
    """Create a new stock replenishment request."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Determine location
        location_id = request.location_id or profile.data.get("location_id")
        if not location_id:
            raise HTTPException(
                status_code=400,
                detail="Location ID is required (not in profile)"
            )

        # Get location details and current stock
        location = supabase.table("locations").select("*").eq(
            "id", location_id
        ).single().execute()


        if not location.data:
            raise HTTPException(status_code=404, detail="Location not found")

        # Get current stock for this location
        stock_result = supabase.table("stock_batches").select(
            "remaining_qty"
        ).eq("location_id", location_id).gt("remaining_qty", 0).execute()

        current_stock_kg = sum(b.get("remaining_qty", 0) for b in (stock_result.data or []))

        # Calculate target based on location type
        location_type = location.data.get("type", "shop")
        target_stock_kg = TARGET_STOCK_KG.get(location_type, TARGET_STOCK_KG["shop"])

        # Create the request
        request_data = {
            "id": str(uuid4()),
            "location_id": location_id,
            "requested_by": profile.data["id"],
            "quantity_bags": request.quantity_bags,
            "urgency": request.urgency,
            "status": "pending",
            "notes": request.notes,
            "current_stock_kg": current_stock_kg,
            "target_stock_kg": target_stock_kg
        }
        print(f"[STOCK REQUEST] Inserting data: {request_data}")

        result = supabase.table("stock_requests").insert(request_data)
        print(f"[STOCK REQUEST] Insert result: {result.data}, Error: {result.error}")

        if not result.data:
            print(f"[STOCK REQUEST] Insert failed: {result.error}")
            raise HTTPException(status_code=500, detail="Failed to create request")

        # Handle both dict and list return types from Supabase insert
        if isinstance(result.data, list):
            created_request = result.data[0]
        else:
            created_request = result.data
        print(f"[STOCK REQUEST] Created request: {created_request['id']}")

        # Resolve any existing low stock alerts for this location
        try:
            from ..jobs.low_stock_alerts import resolve_alert_for_location
            resolve_alert_for_location(location_id, created_request["id"])
        except Exception as e:
            print(f"[LOW STOCK ALERT] Error resolving alert on request creation: {e}")

        # Send notification to drivers (DEFENSIVE - never fail the request due to notification issues)
        # This block is designed to NEVER throw an exception to the caller
        try:
            # Query for drivers - if role doesn't exist, this will fail gracefully
            try:
                print(f"[NOTIFICATION] Querying for drivers with role='driver' and is_active=True")
                drivers_result = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("role", "driver").eq("is_active", True).execute()
                all_recipients = drivers_result.data or []
                print(f"[NOTIFICATION] Found {len(all_recipients)} drivers: {all_recipients}")
            except Exception as query_err:
                # Role might not exist yet - log and continue without notifications
                print(f"[NOTIFICATION] Driver query failed (role may not exist): {query_err}")
                all_recipients = []

            for recipient in all_recipients:
                if recipient.get("email"):
                    try:
                        print(f"[NOTIFICATION] Sending email to {recipient['email']}")
                        send_stock_request_notification(
                            to_email=recipient["email"],
                            recipient_name=recipient.get("full_name", "Team Member"),
                            location_name=location.data["name"],
                            quantity_bags=request.quantity_bags,
                            urgency=request.urgency,
                            current_stock_pct=round((current_stock_kg / target_stock_kg) * 100, 1) if target_stock_kg > 0 else 0,
                            request_id=created_request["id"]
                        )
                        print(f"[NOTIFICATION] Email sent successfully to {recipient['email']}")
                    except Exception as email_err:
                        print(f"[EMAIL ERROR] Failed to send to {recipient['email']}: {email_err}")
        except Exception as notify_err:
            # Catch-all safety net - notifications must never crash the request
            print(f"[NOTIFICATION ERROR] Unexpected error: {notify_err}")

        # Ensure created_request is serializable (no Date objects etc if Supabase client returned them)
        # But Supabase client wraps requests.json() which returns strings for timestamps
        
        response = {
            "success": True,
            "message": f"Stock request created for {request.quantity_bags} bags",
            "request": created_request
        }
        print(f"[STOCK REQUEST] Returning success response: {response}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[STOCK REQUEST CRITICAL ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")




@router.post("/{request_id}/accept")
async def accept_stock_request(
    request_id: str,
    user_data: dict = Depends(require_auth)
):
    """Accept a pending stock request (driver action)."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Get the request
        existing = supabase.table("stock_requests").select(
            "*, location:locations(id, name, type), "
            "requester:profiles!stock_requests_requested_by_fkey(id, full_name)"
        ).eq("id", request_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Stock request not found")

        if existing.data["status"] != "pending":
            status = existing.data["status"]
            if status == "accepted":
                raise HTTPException(
                    status_code=400,
                    detail="This request was already accepted by another driver. Please check the available requests list for other opportunities."
                )
            elif status == "trip_created":
                raise HTTPException(
                    status_code=400,
                    detail="This request already has a trip created for it."
                )
            elif status == "fulfilled":
                raise HTTPException(
                    status_code=400,
                    detail="This request has already been fulfilled."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"This request cannot be accepted (current status: {status})"
                )

        # Update request status
        try:
            result = supabase.table("stock_requests").eq("id", request_id).update({
                "status": "accepted",
                "accepted_by": profile.data["id"],
                "accepted_at": datetime.now().isoformat()
            })
        except Exception as update_err:
            print(f"[ACCEPT] Update error: {update_err}")
            raise HTTPException(status_code=500, detail=f"Failed to update request: {str(update_err)}")

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to accept request - no data returned")

        # Remove escalation tracking (request is no longer pending)
        try:
            from ..jobs.request_expiration import remove_escalation_tracking
            remove_escalation_tracking(request_id)
        except Exception as e:
            print(f"[ESCALATION] Error removing tracking on accept: {e}")

        # Send email notification to the requester (store manager)
        try:
            requester_id = existing.data.get("requested_by")
            if requester_id:
                # Get requester email from profiles_with_email view
                requester_data = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("id", requester_id).execute()

                if requester_data.data and len(requester_data.data) > 0:
                    requester = requester_data.data[0]
                    if requester.get("email"):
                        send_request_accepted_by_driver_notification(
                            to_email=requester["email"],
                            requester_name=requester.get("full_name", "Store Manager"),
                            location_name=existing.data.get("location", {}).get("name", "Your location"),
                            quantity_bags=existing.data.get("quantity_bags", 0),
                            driver_name=profile.data.get("full_name", "A driver"),
                            request_id=request_id
                        )
        except Exception as email_err:
            print(f"[EMAIL ERROR] Failed to notify requester: {email_err}")

        # result.data is already the object (not a list) from our custom client
        request_data = result.data if isinstance(result.data, dict) else result.data[0] if result.data else existing.data
        return {
            "success": True,
            "message": "Request accepted. You can now create a trip to fulfill it.",
            "request": request_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/create-trip")
async def create_trip_from_request(
    request_id: str,
    trip_request: CreateTripFromRequestRequest,
    user_data: dict = Depends(require_auth)
):
    """Create a trip to fulfill a stock request."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Get the request
        existing = supabase.table("stock_requests").select(
            "*, location:locations(id, name, type), "
            "requester:profiles!stock_requests_requested_by_fkey(id, full_name)"
        ).eq("id", request_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Stock request not found")

        # Check permission: must be a manager OR the driver who accepted this request
        is_manager = profile.data["role"] in ("admin", "zone_manager", "location_manager")
        is_acceptor = existing.data.get("accepted_by") == profile.data["id"]

        if not (is_manager or is_acceptor):
            raise HTTPException(
                status_code=403,
                detail="You must be a manager or the driver who accepted this request"
            )

        if existing.data["status"] not in ("pending", "accepted"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot create trip for request with status '{existing.data['status']}'"
            )

        # Validate vehicle
        vehicle = supabase.table("vehicles").select("*").eq(
            "id", trip_request.vehicle_id
        ).single().execute()

        if not vehicle.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        if not vehicle.data.get("is_active"):
            raise HTTPException(status_code=400, detail="Vehicle is not active")

        # Get supplier info
        supplier = supabase.table("suppliers").select("*").eq(
            "id", trip_request.supplier_id
        ).single().execute()

        if not supplier.data:
            raise HTTPException(status_code=404, detail="Supplier not found")

        # Get driver info if provided - check both drivers table and profiles table
        # Only use driver_id if driver exists in drivers table (FK constraint)
        driver_name = None
        actual_driver_id = None  # Only set if driver exists in drivers table
        
        if trip_request.driver_id:
            try:
                # First try drivers table
                driver_result = supabase.table("drivers").select("*").eq(
                    "id", trip_request.driver_id
                ).execute()
                
                if driver_result.data and len(driver_result.data) > 0:
                    driver_name = driver_result.data[0].get("full_name")
                    actual_driver_id = trip_request.driver_id  # Valid FK reference
                else:
                    # Fall back to profiles table (driver_id might be a profile ID)
                    profile_result = supabase.table("profiles").select("full_name").eq(
                        "id", trip_request.driver_id
                    ).execute()
                    
                    if profile_result.data and len(profile_result.data) > 0:
                        driver_name = profile_result.data[0].get("full_name")
                        
                        # AUTO-REGISTER as driver to satisfy FK constraint
                        try:
                            supabase.table("drivers").insert({
                                "id": trip_request.driver_id,
                                "full_name": driver_name,
                                "is_active": True
                            }).execute()
                            actual_driver_id = trip_request.driver_id
                        except Exception:
                            actual_driver_id = None
            except Exception:
                actual_driver_id = None

        # Generate trip number
        year = datetime.now().year
        trip_count = supabase.table("trips").select("id").gte(
            "created_at", f"{year}-01-01"
        ).lt("created_at", f"{year + 1}-01-01").execute()
        trip_number = f"TRP-{year}-{len(trip_count.data or []) + 1:04d}"

        # Determine trip status based on auto_start flag
        trip_status = "in_progress" if trip_request.auto_start else "planned"
        request_status = "in_delivery" if trip_request.auto_start else "trip_created"

        # Create the trip
        trip_data = {
            "id": str(uuid4()),
            "trip_number": trip_number,
            "vehicle_id": trip_request.vehicle_id,
            "driver_id": actual_driver_id,  # None if driver is from profiles table
            "driver_name": driver_name,
            "status": trip_status,
            "trip_type": "supplier_to_shop",
            "supplier_id": trip_request.supplier_id,
            "to_location_id": existing.data["location_id"],
            "origin_description": supplier.data["name"],
            "destination_description": existing.data["location"]["name"],
            "notes": trip_request.notes,
            "created_by": user.id,
            "fuel_cost": 0,
            "toll_cost": 0,
            "other_cost": 0
        }

        # Add departure_time, ETA, and odometer if auto-starting
        if trip_request.auto_start:
            trip_data["departure_time"] = datetime.now().isoformat()
            if trip_request.estimated_arrival_time:
                trip_data["estimated_arrival_time"] = trip_request.estimated_arrival_time
            if trip_request.odometer_start is not None:
                trip_data["odometer_start"] = trip_request.odometer_start

        trip_result = supabase.table("trips").insert(trip_data, returning="id, trip_number, status, vehicle_id, driver_id, driver_name")

        if trip_result.error:
            raise HTTPException(status_code=500, detail=f"Failed to create trip: {trip_result.error}")
        if not trip_result.data:
            raise HTTPException(status_code=500, detail="Failed to create trip: no data returned")

        created_trip = trip_result.data if isinstance(trip_result.data, dict) else trip_result.data[0]

        # Update request status
        supabase.table("stock_requests").eq("id", request_id).update({
            "status": request_status,
            "trip_id": created_trip["id"],
            "accepted_by": profile.data["id"] if not existing.data.get("accepted_by") else existing.data["accepted_by"],
            "accepted_at": existing.data.get("accepted_at") or datetime.now().isoformat()
        })

        # Notify the requester - fetch email from profiles_with_email view
        try:
            requester_id = existing.data.get("requested_by")
            if requester_id:
                requester_data = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("id", requester_id).execute()

                if requester_data.data and len(requester_data.data) > 0:
                    requester = requester_data.data[0]
                    if requester.get("email"):
                        send_request_accepted_notification(
                            to_email=requester["email"],
                            requester_name=requester.get("full_name", "Store Manager"),
                            location_name=existing.data["location"]["name"],
                            quantity_bags=existing.data["quantity_bags"],
                            driver_name=driver_name or "A driver",
                            vehicle_reg=vehicle.data["registration_number"],
                            vehicle_desc=f"{vehicle.data.get('make', '')} {vehicle.data.get('model', '')}".strip(),
                            supplier_name=supplier.data["name"],
                            trip_number=trip_number,
                            trip_id=created_trip["id"]
                        )
        except Exception as email_err:
            print(f"[EMAIL ERROR] Failed to notify requester: {email_err}")

        return {
            "success": True,
            "message": f"Trip {trip_number} created for stock request",
            "trip": created_trip,
            "request_id": request_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-multi-trip")
async def create_trip_from_multiple_requests(
    trip_request: CreateTripFromMultipleRequestsRequest,
    user_data: dict = Depends(require_auth)
):
    """Create a multi-stop trip to fulfill multiple stock requests.

    This allows a driver to:
    1. Accept multiple stock requests from different shops
    2. Pick up from ONE supplier
    3. Deliver to multiple shops in one trip
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        profile_id = profile.data["id"]
        is_manager = profile.data["role"] in ("admin", "zone_manager", "location_manager")

        # Validate all requests exist and are accepted by this driver
        requests_data = []
        total_bags = 0

        for request_id in trip_request.request_ids:
            req = supabase.table("stock_requests").select(
                "*, location:locations(id, name, type), "
                "requester:profiles!stock_requests_requested_by_fkey(id, full_name)"
            ).eq("id", request_id).single().execute()

            if not req.data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Stock request {request_id} not found"
                )

            # Check permission: must be manager or acceptor
            is_acceptor = req.data.get("accepted_by") == profile_id
            if not (is_manager or is_acceptor):
                raise HTTPException(
                    status_code=403,
                    detail=f"You must be a manager or have accepted request {request_id}"
                )

            if req.data["status"] not in ("pending", "accepted"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Request {request_id} cannot be fulfilled (status: {req.data['status']})"
                )

            requests_data.append(req.data)
            total_bags += req.data["quantity_bags"]

        # Validate vehicle
        vehicle = supabase.table("vehicles").select("*").eq(
            "id", trip_request.vehicle_id
        ).single().execute()

        if not vehicle.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        if not vehicle.data.get("is_active"):
            raise HTTPException(status_code=400, detail="Vehicle is not active")

        # Get supplier info
        supplier = supabase.table("suppliers").select("*").eq(
            "id", trip_request.supplier_id
        ).single().execute()

        if not supplier.data:
            raise HTTPException(status_code=404, detail="Supplier not found")

        # Get driver info if provided - check both drivers table and profiles table
        # Only use driver_id if driver exists in drivers table (FK constraint)
        driver_name = None
        actual_driver_id = None  # Only set if driver exists in drivers table
        if trip_request.driver_id:
            # First try drivers table
            driver_result = supabase.table("drivers").select("*").eq(
                "id", trip_request.driver_id
            ).execute()
            if driver_result.data and len(driver_result.data) > 0:
                driver_name = driver_result.data[0].get("full_name")
                actual_driver_id = trip_request.driver_id  # Valid FK reference
            else:
                # Fall back to profiles table (driver_id might be a profile ID)
                # Don't set driver_id as it would violate FK constraint
                profile_result = supabase.table("profiles").select("full_name").eq(
                    "id", trip_request.driver_id
                ).execute()
                if profile_result.data and len(profile_result.data) > 0:
                    driver_name = profile_result.data[0].get("full_name")

        # Generate trip number
        year = datetime.now().year
        trip_count = supabase.table("trips").select("id").gte(
            "created_at", f"{year}-01-01"
        ).lt("created_at", f"{year + 1}-01-01").execute()
        trip_number = f"TRP-{year}-{len(trip_count.data or []) + 1:04d}"

        # Build destination description from all locations
        location_names = [r["location"]["name"] for r in requests_data]
        destination_desc = " → ".join(location_names)

        # Determine trip status based on auto_start flag
        trip_status = "in_progress" if trip_request.auto_start else "planned"
        request_status = "in_delivery" if trip_request.auto_start else "trip_created"

        # Create the trip
        trip_id = str(uuid4())
        trip_data = {
            "id": trip_id,
            "trip_number": trip_number,
            "vehicle_id": trip_request.vehicle_id,
            "driver_id": actual_driver_id,  # None if driver is from profiles table
            "driver_name": driver_name,
            "status": trip_status,
            "trip_type": "supplier_to_shop",
            "supplier_id": trip_request.supplier_id,
            "to_location_id": requests_data[0]["location_id"],  # First destination
            "origin_description": supplier.data["name"],
            "destination_description": destination_desc,
            "notes": trip_request.notes or f"Multi-delivery: {total_bags} bags to {len(requests_data)} locations",
            "created_by": user.id,
            "fuel_cost": 0,
            "toll_cost": 0,
            "other_cost": 0
        }

        # Add departure_time and ETA if auto-starting
        if trip_request.auto_start:
            trip_data["departure_time"] = datetime.now().isoformat()
            if trip_request.estimated_arrival_time:
                trip_data["estimated_arrival_time"] = trip_request.estimated_arrival_time

        trip_result = supabase.table("trips").insert(trip_data, returning="id, trip_number, status, vehicle_id, driver_id, driver_name")

        if not trip_result.data:
            raise HTTPException(status_code=500, detail="Failed to create trip")

        created_trip = trip_result.data[0]

        # Create trip stops - first is pickup, rest are dropoffs
        stops_data = []

        # Pickup stop from supplier
        pickup_stop_id = str(uuid4())
        stops_data.append({
            "id": pickup_stop_id,
            "trip_id": trip_id,
            "stop_sequence": 0,
            "stop_type": "pickup",
            "supplier_id": trip_request.supplier_id,
            "location_name": supplier.data["name"],
            "planned_qty_kg": total_bags * KG_PER_BAG,
            "status": "pending"
        })

        # Dropoff stops for each request
        trip_requests_data = []
        for idx, req_data in enumerate(requests_data):
            stop_id = str(uuid4())
            stops_data.append({
                "id": stop_id,
                "trip_id": trip_id,
                "stop_sequence": idx + 1,
                "stop_type": "dropoff",
                "location_id": req_data["location_id"],
                "location_name": req_data["location"]["name"],
                "planned_qty_kg": req_data["quantity_bags"] * KG_PER_BAG,
                "status": "pending"
            })

            # Create trip_request junction record
            trip_requests_data.append({
                "id": str(uuid4()),
                "trip_id": trip_id,
                "request_id": req_data["id"],
                "stop_id": stop_id,
                "stop_sequence": idx + 1,
                "planned_qty_bags": req_data["quantity_bags"],
                "status": "pending"
            })

        # Insert all stops
        supabase.table("trip_stops").insert(stops_data)

        # Insert trip_requests junction records
        supabase.table("trip_requests").insert(trip_requests_data)

        # Update all request statuses
        for req_data in requests_data:
            supabase.table("stock_requests").eq("id", req_data["id"]).update({
                "status": request_status,
                "trip_id": trip_id,
                "accepted_by": profile_id if not req_data.get("accepted_by") else req_data["accepted_by"],
                "accepted_at": req_data.get("accepted_at") or datetime.now().isoformat()
            })

            # Notify each requester - fetch email from profiles_with_email view
            try:
                requester_id = req_data.get("requested_by")
                if requester_id:
                    requester_data = supabase.table("profiles_with_email").select(
                        "email, full_name"
                    ).eq("id", requester_id).execute()

                    if requester_data.data and len(requester_data.data) > 0:
                        requester = requester_data.data[0]
                        if requester.get("email"):
                            send_request_accepted_notification(
                                to_email=requester["email"],
                                requester_name=requester.get("full_name", "Store Manager"),
                                location_name=req_data["location"]["name"],
                                quantity_bags=req_data["quantity_bags"],
                                driver_name=driver_name or profile.data.get("full_name", "A driver"),
                                vehicle_reg=vehicle.data["registration_number"],
                                vehicle_desc=f"{vehicle.data.get('make', '')} {vehicle.data.get('model', '')}".strip(),
                                supplier_name=supplier.data["name"],
                                trip_number=trip_number,
                                trip_id=trip_id
                            )
            except Exception as email_err:
                print(f"[EMAIL ERROR] Failed to notify requester: {email_err}")

        return {
            "success": True,
            "message": f"Multi-stop trip {trip_number} created for {len(requests_data)} requests ({total_bags} bags total)",
            "trip": created_trip,
            "request_ids": trip_request.request_ids,
            "stops_created": len(stops_data),
            "total_bags": total_bags
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/cancel")
async def cancel_stock_request(
    request_id: str,
    cancel_request: CancelStockRequestRequest,
    user_data: dict = Depends(require_auth)
):
    """Cancel a stock request with a reason. Notifies driver if request was accepted."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get the request with location info
        existing = supabase.table("stock_requests").select(
            "*, location:locations(id, name)"
        ).eq("id", request_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Stock request not found")

        if existing.data["status"] in ("fulfilled", "cancelled", "expired"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel request with status '{existing.data['status']}'"
            )

        # Get profile to verify permission
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Only allow cancellation by requester, acceptor, or manager
        is_requester = profile.data["id"] == existing.data["requested_by"]
        is_acceptor = profile.data["id"] == existing.data.get("accepted_by")
        is_manager = profile.data["role"] in ("admin", "zone_manager")

        if not (is_requester or is_acceptor or is_manager):
            raise HTTPException(status_code=403, detail="Not authorized to cancel this request")

        # Cancel the request with cancellation details
        result = supabase.table("stock_requests").eq("id", request_id).update({
            "status": "cancelled",
            "cancelled_at": datetime.now().isoformat(),
            "cancelled_by": profile.data["id"],
            "cancellation_reason": cancel_request.reason
        })

        # Remove escalation tracking
        try:
            from ..jobs.request_expiration import remove_escalation_tracking
            remove_escalation_tracking(request_id)
        except Exception as e:
            print(f"[ESCALATION] Error removing tracking: {e}")

        # Notify driver if request was accepted by someone
        accepted_by = existing.data.get("accepted_by")
        if accepted_by and accepted_by != profile.data["id"]:
            try:
                driver_data = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("id", accepted_by).execute()

                if driver_data.data:
                    driver = driver_data.data[0]
                    if driver.get("email"):
                        location = existing.data.get("location", {})
                        send_request_cancelled_notification(
                            to_email=driver["email"],
                            driver_name=driver.get("full_name", "Driver"),
                            location_name=location.get("name", "Unknown"),
                            quantity_bags=existing.data.get("quantity_bags", 0),
                            cancellation_reason=cancel_request.reason,
                            cancelled_by_name=profile.data.get("full_name", "A manager"),
                            request_id=request_id
                        )
            except Exception as email_err:
                print(f"[EMAIL ERROR] Failed to notify driver: {email_err}")

        # result.data is already the object from our custom client
        request_data = result.data if isinstance(result.data, dict) else result.data[0] if result.data else None
        return {
            "success": True,
            "message": "Stock request cancelled",
            "request": request_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my/requests")
async def get_my_requests(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user_data: dict = Depends(require_auth)
):
    """Get requests created by or accepted by the current user."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("id").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        profile_id = profile.data["id"]

        # Get requests I created
        created_query = supabase.table("stock_requests").select(
            "*, location:locations(id, name, type), trips(id, trip_number, status)"
        ).eq("requested_by", profile_id).order("created_at", desc=True)

        if status:
            created_query = created_query.eq("status", status)

        created_result = created_query.limit(limit).execute()

        # Get requests I accepted
        accepted_query = supabase.table("stock_requests").select(
            "*, location:locations(id, name, type), trips(id, trip_number, status)"
        ).eq("accepted_by", profile_id).order("created_at", desc=True)

        if status:
            accepted_query = accepted_query.eq("status", status)

        accepted_result = accepted_query.limit(limit).execute()

        created_requests = created_result.data or []
        accepted_requests = accepted_result.data or []

        # Fetch profile info for requesters and acceptors
        all_requests = created_requests + accepted_requests
        if all_requests:
            profile_ids = set()
            for req in all_requests:
                if req.get("requested_by"):
                    profile_ids.add(req["requested_by"])
                if req.get("accepted_by"):
                    profile_ids.add(req["accepted_by"])

            if profile_ids:
                profiles_result = supabase.table("profiles").select(
                    "id, full_name"
                ).in_("id", list(profile_ids)).execute()

                profiles_map = {p["id"]: p for p in (profiles_result.data or [])}

                for req in all_requests:
                    req["requester"] = profiles_map.get(req.get("requested_by"))
                    req["acceptor"] = profiles_map.get(req.get("accepted_by"))

        return {
            "created": created_requests,
            "accepted": accepted_requests,
            "total_created": len(created_requests),
            "total_accepted": len(accepted_requests)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{request_id}")
async def update_stock_request(
    request_id: str,
    update_request: UpdateStockRequestRequest,
    user_data: dict = Depends(require_auth)
):
    """Update a pending or accepted stock request (before trip is created).

    Allowed updates: quantity_bags, urgency, notes
    Only requester or managers can modify.
    Notifies all drivers if quantity/urgency changes.
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get the request with location info
        existing = supabase.table("stock_requests").select(
            "*, location:locations(id, name)"
        ).eq("id", request_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Stock request not found")

        # Can only modify pending or accepted requests (before trip created)
        if existing.data["status"] not in ("pending", "accepted"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot modify request with status '{existing.data['status']}'. Only pending or accepted requests can be modified."
            )

        # Get profile to verify permission
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Only requester or managers can modify
        is_requester = profile.data["id"] == existing.data["requested_by"]
        is_manager = profile.data["role"] in ("admin", "zone_manager", "location_manager")

        if not (is_requester or is_manager):
            raise HTTPException(status_code=403, detail="Not authorized to modify this request")

        # Build update data
        update_data = {}
        old_quantity = existing.data["quantity_bags"]
        old_urgency = existing.data["urgency"]
        new_quantity = update_request.quantity_bags or old_quantity
        new_urgency = update_request.urgency or old_urgency

        if update_request.quantity_bags is not None:
            update_data["quantity_bags"] = update_request.quantity_bags
        if update_request.urgency is not None:
            update_data["urgency"] = update_request.urgency
        if update_request.notes is not None:
            update_data["notes"] = update_request.notes

        if not update_data:
            raise HTTPException(status_code=400, detail="No updates provided")

        update_data["updated_at"] = datetime.now().isoformat()

        # Update the request
        result = supabase.table("stock_requests").eq("id", request_id).update(update_data)

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update request")

        # Check if urgency changed - need to recalculate escalation timing
        if update_request.urgency is not None and update_request.urgency != old_urgency:
            try:
                from ..jobs.request_expiration import ESCALATION_THRESHOLDS
                thresholds = ESCALATION_THRESHOLDS.get(update_request.urgency, ESCALATION_THRESHOLDS["normal"])

                # Recalculate next escalation based on creation time
                created_at = datetime.fromisoformat(existing.data["created_at"].replace("Z", "+00:00"))

                # Get current escalation state
                escalation = supabase.table("request_escalation_state").select("*").eq(
                    "request_id", request_id
                ).execute()

                if escalation.data:
                    state = escalation.data[0]
                    current_level = state["escalation_level"]

                    # Calculate next escalation time based on new urgency
                    from datetime import timedelta
                    if current_level == 0:
                        next_hours = thresholds["reminder"]
                    elif current_level == 1:
                        next_hours = thresholds["escalate"]
                    else:
                        next_hours = thresholds["expire"]

                    next_escalation = created_at + timedelta(hours=next_hours)

                    supabase.table("request_escalation_state").eq("request_id", request_id).update({
                        "reminder_threshold_hours": thresholds["reminder"],
                        "escalate_threshold_hours": thresholds["escalate"],
                        "expire_threshold_hours": thresholds["expire"],
                        "next_escalation_at": next_escalation.isoformat()
                    })
            except Exception as e:
                print(f"[ESCALATION] Error updating timing: {e}")

        # Notify drivers if quantity or urgency changed
        quantity_changed = update_request.quantity_bags is not None and update_request.quantity_bags != old_quantity
        urgency_changed = update_request.urgency is not None and update_request.urgency != old_urgency

        if quantity_changed or urgency_changed:
            try:
                drivers = supabase.table("profiles_with_email").select(
                    "id, email, full_name"
                ).eq("role", "driver").eq("is_active", True).execute()

                location = existing.data.get("location", {})

                for driver in (drivers.data or []):
                    if driver.get("email"):
                        try:
                            send_request_updated_notification(
                                to_email=driver["email"],
                                recipient_name=driver.get("full_name", "Driver"),
                                location_name=location.get("name", "Unknown"),
                                old_quantity_bags=old_quantity,
                                new_quantity_bags=new_quantity,
                                old_urgency=old_urgency,
                                new_urgency=new_urgency,
                                updated_by_name=profile.data.get("full_name", "Manager"),
                                request_id=request_id
                            )
                        except Exception as e:
                            print(f"[EMAIL ERROR] Failed to notify {driver['email']}: {e}")

                # Also notify the driver who accepted (if different from updater)
                accepted_by = existing.data.get("accepted_by")
                if accepted_by and accepted_by != profile.data["id"]:
                    acceptor = supabase.table("profiles_with_email").select(
                        "email, full_name"
                    ).eq("id", accepted_by).execute()

                    if acceptor.data:
                        acc = acceptor.data[0]
                        # May have already been notified if they're a driver
                        # But send anyway to ensure they got it
            except Exception as notify_err:
                print(f"[NOTIFICATION ERROR] Failed to send update notifications: {notify_err}")

        # result.data is already the object from our custom client
        request_data = result.data if isinstance(result.data, dict) else result.data[0] if result.data else existing.data
        return {
            "success": True,
            "message": "Stock request updated",
            "request": request_data,
            "changes": {
                "quantity_changed": quantity_changed,
                "urgency_changed": urgency_changed
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/fulfill-remaining")
async def fulfill_remaining_request(
    request_id: str,
    fulfill_request: FulfillRemainingRequest,
    user_data: dict = Depends(require_auth)
):
    """Create a new trip to fulfill the remaining quantity of a partially fulfilled request.

    Only available for requests with status 'partially_fulfilled'.
    """
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get the request
        existing = supabase.table("stock_requests").select(
            "*, location:locations(id, name, type), "
            "requester:profiles!stock_requests_requested_by_fkey(id, full_name)"
        ).eq("id", request_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Stock request not found")

        if existing.data["status"] != "partially_fulfilled":
            raise HTTPException(
                status_code=400,
                detail=f"Can only fulfill remaining for partially_fulfilled requests. Current status: '{existing.data['status']}'"
            )

        # Get profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="Profile not found")

        # Calculate remaining quantity from trip_requests
        # Sum up all delivered_qty_bags for this request
        trip_requests = supabase.table("trip_requests").select(
            "delivered_qty_bags"
        ).eq("request_id", request_id).execute()

        total_delivered = sum(
            (tr.get("delivered_qty_bags") or 0)
            for tr in (trip_requests.data or [])
        )

        requested_bags = existing.data["quantity_bags"]
        remaining_bags = requested_bags - total_delivered

        if remaining_bags <= 0:
            # Actually fully fulfilled, update status
            supabase.table("stock_requests").eq("id", request_id).update({
                "status": "fulfilled"
            })

            return {
                "success": True,
                "message": "Request is fully fulfilled (no remaining quantity)",
                "remaining_bags": 0
            }

        # Validate vehicle
        vehicle = supabase.table("vehicles").select("*").eq(
            "id", fulfill_request.vehicle_id
        ).single().execute()

        if not vehicle.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        if not vehicle.data.get("is_active"):
            raise HTTPException(status_code=400, detail="Vehicle is not active")

        # Get supplier
        supplier = supabase.table("suppliers").select("*").eq(
            "id", fulfill_request.supplier_id
        ).single().execute()

        if not supplier.data:
            raise HTTPException(status_code=404, detail="Supplier not found")

        # Get driver info - only use driver_id if driver exists in drivers table (FK constraint)
        driver_name = None
        actual_driver_id = None  # Only set if driver exists in drivers table
        if fulfill_request.driver_id:
            driver_result = supabase.table("drivers").select("full_name").eq(
                "id", fulfill_request.driver_id
            ).execute()
            if driver_result.data:
                driver_name = driver_result.data[0].get("full_name")
                actual_driver_id = fulfill_request.driver_id  # Valid FK reference
            else:
                # Fall back to profiles table - don't set driver_id (FK constraint)
                profile_result = supabase.table("profiles").select("full_name").eq(
                    "id", fulfill_request.driver_id
                ).execute()
                if profile_result.data:
                    driver_name = profile_result.data[0].get("full_name")

        # Generate trip number
        year = datetime.now().year
        trip_count = supabase.table("trips").select("id").gte(
            "created_at", f"{year}-01-01"
        ).lt("created_at", f"{year + 1}-01-01").execute()
        trip_number = f"TRP-{year}-{len(trip_count.data or []) + 1:04d}"

        # Create trip for remaining quantity
        trip_id = str(uuid4())
        trip_data = {
            "id": trip_id,
            "trip_number": trip_number,
            "vehicle_id": fulfill_request.vehicle_id,
            "driver_id": actual_driver_id,  # None if driver is from profiles table
            "driver_name": driver_name,
            "status": "planned",
            "trip_type": "supplier_to_shop",
            "supplier_id": fulfill_request.supplier_id,
            "to_location_id": existing.data["location_id"],
            "request_id": request_id,
            "origin_description": supplier.data["name"],
            "destination_description": existing.data["location"]["name"],
            "notes": fulfill_request.notes or f"Fulfilling remaining {remaining_bags} bags for request {request_id}",
            "created_by": user.id,
            "fuel_cost": 0,
            "toll_cost": 0,
            "other_cost": 0
        }

        trip_result = supabase.table("trips").insert(trip_data, returning="id, trip_number, status, vehicle_id, driver_id, driver_name")

        if not trip_result.data:
            raise HTTPException(status_code=500, detail="Failed to create trip")

        created_trip = trip_result.data[0]

        # Create trip_request junction record for this partial fulfillment
        trip_request_data = {
            "id": str(uuid4()),
            "trip_id": trip_id,
            "request_id": request_id,
            "planned_qty_bags": remaining_bags,
            "status": "pending"
        }
        supabase.table("trip_requests").insert(trip_request_data)

        # Update request status back to trip_created (being fulfilled again)
        supabase.table("stock_requests").eq("id", request_id).update({
            "status": "trip_created",
            "trip_id": trip_id
        })

        # Notify requester
        try:
            requester_id = existing.data.get("requested_by")
            if requester_id:
                requester_data = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("id", requester_id).execute()

                if requester_data.data:
                    requester = requester_data.data[0]
                    if requester.get("email"):
                        send_request_accepted_notification(
                            to_email=requester["email"],
                            requester_name=requester.get("full_name", "Store Manager"),
                            location_name=existing.data["location"]["name"],
                            quantity_bags=remaining_bags,
                            driver_name=driver_name or "A driver",
                            vehicle_reg=vehicle.data["registration_number"],
                            vehicle_desc=f"{vehicle.data.get('make', '')} {vehicle.data.get('model', '')}".strip(),
                            supplier_name=supplier.data["name"],
                            trip_number=trip_number,
                            trip_id=trip_id
                        )
        except Exception as email_err:
            print(f"[EMAIL ERROR] Failed to notify requester: {email_err}")

        return {
            "success": True,
            "message": f"Trip {trip_number} created for remaining {remaining_bags} bags",
            "trip": created_trip,
            "request_id": request_id,
            "remaining_bags": remaining_bags,
            "total_requested": requested_bags,
            "already_delivered": total_delivered
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
