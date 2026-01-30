"""
Loans Router - Inter-shop stock borrowing system

This module handles all loan-related operations including:
- Creating loan requests
- Accepting/rejecting loans
- Confirming loans
- Assigning drivers for pickup/return
- Confirming pickup/return and stock transfers
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from uuid import uuid4
import jwt
import os

from app.config import get_supabase_admin_client
from app.routers.auth import require_auth, require_manager
from app.email import (
    send_loan_request_notification,
    send_loan_accepted_notification,
    send_loan_rejected_notification,
    send_loan_confirmed_notification,
    send_loan_pickup_complete_notification,
    send_loan_return_initiated_notification,
    send_loan_completed_notification,
    send_driver_km_submission_request,
)

# Secret key for JWT tokens for KM submission
KM_SUBMISSION_SECRET = os.environ.get("KM_SUBMISSION_SECRET", "default-secret-change-me")

router = APIRouter(prefix="/loans", tags=["Loans"])


# ============== Pydantic Models ==============

class CreateLoanRequest(BaseModel):
    lender_location_id: str
    quantity_requested: int
    estimated_return_date: date
    notes: Optional[str] = None


class AcceptLoanRequest(BaseModel):
    quantity_approved: int
    notes: Optional[str] = None


class RejectLoanRequest(BaseModel):
    reason: Optional[str] = None


class AssignDriverRequest(BaseModel):
    vehicle_id: str
    driver_id: str
    odometer_start: Optional[float] = None
    estimated_arrival_time: Optional[str] = None


class ConfirmPickupRequest(BaseModel):
    odometer_end: Optional[float] = None


class ConfirmReturnRequest(BaseModel):
    odometer_end: Optional[float] = None


# ============== Helper Functions ==============

def get_user_profile(supabase, user_id: str):
    """Get user profile with location info."""
    result = supabase.table("profiles").select(
        "*, location:locations(id, name)"
    ).eq("user_id", user_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User profile not found")
    return result.data[0]


def get_location_manager_email(supabase, location_id: str):
    """Get the manager's email for a location."""
    # Try location_manager first, then zone_manager, then admin
    for role in ["location_manager", "zone_manager", "admin"]:
        result = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("location_id", location_id).eq("role", role).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]

    return None


def get_loan_with_details(supabase, loan_id: str):
    """Get loan with all related details."""
    result = supabase.table("loans").select("*").eq("id", loan_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Loan not found")

    loan = result.data[0]

    # Enrich with location names
    location_ids = []
    if loan.get("borrower_location_id"):
        location_ids.append(loan["borrower_location_id"])
    if loan.get("lender_location_id"):
        location_ids.append(loan["lender_location_id"])

    if location_ids:
        locs_result = supabase.table("locations").select("id, name").in_("id", location_ids).execute()
        locations_map = {loc["id"]: {"id": loc["id"], "name": loc["name"]} for loc in (locs_result.data or [])}
        loan["borrower_location"] = locations_map.get(loan.get("borrower_location_id"))
        loan["lender_location"] = locations_map.get(loan.get("lender_location_id"))

    # Enrich with profile names
    profile_ids = []
    if loan.get("requested_by"):
        profile_ids.append(loan["requested_by"])
    if loan.get("approved_by"):
        profile_ids.append(loan["approved_by"])

    if profile_ids:
        profs_result = supabase.table("profiles").select("id, full_name").in_("id", profile_ids).execute()
        profiles_map = {prof["id"]: {"id": prof["id"], "full_name": prof["full_name"]} for prof in (profs_result.data or [])}
        loan["requester"] = profiles_map.get(loan.get("requested_by"))
        loan["approver"] = profiles_map.get(loan.get("approved_by"))

    return loan


# ============== API Endpoints ==============

@router.get("")
async def list_loans(
    direction: Optional[str] = None,  # 'incoming', 'outgoing', or None for all
    as_borrower: Optional[bool] = None,  # Alternative: True = outgoing
    as_lender: Optional[bool] = None,  # Alternative: True = incoming
    status: Optional[str] = None,  # Can be comma-separated list
    include_history: bool = False,
    user_data: dict = Depends(require_auth)
):
    """
    List loans for the current user's location.

    - direction: 'incoming' (as lender), 'outgoing' (as borrower), or None for all
    - as_borrower/as_lender: Alternative to direction param
    - status: Filter by specific status (can be comma-separated)
    - include_history: Include completed/rejected loans
    """
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)
    location_id = profile.get("location_id")

    if not location_id:
        raise HTTPException(status_code=400, detail="User has no assigned location")

    # Normalize direction from as_borrower/as_lender params
    if as_borrower:
        direction = "outgoing"
    elif as_lender:
        direction = "incoming"

    # Build query - fetch all loans first, then enrich with location names
    query = supabase.table("loans").select("*")

    # Filter by direction
    if direction == "incoming":
        query = query.eq("lender_location_id", location_id)
    elif direction == "outgoing":
        query = query.eq("borrower_location_id", location_id)

    query = query.order("created_at", desc=True)
    result = query.execute()

    loans = result.data or []

    # If no direction specified and not owner, filter to user's location
    if direction is None and profile.get("role") != "owner":
        loans = [
            loan for loan in loans
            if loan["borrower_location_id"] == location_id
            or loan["lender_location_id"] == location_id
        ]

    # Filter by status (supports comma-separated list)
    if status:
        status_list = [s.strip() for s in status.split(",")]
        loans = [loan for loan in loans if loan.get("status") in status_list]
    elif not include_history:
        # Exclude completed and rejected by default
        loans = [loan for loan in loans if loan.get("status") not in ["completed", "rejected"]]

    # Enrich loans with location names and requester info
    if loans:
        # Collect all unique location IDs and profile IDs
        location_ids = set()
        profile_ids = set()
        for loan in loans:
            if loan.get("borrower_location_id"):
                location_ids.add(loan["borrower_location_id"])
            if loan.get("lender_location_id"):
                location_ids.add(loan["lender_location_id"])
            if loan.get("requested_by"):
                profile_ids.add(loan["requested_by"])

        # Fetch all locations at once
        locations_map = {}
        if location_ids:
            locs_result = supabase.table("locations").select("id, name").in_("id", list(location_ids)).execute()
            for loc in (locs_result.data or []):
                locations_map[loc["id"]] = {"id": loc["id"], "name": loc["name"]}

        # Fetch all profiles at once
        profiles_map = {}
        if profile_ids:
            profs_result = supabase.table("profiles").select("id, full_name").in_("id", list(profile_ids)).execute()
            for prof in (profs_result.data or []):
                profiles_map[prof["id"]] = {"id": prof["id"], "full_name": prof["full_name"]}

        # Enrich each loan
        for loan in loans:
            loan["borrower_location"] = locations_map.get(loan.get("borrower_location_id"))
            loan["lender_location"] = locations_map.get(loan.get("lender_location_id"))
            loan["requester"] = profiles_map.get(loan.get("requested_by"))

    return {"loans": loans, "total": len(loans)}


