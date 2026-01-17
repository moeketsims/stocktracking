from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel, Field
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager, get_current_user

router = APIRouter(prefix="/drivers", tags=["Drivers"])


class CreateDriverRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    notes: Optional[str] = None


class UpdateDriverRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_drivers(
    active_only: bool = Query(True, description="Only return active drivers"),
    user_data: dict = Depends(get_current_user)
):
    """List all drivers."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("drivers").select("*").order("full_name", desc=False)

        if active_only:
            query = query.eq("is_active", True)

        result = query.execute()

        return {
            "drivers": result.data or [],
            "total": len(result.data or [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{driver_id}")
async def get_driver(driver_id: str, user_data: dict = Depends(get_current_user)):
    """Get driver details."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("drivers").select("*").eq("id", driver_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Driver not found")

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_driver(request: CreateDriverRequest, user_data: dict = Depends(require_manager)):
    """Create a new driver - managers only."""
    supabase = get_supabase_admin_client()

    try:
        driver_data = {
            "id": str(uuid4()),
            "full_name": request.full_name,
            "phone": request.phone,
            "license_number": request.license_number,
            "license_expiry": request.license_expiry,
            "notes": request.notes,
            "is_active": True
        }

        result = supabase.table("drivers").insert(driver_data)

        return {
            "success": True,
            "message": f"Driver {request.full_name} created",
            "driver": result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{driver_id}")
async def update_driver(
    driver_id: str,
    request: UpdateDriverRequest,
    user_data: dict = Depends(require_manager)
):
    """Update driver details - managers only."""
    supabase = get_supabase_admin_client()

    try:
        # Check driver exists
        existing = supabase.table("drivers").select("id").eq("id", driver_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Driver not found")

        # Build update data
        update_data = {}
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        if request.phone is not None:
            update_data["phone"] = request.phone
        if request.license_number is not None:
            update_data["license_number"] = request.license_number
        if request.license_expiry is not None:
            update_data["license_expiry"] = request.license_expiry
        if request.notes is not None:
            update_data["notes"] = request.notes
        if request.is_active is not None:
            update_data["is_active"] = request.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("drivers").update(update_data).eq("id", driver_id).execute()

        return {
            "success": True,
            "message": "Driver updated",
            "driver": result.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{driver_id}")
async def deactivate_driver(driver_id: str, user_data: dict = Depends(require_manager)):
    """Soft delete (deactivate) a driver - managers only."""
    supabase = get_supabase_admin_client()

    try:
        # Check driver exists
        existing = supabase.table("drivers").select("id, full_name").eq("id", driver_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Driver not found")

        # Soft delete - set is_active to false
        supabase.table("drivers").eq("id", driver_id).update({"is_active": False})

        return {
            "success": True,
            "message": f"Driver {existing.data['full_name']} deactivated"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
