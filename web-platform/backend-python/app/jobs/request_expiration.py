"""Request Escalation Job.

Handles automatic escalation of pending stock requests to zone managers.

Logic:
- No emails for the first 48 hours after a request is created
- After 48 hours: escalate to the zone manager with one email
- Then one reminder email per day to the zone manager until the request is resolved
"""

from datetime import datetime, timedelta
import logging
from ..config import get_supabase_admin_client
from ..email import send_request_escalation_notification

logger = logging.getLogger(__name__)

# Wait 48 hours before first escalation
QUIET_PERIOD_HOURS = 48

# Minimum 24 hours between reminder emails for the same request
REMINDER_INTERVAL_HOURS = 24


async def process_request_escalations():
    """Process pending stock requests and escalate to zone managers after 48h."""
    logger.info("[ESCALATION JOB] Starting request escalation processing...")

    try:
        supabase = get_supabase_admin_client()
        now = datetime.utcnow()

        # Get all pending requests
        pending_requests = supabase.table("stock_requests").select(
            "*, location:locations(id, name, zone_id), "
            "requester:profiles!stock_requests_requested_by_fkey(id, full_name)"
        ).eq("status", "pending").execute()

        if not pending_requests.data:
            logger.info("[ESCALATION JOB] No pending requests to process")
            return

        sent_count = 0
        skipped_count = 0

        for request in pending_requests.data:
            result = await process_single_request(supabase, request, now)
            if result == "sent":
                sent_count += 1
            else:
                skipped_count += 1

        logger.info(f"[ESCALATION JOB] Done. Sent {sent_count} zone manager emails, skipped {skipped_count}")

    except Exception as e:
        logger.error(f"[ESCALATION JOB] Error: {str(e)}")


async def process_single_request(supabase, request: dict, now: datetime) -> str:
    """Process a single request. Returns 'sent' or 'skipped'."""
    request_id = request["id"]

    # Check how old the request is
    created_at = datetime.fromisoformat(request["created_at"].replace("Z", "+00:00"))
    hours_since_created = (now - created_at.replace(tzinfo=None)).total_seconds() / 3600

    # Still in quiet period — no emails yet
    if hours_since_created < QUIET_PERIOD_HOURS:
        return "skipped"

    # Get escalation state to check when we last sent an email
    escalation = supabase.table("request_escalation_state").select("*").eq(
        "request_id", request_id
    ).execute()

    if not escalation.data:
        # First time past 48h — create tracking and send first escalation
        insert_result = supabase.table("request_escalation_state").insert({
            "request_id": request_id,
            "escalation_level": 1,
            "last_escalation_at": now.isoformat(),
            "next_escalation_at": (now + timedelta(hours=REMINDER_INTERVAL_HOURS)).isoformat(),
            "reminder_threshold_hours": QUIET_PERIOD_HOURS,
            "escalate_threshold_hours": REMINDER_INTERVAL_HOURS,
            "expire_threshold_hours": 0
        }).execute()

        if not insert_result.data:
            logger.error(f"[ESCALATION] Failed to insert tracking for {request_id}, skipping email")
            return "skipped"

        await notify_zone_manager(supabase, request)
        logger.info(f"[ESCALATION] First zone manager notification for request {request_id}")
        return "sent"

    state = escalation.data[0]
    last_sent_str = state.get("last_escalation_at")

    if last_sent_str:
        last_sent = datetime.fromisoformat(last_sent_str.replace("Z", "+00:00"))
        hours_since_last = (now - last_sent.replace(tzinfo=None)).total_seconds() / 3600

        # Not yet 24 hours since last email — skip
        if hours_since_last < REMINDER_INTERVAL_HOURS:
            return "skipped"

    # 24+ hours since last email — send daily reminder to zone manager
    # Cap at 3 to avoid violating DB CHECK constraint (max escalation_level = 3)
    day_number = min(state.get("escalation_level", 0) + 1, 3)

    update_result = supabase.table("request_escalation_state").update({
        "last_escalation_at": now.isoformat(),
        "next_escalation_at": (now + timedelta(hours=REMINDER_INTERVAL_HOURS)).isoformat(),
        "escalation_level": day_number,
    }).eq("request_id", request_id).execute()

    if not update_result.data:
        logger.error(f"[ESCALATION] Failed to update tracking for {request_id}, skipping email")
        return "skipped"

    await notify_zone_manager(supabase, request)
    logger.info(f"[ESCALATION] Daily reminder #{day_number} to zone manager for request {request_id}")
    return "sent"


async def notify_zone_manager(supabase, request: dict):
    """Send escalation email to the zone manager for the request's location."""
    try:
        location = request.get("location", {})
        zone_id = location.get("zone_id")

        if not zone_id:
            logger.warning(f"[ESCALATION] No zone_id for location {location.get('name', 'Unknown')}, skipping")
            return

        # Get zone managers for this zone
        managers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("role", "zone_manager").eq("zone_id", zone_id).eq("is_active", True).execute()

        # Fallback to admins if no zone managers found
        if not managers.data:
            managers = supabase.table("profiles_with_email").select(
                "email, full_name"
            ).eq("role", "admin").eq("is_active", True).execute()

        if not managers.data:
            logger.warning(f"[ESCALATION] No zone manager or admin found for zone {zone_id}")
            return

        hours_pending = calculate_hours_pending(request["created_at"])

        for manager in managers.data:
            if manager.get("email"):
                try:
                    send_request_escalation_notification(
                        to_email=manager["email"],
                        manager_name=manager.get("full_name", "Manager"),
                        location_name=location.get("name", "Unknown"),
                        quantity_bags=request.get("quantity_bags", 0),
                        urgency=request.get("urgency", "normal"),
                        hours_pending=hours_pending,
                        request_id=request["id"]
                    )
                except Exception as e:
                    logger.error(f"[ESCALATION] Failed to send to {manager['email']}: {e}")

    except Exception as e:
        logger.error(f"[ESCALATION] Failed to notify zone manager: {e}")


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