@router.get("/pending-count")
async def get_pending_loans_count(user_data: dict = Depends(require_auth)):
    """Get count of pending loans requiring action for the current user's location."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)
    location_id = profile.get("location_id")

    if not location_id:
        return {
            "incoming_pending": 0,
            "outgoing_pending": 0,
            "lent_out_new": 0,
            "borrowed_new": 0
        }

    # Count incoming requests (as lender) that are pending - need your decision
    incoming_pending = supabase.table("loans").select("id").eq(
        "lender_location_id", location_id
    ).eq("status", "pending").execute()

    # Count outgoing requests (as borrower) that are pending - waiting for lender decision
    outgoing_pending = supabase.table("loans").select("id").eq(
        "borrower_location_id", location_id
    ).eq("status", "pending").execute()

    # Count newly accepted loans where you're the lender (for Lent Out badge)
    lent_out_new = supabase.table("loans").select("id").eq(
        "lender_location_id", location_id
    ).eq("status", "accepted").execute()

    # Count newly accepted loans where you're the borrower (for Borrowed badge - needs confirmation)
    borrowed_new = supabase.table("loans").select("id").eq(
        "borrower_location_id", location_id
    ).eq("status", "accepted").execute()

    return {
        "incoming_pending": len(incoming_pending.data or []),
        "outgoing_pending": len(outgoing_pending.data or []),
        "lent_out_new": len(lent_out_new.data or []),
        "borrowed_new": len(borrowed_new.data or [])
    }


@router.get("/locations")
async def get_other_locations(user_data: dict = Depends(require_auth)):
    """Get list of other locations that can be borrowed from, with their current stock levels."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)
    location_id = profile.get("location_id")

    # Get all shop locations
    query = supabase.table("locations").select("id, name, type")

    # Exclude user's own location if they have one
    if location_id:
        query = query.neq("id", location_id)

    # Only get shops (not warehouses) for borrowing
    query = query.eq("type", "shop").order("name")
    result = query.execute()

    locations = result.data or []

    # Get stock levels for each location
    if locations:
        location_ids = [loc["id"] for loc in locations]

        # Get stock balance for these locations
        # Using stock_balance view or calculating from batches
        stock_result = supabase.table("stock_balance").select(
            "location_id, on_hand_qty"
        ).in_("location_id", location_ids).execute()

        stock_by_location = {}
        for stock in (stock_result.data or []):
            loc_id = stock["location_id"]
            qty = stock.get("on_hand_qty", 0) or 0
            # Convert to bags (assuming 10kg per bag)
            stock_by_location[loc_id] = round(qty / 10, 1)

        # Add stock info to locations
        for loc in locations:
            loc["current_stock_bags"] = stock_by_location.get(loc["id"], 0)

    return {"locations": locations}


@router.get("/{loan_id}")
async def get_loan(loan_id: str, user_data: dict = Depends(require_auth)):
    """Get detailed information about a specific loan."""
    supabase = get_supabase_admin_client()
    loan = get_loan_with_details(supabase, loan_id)
    return loan


