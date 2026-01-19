"""Low Stock Alert Escalation Job.

Monitors stock levels and sends escalating alerts until a stock request is created.

Escalation Chain:
- Level 1: Location Manager (immediate)
- Level 2: Zone Manager (after 4 hours)
- Level 3: Admin (after 8 hours, repeats daily)

Resolution Conditions:
- A stock request is created for that location
- Stock level rises above reorder point
"""

from datetime import datetime, timedelta
import logging
from ..config import get_supabase_admin_client
from ..email import send_low_stock_alert, send_low_stock_escalation

logger = logging.getLogger(__name__)

# Escalation timing in hours
ESCALATION_TIMING = {
    'level_2_after': 4,   # Escalate to zone manager after 4 hours
    'level_3_after': 8,   # Escalate to admin after 8 hours
    'level_3_repeat': 24  # Repeat admin notification daily
}


async def process_low_stock_alerts():
    """Check for low stock and process alerts."""
    logger.info("[LOW STOCK JOB] Starting low stock alert processing...")

    try:
        supabase = get_supabase_admin_client()
        now = datetime.now()

        # Get low stock locations using the database function
        low_stock_result = supabase.rpc("get_low_stock_locations").execute()

        if low_stock_result.data:
            logger.info(f"[LOW STOCK JOB] Found {len(low_stock_result.data)} low stock locations")

            for location_data in low_stock_result.data:
                await process_low_stock_location(supabase, location_data, now)
        else:
            logger.info("[LOW STOCK JOB] No low stock locations found")

        # Check for resolved alerts (stock back above threshold)
        await check_resolved_alerts(supabase)

        # Process existing alert escalations
        await process_alert_escalations(supabase, now)

    except Exception as e:
        logger.error(f"[LOW STOCK JOB] Error: {str(e)}")


async def process_low_stock_location(supabase, location_data: dict, now: datetime):
    """Process a low stock location - create or update alert."""
    location_id = location_data["location_id"]
    item_id = location_data["item_id"]

    # Check if there's already an open stock request for this location
    has_request = supabase.rpc("check_stock_request_for_location", {
        "p_location_id": location_id,
        "p_item_id": item_id
    }).execute()

    if has_request.data:
        # Stock request exists, mark alert as resolved if it exists
        await resolve_alert_by_request(supabase, location_id, item_id)
        return

    # Check if alert already exists for this location/item
    existing_alert = supabase.table("low_stock_alert_state").select("*").eq(
        "location_id", location_id
    ).eq("item_id", item_id).eq("is_resolved", False).execute()

    if not existing_alert.data:
        # Create new alert at level 1
        await create_low_stock_alert(supabase, location_data, now)
    # If alert exists, escalation will be handled in process_alert_escalations


async def create_low_stock_alert(supabase, location_data: dict, now: datetime):
    """Create a new low stock alert and send initial notification."""
    location_id = location_data["location_id"]
    item_id = location_data["item_id"]
    location_name = location_data["location_name"]
    item_name = location_data["item_name"]
    on_hand_qty = location_data["on_hand_qty"]
    reorder_point = location_data["reorder_point_qty"]
    zone_id = location_data.get("zone_id")

    # Create alert record
    next_escalation = now + timedelta(hours=ESCALATION_TIMING["level_2_after"])

    supabase.table("low_stock_alert_state").insert({
        "location_id": location_id,
        "item_id": item_id,
        "escalation_level": 1,
        "first_detected_at": now.isoformat(),
        "last_notification_at": now.isoformat(),
        "next_escalation_at": next_escalation.isoformat(),
        "stock_qty_when_detected": float(on_hand_qty),
        "reorder_point_qty": float(reorder_point)
    }).execute()

    # Send notification to location manager
    await send_location_manager_alert(
        supabase, location_id, location_name, item_name,
        on_hand_qty, reorder_point
    )

    logger.info(f"[LOW STOCK] Created alert for {location_name} - {item_name}")


