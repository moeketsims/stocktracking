from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from ..config import get_supabase_client, get_supabase_admin_client
from ..models.requests import LoginRequest
from ..models.responses import LoginResponse, UserProfile, AuthStatusResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
