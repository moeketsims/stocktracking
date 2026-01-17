from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from datetime import datetime
from typing import Optional
import json
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager, get_current_user
from ..models.requests import (
    CreateTripRequest,
    UpdateTripRequest,
    CompleteTripRequest,
    CreateMultiStopTripRequest,
    CompleteStopRequest
)

router = APIRouter(prefix="/trips", tags=["Trips"])


def generate_trip_number(supabase) -> str:
    """Generate a unique trip number like TRP-2026-0001."""
    year = datetime.now().year

    # Count trips this year
    result = supabase.table("trips").select("id", count="exact").gte(
        "created_at", f"{year}-01-01"
    ).lt("created_at", f"{year + 1}-01-01").execute()

    count = (result.count or 0) + 1
    return f"TRP-{year}-{count:04d}"


@router.get("")
async def list_trips(
    status: Optional[str] = Query(None, description="Filter by status"),
    vehicle_id: Optional[str] = Query(None, description="Filter by vehicle"),
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=200),
    user_data: dict = Depends(get_current_user)
):
    """List trips with optional filters."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("trips").select(
            "*, vehicles(id, registration_number, make, model), "
            "from_location:locations!trips_from_location_id_fkey(id, name), "
            "to_location:locations!trips_to_location_id_fkey(id, name), "
            "suppliers(id, name), "
            "drivers(id, full_name, phone)"
        ).order("created_at", desc=True).limit(limit)

        if status:
            query = query.eq("status", status)
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)
        if from_date:
            query = query.gte("created_at", from_date)
        if to_date:
            query = query.lte("created_at", f"{to_date}T23:59:59")

        result = query.execute()

        # Calculate totals for each trip
        trips = []
        for trip in (result.data or []):
            trip["total_cost"] = (trip.get("fuel_cost") or 0) + (trip.get("toll_cost") or 0) + (trip.get("other_cost") or 0)
            if trip.get("odometer_start") and trip.get("odometer_end"):
                trip["distance_km"] = trip["odometer_end"] - trip["odometer_start"]
            else:
                trip["distance_km"] = None
            trips.append(trip)

        return {
            "trips": trips,
            "total": len(trips)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_trip_summary(
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)"),
    vehicle_id: Optional[str] = Query(None, description="Filter by vehicle"),
    user_data: dict = Depends(get_current_user)
):
    """Get cost summary for completed trips."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("trips").select("*").eq("status", "completed")

        if from_date:
            query = query.gte("created_at", from_date)
        if to_date:
            query = query.lte("created_at", f"{to_date}T23:59:59")
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)

        result = query.execute()
        trips = result.data or []

        total_fuel = sum(t.get("fuel_cost") or 0 for t in trips)
        total_toll = sum(t.get("toll_cost") or 0 for t in trips)
        total_other = sum(t.get("other_cost") or 0 for t in trips)
        total_cost = total_fuel + total_toll + total_other

        total_distance = sum(
            (t.get("odometer_end") or 0) - (t.get("odometer_start") or 0)
            for t in trips
            if t.get("odometer_start") and t.get("odometer_end")
        )

        return {
            "total_trips": len(trips),
            "total_fuel_cost": round(total_fuel, 2),
            "total_toll_cost": round(total_toll, 2),
            "total_other_cost": round(total_other, 2),
            "total_cost": round(total_cost, 2),
            "total_distance_km": round(total_distance, 1),
            "avg_cost_per_trip": round(total_cost / len(trips), 2) if trips else 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}")