async def send_location_manager_alert(supabase, location_id: str, location_name: str,
                                      item_name: str, current_qty: float, reorder_point: float):
    """Send low stock alert to location manager."""
    try:
        # Get location managers
        managers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("location_id", location_id).in_(
            "role", ["location_manager", "admin", "zone_manager"]
        ).eq("is_active", True).execute()

        for manager in (managers.data or []):
            if manager.get("email"):
                try:
                    send_low_stock_alert(
                        to_email=manager["email"],
                        manager_name=manager.get("full_name", "Manager"),
                        location_name=location_name,
                        item_name=item_name,
                        current_qty=float(current_qty),
                        reorder_point=float(reorder_point),
                        escalation_level=1
                    )
                except Exception as e:
                    logger.error(f"[LOW STOCK] Failed to send alert to {manager['email']}: {e}")

    except Exception as e:
        logger.error(f"[LOW STOCK] Failed to send location manager alert: {e}")


async def process_alert_escalations(supabase, now: datetime):
    """Process existing alerts that need escalation."""
    # Get unresolved alerts where next_escalation_at has passed
    alerts = supabase.table("low_stock_alert_state").select(
        "*, locations(name, zone_id), items(name)"
    ).eq("is_resolved", False).lt("next_escalation_at", now.isoformat()).execute()

    for alert in (alerts.data or []):
        await escalate_alert(supabase, alert, now)


async def escalate_alert(supabase, alert: dict, now: datetime):
    """Escalate an existing alert to the next level."""
    alert_id = alert["id"]
    current_level = alert["escalation_level"]
    location = alert.get("locations", {})
    item = alert.get("items", {})
    zone_id = location.get("zone_id")

    location_name = location.get("name", "Unknown")
    item_name = item.get("name", "Stock")
    current_qty = alert["stock_qty_when_detected"]
    reorder_point = alert["reorder_point_qty"]

    if current_level == 1:
        # Escalate to level 2: Zone Manager
        next_escalation = now + timedelta(hours=ESCALATION_TIMING["level_3_after"] - ESCALATION_TIMING["level_2_after"])

        supabase.table("low_stock_alert_state").update({
            "escalation_level": 2,
            "last_notification_at": now.isoformat(),
            "next_escalation_at": next_escalation.isoformat()
        }).eq("id", alert_id).execute()

        await send_zone_manager_low_stock_alert(
            supabase, zone_id, location_name, item_name, current_qty, reorder_point
        )

        logger.info(f"[LOW STOCK] Escalated alert for {location_name} to level 2")

    elif current_level == 2:
        # Escalate to level 3: Admin
        next_escalation = now + timedelta(hours=ESCALATION_TIMING["level_3_repeat"])

        supabase.table("low_stock_alert_state").update({
            "escalation_level": 3,
            "last_notification_at": now.isoformat(),
            "next_escalation_at": next_escalation.isoformat()
        }).eq("id", alert_id).execute()

        await send_admin_low_stock_alert(
            supabase, location_name, item_name, current_qty, reorder_point
        )

        logger.info(f"[LOW STOCK] Escalated alert for {location_name} to level 3")

    elif current_level == 3:
        # Repeat admin notification
        next_escalation = now + timedelta(hours=ESCALATION_TIMING["level_3_repeat"])

        supabase.table("low_stock_alert_state").update({
            "last_notification_at": now.isoformat(),
            "next_escalation_at": next_escalation.isoformat()
        }).eq("id", alert_id).execute()

        await send_admin_low_stock_alert(
            supabase, location_name, item_name, current_qty, reorder_point,
            is_repeat=True
        )

        logger.info(f"[LOW STOCK] Repeated admin alert for {location_name}")


