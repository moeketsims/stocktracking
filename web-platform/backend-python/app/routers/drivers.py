from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from typing import Optional
from datetime import datetime, timedelta
import secrets
import logging
from pydantic import BaseModel, Field, EmailStr
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager, get_current_user
from ..email import send_invitation_email

router = APIRouter(prefix="/drivers", tags=["Drivers"])
logger = logging.getLogger(__name__)


class CreateDriverRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address for system invitation")
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
    """List all drivers with their invitation status."""
    supabase = get_supabase_admin_client()

    try:
        # Get drivers without join - we'll handle invitation status separately
        query = supabase.table("drivers").select("*").order("full_name", desc=False)

        if active_only:
            query = query.eq("is_active", True)

        result = query.execute()

        # Process drivers to add invitation_status field
        drivers = []
        for driver in (result.data or []):
            # Determine invitation status based on user_id and invitation_id
            if driver.get("user_id"):
                invitation_status = "active"  # Has a linked user account
            elif driver.get("invitation_id"):
                # Fetch invitation to check status
                try:
                    inv_result = supabase.table("user_invitations").select(
                        "accepted_at, expires_at"
                    ).eq("id", driver["invitation_id"]).single().execute()

                    if inv_result.data:
                        invitation = inv_result.data
                        if invitation.get("accepted_at"):
                            invitation_status = "active"
                        else:
                            expires_at = invitation.get("expires_at")
                            if expires_at:
                                exp_time = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
                                if exp_time < datetime.utcnow():
                                    invitation_status = "expired"
                                else:
                                    invitation_status = "pending"
                            else:
                                invitation_status = "pending"
                    else:
                        invitation_status = "no_invitation"
                except Exception:
                    invitation_status = "no_invitation"
            else:
                invitation_status = "no_invitation"

            driver["invitation_status"] = invitation_status
            drivers.append(driver)

        return {
            "drivers": drivers,
            "total": len(drivers)
        }

    except Exception as e:
        logger.error(f"Error listing drivers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{driver_id}")
