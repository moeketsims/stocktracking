"""Auto-reorder job.

Checks stock levels against reorder policies and auto-creates stock requests
when stock falls below the reorder point.
"""

from datetime import datetime, timedelta
import logging
from uuid import uuid4
from ..config import get_supabase_admin_client

logger = logging.getLogger(__name__)


async def process_auto_reorder():
    """Check stock levels and auto-create stock requests where needed."""
    logger.info("[AUTO-REORDER] Starting auto-reorder processing...")

    try:
        supabase = get_supabase_admin_client()

        # Get all policies with auto-reorder enabled
        policies = supabase.table("reorder_policies").select(
            "*, locations(name, type), items(name)"
        ).eq("auto_reorder_enabled", True).execute()

        created = 0
        skipped = 0

        for policy in (policies.data or []):
            try:
                result = await _check_and_create_request(supabase, policy)
                if result:
                    created += 1
                else:
                    skipped += 1
            except Exception as e:
                logger.error(
                    f"[AUTO-REORDER] Error processing policy {policy.get('id', '?')}: {str(e)}"
                )
                skipped += 1

        logger.info(
            f"[AUTO-REORDER] Completed. Created {created} request(s), skipped {skipped}."
        )

    except Exception as e:
        logger.error(f"[AUTO-REORDER] Error: {str(e)}")


async def _check_and_create_request(supabase, policy: dict) -> bool:
    """Check one policy and create a request if needed. Returns True if created."""
    location_id = policy["location_id"]
    item_id = policy["item_id"]
    reorder_point = float(policy.get("reorder_point_qty", 50))

    # Get current stock
    stock = supabase.table("stock_balance").select(
        "on_hand_qty"
    ).eq("location_id", location_id).eq("item_id", item_id).execute()

    current_qty = float((stock.data or [{}])[0].get("on_hand_qty", 0)) if stock.data else 0

    if current_qty >= reorder_point:
        return False

    # Check for existing pending/active requests (within last 2 days to avoid duplicates)
    cutoff = (datetime.utcnow() - timedelta(days=2)).isoformat()
    existing = supabase.table("stock_requests").select("id").eq(
        "location_id", location_id
    ).in_(
        "status", ["pending", "accepted", "trip_created", "in_delivery"]
    ).gte("created_at", cutoff).execute()

    if existing.data:
        logger.info(
            f"[AUTO-REORDER] Skipping {location_id} - "
            f"existing request(s): {[r['id'][:8] for r in existing.data]}"
        )
        return False

    # Determine order quantity
    order_qty_bags = policy.get("auto_reorder_quantity_bags")
    if not order_qty_bags:
        # Default: order enough to reach reorder point + some buffer
        target_days = policy.get("target_days_of_cover", 7)
        order_qty_bags = max(10, target_days * 5)  # rough estimate

    location_name = (policy.get("locations") or {}).get("name", "Unknown")

    request_data = {
        "id": str(uuid4()),
        "location_id": location_id,
        "quantity_bags": order_qty_bags,
        "urgency": "urgent" if current_qty < float(policy.get("safety_stock_qty", 20)) else "normal",
        "status": "pending",
        "notes": (
            f"Auto-generated: stock at {current_qty:.0f} kg "
            f"(reorder point: {reorder_point:.0f} kg)"
        ),
        "is_auto_generated": True,
        "current_stock_kg": current_qty,
        "created_at": datetime.utcnow().isoformat(),
    }

    supabase.table("stock_requests").insert(request_data).execute()
    logger.info(
        f"[AUTO-REORDER] Created request for {location_name}: "
        f"{order_qty_bags} bags (stock: {current_qty:.0f} kg, reorder: {reorder_point:.0f} kg)"
    )
    return True
