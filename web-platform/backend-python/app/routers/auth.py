from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, EmailStr, Field
from ..config import get_supabase_client, get_supabase_admin_client
from ..models.requests import LoginRequest
from ..models.responses import LoginResponse, UserProfile, AuthStatusResponse


# Additional request models for auth extensions
class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/create-test-admin")
async def create_test_admin():
    """Create a test admin user for development. Email: test@admin.com, Password: password123"""
    supabase = get_supabase_admin_client()

    test_email = "test@admin.com"
    test_password = "password123"

    try:
        # Try to sign in first to check if user exists with correct password
        client = get_supabase_client()
        auth = client.auth.sign_in_with_password({
            "email": test_email,
            "password": test_password
        })
        if auth.session and auth.session.access_token:
            return {
                "success": True,
                "message": "Test admin already exists",
                "email": test_email,
                "password": test_password,
                "access_token": auth.session.access_token
            }
    except Exception:
        pass  # User doesn't exist or wrong password

    try:
        # Try to create new auth user
        auth_response = supabase.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True
        })

        if auth_response.user:
            new_user_id = auth_response.user.id

            # Get first location for assignment
            locations = supabase.table("locations").select("id").limit(1).execute()
            location_id = locations.data[0]["id"] if locations.data else None

            # Create admin profile
            profile_data = {
                "id": str(uuid4()),
                "user_id": new_user_id,
                "role": "admin",
                "location_id": location_id,
                "full_name": "Test Admin",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
            }

            supabase.table("profiles").insert(profile_data).execute()

            return {
                "success": True,
                "message": "Test admin created successfully",
                "email": test_email,
                "password": test_password,
                "user_id": new_user_id
            }
    except Exception:
        pass  # User might already exist, try to update password

    # User exists but with different password - update the password
    try:
        # Find existing user by email in profiles
        profiles = supabase.table("profiles").select("user_id").execute()

        # Get all auth users and find the one with matching email
        for profile in profiles.data or []:
            user_id = profile.get("user_id")
            if user_id:
                user_response = supabase.auth.admin.get_user_by_id(user_id)
                if user_response.user and user_response.user.email == test_email:
                    # Update password
                    supabase.auth.admin.update_user(user_id, {"password": test_password})
                    return {
                        "success": True,
                        "message": "Test admin password reset",
                        "email": test_email,
                        "password": test_password,
                        "user_id": user_id
                    }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")

    raise HTTPException(status_code=500, detail="Failed to create or update test admin")


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Extract and verify user from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")
    supabase = get_supabase_client()

    try:
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return {"user": user_response.user, "token": token}
    except Exception:
        pass

    return None


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """Require authenticated user."""
    user_data = await get_current_user(authorization)
    if not user_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_data


async def require_manager(authorization: Optional[str] = Header(None)) -> dict:
    """Require manager role (admin, zone_manager, or location_manager)."""
    user_data = await require_auth(authorization)
    admin_client = get_supabase_admin_client()

    profile = admin_client.table("profiles").select("*").eq(
        "user_id", user_data["user"].id
    ).single().execute()

    if not profile.data or profile.data["role"] == "staff":
        raise HTTPException(status_code=403, detail="Manager access required")

    user_data["profile"] = profile.data
    return user_data


def get_view_location_id(profile: dict, view_location_id: Optional[str] = None) -> Optional[str]:
    """
    Get the effective location_id for READ operations.

    - admin/zone_manager: Can view any location (view_location_id or None for all)
    - location_manager: Can view any location (view_location_id or their own if not specified)
    - driver/staff: Can only view their own location

    Returns the location_id to filter by, or None for no filter (view all).
    """
    role = profile.get("role")
    user_location_id = profile.get("location_id")

    if role == "admin":
        # Admin can view any location, or all if not specified
        return view_location_id

    if role == "zone_manager":
        # Zone manager can view any location, or all in their zone if not specified
        return view_location_id

    if role == "location_manager":
        # Location manager can view any location (read-only access to other shops)
        # If view_location_id specified, use that; otherwise default to their own
        return view_location_id if view_location_id else user_location_id

    # Driver and staff can only view their own location
    return user_location_id


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user with email and password."""
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get user profile using admin client to bypass RLS
        admin_client = get_supabase_admin_client()
        profile = admin_client.table("profiles").select(
            "*, zones(name), locations(name)"
        ).eq("user_id", auth_response.user.id).single().execute()

        if not profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")

        # Check if user is active
        if profile.data.get("is_active") is False:
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact an administrator.")

        user_profile = UserProfile(
            id=profile.data["id"],
            user_id=profile.data["user_id"],
            email=auth_response.user.email,
            role=profile.data["role"],
            zone_id=profile.data.get("zone_id"),
            location_id=profile.data.get("location_id"),
            full_name=profile.data.get("full_name"),
            zone_name=profile.data.get("zones", {}).get("name") if profile.data.get("zones") else None,
            location_name=profile.data.get("locations", {}).get("name") if profile.data.get("locations") else None,
        )

        return LoginResponse(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            user=user_profile
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(user_data: dict = Depends(require_auth)):
    """Sign out the current user."""
    supabase = get_supabase_client()

    try:
        supabase.auth.sign_out()
        return {"success": True, "message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=AuthStatusResponse)
async def get_current_user_profile(user_data: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    if not user_data:
        return AuthStatusResponse(authenticated=False)

    admin_client = get_supabase_admin_client()

    try:
        profile = admin_client.table("profiles").select(
            "*, zones(name), locations(name)"
        ).eq("user_id", user_data["user"].id).single().execute()

        if not profile.data:
            return AuthStatusResponse(authenticated=False)

        user_profile = UserProfile(
            id=profile.data["id"],
            user_id=profile.data["user_id"],
            email=user_data["user"].email,
            role=profile.data["role"],
            zone_id=profile.data.get("zone_id"),
            location_id=profile.data.get("location_id"),
            full_name=profile.data.get("full_name"),
            zone_name=profile.data.get("zones", {}).get("name") if profile.data.get("zones") else None,
            location_name=profile.data.get("locations", {}).get("name") if profile.data.get("locations") else None,
        )

        return AuthStatusResponse(authenticated=True, user=user_profile)

    except Exception:
        return AuthStatusResponse(authenticated=False)


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token."""
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.refresh_session(refresh_token)

        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/accept-invite")