@router.post("")
async def create_loan_request(
    request: CreateLoanRequest,
    user_data: dict = Depends(require_auth)
):
    """Create a new loan request."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)
    borrower_location_id = profile.get("location_id")

    if not borrower_location_id:
        raise HTTPException(status_code=400, detail="User has no assigned location")

    if borrower_location_id == request.lender_location_id:
        raise HTTPException(status_code=400, detail="Cannot request loan from your own location")

    # Verify lender location exists
    lender = supabase.table("locations").select("id, name").eq(
        "id", request.lender_location_id
    ).execute()

    if not lender.data:
        raise HTTPException(status_code=404, detail="Lender location not found")

    # Create the loan request
    loan_data = {
        "id": str(uuid4()),
        "borrower_location_id": borrower_location_id,
        "lender_location_id": request.lender_location_id,
        "requested_by": profile["id"],
        "quantity_requested": request.quantity_requested,
        "estimated_return_date": request.estimated_return_date.isoformat(),
        "notes": request.notes,
        "status": "pending"
    }

    result = supabase.table("loans").insert(loan_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create loan request")

    # Send notification to lender's manager
    try:
        lender_manager = get_location_manager_email(supabase, request.lender_location_id)
        if lender_manager and lender_manager.get("email"):
            send_loan_request_notification(
                to_email=lender_manager["email"],
                manager_name=lender_manager.get("full_name", "Manager"),
                borrower_shop=profile["location"]["name"],
                quantity=request.quantity_requested,
                return_date=request.estimated_return_date.strftime("%B %d, %Y"),
                requester_name=profile.get("full_name", "A manager"),
                notes=request.notes
            )
    except Exception as e:
        print(f"Failed to send loan request notification: {e}")

    return {
        "message": "Loan request created successfully",
        "loan": result.data
    }


@router.post("/{loan_id}/accept")
async def accept_loan(
    loan_id: str,
    request: AcceptLoanRequest,
    user_data: dict = Depends(require_auth)
):
    """Accept a loan request (as lender). Can modify the quantity."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is from lender location
    if loan["lender_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the lender can accept this loan")

    if loan["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot accept loan with status '{loan['status']}'")

    if request.quantity_approved > loan["quantity_requested"]:
        raise HTTPException(
            status_code=400,
            detail="Approved quantity cannot exceed requested quantity"
        )

    # Update the loan
    update_data = {
        "status": "accepted",
        "quantity_approved": request.quantity_approved,
        "approved_by": profile["id"]
    }
    if request.notes:
        update_data["notes"] = (loan.get("notes") or "") + f"\n\nLender note: {request.notes}"

    result = supabase.table("loans").update(update_data).eq("id", loan_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to accept loan")

    # Send notification to borrower's manager
    try:
        borrower_manager = get_location_manager_email(supabase, loan["borrower_location_id"])
        if borrower_manager and borrower_manager.get("email"):
            quantity_changed = request.quantity_approved != loan["quantity_requested"]
            send_loan_accepted_notification(
                to_email=borrower_manager["email"],
                manager_name=borrower_manager.get("full_name", "Manager"),
                lender_shop=loan["lender_location"]["name"],
                quantity_requested=loan["quantity_requested"],
                quantity_approved=request.quantity_approved,
                quantity_changed=quantity_changed
            )
    except Exception as e:
        print(f"Failed to send loan accepted notification: {e}")

    return {"message": "Loan accepted successfully", "loan": result.data}


@router.post("/{loan_id}/reject")
async def reject_loan(
    loan_id: str,
    request: RejectLoanRequest,
    user_data: dict = Depends(require_auth)
):
    """Reject a loan request (can be done by lender for pending, or borrower for accepted)."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)
    location_id = profile.get("location_id")

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Determine who is rejecting
    is_lender = loan["lender_location_id"] == location_id
    is_borrower = loan["borrower_location_id"] == location_id

    if not is_lender and not is_borrower:
        raise HTTPException(status_code=403, detail="You are not involved in this loan")

    # Lender can reject pending loans, borrower can reject accepted (counter-offer)
    if is_lender and loan["status"] != "pending":
        raise HTTPException(status_code=400, detail="Lender can only reject pending loans")

    if is_borrower and loan["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Borrower can only reject accepted loans (counter-offers)")

    # Update the loan
    update_data = {
        "status": "rejected",
        "rejection_reason": request.reason
    }

    result = supabase.table("loans").update(update_data).eq("id", loan_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to reject loan")

    # Send notification
    try:
        if is_lender:
            # Notify borrower that their request was rejected
            borrower_manager = get_location_manager_email(supabase, loan["borrower_location_id"])
            if borrower_manager and borrower_manager.get("email"):
                send_loan_rejected_notification(
                    to_email=borrower_manager["email"],
                    manager_name=borrower_manager.get("full_name", "Manager"),
                    lender_shop=loan["lender_location"]["name"],
                    quantity=loan["quantity_requested"],
                    reason=request.reason,
                    is_counter_offer_rejection=False
                )
        else:
            # Notify lender that borrower rejected counter-offer
            lender_manager = get_location_manager_email(supabase, loan["lender_location_id"])
            if lender_manager and lender_manager.get("email"):
                send_loan_rejected_notification(
                    to_email=lender_manager["email"],
                    manager_name=lender_manager.get("full_name", "Manager"),
                    lender_shop=loan["borrower_location"]["name"],
                    quantity=loan["quantity_approved"],
                    reason=request.reason,
                    is_counter_offer_rejection=True
                )
    except Exception as e:
        print(f"Failed to send loan rejection notification: {e}")

    return {"message": "Loan rejected", "loan": result.data}


@router.post("/{loan_id}/confirm")
async def confirm_loan(loan_id: str, user_data: dict = Depends(require_auth)):
    """Borrower confirms the accepted loan (including any counter-offer)."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is borrower
    if loan["borrower_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the borrower can confirm this loan")

    if loan["status"] != "accepted":
        raise HTTPException(status_code=400, detail=f"Cannot confirm loan with status '{loan['status']}'")

    # Update status to confirmed
    result = supabase.table("loans").update({
        "status": "confirmed"
    }).eq("id", loan_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to confirm loan")

    # Notify lender
    try:
        lender_manager = get_location_manager_email(supabase, loan["lender_location_id"])
        if lender_manager and lender_manager.get("email"):
            send_loan_confirmed_notification(
                to_email=lender_manager["email"],
                manager_name=lender_manager.get("full_name", "Manager"),
                borrower_shop=loan["borrower_location"]["name"],
                quantity=loan["quantity_approved"]
            )
    except Exception as e:
        print(f"Failed to send loan confirmed notification: {e}")

    return {"message": "Loan confirmed. Please assign a driver for pickup.", "loan": result.data}


@router.post("/{loan_id}/assign-pickup")
async def assign_pickup_driver(
    loan_id: str,
    request: AssignDriverRequest,
    user_data: dict = Depends(require_auth)
):
    """Borrower assigns a driver to pick up the loaned stock."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is borrower
    if loan["borrower_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the borrower can assign pickup driver")

    if loan["status"] != "confirmed":
        raise HTTPException(status_code=400, detail=f"Cannot assign pickup for loan with status '{loan['status']}'")

    # Get vehicle info
    vehicle = supabase.table("vehicles").select("*").eq("id", request.vehicle_id).execute()
    if not vehicle.data:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Get driver name
    driver_name = None
    driver_result = supabase.table("drivers").select("full_name").eq("id", request.driver_id).execute()
    if driver_result.data:
        driver_name = driver_result.data[0].get("full_name")
    else:
        profile_result = supabase.table("profiles").select("full_name").eq("id", request.driver_id).execute()
        if profile_result.data:
            driver_name = profile_result.data[0].get("full_name")

    # Generate trip number
    year = datetime.now().year
    year_prefix = f"TRP-{year}-"
    all_trips = supabase.table("trips").select("trip_number").execute()

    max_seq = 0
    for trip in (all_trips.data or []):
        trip_num = trip.get("trip_number", "")
        if trip_num and trip_num.startswith(year_prefix):
            try:
                seq = int(trip_num[len(year_prefix):])
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                pass

    trip_number = f"TRP-{year}-{max_seq + 1:04d}"

    # Create trip for pickup - starts as "planned" until driver accepts
    trip_data = {
        "id": str(uuid4()),
        "trip_number": trip_number,
        "vehicle_id": request.vehicle_id,
        "driver_id": request.driver_id if driver_result.data else None,
        "driver_name": driver_name,
        "status": "planned",  # Driver needs to accept before it becomes in_progress
        "trip_type": "loan_pickup",
        "from_location_id": loan["lender_location_id"],
        "to_location_id": loan["borrower_location_id"],
        "origin_description": f"Loan pickup from {loan['lender_location']['name']}",
        "destination_description": loan["borrower_location"]["name"],
        "notes": f"Loan pickup - {loan['quantity_approved']} bags",
        "created_by": user_data["user"].id,
        "fuel_cost": 0,
        "toll_cost": 0,
        "other_cost": 0
    }

    if request.odometer_start is not None:
        trip_data["odometer_start"] = request.odometer_start

    if request.estimated_arrival_time:
        trip_data["estimated_arrival_time"] = request.estimated_arrival_time

    trip_result = supabase.table("trips").insert(trip_data).execute()

    if not trip_result.data:
        raise HTTPException(status_code=500, detail="Failed to create pickup trip")

    # Update loan with trip reference - status stays "confirmed" until driver accepts
    loan_update = supabase.table("loans").update({
        "pickup_trip_id": trip_data["id"]
        # Note: status stays "confirmed" - will change to "in_transit" when driver accepts
    }).eq("id", loan_id).execute()

    if not loan_update.data:
        raise HTTPException(status_code=500, detail="Failed to update loan")

    # Update vehicle odometer if provided
    if request.odometer_start is not None:
        supabase.table("vehicles").update({
            "current_km": request.odometer_start
        }).eq("id", request.vehicle_id).execute()

    return {
        "message": "Pickup driver assigned. Driver needs to accept the assignment.",
        "loan": loan_update.data,
        "trip": trip_result.data
    }


class AcceptPickupRequest(BaseModel):
    """Request body for driver accepting loan pickup."""
    odometer_start: int  # Required - driver must enter starting odometer


@router.post("/{loan_id}/accept-pickup")
async def accept_pickup_assignment(
    loan_id: str,
    request: AcceptPickupRequest,
    user_data: dict = Depends(require_auth)
):
    """Driver accepts the loan pickup assignment. This starts the trip."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    # Validate odometer value
    if request.odometer_start < 0:
        raise HTTPException(status_code=400, detail="Odometer value cannot be negative")

    # Get driver IDs from both tables
    driver_ids = []
    driver_result = supabase.table("drivers").select("id, full_name").eq(
        "user_id", user.id
    ).execute()
    if driver_result.data:
        driver_ids.append(driver_result.data[0]["id"])

    profile_result = supabase.table("profiles").select("id, full_name, role").eq(
        "user_id", user.id
    ).execute()
    if profile_result.data:
        profile_id = profile_result.data[0]["id"]
        if profile_id not in driver_ids:
            driver_ids.append(profile_id)

    if not driver_ids:
        raise HTTPException(status_code=403, detail="Only drivers can accept pickup assignments")

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    if loan["status"] != "confirmed":
        raise HTTPException(status_code=400, detail=f"Cannot accept pickup for loan with status '{loan['status']}'")

    if not loan.get("pickup_trip_id"):
        raise HTTPException(status_code=400, detail="No pickup trip assigned to this loan")

    # Verify the trip is assigned to this driver
    trip = supabase.table("trips").select("*").eq("id", loan["pickup_trip_id"]).execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Pickup trip not found")

    trip_data = trip.data[0]
    if trip_data["driver_id"] not in driver_ids:
        raise HTTPException(status_code=403, detail="This pickup is not assigned to you")

    if trip_data["status"] != "planned":
        raise HTTPException(status_code=400, detail=f"Trip is already {trip_data['status']}")

    # Update trip to in_progress with starting odometer
    trip_update = supabase.table("trips").update({
        "status": "in_progress",
        "departure_time": datetime.now().isoformat(),
        "odometer_start": request.odometer_start
    }).eq("id", loan["pickup_trip_id"]).execute()

    # Update loan to in_transit
    loan_update = supabase.table("loans").update({
        "status": "in_transit"
    }).eq("id", loan_id).execute()

    return {
        "message": "Pickup accepted. You can now proceed to collect the stock.",
        "loan": loan_update.data,
        "trip": trip_update.data
    }


class ConfirmCollectionRequest(BaseModel):
    """Request body for lender confirming collection."""
    actual_quantity_bags: Optional[int] = None  # If different from approved


@router.post("/{loan_id}/confirm-collection")
async def confirm_collection(
    loan_id: str,
    request: Optional[ConfirmCollectionRequest] = None,
    user_data: dict = Depends(require_auth)
):
    """
    Lender confirms the driver has collected the stock.
    This DEDUCTS stock from the lender's inventory.
    """
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is LENDER (stock is being collected FROM their location)
    if loan["lender_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the lender can confirm collection")

    # Allow if status is "in_transit" (normal) or "active" (already partially processed - idempotent)
    if loan["status"] not in ["in_transit", "active"]:
        raise HTTPException(status_code=400, detail=f"Cannot confirm collection for loan with status '{loan['status']}'")

    # If already active, return success (idempotent)
    if loan["status"] == "active":
        return {
            "success": True,
            "message": f"Collection already confirmed. {loan['quantity_approved']} bags were released.",
            "quantity_bags": loan["quantity_approved"],
            "loan": loan
        }

    quantity = loan["quantity_approved"]
    if request and request.actual_quantity_bags:
        quantity = request.actual_quantity_bags

    # Get the default item (Potatoes)
    item_result = supabase.table("items").select("id").ilike("sku", "POT-%").limit(1).execute()
    if not item_result.data:
        item_result = supabase.table("items").select("id").limit(1).execute()

    item_id = item_result.data[0]["id"] if item_result.data else None

    # DEDUCT stock from lender using stock_batches (FIFO)
    quantity_kg = quantity * 10  # Convert bags to kg
    remaining_to_deduct = quantity_kg

    # Get lender's batches ordered by received_at (FIFO)
    batches = supabase.table("stock_batches").select("*").eq(
        "location_id", loan["lender_location_id"]
    ).gt("remaining_qty", 0).order("received_at", desc=False).execute()

    deducted_from_batches = []
    for batch in (batches.data or []):
        if remaining_to_deduct <= 0:
            break

        batch_remaining = batch.get("remaining_qty", 0)
        deduct_amount = min(batch_remaining, remaining_to_deduct)

        new_remaining = batch_remaining - deduct_amount
        supabase.table("stock_batches").update({
            "remaining_qty": new_remaining
        }).eq("id", batch["id"]).execute()

        deducted_from_batches.append({
            "batch_id": batch["id"],
            "amount_kg": deduct_amount
        })
        remaining_to_deduct -= deduct_amount

    # Create stock transaction for the loan out
    if item_id:
        transaction_data = {
            "id": str(uuid4()),
            "item_id": item_id,
            "location_id_from": loan["lender_location_id"],
            "location_id_to": loan["borrower_location_id"],
            "type": "transfer",  # Using transfer type for loans
            "qty": quantity_kg,
            "unit": "kg",
            "created_by": user_data["user"].id,
            "notes": f"Loan collection confirmed - {quantity} bags to {loan['borrower_location']['name']} (Loan ID: {loan_id[:8]})"
        }
        supabase.table("stock_transactions").insert(transaction_data).execute()

    # Update loan status to "active" (skipping "collected" intermediate state)
    # The lender confirming pickup means stock has left their inventory
    # Stock will be added to borrower's inventory when borrower confirms receipt
    loan_update = supabase.table("loans").update({
        "status": "active"
    }).eq("id", loan_id).execute()

    if not loan_update.data or len(loan_update.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to update loan status")

    # NOTE: Don't complete the trip here - trip stays in_progress
    # The trip will be completed when the BORROWER confirms receipt
    # This allows the borrower to see the delivery in their Tracking section
    print(f"[LOAN CONFIRM] Lender confirmed collection. Trip remains in_progress for borrower to confirm receipt.")

    # Create pending_delivery record for history (lender - stock released)
    pending_delivery_data = {
        "id": str(uuid4()),
        "trip_id": loan.get("pickup_trip_id"),
        "trip_stop_id": None,
        "request_id": None,
        "location_id": loan["lender_location_id"],
        "supplier_id": None,  # No supplier for loans
        "driver_claimed_qty_kg": quantity_kg,
        "status": "confirmed",
        "confirmed_qty_kg": quantity_kg,
        "confirmed_by": profile["id"],
        "confirmed_at": datetime.now().isoformat(),
        "discrepancy_notes": f"Loan collection - {quantity} bags released to {loan['borrower_location']['name']}"
    }
    supabase.table("pending_deliveries").insert(pending_delivery_data).execute()

    return {
        "success": True,
        "message": f"Collection confirmed. {quantity} bags released to driver.",
        "quantity_bags": quantity,
        "loan": loan_update.data[0] if loan_update.data and len(loan_update.data) > 0 else loan
    }


@router.post("/{loan_id}/confirm-receipt")
async def confirm_receipt(
    loan_id: str,
    request: ConfirmPickupRequest = None,
    user_data: dict = Depends(require_auth)
):
    """
    Borrower confirms receipt of loaned stock.
    This ADDS stock to the borrower's inventory and sets loan to "active".
    """
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is BORROWER (stock is arriving TO their location)
    if loan["borrower_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the borrower can confirm receipt")

    # Can confirm receipt if status is "active" (lender confirmed), "collected", or "in_transit"
    if loan["status"] not in ["active", "collected", "in_transit"]:
        raise HTTPException(status_code=400, detail=f"Cannot confirm receipt for loan with status '{loan['status']}'")

    quantity = loan["quantity_approved"]

    # Get the default item (Potatoes)
    item_result = supabase.table("items").select("id").ilike("sku", "POT-%").limit(1).execute()
    if not item_result.data:
        item_result = supabase.table("items").select("id").limit(1).execute()

    item_id = item_result.data[0]["id"] if item_result.data else None

    # ADD stock to borrower - create a new batch
    quantity_kg = quantity * 10  # Convert bags to kg

    if item_id:
        # Get a default supplier (supplier_id is required in stock_batches)
        supplier_result = supabase.table("suppliers").select("id").limit(1).execute()
        default_supplier_id = supplier_result.data[0]["id"] if supplier_result.data else None

        if not default_supplier_id:
            print("[LOAN RECEIPT] WARNING: No supplier found, cannot create stock batch")
        else:
            batch_data = {
                "id": str(uuid4()),
                "item_id": item_id,
                "location_id": loan["borrower_location_id"],
                "supplier_id": default_supplier_id,  # Required field
                "trip_id": loan.get("pickup_trip_id"),
                "initial_qty": quantity_kg,
                "remaining_qty": quantity_kg,
                "received_at": datetime.now().isoformat(),
                "quality_score": 1,
                "status": "available",
                "last_edited_by": user_data["user"].id,
                "quality_notes": f"Loan from {loan['lender_location']['name']} ({quantity} bags)"
            }
            batch_result = supabase.table("stock_batches").insert(batch_data).execute()
            print(f"[LOAN RECEIPT] Stock batch insert result: {batch_result.data}")

        # Create stock transaction for the loan in
        transaction_data = {
            "id": str(uuid4()),
            "item_id": item_id,
            "location_id_to": loan["borrower_location_id"],
            "batch_id": batch_data["id"],
            "trip_id": loan.get("pickup_trip_id"),
            "type": "receive",  # Receiving loaned stock
            "qty": quantity_kg,
            "unit": "kg",
            "created_by": user_data["user"].id,
            "notes": f"Loan received from {loan['lender_location']['name']} - {quantity} bags (Loan ID: {loan_id[:8]})"
        }
        supabase.table("stock_transactions").insert(transaction_data).execute()

    # Complete the pickup trip
    if loan.get("pickup_trip_id"):
        trip_update = {
            "status": "completed",
            "completed_at": datetime.now().isoformat()
        }
        supabase.table("trips").update(trip_update).eq("id", loan["pickup_trip_id"]).execute()

    # Update loan status to active
    loan_update = supabase.table("loans").update({
        "status": "active"
    }).eq("id", loan_id).execute()

    if not loan_update.data:
        raise HTTPException(status_code=500, detail="Failed to update loan")

    # Create pending_delivery record for history (borrower - stock received)
    pending_delivery_data = {
        "id": str(uuid4()),
        "trip_id": loan.get("pickup_trip_id"),
        "trip_stop_id": None,
        "request_id": None,
        "location_id": loan["borrower_location_id"],
        "supplier_id": None,  # No supplier for loans
        "driver_claimed_qty_kg": quantity_kg,
        "status": "confirmed",
        "confirmed_qty_kg": quantity_kg,
        "confirmed_by": profile["id"],
        "confirmed_at": datetime.now().isoformat(),
        "discrepancy_notes": f"Loan receipt - {quantity} bags received from {loan['lender_location']['name']}"
    }
    supabase.table("pending_deliveries").insert(pending_delivery_data).execute()

    # Send KM submission request to driver (blocks their app until submitted)
    km_email_sent = False
    try:
        pickup_trip_id = loan.get("pickup_trip_id")
        if pickup_trip_id:
            # Get trip details for driver info
            trip_result = supabase.table("trips").select(
                "id, trip_number, driver_id, driver_name, odometer_start, vehicle_id, "
                "vehicles(registration_number), "
                "drivers(id, full_name, user_id)"
            ).eq("id", pickup_trip_id).execute()

            if trip_result.data:
                trip_data = trip_result.data[0] if isinstance(trip_result.data, list) else trip_result.data
                driver_id = trip_data.get("driver_id")
                driver_name = trip_data.get("driver_name") or "Driver"
                starting_km = trip_data.get("odometer_start")
                vehicle_id = trip_data.get("vehicle_id")
                vehicle_reg = trip_data.get("vehicles", {}).get("registration_number", "Unknown") if trip_data.get("vehicles") else "Unknown"
                trip_number = trip_data.get("trip_number", "Unknown")

                # Get driver's user_id from drivers table
                driver_user_id = None
                if trip_data.get("drivers"):
                    driver_user_id = trip_data["drivers"].get("user_id")

                if driver_user_id:
                    # Get driver email from auth
                    driver_auth = supabase.auth.admin.get_user_by_id(driver_user_id)
                    driver_email = driver_auth.user.email if driver_auth and driver_auth.user else None

                    if driver_email and starting_km is not None:
                        # Generate JWT token for KM submission (valid for 7 days)
                        km_token_payload = {
                            "trip_id": pickup_trip_id,
                            "delivery_id": pending_delivery_data["id"],
                            "driver_id": driver_id,
                            "driver_name": driver_name,
                            "vehicle_id": vehicle_id,
                            "starting_km": starting_km,
                            "exp": datetime.utcnow() + timedelta(days=7)
                        }
                        km_submission_token = jwt.encode(km_token_payload, KM_SUBMISSION_SECRET, algorithm="HS256")

                        # Send KM submission request email to driver
                        print(f"[LOAN RECEIPT] Sending KM submission email to driver: {driver_email}")
                        km_email_sent = send_driver_km_submission_request(
                            to_email=driver_email,
                            driver_name=driver_name,
                            location_name=loan["borrower_location"]["name"],
                            vehicle_reg=vehicle_reg,
                            trip_number=trip_number,
                            starting_km=starting_km,
                            submission_token=km_submission_token
                        )
                        print(f"[LOAN RECEIPT] KM email sent: {km_email_sent}")
                    elif not starting_km:
                        print(f"[LOAN RECEIPT] No starting KM on trip, skipping KM submission email")
                    else:
                        print(f"[LOAN RECEIPT] No driver email found")
                else:
                    print(f"[LOAN RECEIPT] No driver user_id found")
    except Exception as km_err:
        print(f"[LOAN RECEIPT] Error sending KM submission email: {km_err}")

    # Notify lender that pickup is complete
    try:
        lender_manager = get_location_manager_email(supabase, loan["lender_location_id"])
        if lender_manager and lender_manager.get("email"):
            send_loan_pickup_complete_notification(
                to_email=lender_manager["email"],
                manager_name=lender_manager.get("full_name", "Manager"),
                borrower_shop=loan["borrower_location"]["name"],
                quantity=quantity,
                driver_name="Driver"
            )
    except Exception as e:
        print(f"Failed to send pickup complete notification: {e}")

    # Handle both list and dict return types from Supabase client
    loan_data = loan_update.data
    if isinstance(loan_data, list) and len(loan_data) > 0:
        loan_data = loan_data[0]

    return {
        "success": True,
        "message": f"Receipt confirmed. {quantity} bags added to your stock. Loan is now active.",
        "quantity_bags": quantity,
        "loan": loan_data
    }


# Keep the old endpoint for backwards compatibility but redirect to new one
@router.post("/{loan_id}/confirm-pickup")
async def confirm_pickup(
    loan_id: str,
    request: ConfirmPickupRequest = None,
    user_data: dict = Depends(require_auth)
):
    """DEPRECATED: Use confirm-receipt instead. This is kept for backwards compatibility."""
    return await confirm_receipt(loan_id, request, user_data)


@router.post("/{loan_id}/initiate-return")
async def initiate_return(loan_id: str, user_data: dict = Depends(require_auth)):
    """Borrower initiates the return process."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is borrower
    if loan["borrower_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the borrower can initiate return")

    if loan["status"] not in ["active", "overdue"]:
        raise HTTPException(status_code=400, detail=f"Cannot initiate return for loan with status '{loan['status']}'")

    # Notify lender
    try:
        lender_manager = get_location_manager_email(supabase, loan["lender_location_id"])
        if lender_manager and lender_manager.get("email"):
            send_loan_return_initiated_notification(
                to_email=lender_manager["email"],
                manager_name=lender_manager.get("full_name", "Manager"),
                borrower_shop=loan["borrower_location"]["name"],
                quantity=loan["quantity_approved"]
            )
    except Exception as e:
        print(f"Failed to send return initiated notification: {e}")

    return {"message": "Return initiated. Please assign a driver for return delivery.", "loan": loan}


@router.post("/{loan_id}/assign-return")
async def assign_return_driver(
    loan_id: str,
    request: AssignDriverRequest,
    user_data: dict = Depends(require_auth)
):
    """Borrower assigns a driver to return the loaned stock."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is borrower
    if loan["borrower_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the borrower can assign return driver")

    if loan["status"] not in ["active", "overdue"]:
        raise HTTPException(status_code=400, detail=f"Cannot assign return for loan with status '{loan['status']}'")

    # Get vehicle info
    vehicle = supabase.table("vehicles").select("*").eq("id", request.vehicle_id).execute()
    if not vehicle.data:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Get driver name
    driver_name = None
    driver_result = supabase.table("drivers").select("full_name").eq("id", request.driver_id).execute()
    if driver_result.data:
        driver_name = driver_result.data[0].get("full_name")
    else:
        profile_result = supabase.table("profiles").select("full_name").eq("id", request.driver_id).execute()
        if profile_result.data:
            driver_name = profile_result.data[0].get("full_name")

    # Generate trip number
    year = datetime.now().year
    year_prefix = f"TRP-{year}-"
    all_trips = supabase.table("trips").select("trip_number").execute()

    max_seq = 0
    for trip in (all_trips.data or []):
        trip_num = trip.get("trip_number", "")
        if trip_num and trip_num.startswith(year_prefix):
            try:
                seq = int(trip_num[len(year_prefix):])
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                pass

    trip_number = f"TRP-{year}-{max_seq + 1:04d}"

    # Create trip for return
    trip_data = {
        "id": str(uuid4()),
        "trip_number": trip_number,
        "vehicle_id": request.vehicle_id,
        "driver_id": request.driver_id if driver_result.data else None,
        "driver_name": driver_name,
        "status": "in_progress",
        "trip_type": "loan_return",
        "from_location_id": loan["borrower_location_id"],
        "to_location_id": loan["lender_location_id"],
        "origin_description": loan["borrower_location"]["name"],
        "destination_description": f"Loan return to {loan['lender_location']['name']}",
        "notes": f"Loan return - {loan['quantity_approved']} bags",
        "created_by": user_data["user"].id,
        "departure_time": datetime.now().isoformat(),
        "fuel_cost": 0,
        "toll_cost": 0,
        "other_cost": 0
    }

    if request.odometer_start is not None:
        trip_data["odometer_start"] = request.odometer_start

    if request.estimated_arrival_time:
        trip_data["estimated_arrival_time"] = request.estimated_arrival_time

    trip_result = supabase.table("trips").insert(trip_data).execute()

    if not trip_result.data:
        raise HTTPException(status_code=500, detail="Failed to create return trip")

    # Update loan with trip reference and status
    loan_update = supabase.table("loans").update({
        "status": "return_in_transit",
        "return_trip_id": trip_data["id"]
    }).eq("id", loan_id).execute()

    if not loan_update.data:
        raise HTTPException(status_code=500, detail="Failed to update loan")

    # Update vehicle odometer if provided
    if request.odometer_start is not None:
        supabase.table("vehicles").update({
            "current_km": request.odometer_start
        }).eq("id", request.vehicle_id).execute()

    return {
        "message": "Return driver assigned. Trip created.",
        "loan": loan_update.data,
        "trip": trip_result.data
    }


@router.post("/{loan_id}/confirm-return")
async def confirm_return(
    loan_id: str,
    request: ConfirmReturnRequest,
    user_data: dict = Depends(require_auth)
):
    """Lender confirms receipt of returned stock. This completes the loan."""
    supabase = get_supabase_admin_client()
    profile = get_user_profile(supabase, user_data["user"].id)

    # Get the loan
    loan = get_loan_with_details(supabase, loan_id)

    # Verify user is lender
    if loan["lender_location_id"] != profile.get("location_id"):
        raise HTTPException(status_code=403, detail="Only the lender can confirm return")

    if loan["status"] != "return_in_transit":
        raise HTTPException(status_code=400, detail=f"Cannot confirm return for loan with status '{loan['status']}'")

    quantity = loan["quantity_approved"]

    # Transfer stock back: Deduct from borrower, add to lender
    # Get borrower's current stock
    borrower_stock = supabase.table("stock").select("*").eq(
        "location_id", loan["borrower_location_id"]
    ).execute()

    if borrower_stock.data and len(borrower_stock.data) > 0:
        current_borrower_qty = borrower_stock.data[0].get("quantity_bags", 0)
        new_borrower_qty = max(0, current_borrower_qty - quantity)
        supabase.table("stock").update({
            "quantity_bags": new_borrower_qty
        }).eq("location_id", loan["borrower_location_id"]).execute()

    # Get lender's current stock
    lender_stock = supabase.table("stock").select("*").eq(
        "location_id", loan["lender_location_id"]
    ).execute()

    if lender_stock.data and len(lender_stock.data) > 0:
        current_lender_qty = lender_stock.data[0].get("quantity_bags", 0)
        new_lender_qty = current_lender_qty + quantity
        supabase.table("stock").update({
            "quantity_bags": new_lender_qty
        }).eq("location_id", loan["lender_location_id"]).execute()
    else:
        # Create stock record if doesn't exist
        supabase.table("stock").insert({
            "location_id": loan["lender_location_id"],
            "quantity_bags": quantity
        }).execute()

    # Complete the return trip
    if loan.get("return_trip_id"):
        trip_update = {
            "status": "completed",
            "completed_at": datetime.now().isoformat()
        }
        if request.odometer_end is not None:
            trip_update["odometer_end"] = request.odometer_end

        supabase.table("trips").update(trip_update).eq("id", loan["return_trip_id"]).execute()

        # Update vehicle odometer
        if request.odometer_end is not None:
            trip = supabase.table("trips").select("vehicle_id").eq("id", loan["return_trip_id"]).execute()
            if trip.data:
                supabase.table("vehicles").update({
                    "current_km": request.odometer_end
                }).eq("id", trip.data[0]["vehicle_id"]).execute()

    # Update loan status to completed
    loan_update = supabase.table("loans").update({
        "status": "completed",
        "actual_return_date": datetime.now().isoformat()
    }).eq("id", loan_id).execute()

    if not loan_update.data:
        raise HTTPException(status_code=500, detail="Failed to complete loan")

    # Notify both parties
    try:
        # Notify borrower
        borrower_manager = get_location_manager_email(supabase, loan["borrower_location_id"])
        if borrower_manager and borrower_manager.get("email"):
            send_loan_completed_notification(
                to_email=borrower_manager["email"],
                manager_name=borrower_manager.get("full_name", "Manager"),
                other_shop=loan["lender_location"]["name"],
                quantity=quantity,
                is_lender=False
            )

        # Notify lender
        lender_manager = get_location_manager_email(supabase, loan["lender_location_id"])
        if lender_manager and lender_manager.get("email"):
            send_loan_completed_notification(
                to_email=lender_manager["email"],
                manager_name=lender_manager.get("full_name", "Manager"),
                other_shop=loan["borrower_location"]["name"],
                quantity=quantity,
                is_lender=True
            )
    except Exception as e:
        print(f"Failed to send loan completed notification: {e}")

    return {
        "message": f"Loan completed. {quantity} bags returned to your stock.",
        "loan": loan_update.data
    }
