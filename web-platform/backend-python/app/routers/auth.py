from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, EmailStr, Field
import logging
from ..config import get_supabase_client, get_supabase_admin_client
from ..models.requests import LoginRequest
from ..models.responses import LoginResponse, UserProfile, AuthStatusResponse

logger = logging.getLogger(__name__)


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

            supabase.table("profiles").insert(profile_data)

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


@router.post("/create-test-manager")
async def create_test_location_manager():
    """Create a test location manager user for development. Email: manager@test.com, Password: Test123!"""
    supabase = get_supabase_admin_client()

    test_email = "manager@test.com"
    test_password = "Test123!"

    try:
        # Try to sign in first to check if user exists
        client = get_supabase_client()
        auth = client.auth.sign_in_with_password({
            "email": test_email,
            "password": test_password
        })
        if auth.session and auth.session.access_token:
            return {
                "success": True,
                "message": "Test location manager already exists",
                "email": test_email,
                "password": test_password
            }
    except Exception:
        pass

    try:
        # Create new auth user
        auth_response = supabase.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True
        })

        if auth_response.user:
            new_user_id = auth_response.user.id

            # Get first shop location
            locations = supabase.table("locations").select("id, name, zone_id").eq("type", "shop").limit(1).execute()
            if not locations.data:
                locations = supabase.table("locations").select("id, name, zone_id").limit(1).execute()

            location_id = locations.data[0]["id"] if locations.data else None
            location_name = locations.data[0]["name"] if locations.data else "Unknown"
            zone_id = locations.data[0].get("zone_id") if locations.data else None

            # Create location_manager profile
            profile_data = {
                "id": str(uuid4()),
                "user_id": new_user_id,
                "role": "location_manager",
                "zone_id": zone_id,
                "location_id": location_id,
                "full_name": "Test Location Manager",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
            }

            supabase.table("profiles").insert(profile_data)

            return {
                "success": True,
                "message": "Test location manager created successfully",
                "email": test_email,
                "password": test_password,
                "location": location_name,
                "user_id": new_user_id
            }
    except Exception as e:
        # Try to update password if user exists
        try:
            users = supabase.auth.admin.list_users()
            for u in users:
                if hasattr(u, 'email') and u.email == test_email:
                    supabase.auth.admin.update_user_by_id(u.id, {"password": test_password})
                    return {
                        "success": True,
                        "message": "Test location manager password reset",
                        "email": test_email,
                        "password": test_password
                    }
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create location manager: {str(e)}")

    raise HTTPException(status_code=500, detail="Failed to create test location manager")


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

        # Check if user already exists in auth (from previous partial attempt)
        # We'll handle this after trying to create the user since the API methods
        # for finding users by email are not reliably available
        existing_user = None

        if existing_user:
            # User exists in auth - check if they have a profile
            existing_profile = supabase.table("profiles").select("id, is_active").eq(
                "user_id", existing_user.id
            ).execute()

            if existing_profile.data:
                profile = existing_profile.data[0]
                if profile.get("is_active", True):
                    # Active profile exists - block
                    raise HTTPException(status_code=400, detail="An account with this email already exists")
                else:
                    # Inactive profile - delete it so we can create a fresh one
                    logger.info(f"[AUTH] Deleting inactive profile {profile['id']} for re-registration")
                    supabase.table("profiles").delete().eq("id", profile["id"]).execute()

            # User exists but no active profile - use existing auth user
            new_user_id = existing_user.id

            # Update their password
            try:
                supabase.auth.admin.update_user_by_id(existing_user.id, {
                    "password": request.password
                })
            except Exception:
                pass  # Password update failed, but user can still use the account
        else:
            # Create auth user using admin API
            create_user_failed = False
            try:
                auth_response = supabase.auth.admin.create_user({
                    "email": inv["email"],
                    "password": request.password,
                    "email_confirm": True  # Skip email confirmation since they used invite link
                })

                if auth_response.user:
                    new_user_id = auth_response.user.id
                else:
                    create_user_failed = True
                    logger.warning(f"[AUTH] create_user returned no user for {inv['email']}")

            except Exception as auth_error:
                error_msg = str(auth_error)
                logger.error(f"[AUTH] Exception creating user: {error_msg}")
                create_user_failed = True

                # Check for common Supabase error patterns
                if "rate" in error_msg.lower() or "429" in error_msg:
                    raise HTTPException(status_code=429, detail="Please wait a moment and try again")

            # If user creation failed, try to recover by finding existing user
            if create_user_failed:
                # User likely already exists - try to find them via REST API
                import httpx
                from ..config import get_settings
                settings = get_settings()

                try:
                    # Use Supabase REST API to find user by email
                    headers = {
                        "Authorization": f"Bearer {settings.supabase_service_key}",
                        "apikey": settings.supabase_service_key,
                    }
                    response = httpx.get(
                        f"{settings.supabase_url}/auth/v1/admin/users",
                        headers=headers,
                        timeout=10.0
                    )
                    logger.info(f"[AUTH] List users response status: {response.status_code}")

                    if response.status_code == 200:
                        users_data = response.json()
                        users_list = users_data.get("users", users_data) if isinstance(users_data, dict) else users_data

                        found_user = None
                        for u in users_list:
                            if isinstance(u, dict) and u.get("email") == inv["email"]:
                                found_user = u
                                break

                        if found_user:
                            new_user_id = found_user["id"]
                            logger.info(f"[AUTH] Found existing user {new_user_id} for email {inv['email']}")

                            # Check if they already have a profile
                            existing_profile = supabase.table("profiles").select("id, is_active").eq(
                                "user_id", new_user_id
                            ).execute()

                            if existing_profile.data:
                                profile = existing_profile.data[0]
                                if profile.get("is_active", True):
                                    # Active profile exists - block
                                    raise HTTPException(status_code=400, detail="An account with this email already exists. Please try logging in instead.")
                                else:
                                    # Inactive profile - delete it so we can create a fresh one
                                    logger.info(f"[AUTH] Deleting inactive profile {profile['id']} for re-registration")
                                    supabase.table("profiles").delete().eq("id", profile["id"]).execute()

                            # Update their password and confirm email
                            update_result = supabase.auth.admin.update_user_by_id(
                                new_user_id,
                                {
                                    "password": request.password,
                                    "email_confirm": True
                                }
                            )
                            if update_result.error:
                                logger.error(f"[AUTH] Password update failed: {update_result.error}")
                            else:
                                logger.info(f"[AUTH] Password update successful for user {new_user_id}")
                                if update_result.user:
                                    logger.info(f"[AUTH] User email_confirmed_at: {update_result.user.email_confirmed_at}")
                        else:
                            logger.error(f"[AUTH] Could not find user with email {inv['email']} in users list")
                            raise HTTPException(status_code=400, detail="Account creation failed. Please contact support.")
                    else:
                        logger.error(f"[AUTH] Failed to list users: {response.status_code} - {response.text}")
                        raise HTTPException(status_code=400, detail="Account creation failed. Please contact support.")

                except HTTPException:
                    raise
                except Exception as e2:
                    logger.error(f"[AUTH] Error recovering existing user: {e2}")
                    raise HTTPException(status_code=400, detail="An account with this email may already exist. Please try logging in or contact support.")

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
        logger.info(f"[AUTH] Creating profile for user {new_user_id} with data: {profile_data}")

        try:
            profile_result = supabase.table("profiles").insert(profile_data)
            logger.info(f"[AUTH] Profile created successfully: {profile_result.data}")
        except Exception as profile_error:
            logger.error(f"[AUTH] Error creating profile: {profile_error}")
            raise HTTPException(status_code=500, detail=f"Failed to create profile: {str(profile_error)}")

        # Mark invitation as accepted
        try:
            invitation_id = inv["id"]
            logger.info(f"[AUTH] Marking invitation {invitation_id} as accepted")

            # Use admin client to update the invitation
            accepted_time = datetime.utcnow().isoformat()
            invite_result = supabase.table("user_invitations").update({
                "accepted_at": accepted_time
            }).eq("id", invitation_id).execute()

            logger.info(f"[AUTH] Invitation update result: {invite_result.data}")

            # Verify the update worked
            verify_result = supabase.table("user_invitations").select("accepted_at").eq("id", invitation_id).single().execute()
            if verify_result.data and verify_result.data.get("accepted_at"):
                logger.info(f"[AUTH] Invitation {invitation_id} successfully marked as accepted at {verify_result.data.get('accepted_at')}")
            else:
                logger.warning(f"[AUTH] Invitation {invitation_id} accepted_at still NULL after update. Verify result: {verify_result.data}")
                # Try direct update as fallback
                retry_result = supabase.table("user_invitations").update({
                    "accepted_at": accepted_time
                }).eq("id", invitation_id).execute()
                logger.info(f"[AUTH] Retry update result: {retry_result.data}")
        except Exception as invite_error:
            logger.error(f"[AUTH] Error marking invitation as accepted: {invite_error}", exc_info=True)
            # Don't fail the whole operation if this fails - profile is already created

        # Create driver record if this invitation was for a driver
        try:
            if inv.get("role") == "driver":
                driver_metadata = inv.get("driver_metadata") or {}
                driver_id = str(uuid4())

                # Convert empty strings to None for proper database handling
                phone = driver_metadata.get("phone") or None
                license_number = driver_metadata.get("license_number") or None
                license_expiry = driver_metadata.get("license_expiry") or None
                notes = driver_metadata.get("notes") or None

                driver_data = {
                    "id": driver_id,
                    "email": inv["email"],
                    "full_name": inv.get("full_name"),
                    "phone": phone,
                    "license_number": license_number,
                    "license_expiry": license_expiry,
                    "notes": notes,
                    "user_id": new_user_id,
                    "is_active": True
                }
                logger.info(f"[AUTH] Creating driver record {driver_id} for user {new_user_id}")
                driver_result = supabase.table("drivers").insert(driver_data)
                logger.info(f"[AUTH] Driver created successfully: {driver_result.data}")
        except Exception as driver_error:
            logger.error(f"[AUTH] Error creating driver record: {driver_error}", exc_info=True)
            # Don't fail - the user account is created, driver creation can be fixed manually

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
