from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth

router = APIRouter(prefix="/users", tags=["User Management"])


# Request Models
class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str = Field(..., pattern="^(admin|zone_manager|location_manager|vehicle_manager|driver|staff)$")
    zone_id: Optional[str] = None
    location_id: Optional[str] = None
    full_name: Optional[str] = None


class UpdateUserRequest(BaseModel):
    role: Optional[str] = Field(None, pattern="^(admin|zone_manager|location_manager|vehicle_manager|driver|staff)$")
    zone_id: Optional[str] = None
    location_id: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None


# Helper functions
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


async def require_admin_or_zone_manager(user_data: dict = Depends(require_auth)) -> dict:
    """Require admin or zone_manager role."""
    supabase = get_supabase_admin_client()

    profile = supabase.table("profiles").select("*").eq(
        "user_id", user_data["user"].id
    ).single().execute()

    if not profile.data or profile.data["role"] not in ["admin", "zone_manager"]:
        raise HTTPException(status_code=403, detail="Admin or Zone Manager access required")

    user_data["profile"] = profile.data
    return user_data


async def require_manager(user_data: dict = Depends(require_auth)) -> dict:
    """Require admin, zone_manager, location_manager, or vehicle_manager role (for viewing users)."""
    supabase = get_supabase_admin_client()

    profile = supabase.table("profiles").select("*").eq(
        "user_id", user_data["user"].id
    ).single().execute()

    if not profile.data or profile.data["role"] not in ["admin", "zone_manager", "location_manager", "vehicle_manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")

    user_data["profile"] = profile.data
    return user_data


def can_manage_role(actor_role: str, target_role: str) -> bool:
    """Check if actor can manage a user with target role."""
    if actor_role == "admin":
        return True  # Admin can manage any role
    if actor_role == "zone_manager":
        return target_role in ["location_manager", "driver", "staff"]
    if actor_role == "vehicle_manager":
        return target_role in ["driver"]  # Vehicle manager can manage drivers
    return False


def is_user_in_actor_scope(actor_profile: dict, user_profile: dict) -> bool:
    """Check if user is within actor's management scope."""
    actor_role = actor_profile.get("role")

    if actor_role == "admin":
        return True  # Admin can manage anyone

    if actor_role == "zone_manager":
        # Zone manager can only manage users in their zone
        actor_zone = actor_profile.get("zone_id")
        user_zone = user_profile.get("zone_id")
        return actor_zone and actor_zone == user_zone

    return False