async def send_zone_manager_low_stock_alert(supabase, zone_id: str, location_name: str,
                                            item_name: str, current_qty: float, reorder_point: float):
    """Send low stock escalation to zone manager."""
    try:
        if not zone_id:
            # No zone, send to admins directly
            await send_admin_low_stock_alert(supabase, location_name, item_name, current_qty, reorder_point)
            return

        managers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("role", "zone_manager").eq("zone_id", zone_id).eq("is_active", True).execute()

        for manager in (managers.data or []):
            if manager.get("email"):
                try:
                    send_low_stock_escalation(
                        to_email=manager["email"],
                        manager_name=manager.get("full_name", "Zone Manager"),
                        location_name=location_name,
                        item_name=item_name,
                        current_qty=float(current_qty),
                        reorder_point=float(reorder_point),
                        escalation_level=2,
                        hours_unresolved=4
                    )
                except Exception as e:
                    logger.error(f"[LOW STOCK] Failed to send escalation to {manager['email']}: {e}")

    except Exception as e:
        logger.error(f"[LOW STOCK] Failed to send zone manager escalation: {e}")


async def send_admin_low_stock_alert(supabase, location_name: str, item_name: str,
                                     current_qty: float, reorder_point: float, is_repeat: bool = False):
    """Send low stock escalation to admin."""
    try:
        admins = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("role", "admin").eq("is_active", True).execute()

        for admin in (admins.data or []):
            if admin.get("email"):
                try:
                    send_low_stock_escalation(
                        to_email=admin["email"],
                        manager_name=admin.get("full_name", "Admin"),
                        location_name=location_name,
                        item_name=item_name,
                        current_qty=float(current_qty),
                        reorder_point=float(reorder_point),
                        escalation_level=3,
                        hours_unresolved=8 if not is_repeat else 24,
                        is_repeat=is_repeat
                    )
                except Exception as e:
                    logger.error(f"[LOW STOCK] Failed to send admin alert to {admin['email']}: {e}")

    except Exception as e:
        logger.error(f"[LOW STOCK] Failed to send admin alert: {e}")


async def check_resolved_alerts(supabase):
    """Check if any alerts should be marked as resolved (stock back above threshold)."""
    try:
        # Get all unresolved alerts
        alerts = supabase.table("low_stock_alert_state").select(
            "id, location_id, item_id, reorder_point_qty"
        ).eq("is_resolved", False).execute()

        for alert in (alerts.data or []):
            # Check current stock level
            stock = supabase.table("stock_balance").select("on_hand_qty").eq(
                "location_id", alert["location_id"]
            ).eq("item_id", alert["item_id"]).execute()

            if stock.data:
                current_qty = stock.data[0].get("on_hand_qty", 0)
                reorder_point = alert["reorder_point_qty"]

                if current_qty >= reorder_point:
                    # Stock is back above threshold, resolve alert
                    supabase.table("low_stock_alert_state").update({
                        "is_resolved": True,
                        "resolved_at": datetime.now().isoformat()
                    }).eq("id", alert["id"]).execute()

                    logger.info(f"[LOW STOCK] Resolved alert {alert['id']} - stock restored")

    except Exception as e:
        logger.error(f"[LOW STOCK] Failed to check resolved alerts: {e}")


async def resolve_alert_by_request(supabase, location_id: str, item_id: str):
    """Mark alert as resolved because a stock request was created."""
    try:
        # Find and update the alert
        result = supabase.table("low_stock_alert_state").update({
            "is_resolved": True,
            "resolved_at": datetime.now().isoformat()
        }).eq("location_id", location_id).eq("item_id", item_id).eq(
            "is_resolved", False
        ).execute()

        if result.data:
            logger.info(f"[LOW STOCK] Resolved alert for location {location_id} - request created")

    except Exception as e:
        logger.error(f"[LOW STOCK] Failed to resolve alert by request: {e}")


def resolve_alert_for_location(location_id: str, request_id: str = None):
    """Public function to resolve alert when a stock request is created."""
    try:
        supabase = get_supabase_admin_client()

        update_data = {
            "is_resolved": True,
            "resolved_at": datetime.now().isoformat()
        }

        if request_id:
            update_data["resolved_by_request_id"] = request_id

        supabase.table("low_stock_alert_state").eq(
            "location_id", location_id
        ).eq("is_resolved", False).update(update_data)

        logger.info(f"[LOW STOCK] Resolved alerts for location {location_id}")

    except Exception as e:
        logger.error(f"[LOW STOCK] Failed to resolve alert for location: {e}")