async def get_trip(trip_id: str, user_data: dict = Depends(get_current_user)):
    """Get trip details."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("trips").select(
            "*, vehicles(id, registration_number, make, model)"
        ).eq("id", trip_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        trip = result.data
        trip["total_cost"] = (trip.get("fuel_cost") or 0) + (trip.get("toll_cost") or 0) + (trip.get("other_cost") or 0)
        if trip.get("odometer_start") and trip.get("odometer_end"):
            trip["distance_km"] = trip["odometer_end"] - trip["odometer_start"]

        return trip

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_trip(request: CreateTripRequest, user_data: dict = Depends(require_manager)):
    """Create a new trip - managers only."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Validate vehicle exists and is active
        vehicle = supabase.table("vehicles").select("id, is_active").eq(
            "id", request.vehicle_id
        ).single().execute()

        if not vehicle.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        if not vehicle.data["is_active"]:
            raise HTTPException(status_code=400, detail="Vehicle is not active")

        # Generate trip number
        trip_number = generate_trip_number(supabase)

        # Get driver name if driver_id provided
        driver_name = request.driver_name
        if request.driver_id:
            driver_result = supabase.table("drivers").select("full_name").eq(
                "id", request.driver_id
            ).single().execute()
            if driver_result.data:
                driver_name = driver_result.data["full_name"]

        trip_data = {
            "id": str(uuid4()),
            "trip_number": trip_number,
            "vehicle_id": request.vehicle_id,
            "driver_id": request.driver_id,
            "driver_name": driver_name,
            "status": "planned",
            "origin_description": request.origin_description,
            "destination_description": request.destination_description,
            "departure_time": request.departure_time,
            "notes": request.notes,
            "created_by": user.id,
            "fuel_cost": 0,
            "toll_cost": 0,
            "other_cost": 0,
            # Trip-Stock Integration fields
            "trip_type": request.trip_type or "other",
            "from_location_id": request.from_location_id,
            "to_location_id": request.to_location_id,
            "supplier_id": request.supplier_id
        }

        result = supabase.table("trips").insert(trip_data)

        return {
            "success": True,
            "message": f"Trip {trip_number} created",
            "trip": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{trip_id}")
async def update_trip(
    trip_id: str,
    request: UpdateTripRequest,
    user_data: dict = Depends(require_manager)
):
    """Update trip details - managers only."""
    supabase = get_supabase_admin_client()

    try:
        # Check trip exists
        existing = supabase.table("trips").select("id, status").eq("id", trip_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        if existing.data["status"] == "completed":
            raise HTTPException(status_code=400, detail="Cannot update a completed trip")

        # Build update data
        update_data = {}
        if request.driver_id is not None:
            update_data["driver_id"] = request.driver_id
            # Also update driver_name for display
            driver_result = supabase.table("drivers").select("full_name").eq(
                "id", request.driver_id
            ).single().execute()
            if driver_result.data:
                update_data["driver_name"] = driver_result.data["full_name"]
        if request.driver_name is not None:
            update_data["driver_name"] = request.driver_name
        if request.origin_description is not None:
            update_data["origin_description"] = request.origin_description
        if request.destination_description is not None:
            update_data["destination_description"] = request.destination_description
        if request.departure_time is not None:
            update_data["departure_time"] = request.departure_time
        if request.notes is not None:
            update_data["notes"] = request.notes
        if request.status is not None:
            update_data["status"] = request.status
        # Trip-Stock Integration fields
        if request.trip_type is not None:
            update_data["trip_type"] = request.trip_type
        if request.from_location_id is not None:
            update_data["from_location_id"] = request.from_location_id
        if request.to_location_id is not None:
            update_data["to_location_id"] = request.to_location_id
        if request.supplier_id is not None:
            update_data["supplier_id"] = request.supplier_id

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("trips").update(update_data).eq("id", trip_id).execute()

        return {
            "success": True,
            "message": "Trip updated",
            "trip": result.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trip_id}/start")
async def start_trip(trip_id: str, user_data: dict = Depends(require_manager)):
    """Mark a trip as in progress - managers only."""
    supabase = get_supabase_admin_client()

    try:
        existing = supabase.table("trips").select("id, status").eq("id", trip_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        if existing.data["status"] != "planned":
            raise HTTPException(status_code=400, detail=f"Trip cannot be started from status '{existing.data['status']}'")

        result = supabase.table("trips").update({
            "status": "in_progress",
            "departure_time": datetime.now().isoformat()
        }).eq("id", trip_id).execute()

        return {
            "success": True,
            "message": "Trip started",
            "trip": result.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trip_id}/complete")
async def complete_trip(
    trip_id: str,
    request: CompleteTripRequest,
    user_data: dict = Depends(require_manager)
):
    """Complete a trip with final costs - managers only."""
    supabase = get_supabase_admin_client()

    try:
        existing = supabase.table("trips").select("id, status").eq("id", trip_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        if existing.data["status"] == "completed":
            raise HTTPException(status_code=400, detail="Trip is already completed")

        if existing.data["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot complete a cancelled trip")

        update_data = {
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "fuel_cost": request.fuel_cost,
            "toll_cost": request.toll_cost,
            "other_cost": request.other_cost
        }

        if request.fuel_litres is not None:
            update_data["fuel_litres"] = request.fuel_litres
        if request.other_cost_description:
            update_data["other_cost_description"] = request.other_cost_description
        if request.odometer_start is not None:
            update_data["odometer_start"] = request.odometer_start
        if request.odometer_end is not None:
            update_data["odometer_end"] = request.odometer_end
        if request.arrival_time:
            update_data["arrival_time"] = request.arrival_time
        if request.linked_batch_ids:
            update_data["linked_batch_ids"] = request.linked_batch_ids
        if request.notes:
            update_data["notes"] = request.notes

        result = supabase.table("trips").update(update_data).eq("id", trip_id).execute()

        trip = result.data[0]
        total_cost = (trip.get("fuel_cost") or 0) + (trip.get("toll_cost") or 0) + (trip.get("other_cost") or 0)

        # Calculate delivery cost per kg for linked batches
        if total_cost > 0:
            # Get total kg from linked batches
            batches_result = supabase.table("stock_batches").select(
                "id, initial_qty"
            ).eq("trip_id", trip_id).execute()

            if batches_result.data:
                total_kg = sum(b.get("initial_qty", 0) for b in batches_result.data)
                if total_kg > 0:
                    delivery_cost_per_kg = round(total_cost / total_kg, 4)
                    # Update all batches linked to this trip
                    supabase.table("stock_batches").update({
                        "delivery_cost_per_kg": delivery_cost_per_kg
                    }).eq("trip_id", trip_id).execute()

        return {
            "success": True,
            "message": f"Trip completed. Total cost: R{total_cost:.2f}",
            "trip": trip
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}/cargo")
async def get_trip_cargo(trip_id: str, user_data: dict = Depends(get_current_user)):
    """Get cargo details for a trip - all linked transactions and batches."""
    supabase = get_supabase_admin_client()

    try:
        # Get linked transactions
        transactions = supabase.table("stock_transactions").select(
            "*, items(name, sku), "
            "from_location:locations!stock_transactions_location_id_from_fkey(name), "
            "to_location:locations!stock_transactions_location_id_to_fkey(name)"
        ).eq("trip_id", trip_id).execute()

        # Get linked batches
        batches = supabase.table("stock_batches").select(
            "*, items(name, sku), locations(name), suppliers(name)"
        ).eq("trip_id", trip_id).execute()

        return {
            "transactions": transactions.data or [],
            "batches": batches.data or [],
            "total_transactions": len(transactions.data or []),
            "total_batches": len(batches.data or [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trip_id}/cancel")
async def cancel_trip(trip_id: str, user_data: dict = Depends(require_manager)):
    """Cancel a trip - managers only."""
    supabase = get_supabase_admin_client()

    try:
        existing = supabase.table("trips").select("id, status").eq("id", trip_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        if existing.data["status"] in ("completed", "cancelled"):
            raise HTTPException(status_code=400, detail=f"Cannot cancel a {existing.data['status']} trip")

        result = supabase.table("trips").eq("id", trip_id).update({"status": "cancelled"})

        return {
            "success": True,
            "message": "Trip cancelled",
            "trip": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# MULTI-STOP TRIP ENDPOINTS
# ============================================

@router.post("/multi-stop")
async def create_multi_stop_trip(
    request: CreateMultiStopTripRequest,
    user_data: dict = Depends(require_manager)
):
    """Create a multi-stop trip with multiple pickup/dropoff locations."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Validate vehicle exists and is active
        vehicle = supabase.table("vehicles").select("id, is_active").eq(
            "id", request.vehicle_id
        ).single().execute()

        if not vehicle.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        if not vehicle.data["is_active"]:
            raise HTTPException(status_code=400, detail="Vehicle is not active")

        # Get driver name if driver_id provided
        driver_name = request.driver_name
        if request.driver_id:
            driver_result = supabase.table("drivers").select("full_name").eq(
                "id", request.driver_id
            ).single().execute()
            if driver_result.data:
                driver_name = driver_result.data["full_name"]

        # Build stops array with location names
        stops_data = []
        for stop in request.stops:
            stop_dict = {
                "location_id": stop.location_id or "",
                "supplier_id": stop.supplier_id or "",
                "stop_type": stop.stop_type,
                "location_name": stop.location_name or "",
                "planned_qty_kg": str(stop.planned_qty_kg) if stop.planned_qty_kg else "",
                "notes": stop.notes or ""
            }

            # Fetch location/supplier name if not provided
            if not stop_dict["location_name"]:
                if stop.location_id:
                    loc = supabase.table("locations").select("name").eq(
                        "id", stop.location_id
                    ).single().execute()
                    if loc.data:
                        stop_dict["location_name"] = loc.data["name"]
                elif stop.supplier_id:
                    sup = supabase.table("suppliers").select("name").eq(
                        "id", stop.supplier_id
                    ).single().execute()
                    if sup.data:
                        stop_dict["location_name"] = sup.data["name"]

            stops_data.append(stop_dict)

        # Call the database function
        result = supabase.rpc("create_multi_stop_trip", {
            "p_vehicle_id": request.vehicle_id,
            "p_driver_id": request.driver_id,
            "p_driver_name": driver_name,
            "p_created_by": user.id,
            "p_notes": request.notes,
            "p_stops": stops_data
        })

        if result.error:
            raise HTTPException(status_code=500, detail=f"Failed to create trip: {result.error}")

        trip_id = result.data

        # Fetch the created trip with details
        trip_result = supabase.table("trips").select(
            "*, vehicles(id, registration_number, make, model)"
        ).eq("id", trip_id).single().execute()

        return {
            "success": True,
            "message": "Multi-stop trip created",
            "trip": trip_result.data,
            "trip_id": trip_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}/stops")
async def get_trip_stops(trip_id: str, user_data: dict = Depends(get_current_user)):
    """Get all stops for a trip."""
    supabase = get_supabase_admin_client()

    try:
        # Get the trip first
        trip = supabase.table("trips").select("id, is_multi_stop").eq(
            "id", trip_id
        ).single().execute()

        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        # Get all stops ordered by stop_order
        result = supabase.table("trip_stops").select(
            "*, locations(id, name, type), suppliers(id, name)"
        ).eq("trip_id", trip_id).order("stop_order").execute()

        stops = result.data or []

        # Calculate progress
        total_stops = len(stops)
        completed_stops = len([s for s in stops if s.get("is_completed")])

        return {
            "stops": stops,
            "total_stops": total_stops,
            "completed_stops": completed_stops,
            "is_multi_stop": trip.data.get("is_multi_stop", False)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stops/{stop_id}/arrive")
async def arrive_at_stop(stop_id: str, user_data: dict = Depends(require_manager)):
    """Mark arrival at a stop."""
    supabase = get_supabase_admin_client()

    try:
        # Check stop exists
        existing = supabase.table("trip_stops").select("id, is_completed").eq(
            "id", stop_id
        ).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Stop not found")

        if existing.data.get("is_completed"):
            raise HTTPException(status_code=400, detail="Stop is already completed")

        result = supabase.table("trip_stops").update({
            "arrived_at": datetime.now().isoformat()
        }).eq("id", stop_id).execute()

        return {
            "success": True,
            "message": "Arrival recorded",
            "stop": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stops/{stop_id}/complete")
async def complete_stop(
    stop_id: str,
    request: CompleteStopRequest,
    user_data: dict = Depends(require_manager)
):
    """Complete a stop (mark as done with actual quantities)."""
    supabase = get_supabase_admin_client()

    try:
        # Use the database function
        result = supabase.rpc("complete_trip_stop", {
            "p_stop_id": stop_id,
            "p_actual_qty_kg": request.actual_qty_kg,
            "p_notes": request.notes
        })

        if result.error:
            raise HTTPException(status_code=500, detail=f"Failed to complete stop: {result.error}")

        if not result.data:
            raise HTTPException(status_code=404, detail="Stop not found")

        # Fetch updated stop
        stop_result = supabase.table("trip_stops").select(
            "*, locations(id, name), suppliers(id, name)"
        ).eq("id", stop_id).single().execute()

        # Check if trip was auto-completed
        if stop_result.data:
            trip_id = stop_result.data["trip_id"]
            trip_result = supabase.table("trips").select("status").eq(
                "id", trip_id
            ).single().execute()

            return {
                "success": True,
                "message": "Stop completed",
                "stop": stop_result.data,
                "trip_completed": trip_result.data.get("status") == "completed" if trip_result.data else False
            }

        return {
            "success": True,
            "message": "Stop completed"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{trip_id}/stops")
async def add_stop_to_trip(
    trip_id: str,
    stop: dict,
    user_data: dict = Depends(require_manager)
):
    """Add a new stop to an existing multi-stop trip."""
    supabase = get_supabase_admin_client()

    try:
        # Get the trip
        trip = supabase.table("trips").select("id, status, is_multi_stop").eq(
            "id", trip_id
        ).single().execute()

        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        if trip.data["status"] == "completed":
            raise HTTPException(status_code=400, detail="Cannot add stops to a completed trip")

        # Get current max stop_order
        stops = supabase.table("trip_stops").select("stop_order").eq(
            "trip_id", trip_id
        ).order("stop_order", desc=True).limit(1).execute()

        next_order = 1
        if stops.data:
            next_order = stops.data[0]["stop_order"] + 1

        # Get location name if needed
        location_name = stop.get("location_name", "")
        if not location_name:
            if stop.get("location_id"):
                loc = supabase.table("locations").select("name").eq(
                    "id", stop["location_id"]
                ).single().execute()
                if loc.data:
                    location_name = loc.data["name"]
            elif stop.get("supplier_id"):
                sup = supabase.table("suppliers").select("name").eq(
                    "id", stop["supplier_id"]
                ).single().execute()
                if sup.data:
                    location_name = sup.data["name"]

        # Insert the new stop
        stop_data = {
            "trip_id": trip_id,
            "stop_order": next_order,
            "location_id": stop.get("location_id"),
            "supplier_id": stop.get("supplier_id"),
            "stop_type": stop.get("stop_type", "dropoff"),
            "location_name": location_name,
            "planned_qty_kg": stop.get("planned_qty_kg"),
            "notes": stop.get("notes")
        }

        result = supabase.table("trip_stops").insert(stop_data)

        # Mark trip as multi-stop if not already
        if not trip.data.get("is_multi_stop"):
            supabase.table("trips").eq("id", trip_id).update({"is_multi_stop": True})

        return {
            "success": True,
            "message": "Stop added",
            "stop": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