async def get_driver(driver_id: str, user_data: dict = Depends(get_current_user)):
    """Get driver details with invitation status."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("drivers").select("*").eq("id", driver_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Driver not found")

        driver = result.data

        # Determine invitation status
        if driver.get("user_id"):
            invitation_status = "active"
        elif driver.get("invitation_id"):
            try:
                inv_result = supabase.table("user_invitations").select(
                    "accepted_at, expires_at"
                ).eq("id", driver["invitation_id"]).single().execute()

                if inv_result.data:
                    invitation = inv_result.data
                    if invitation.get("accepted_at"):
                        invitation_status = "active"
                    else:
                        expires_at = invitation.get("expires_at")
                        if expires_at:
                            exp_time = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
                            if exp_time < datetime.utcnow():
                                invitation_status = "expired"
                            else:
                                invitation_status = "pending"
                        else:
                            invitation_status = "pending"
                else:
                    invitation_status = "no_invitation"
            except Exception:
                invitation_status = "no_invitation"
        else:
            invitation_status = "no_invitation"

        driver["invitation_status"] = invitation_status

        return driver

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting driver: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_driver(request: CreateDriverRequest, user_data: dict = Depends(require_manager)):
    """Send driver invitation - driver record is created when they accept. Managers only."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Check if email already exists in active drivers table
        existing_driver = supabase.table("drivers").select("id, email").eq(
            "email", request.email
        ).eq("is_active", True).execute()

        if existing_driver.data:
            raise HTTPException(
                status_code=400,
                detail="A driver with this email already exists"
            )

        # Check for existing pending invitation (not yet accepted and not cancelled)
        existing_invitations = supabase.table("user_invitations").select("id, accepted_at, cancelled_at").eq(
            "email", request.email
        ).execute()

        # Filter for pending invitations (accepted_at is None and cancelled_at is None)
        pending_invitations = [
            inv for inv in (existing_invitations.data or [])
            if not inv.get("accepted_at") and not inv.get("cancelled_at")
        ]

        if pending_invitations:
            raise HTTPException(
                status_code=400,
                detail="A pending invitation already exists for this email"
            )

        # Generate invitation token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)

        # Store driver details in invitation metadata (driver record created on acceptance)
        driver_metadata = {
            "phone": request.phone,
            "license_number": request.license_number,
            "license_expiry": request.license_expiry,
            "notes": request.notes
        }

        # Create invitation record only (driver record will be created when they accept)
        invitation_id = str(uuid4())
        invitation_data = {
            "id": invitation_id,
            "email": request.email,
            "role": "driver",
            "zone_id": actor_profile.get("zone_id"),
            "location_id": actor_profile.get("location_id"),
            "full_name": request.full_name,
            "invited_by": actor_profile["user_id"],
            "token": token,
            "expires_at": expires_at.isoformat(),
            "driver_metadata": driver_metadata
        }

        # Insert invitation
        invitation_result = supabase.table("user_invitations").insert(invitation_data)
        logger.info(f"Created driver invitation {invitation_id} for {request.email}")

        # Send invitation email
        inviter_name = actor_profile.get("full_name") or "Manager"
        email_sent = send_invitation_email(
            to_email=request.email,
            full_name=request.full_name,
            role="driver",
            token=token,
            invited_by_name=inviter_name
        )

        if not email_sent:
            logger.warning(f"Failed to send invitation email to {request.email}")

        return {
            "success": True,
            "message": f"Invitation sent to {request.email}. Driver will be added when they accept.",
            "invitation_id": invitation_id,
            "email_sent": email_sent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating driver: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{driver_id}/resend-invitation")
async def resend_driver_invitation(driver_id: str, user_data: dict = Depends(require_manager)):
    """Resend invitation email for a driver."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Get driver
        driver_result = supabase.table("drivers").select("*").eq("id", driver_id).single().execute()

        if not driver_result.data:
            raise HTTPException(status_code=404, detail="Driver not found")

        driver = driver_result.data

        # Check if driver already has a user account
        if driver.get("user_id"):
            raise HTTPException(status_code=400, detail="Driver already has an active account")

        if not driver.get("email"):
            raise HTTPException(status_code=400, detail="Driver has no email address")

        # Generate new token
        new_token = secrets.token_urlsafe(32)
        new_expires = datetime.utcnow() + timedelta(days=7)

        # Check if invitation exists
        if driver.get("invitation_id"):
            # Update existing invitation
            supabase.table("user_invitations").update({
                "token": new_token,
                "expires_at": new_expires.isoformat()
            }).eq("id", driver["invitation_id"]).execute()
        else:
            # Create new invitation
            invitation_id = str(uuid4())
            invitation_data = {
                "id": invitation_id,
                "email": driver["email"],
                "role": "driver",
                "zone_id": actor_profile.get("zone_id"),
                "location_id": actor_profile.get("location_id"),
                "full_name": driver["full_name"],
                "invited_by": actor_profile["user_id"],
                "token": new_token,
                "expires_at": new_expires.isoformat(),
                "driver_id": driver_id
            }
            supabase.table("user_invitations").insert(invitation_data).execute()

            # Update driver with invitation_id
            supabase.table("drivers").update({
                "invitation_id": invitation_id
            }).eq("id", driver_id).execute()

        # Send email
        inviter_name = actor_profile.get("full_name") or "Manager"
        email_sent = send_invitation_email(
            to_email=driver["email"],
            full_name=driver["full_name"],
            role="driver",
            token=new_token,
            invited_by_name=inviter_name
        )

        return {
            "success": True,
            "message": f"Invitation resent to {driver['email']}",
            "email_sent": email_sent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending invitation: {e}")
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
            "driver": result.data[0] if result.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating driver: {e}")
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
        supabase.table("drivers").update({"is_active": False}).eq("id", driver_id).execute()

        return {
            "success": True,
            "message": f"Driver {existing.data['full_name']} deactivated"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating driver: {e}")
        raise HTTPException(status_code=500, detail=str(e))
