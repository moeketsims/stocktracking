"""Request Expiration and Escalation Job.

Handles automatic reminders, escalations, and expiration of stock requests.

Timing Thresholds:
- Urgent: Reminder at 2h, Escalate at 4h, Expire at 8h
- Normal: Reminder at 4h, Escalate at 8h, Expire at 24h

Escalation Levels:
- Level 0: Request created, no escalation yet
- Level 1: Reminder sent to ALL drivers
- Level 2: Escalation sent to ZONE MANAGER
- Level 3: Request EXPIRED, requester notified
"""

from datetime import datetime, timedelta
import logging
from ..config import get_supabase_admin_client
from ..email import (
    send_request_reminder_notification,
    send_request_escalation_notification,
    send_request_expired_notification
)

logger = logging.getLogger(__name__)

# Timing thresholds in hours
ESCALATION_THRESHOLDS = {
    'urgent': {
        'reminder': 2,
        'escalate': 4,
        'expire': 8
    },
    'normal': {
        'reminder': 4,
        'escalate': 8,
        'expire': 24
    }
}


async def process_request_escalations():
    """Process pending stock requests and handle escalations."""
    logger.info("[ESCALATION JOB] Starting request escalation processing...")

    try:
        supabase = get_supabase_admin_client()
        now = datetime.now()

        # Get all pending requests that need escalation tracking
        # Note: Only pending requests are tracked. Once accepted/cancelled, tracking is removed.
        pending_requests = supabase.table("stock_requests").select(
            "*, location:locations(id, name, zone_id), "
            "requester:profiles!stock_requests_requested_by_fkey(id, full_name)"
        ).eq("status", "pending").execute()

        if not pending_requests.data:
            logger.info("[ESCALATION JOB] No pending requests to process")
            return

        for request in pending_requests.data:
            await process_single_request(supabase, request, now)

        logger.info(f"[ESCALATION JOB] Processed {len(pending_requests.data)} requests")

    except Exception as e:
        logger.error(f"[ESCALATION JOB] Error: {str(e)}")


async def process_single_request(supabase, request: dict, now: datetime):
    """Process a single request for escalation."""
    request_id = request["id"]
    urgency = request.get("urgency", "normal")
    thresholds = ESCALATION_THRESHOLDS.get(urgency, ESCALATION_THRESHOLDS["normal"])

    # Get or create escalation state
    escalation = supabase.table("request_escalation_state").select("*").eq(
        "request_id", request_id
    ).execute()

    created_at = datetime.fromisoformat(request["created_at"].replace("Z", "+00:00"))
    hours_since_created = (now - created_at.replace(tzinfo=None)).total_seconds() / 3600

    if not escalation.data:
        # Create escalation tracking
        next_escalation = created_at + timedelta(hours=thresholds["reminder"])

        supabase.table("request_escalation_state").insert({
            "request_id": request_id,
            "escalation_level": 0,
            "next_escalation_at": next_escalation.isoformat(),
            "reminder_threshold_hours": thresholds["reminder"],
            "escalate_threshold_hours": thresholds["escalate"],
            "expire_threshold_hours": thresholds["expire"]
        }).execute()

        logger.info(f"[ESCALATION] Created tracking for request {request_id}")
        return

    state = escalation.data[0]
    current_level = state["escalation_level"]

    # Check if we need to escalate
    if current_level == 0 and hours_since_created >= thresholds["reminder"]:
        # Level 1: Send reminder to all drivers
        await send_driver_reminders(supabase, request)
        update_escalation_level(supabase, request_id, 1, now, created_at, thresholds["escalate"])
        logger.info(f"[ESCALATION] Request {request_id} escalated to level 1 (driver reminder)")

    elif current_level == 1 and hours_since_created >= thresholds["escalate"]:
        # Level 2: Escalate to zone manager
        await send_zone_manager_escalation(supabase, request)
        update_escalation_level(supabase, request_id, 2, now, created_at, thresholds["expire"])
        logger.info(f"[ESCALATION] Request {request_id} escalated to level 2 (zone manager)")

    elif current_level == 2 and hours_since_created >= thresholds["expire"]:
        # Level 3: Mark as expired and notify requester
        await expire_request(supabase, request)
        update_escalation_level(supabase, request_id, 3, now, None, None)
        logger.info(f"[ESCALATION] Request {request_id} expired")


