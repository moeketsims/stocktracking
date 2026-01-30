from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager, get_current_user
from ..models.requests import CreateVehicleRequest, UpdateVehicleRequest

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("")
async def list_vehicles(
    active_only: bool = Query(True, description="Only show active vehicles"),
    include_trip_status: bool = Query(False, description="Include current trip status for each vehicle"),
    user_data: dict = Depends(get_current_user)
):
    """List all vehicles with optional trip status."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("vehicles").select("*").order("registration_number")

        if active_only:
            query = query.eq("is_active", True)

        result = query.execute()
        vehicles = result.data or []

        # If trip status requested, check which vehicles are currently on trips
        if include_trip_status and vehicles:
            vehicle_ids = [v["id"] for v in vehicles]

            # Get all relevant trips for these vehicles:
            # 1. planned (assigned but not started)
            # 2. in_progress (currently on trip)
            # 3. completed (may be awaiting km or recently submitted)
            active_trips = supabase.table("trips").select(
                "id, trip_number, vehicle_id, driver_id, driver_name, status, odometer_start, odometer_end, completed_at"
            ).in_("vehicle_id", vehicle_ids).in_(
                "status", ["planned", "in_progress", "completed"]
            ).order("created_at", desc=True).execute()

            # Build a map of vehicle_id -> most recent ACTIVE trip (for availability check)
            # Also build a list of ALL trips for Fleet Status display
            vehicles_on_trips = {}
            all_trips = []

            for trip in (active_trips.data or []):
                vehicle_id = trip["vehicle_id"]
                has_odometer_end = trip.get("odometer_end") is not None
                is_completed = trip["status"] == "completed"
                awaiting_km = is_completed and not has_odometer_end

                trip_info = {
                    "trip_id": trip["id"],
                    "trip_number": trip["trip_number"],
                    "vehicle_id": vehicle_id,
                    "driver_name": trip["driver_name"],
                    "status": trip["status"],
                    "odometer_start": trip.get("odometer_start"),
                    "odometer_end": trip.get("odometer_end"),
                    "km_submitted": has_odometer_end,
                    "awaiting_km": awaiting_km
                }

                # Add to all_trips list (for Fleet Status)
                all_trips.append(trip_info)

                # For vehicle availability, only consider non-completed trips
                # or completed trips that are awaiting km
                if vehicle_id not in vehicles_on_trips:
                    if not is_completed or awaiting_km:
                        vehicles_on_trips[vehicle_id] = trip_info

            # Add trip status to each vehicle
            for vehicle in vehicles:
                trip_info = vehicles_on_trips.get(vehicle["id"])
                vehicle["current_trip"] = trip_info

                # Vehicle is available if no blocking trip
                vehicle["is_available"] = trip_info is None

            # Add all_trips to response for Fleet Status page
            for vehicle in vehicles:
                vehicle["all_trips"] = [t for t in all_trips if t["vehicle_id"] == vehicle["id"]]

        return {
            "vehicles": vehicles,
            "total": len(vehicles)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: str, user_data: dict = Depends(get_current_user)):
    """Get vehicle details."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("vehicles").select("*").eq("id", vehicle_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_vehicle(request: CreateVehicleRequest, user_data: dict = Depends(require_manager)):
    """Create a new vehicle - managers only."""
    supabase = get_supabase_admin_client()

    try:
        # Check if registration number already exists
        existing = supabase.table("vehicles").select("id").eq(
            "registration_number", request.registration_number
        ).execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=f"Vehicle with registration {request.registration_number} already exists"
            )

        vehicle_data = {
            "id": str(uuid4()),
            "registration_number": request.registration_number.upper(),
            "make": request.make,
            "model": request.model,
            "fuel_type": request.fuel_type,
            "notes": request.notes,
            "is_active": True
        }

        result = supabase.table("vehicles").insert(vehicle_data).execute()

        return {
            "success": True,
            "message": f"Vehicle {request.registration_number} created",
            "vehicle": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    request: UpdateVehicleRequest,
    user_data: dict = Depends(require_manager)
):
    """Update vehicle details - managers only."""
    supabase = get_supabase_admin_client()

    try:
        # Check vehicle exists
        existing = supabase.table("vehicles").select("id").eq("id", vehicle_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        # Build update data (only non-None fields)
        update_data = {}
        if request.registration_number is not None:
            update_data["registration_number"] = request.registration_number.upper()
        if request.make is not None:
            update_data["make"] = request.make
        if request.model is not None:
            update_data["model"] = request.model
        if request.fuel_type is not None:
            update_data["fuel_type"] = request.fuel_type
        if request.notes is not None:
            update_data["notes"] = request.notes
        if request.is_active is not None:
            update_data["is_active"] = request.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("vehicles").update(update_data).eq("id", vehicle_id).execute()

        return {
            "success": True,
            "message": "Vehicle updated",
            "vehicle": result.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{vehicle_id}")
async def deactivate_vehicle(vehicle_id: str, user_data: dict = Depends(require_manager)):
    """Soft delete (deactivate) a vehicle - managers only."""
    supabase = get_supabase_admin_client()

    try:
        # Check vehicle exists and is active
        existing = supabase.table("vehicles").select("id, is_active").eq("id", vehicle_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        if not existing.data["is_active"]:
            raise HTTPException(status_code=400, detail="Vehicle is already inactive")

        # Soft delete
        supabase.table("vehicles").update({"is_active": False}).eq("id", vehicle_id).execute()

        return {
            "success": True,
            "message": "Vehicle deactivated"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
