from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth

router = APIRouter(prefix="/reference", tags=["Reference Data"])


# Request Models for Location Management
class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    zone_id: str
    type: str = Field(..., pattern="^(shop|warehouse)$")
    address: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None


# Helper function for admin check
async def require_admin(user_data: dict = Depends(require_auth)) -> dict:
    """Require admin role."""
    supabase = get_supabase_admin_client()

    profile = supabase.table("profiles").select("*").eq(
        "user_id", user_data["user"].id
    ).single().execute()

    if not profile.data or profile.data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user_data["profile"] = profile.data
    return user_data


@router.get("/items")
async def get_items(user_data: dict = Depends(require_auth)):
    """Get all items."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("items").select("*").order("name").execute()
        return {"items": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suppliers")
async def get_suppliers(user_data: dict = Depends(require_auth)):
    """Get all suppliers."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("suppliers").select("*").order("name").execute()
        return {"suppliers": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations")
async def get_locations(user_data: dict = Depends(require_auth)):
    """Get all locations."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("locations").select(
            "*, zones(name)"
        ).order("type", desc=True).order("name").execute()

        locations = [
            {
                **loc,
                "zone_name": loc.get("zones", {}).get("name") if loc.get("zones") else None
            }
            for loc in (result.data or [])
        ]

        return {"locations": locations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zones")
async def get_zones(user_data: dict = Depends(require_auth)):
    """Get all zones."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("zones").select("*").order("name").execute()
        return {"zones": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations-by-zone/{zone_id}")
async def get_locations_by_zone(zone_id: str, user_data: dict = Depends(require_auth)):
    """Get locations in a specific zone."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("locations").select("*").eq(
            "zone_id", zone_id
        ).order("type", desc=True).order("name").execute()

        return {"locations": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/waste-reasons")
async def get_waste_reasons():
    """Get list of waste reasons (simplified - no expiry tracking for potatoes)."""
    return {
        "reasons": [
            {"value": "spoiled", "label": "Spoiled / Rotten"},
            {"value": "damaged", "label": "Damaged"},
            {"value": "trim_prep_loss", "label": "Trim / Prep Loss"},
            {"value": "contaminated", "label": "Contaminated"},
            {"value": "other", "label": "Other"}
        ]
    }


@router.get("/quality-scores")
async def get_quality_scores():
    """Get quality score definitions."""
    return {
        "scores": [
            {"value": 1, "label": "Good", "description": "Excellent quality, no defects"},
            {"value": 2, "label": "Acceptable", "description": "Minor issues, usable"},
            {"value": 3, "label": "Poor", "description": "Significant defects, needs review"}
        ]
    }


# Location Management Endpoints (Admin Only)

@router.post("/locations")
async def create_location(
    data: LocationCreate,
    user_data: dict = Depends(require_admin)
):
    """Create a new location. Admin only."""
    supabase = get_supabase_admin_client()

    try:
        # Validate zone exists
        zone = supabase.table("zones").select("id").eq("id", data.zone_id).single().execute()
        if not zone.data:
            raise HTTPException(status_code=400, detail="Zone not found")

        # Create location
        result = supabase.table("locations").insert({
            "name": data.name,
            "zone_id": data.zone_id,
            "type": data.type,
            "address": data.address,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create location")

        location = result.data[0]

        # Get zone name for response
        zone_result = supabase.table("zones").select("name").eq("id", data.zone_id).single().execute()

        return {
            "success": True,
            "message": f"Location '{data.name}' created successfully",
            "location": {
                **location,
                "zone_name": zone_result.data.get("name") if zone_result.data else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/locations/{location_id}")
async def update_location(
    location_id: str,
    data: LocationUpdate,
    user_data: dict = Depends(require_admin)
):
    """Update a location. Admin only."""
    supabase = get_supabase_admin_client()

    try:
        # Check location exists
        existing = supabase.table("locations").select("*").eq("id", location_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Location not found")

        # Build update data
        update_data = {"updated_at": datetime.utcnow().isoformat()}

        if data.name is not None:
            update_data["name"] = data.name
        if data.address is not None:
            update_data["address"] = data.address if data.address else None

        # Update location
        result = supabase.table("locations").update(update_data).eq("id", location_id).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update location")

        location = result.data[0]

        # Get zone name for response
        zone_result = supabase.table("zones").select("name").eq("id", location["zone_id"]).single().execute()

        return {
            "success": True,
            "message": f"Location updated successfully",
            "location": {
                **location,
                "zone_name": zone_result.data.get("name") if zone_result.data else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/locations/{location_id}")
async def delete_location(
    location_id: str,
    user_data: dict = Depends(require_admin)
):
    """Delete a location. Admin only. Fails if users or stock are assigned."""
    supabase = get_supabase_admin_client()

    try:
        # Check location exists
        existing = supabase.table("locations").select("*").eq("id", location_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Location not found")

        location_name = existing.data.get("name", "Unknown")

        # Check for assigned users
        users = supabase.table("profiles").select("id").eq("location_id", location_id).execute()
        if users.data and len(users.data) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete location. {len(users.data)} user(s) are assigned to this location."
            )

        # Check for stock batches
        stock = supabase.table("stock_batches").select("id").eq("location_id", location_id).limit(1).execute()
        if stock.data and len(stock.data) > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete location. Stock batches exist at this location."
            )

        # Delete location
        supabase.table("locations").delete().eq("id", location_id).execute()

        return {
            "success": True,
            "message": f"Location '{location_name}' deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