@router.get("")
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    zone_id: Optional[str] = Query(None, description="Filter by zone"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    user_data: dict = Depends(require_manager)
):
    """List users with filtering. Zone/location managers see users in their scope."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Build query - join with auth.users for email
        query = supabase.table("profiles").select(
            "*, zones(name), locations(name)"
        ).order("created_at", desc=True)

        # Zone manager and location manager can only see users in their zone
        if actor_profile["role"] in ["zone_manager", "location_manager"]:
            query = query.eq("zone_id", actor_profile["zone_id"])
        elif zone_id:
            query = query.eq("zone_id", zone_id)

        # Apply filters
        if role:
            query = query.eq("role", role)

        if is_active is not None:
            query = query.eq("is_active", is_active)

        result = query.execute()
        profiles = result.data or []

        # Get emails from auth.users
        users_with_email = []
        for profile in profiles:
            user_id = profile.get("user_id")
            email = None

            # Try to get email from auth.users
            if user_id:
                try:
                    auth_user = supabase.auth.admin.get_user_by_id(user_id)
                    if auth_user and auth_user.user:
                        email = auth_user.user.email
                except Exception:
                    pass

            # Apply search filter
            if search:
                search_lower = search.lower()
                full_name = (profile.get("full_name") or "").lower()
                email_lower = (email or "").lower()
                if search_lower not in full_name and search_lower not in email_lower:
                    continue

            users_with_email.append({
                "id": profile["id"],
                "user_id": profile["user_id"],
                "email": email,
                "role": profile["role"],
                "full_name": profile.get("full_name"),
                "phone": profile.get("phone"),
                "zone_id": profile.get("zone_id"),
                "location_id": profile.get("location_id"),
                "zone_name": profile.get("zones", {}).get("name") if profile.get("zones") else None,
                "location_name": profile.get("locations", {}).get("name") if profile.get("locations") else None,
                "is_active": profile.get("is_active", True),
                "created_at": profile.get("created_at"),
                "updated_at": profile.get("updated_at"),
            })

        return {
            "users": users_with_email,
            "total": len(users_with_email)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    user_data: dict = Depends(require_admin_or_zone_manager)
):
    """Get user details by profile ID."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        result = supabase.table("profiles").select(
            "*, zones(name), locations(name)"
        ).eq("id", user_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        profile = result.data

        # Check scope
        if not is_user_in_actor_scope(actor_profile, profile):
            raise HTTPException(status_code=403, detail="User not in your management scope")

        # Get email
        email = None
        if profile.get("user_id"):
            try:
                auth_user = supabase.auth.admin.get_user_by_id(profile["user_id"])
                if auth_user and auth_user.user:
                    email = auth_user.user.email
            except Exception:
                pass

        return {
            "id": profile["id"],
            "user_id": profile["user_id"],
            "email": email,
            "role": profile["role"],
            "full_name": profile.get("full_name"),
            "phone": profile.get("phone"),
            "zone_id": profile.get("zone_id"),
            "location_id": profile.get("location_id"),
            "zone_name": profile.get("zones", {}).get("name") if profile.get("zones") else None,
            "location_name": profile.get("locations", {}).get("name") if profile.get("locations") else None,
            "is_active": profile.get("is_active", True),
            "created_at": profile.get("created_at"),
            "updated_at": profile.get("updated_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    user_data: dict = Depends(require_admin_or_zone_manager)
):
    """Update user profile. Zone managers can only update users in their zone."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Get existing profile
        existing = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="User not found")

        target_profile = existing.data

        # Check scope
        if not is_user_in_actor_scope(actor_profile, target_profile):
            raise HTTPException(status_code=403, detail="User not in your management scope")

        # Check role management permissions
        if request.role:
            if not can_manage_role(actor_profile["role"], request.role):
                raise HTTPException(
                    status_code=403,
                    detail=f"You cannot assign the {request.role} role"
                )

        # Zone managers cannot change zone
        if actor_profile["role"] == "zone_manager" and request.zone_id:
            if request.zone_id != actor_profile["zone_id"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only assign users to your own zone"
                )

        # Build update data
        update_data = {"updated_at": datetime.utcnow().isoformat()}

        if request.role is not None:
            update_data["role"] = request.role
        if request.zone_id is not None:
            update_data["zone_id"] = request.zone_id if request.zone_id else None
        if request.location_id is not None:
            update_data["location_id"] = request.location_id if request.location_id else None
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        if request.phone is not None:
            update_data["phone"] = request.phone if request.phone else None

        result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()

        return {
            "success": True,
            "message": "User updated successfully",
            "user": result.data[0] if result.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    user_data: dict = Depends(require_admin)
):
    """Deactivate a user account. Admin only. Also deactivates linked driver record if exists."""
    supabase = get_supabase_admin_client()

    try:
        # Get existing profile
        existing = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Don't allow self-deactivation
        if existing.data["user_id"] == user_data["user"].id:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

        # Deactivate user profile
        supabase.table("profiles").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()

        # If user is a driver, also deactivate their driver record
        auth_user_id = existing.data.get("user_id")
        if auth_user_id and existing.data.get("role") == "driver":
            # Find and deactivate linked driver record
            supabase.table("drivers").update({
                "is_active": False
            }).eq("user_id", auth_user_id).execute()

        return {
            "success": True,
            "message": f"User {existing.data.get('full_name', 'Unknown')} deactivated"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    user_data: dict = Depends(require_admin)
):
    """Reactivate a user account. Admin only."""
    supabase = get_supabase_admin_client()

    try:
        # Get existing profile
        existing = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Activate
        supabase.table("profiles").update({
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()

        return {
            "success": True,
            "message": f"User {existing.data.get('full_name', 'Unknown')} activated"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    user_data: dict = Depends(require_admin)
):
    """Admin-initiated password reset. Sends reset email to user."""
    supabase = get_supabase_admin_client()

    try:
        # Get profile to find auth user
        profile = supabase.table("profiles").select("user_id, full_name").eq(
            "id", user_id
        ).single().execute()

        if not profile.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Get user email
        auth_user = supabase.auth.admin.get_user_by_id(profile.data["user_id"])
        if not auth_user or not auth_user.user:
            raise HTTPException(status_code=404, detail="Auth user not found")

        email = auth_user.user.email

        # Generate password reset link
        # Note: This uses Supabase's built-in password reset
        supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": email
        })

        return {
            "success": True,
            "message": f"Password reset email sent to {email}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
