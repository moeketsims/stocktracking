from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from pydantic import BaseModel, Field
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, get_current_user

router = APIRouter(prefix="/locations", tags=["Locations"])


class UpdateThresholdsRequest(BaseModel):
    critical_stock_threshold: int = Field(ge=0, le=1000, description="Critical stock level in bags")
    low_stock_threshold: int = Field(ge=0, le=2000, description="Low stock level in bags")


@router.get("")
async def list_locations(
    type: Optional[str] = Query(None, description="Filter by type (shop/warehouse)"),
    user_data: dict = Depends(get_current_user)
):
    """List all locations."""
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("locations").select(
            "*, zones(name)"
        ).order("name")

        if type:
            query = query.eq("type", type)

        result = query.execute()

        locations = []
        for loc in (result.data or []):
            locations.append({
                **loc,
                "zone_name": loc.get("zones", {}).get("name") if loc.get("zones") else None
            })

        return {"locations": locations}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Thresholds endpoints - defined BEFORE the generic /{location_id} route
@router.get("/{location_id}/thresholds")
async def get_location_thresholds(
    location_id: str,
    user_data: dict = Depends(get_current_user)
):
    """Get current stock thresholds for a location."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("locations").select(
            "id, name, critical_stock_threshold, low_stock_threshold"
        ).eq("id", location_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Location not found")

        # Return thresholds with defaults if not set
        return {
            "location_id": result.data["id"],
            "location_name": result.data["name"],
            "critical_stock_threshold": result.data.get("critical_stock_threshold") or 20,
            "low_stock_threshold": result.data.get("low_stock_threshold") or 50
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{location_id}/thresholds")
async def update_location_thresholds(
    location_id: str,
    request: UpdateThresholdsRequest,
    user_data: dict = Depends(require_auth)
):
    """Update stock thresholds for a location. Location manager or admin only."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("role, location_id").eq(
            "user_id", user.id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="User profile not found")

        user_role = profile.data["role"]
        user_location_id = profile.data.get("location_id")

        # Check authorization
        # Admin can update any location
        # Location manager can only update their own location
        if user_role not in ("admin", "location_manager"):
            raise HTTPException(status_code=403, detail="Only admins and location managers can update thresholds")

        if user_role == "location_manager" and user_location_id != location_id:
            raise HTTPException(status_code=403, detail="You can only update thresholds for your assigned location")

        # Validate thresholds (critical must be less than low)
        if request.critical_stock_threshold >= request.low_stock_threshold:
            raise HTTPException(
                status_code=400,
                detail="Critical threshold must be less than low stock threshold"
            )

        # Check location exists
        location = supabase.table("locations").select("id, name").eq(
            "id", location_id
        ).single().execute()

        if not location.data:
            raise HTTPException(status_code=404, detail="Location not found")

        # Update thresholds - filter before update, no execute needed
        supabase.table("locations").eq("id", location_id).update({
            "critical_stock_threshold": request.critical_stock_threshold,
            "low_stock_threshold": request.low_stock_threshold
        })

        return {
            "success": True,
            "message": f"Thresholds updated for {location.data['name']}",
            "location_id": location_id,
            "critical_stock_threshold": request.critical_stock_threshold,
            "low_stock_threshold": request.low_stock_threshold
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Generic location endpoint - defined AFTER more specific routes
@router.get("/{location_id}")
async def get_location(location_id: str, user_data: dict = Depends(get_current_user)):
    """Get location details including thresholds."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("locations").select(
            "*, zones(name)"
        ).eq("id", location_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Location not found")

        location = result.data
        location["zone_name"] = location.get("zones", {}).get("name") if location.get("zones") else None

        return location

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