def update_escalation_level(supabase, request_id: str, level: int, now: datetime,
                           created_at: datetime = None, next_hours: int = None):
    """Update the escalation level for a request."""
    update_data = {
        "escalation_level": level,
        "last_escalation_at": now.isoformat()
    }

    if next_hours is not None and created_at is not None:
        next_time = created_at + timedelta(hours=next_hours)
        update_data["next_escalation_at"] = next_time.isoformat()
    else:
        update_data["next_escalation_at"] = None

    supabase.table("request_escalation_state").eq(
        "request_id", request_id
    ).update(update_data)


async def send_driver_reminders(supabase, request: dict):
    """Send reminder notifications to all active drivers."""
    try:
        # Get all active drivers
        drivers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("role", "driver").eq("is_active", True).execute()

        location = request.get("location", {})
        requester = request.get("requester", {})

        for driver in (drivers.data or []):
            if driver.get("email"):
                try:
                    send_request_reminder_notification(
                        to_email=driver["email"],
                        recipient_name=driver.get("full_name", "Driver"),
                        location_name=location.get("name", "Unknown"),
                        quantity_bags=request.get("quantity_bags", 0),
                        urgency=request.get("urgency", "normal"),
                        hours_pending=calculate_hours_pending(request["created_at"]),
                        request_id=request["id"]
                    )
                except Exception as e:
                    logger.error(f"[ESCALATION] Failed to send reminder to {driver['email']}: {e}")

    except Exception as e:
        logger.error(f"[ESCALATION] Failed to send driver reminders: {e}")


async def send_zone_manager_escalation(supabase, request: dict):
    """Send escalation notification to zone manager."""
    try:
        location = request.get("location", {})
        zone_id = location.get("zone_id")

        if not zone_id:
            logger.warning(f"[ESCALATION] No zone_id for location {location.get('id')}")
            return

        # Get zone managers
        managers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("role", "zone_manager").eq("zone_id", zone_id).eq("is_active", True).execute()

        # If no zone managers, try admin
        if not managers.data:
            managers = supabase.table("profiles_with_email").select(
                "email, full_name"
            ).eq("role", "admin").eq("is_active", True).execute()

        for manager in (managers.data or []):
            if manager.get("email"):
                try:
                    send_request_escalation_notification(
                        to_email=manager["email"],
                        manager_name=manager.get("full_name", "Manager"),
                        location_name=location.get("name", "Unknown"),
                        quantity_bags=request.get("quantity_bags", 0),
                        urgency=request.get("urgency", "normal"),
                        hours_pending=calculate_hours_pending(request["created_at"]),
                        request_id=request["id"]
                    )
                except Exception as e:
                    logger.error(f"[ESCALATION] Failed to send escalation to {manager['email']}: {e}")

    except Exception as e:
        logger.error(f"[ESCALATION] Failed to send zone manager escalation: {e}")


async def expire_request(supabase, request: dict):
    """Mark a request as expired and notify the requester."""
    try:
        # Update request status to expired
        supabase.table("stock_requests").update({
            "status": "expired"
        }).eq("id", request["id"]).execute()

        # Remove escalation tracking
        supabase.table("request_escalation_state").delete().eq(
            "request_id", request["id"]
        ).execute()

        # Notify requester
        requester = request.get("requester", {})
        requester_id = request.get("requested_by")

        if requester_id:
            requester_data = supabase.table("profiles_with_email").select(
                "email, full_name"
            ).eq("id", requester_id).execute()

            if requester_data.data:
                requester_info = requester_data.data[0]
                if requester_info.get("email"):
                    location = request.get("location", {})
                    send_request_expired_notification(
                        to_email=requester_info["email"],
                        requester_name=requester_info.get("full_name", "User"),
                        location_name=location.get("name", "Unknown"),
                        quantity_bags=request.get("quantity_bags", 0),
                        hours_pending=calculate_hours_pending(request["created_at"]),
                        request_id=request["id"]
                    )

    except Exception as e:
        logger.error(f"[ESCALATION] Failed to expire request: {e}")


def calculate_hours_pending(created_at_str: str) -> int:
    """Calculate hours since request was created."""
    try:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        now = datetime.now(created_at.tzinfo) if created_at.tzinfo else datetime.now()
        hours = (now - created_at).total_seconds() / 3600
        return int(hours)
    except:
        return 0


def remove_escalation_tracking(request_id: str):
    """Remove escalation tracking for a request (call when accepted/cancelled)."""
    try:
        supabase = get_supabase_admin_client()
        supabase.table("request_escalation_state").delete().eq(
            "request_id", request_id
        ).execute()
        logger.info(f"[ESCALATION] Removed tracking for request {request_id}")
    except Exception as e:
        logger.error(f"[ESCALATION] Failed to remove tracking for {request_id}: {e}")