async def accept_invite(request: AcceptInviteRequest):
    """Accept an invitation and create user account."""
    supabase = get_supabase_admin_client()

    try:
        # Find the invitation by token
        invitation = supabase.table("user_invitations").select("*").eq(
            "token", request.token
        ).single().execute()

        if not invitation.data:
            raise HTTPException(status_code=404, detail="Invalid invitation token")

        inv = invitation.data

        # Check if already accepted
        if inv.get("accepted_at"):
            raise HTTPException(status_code=400, detail="Invitation has already been used")

        # Check expiry
        expires_at = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        if expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invitation has expired")

        # Create auth user using signup
        auth_response = supabase.auth.sign_up({
            "email": inv["email"],
            "password": request.password
        })

        if not auth_response.user:
            error_detail = auth_response.error if auth_response.error else "Failed to create user account"
            raise HTTPException(status_code=500, detail=error_detail)

        new_user_id = auth_response.user.id

        # Create profile
        profile_data = {
            "id": str(uuid4()),
            "user_id": new_user_id,
            "role": inv["role"],
            "zone_id": inv.get("zone_id"),
            "location_id": inv.get("location_id"),
            "full_name": inv.get("full_name"),
            "is_active": True,
            "created_by": inv["invited_by"],
            "created_at": datetime.utcnow().isoformat(),
        }

        supabase.table("profiles").insert(profile_data).execute()

        # Mark invitation as accepted
        supabase.table("user_invitations").eq("id", inv["id"]).update({
            "accepted_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "success": True,
            "message": "Account created successfully. You can now log in.",
            "email": inv["email"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate-invite/{token}")
async def validate_invite(token: str):
    """Validate an invitation token and return invitation details."""
    supabase = get_supabase_admin_client()

    try:
        invitation = supabase.table("user_invitations").select(
            "*, zones(name), locations(name)"
        ).eq("token", token).single().execute()

        if not invitation.data:
            raise HTTPException(status_code=404, detail="Invalid invitation token")

        inv = invitation.data

        # Check if already accepted
        if inv.get("accepted_at"):
            raise HTTPException(status_code=400, detail="Invitation has already been used")

        # Check expiry
        expires_at = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        if expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invitation has expired")

        return {
            "valid": True,
            "email": inv["email"],
            "role": inv["role"],
            "full_name": inv.get("full_name"),
            "zone_name": inv.get("zones", {}).get("name") if inv.get("zones") else None,
            "location_name": inv.get("locations", {}).get("name") if inv.get("locations") else None,
            "expires_at": inv["expires_at"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request a password reset email."""
    supabase = get_supabase_admin_client()

    try:
        # Check if user exists (by looking up profiles and auth users)
        # Don't reveal if email exists for security
        supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": request.email
        })

        return {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent."
        }

    except Exception:
        # Always return success to not reveal email existence
        return {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent."
        }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using a reset token from email."""
    supabase = get_supabase_client()

    try:
        # Verify the token and update password
        # Note: This requires the user to have clicked the magic link first
        # The token here is the access_token from the magic link session
        auth_response = supabase.auth.verify_otp({
            "token": request.token,
            "type": "recovery"
        })

        if auth_response.user:
            # Update the password
            supabase.auth.update_user({
                "password": request.password
            })

            return {
                "success": True,
                "message": "Password has been reset successfully. You can now log in."
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
