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

            # A vehicle is "on a trip" if:
            # 1. There's a trip with status='planned' (assigned but not started), OR
            # 2. There's a trip with status='in_progress'
            # Note: completed trips are no longer considered "on trip"
            active_trips = supabase.table("trips").select(
                "id, trip_number, vehicle_id, driver_id, driver_name, status"
            ).in_("vehicle_id", vehicle_ids).in_(
                "status", ["planned", "in_progress"]
            ).execute()

            # Build a map of vehicle_id -> trip info for vehicles currently on trips
            vehicles_on_trips = {}
            for trip in (active_trips.data or []):
                vehicles_on_trips[trip["vehicle_id"]] = {
                    "trip_id": trip["id"],
                    "trip_number": trip["trip_number"],
                    "driver_name": trip["driver_name"],
                    "status": trip["status"],
                    "awaiting_km": False
                }

            # Add trip status to each vehicle
            for vehicle in vehicles:
                trip_info = vehicles_on_trips.get(vehicle["id"])
                vehicle["current_trip"] = trip_info
                vehicle["is_available"] = trip_info is None

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

        result = supabase.table("vehicles").insert(vehicle_data)

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
        supabase.table("vehicles").eq("id", vehicle_id).update({"is_active": False})

        return {
            "success": True,
            "message": "Vehicle deactivated"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
