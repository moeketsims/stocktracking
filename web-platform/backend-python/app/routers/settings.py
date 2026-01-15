from fastapi import APIRouter, HTTPException, Depends
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth
from ..models.responses import UserSettingsResponse, UserProfile

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=UserSettingsResponse)
async def get_settings(user_data: dict = Depends(require_auth)):
    """Get user settings and profile."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile with related data
        profile = supabase.table("profiles").select(
            "*, zones(name), locations(name)"
        ).eq("user_id", user.id).single().execute()

        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        user_profile = UserProfile(
            id=profile.data["id"],
            user_id=profile.data["user_id"],
            email=user.email,
            role=profile.data["role"],
            zone_id=profile.data.get("zone_id"),
            location_id=profile.data.get("location_id"),
            full_name=profile.data.get("full_name"),
            zone_name=profile.data.get("zones", {}).get("name") if profile.data.get("zones") else None,
            location_name=profile.data.get("locations", {}).get("name") if profile.data.get("locations") else None,
        )

        # Default preferences (could be stored in a user_preferences table)
        preferences = {
            "dark_mode": False,
            "language": "en",
            "default_unit": "kg",
            "notifications_enabled": True
        }

        return UserSettingsResponse(
            profile=user_profile,
            preferences=preferences
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/profile")
async def update_profile(
    full_name: str = None,
    user_data: dict = Depends(require_auth)
):
    """Update user profile."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        update_data = {}
        if full_name is not None:
            update_data["full_name"] = full_name

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("profiles").update(update_data).eq(
            "user_id", user.id
        ).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return {"success": True, "message": "Profile updated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync-status")
async def get_sync_status(user_data: dict = Depends(require_auth)):
    """Get sync status (for offline support)."""
    return {
        "last_sync": None,
        "pending_items": 0,
        "is_online": True
    }
