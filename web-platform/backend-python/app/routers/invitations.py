from fastapi import APIRouter, HTTPException, Depends, Query
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import secrets
from ..config import get_supabase_admin_client
from ..email import send_invitation_email
from .users import require_admin_or_zone_manager, require_manager, can_manage_role

router = APIRouter(prefix="/invitations", tags=["User Invitations"])


class CreateInvitationRequest(BaseModel):
    email: EmailStr
    role: str = Field(..., pattern="^(admin|zone_manager|location_manager|vehicle_manager|driver|staff)$")
    zone_id: Optional[str] = None
    location_id: Optional[str] = None
    full_name: Optional[str] = None


@router.get("")
async def list_invitations(
    status: Optional[str] = Query("pending", description="Filter: pending, accepted, expired, all"),
    user_data: dict = Depends(require_manager)
):
    """List invitations. Zone/location managers see only invitations for their zone."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        query = supabase.table("user_invitations").select(
            "*, zones(name), locations(name)"
        ).order("created_at", desc=True)

        # Zone/location managers see only their zone's invitations
        if actor_profile["role"] in ["zone_manager", "location_manager"] and actor_profile.get("zone_id"):
            query = query.eq("zone_id", actor_profile["zone_id"])

        result = query.execute()
        invitations = result.data or []

        now = datetime.utcnow()

        # Filter by status
        filtered = []
        for inv in invitations:
            expires_at = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            is_expired = expires_at < now
            is_accepted = inv.get("accepted_at") is not None
            is_cancelled = inv.get("cancelled_at") is not None

            if status == "pending" and not is_accepted and not is_expired and not is_cancelled:
                filtered.append(inv)
            elif status == "accepted" and is_accepted:
                filtered.append(inv)
            elif status == "expired" and is_expired and not is_accepted and not is_cancelled:
                filtered.append(inv)
            elif status == "cancelled" and is_cancelled:
                filtered.append(inv)
            elif status == "all":
                filtered.append(inv)

        # Format response
        formatted = []
        for inv in filtered:
            expires_at = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            is_expired = expires_at < now

            # Determine status
            if inv.get("cancelled_at"):
                inv_status = "cancelled"
            elif inv.get("accepted_at"):
                inv_status = "accepted"
            elif is_expired:
                inv_status = "expired"
            else:
                inv_status = "pending"

            formatted.append({
                "id": inv["id"],
                "email": inv["email"],
                "role": inv["role"],
                "zone_id": inv.get("zone_id"),
                "location_id": inv.get("location_id"),
                "zone_name": inv.get("zones", {}).get("name") if inv.get("zones") else None,
                "location_name": inv.get("locations", {}).get("name") if inv.get("locations") else None,
                "full_name": inv.get("full_name"),
                "invited_by": inv["invited_by"],
                "expires_at": inv["expires_at"],
                "accepted_at": inv.get("accepted_at"),
                "cancelled_at": inv.get("cancelled_at"),
                "created_at": inv["created_at"],
                "status": inv_status
            })

        return {
            "invitations": formatted,
            "total": len(formatted)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_invitation(
    request: CreateInvitationRequest,
    user_data: dict = Depends(require_manager)
):
    """Create a new user invitation."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Location managers can ONLY invite drivers
        if actor_profile["role"] == "location_manager":
            if request.role != "driver":
                raise HTTPException(
                    status_code=403,
                    detail="Location managers can only invite drivers"
                )
            # Default to actor's zone and location
            request.zone_id = actor_profile["zone_id"]
            request.location_id = actor_profile["location_id"]
        # Check role permissions for other roles
        elif not can_manage_role(actor_profile["role"], request.role):
            raise HTTPException(
                status_code=403,
                detail=f"You cannot invite users with the {request.role} role"
            )

        # Zone managers must invite to their own zone
        if actor_profile["role"] == "zone_manager":
            if request.zone_id and request.zone_id != actor_profile["zone_id"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only invite users to your own zone"
                )
            # Default to actor's zone
            request.zone_id = actor_profile["zone_id"]

        # Check if email already has an ACTIVE account
        try:
            existing_result = supabase.table("profiles").select("id, user_id, is_active").execute()
            for profile in existing_result.data or []:
                # Only block if the profile is active
                if profile.get("user_id") and profile.get("is_active", True):
                    try:
                        auth_user = supabase.auth.admin.get_user_by_id(profile["user_id"])
                        if auth_user and auth_user.user and auth_user.user.email == request.email:
                            raise HTTPException(
                                status_code=400,
                                detail="A user with this email already exists"
                            )
                    except HTTPException:
                        raise
                    except Exception:
                        pass
        except HTTPException:
            raise
        except Exception:
            pass  # Skip check if it fails

        # Check for pending invitation (not accepted, not cancelled, not expired)
        try:
            pending_result = supabase.table("user_invitations").select("id, expires_at, accepted_at, cancelled_at").eq(
                "email", request.email
            ).execute()

            for inv in pending_result.data or []:
                # Skip accepted or cancelled invitations
                if inv.get("accepted_at") or inv.get("cancelled_at"):
                    continue
                expires_at = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
                if expires_at > datetime.utcnow():
                    raise HTTPException(
                        status_code=400,
                        detail="An active invitation already exists for this email"
                    )
        except HTTPException:
            raise
        except Exception:
            pass  # Skip check if it fails

        # Create invitation
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)

        invitation_data = {
            "id": str(uuid4()),
            "email": request.email,
            "role": request.role,
            "zone_id": request.zone_id,
            "location_id": request.location_id,
            "full_name": request.full_name,
            "invited_by": actor_profile["id"],
            "token": token,
            "expires_at": expires_at.isoformat(),
        }

        result = supabase.table("user_invitations").insert(invitation_data)

        # Send invitation email
        inviter_name = actor_profile.get("full_name") or "Admin"
        email_sent = send_invitation_email(
            to_email=request.email,
            full_name=request.full_name,
            role=request.role,
            token=token,
            invited_by_name=inviter_name
        )

        return {
            "success": True,
            "message": f"Invitation sent to {request.email}",
            "email_sent": email_sent,
            "invitation": {
                "id": invitation_data["id"],
                "email": request.email,
                "role": request.role,
                "expires_at": expires_at.isoformat(),
                "token": token  # Include for testing; remove in production
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{invitation_id}")
async def cancel_invitation(
    invitation_id: str,
    user_data: dict = Depends(require_admin_or_zone_manager)
):
    """Cancel a pending invitation (flags as cancelled, does not delete)."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Get invitation
        existing = supabase.table("user_invitations").select("*").eq(
            "id", invitation_id
        ).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Invitation not found")

        invitation = existing.data

        # Check if already accepted
        if invitation.get("accepted_at"):
            raise HTTPException(status_code=400, detail="Cannot cancel an accepted invitation")

        # Check if already cancelled
        if invitation.get("cancelled_at"):
            raise HTTPException(status_code=400, detail="Invitation is already cancelled")

        # Zone managers can only cancel invitations for their zone
        if actor_profile["role"] == "zone_manager":
            if invitation.get("zone_id") != actor_profile["zone_id"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only cancel invitations for your zone"
                )

        # Flag invitation as cancelled instead of deleting
        cancelled_time = datetime.utcnow().isoformat()
        supabase.table("user_invitations").update({
            "cancelled_at": cancelled_time,
            "cancelled_by": actor_profile["id"]
        }).eq("id", invitation_id).execute()

        # If this invitation was linked to a driver, unlink it so they can be re-invited
        driver_id = invitation.get("driver_id")
        if driver_id:
            supabase.table("drivers").update({
                "invitation_id": None
            }).eq("id", driver_id).execute()

        return {
            "success": True,
            "message": f"Invitation to {invitation['email']} cancelled"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: str,
    user_data: dict = Depends(require_admin_or_zone_manager)
):
    """Resend an invitation with a new token and expiry."""
    supabase = get_supabase_admin_client()
    actor_profile = user_data["profile"]

    try:
        # Get invitation
        existing = supabase.table("user_invitations").select("*").eq(
            "id", invitation_id
        ).single().execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Invitation not found")

        invitation = existing.data

        # Check if already accepted
        if invitation.get("accepted_at"):
            raise HTTPException(status_code=400, detail="Cannot resend an accepted invitation")

        # Zone managers can only resend invitations for their zone
        if actor_profile["role"] == "zone_manager":
            if invitation.get("zone_id") != actor_profile["zone_id"]:
                raise HTTPException(
                    status_code=403,
                    detail="You can only resend invitations for your zone"
                )

        # Generate new token and expiry
        new_token = secrets.token_urlsafe(32)
        new_expires = datetime.utcnow() + timedelta(days=7)

        supabase.table("user_invitations").update({
            "token": new_token,
            "expires_at": new_expires.isoformat()
        }).eq("id", invitation_id).execute()

        return {
            "success": True,
            "message": f"Invitation resent to {invitation['email']}",
            "invitation": {
                "id": invitation_id,
                "email": invitation["email"],
                "expires_at": new_expires.isoformat(),
                "token": new_token  # Include for testing
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
