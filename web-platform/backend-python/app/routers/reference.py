from fastapi import APIRouter, HTTPException, Depends
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth

router = APIRouter(prefix="/reference", tags=["Reference Data"])


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
