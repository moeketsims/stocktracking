from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional, Set
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth
from ..models.responses import (
    OwnerDashboardResponse,
    ShopDailyStatus,
    ShopDailyActivity,
    ShopAlertSummary,
)

router = APIRouter(prefix="/owner-dashboard", tags=["Owner Dashboard"])


async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Require admin role only."""
    user_data = await require_auth(authorization)
    admin_client = get_supabase_admin_client()

    profile = admin_client.table("profiles").select("*").eq(
        "user_id", user_data["user"].id
    ).single().execute()

    if not profile.data or profile.data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user_data["profile"] = profile.data
    return user_data


def get_potato_item_ids(supabase) -> Set[str]:
    """Get all potato item IDs for filtering."""
    potato_items = supabase.table("items").select("id").ilike("sku", "POT-%").execute()
    return {item["id"] for item in (potato_items.data or [])}


def kg_to_bags(kg: float) -> float:
    """Convert kg to bags (1 bag = 10 kg). Returns fractional bags."""
    return round(kg / 10.0, 1)


def calculate_location_alerts(
    supabase, location_id: str, stock_bags: float, batches_data: list
) -> dict:
    """Calculate alert counts for a specific location."""
    # Low stock: < 2 bags (safety stock)
    low_stock_count = 1 if stock_bags < 2 else 0

    # Reorder: between 2 and 5 bags (reorder point)
    reorder_count = 1 if 2 <= stock_bags < 5 else 0

    # Expiring soon: batches with expiry_date within 7 days
    expiry_threshold = (datetime.now() + timedelta(days=7)).date().isoformat()
    today = datetime.now().date().isoformat()

    expiring_count = sum(
        1 for batch in batches_data
        if batch.get("location_id") == location_id
        and batch.get("expiry_date")
        and today <= batch.get("expiry_date", "") <= expiry_threshold
    )

    total = low_stock_count + reorder_count + expiring_count

    return {
        "low_stock_count": low_stock_count,
        "reorder_count": reorder_count,
        "expiring_soon_count": expiring_count,
        "total_alerts": total,
    }


def determine_status(stock_bags: float, total_alerts: int) -> str:
    """Determine health status based on stock level (in bags) and alerts."""
    if total_alerts > 3 or stock_bags < 2:
        return "critical"
    elif total_alerts > 0 or stock_bags < 5:
        return "warning"
    return "healthy"


def calculate_trends(supabase, potato_item_ids: Set[str]) -> dict:
    """Calculate 7-day and 30-day trend metrics for potato items."""
    now = datetime.now()
    day_7_ago = (now - timedelta(days=7)).isoformat()
    day_30_ago = (now - timedelta(days=30)).isoformat()
    day_15_ago = (now - timedelta(days=15)).isoformat()

    # Get 30 days of transactions
    if potato_item_ids:
        tx_30d = supabase.table("stock_transactions").select(
            "type, qty, created_at"
        ).gte("created_at", day_30_ago).in_("item_id", list(potato_item_ids)).execute()
    else:
        tx_30d = supabase.table("stock_transactions").select(
            "type, qty, created_at"
        ).gte("created_at", day_30_ago).execute()

    # Aggregate by period
    issued_7d = issued_30d = wasted_7d = wasted_30d = 0.0
    issued_first_half = issued_second_half = 0.0

    for tx in (tx_30d.data or []):
        qty = tx.get("qty", 0) or 0
        tx_type = tx.get("type")
        created = tx.get("created_at", "")

        is_within_7d = created >= day_7_ago
        is_first_half = created < day_15_ago  # Days 16-30 ago
        is_second_half = created >= day_15_ago  # Days 0-15 ago

        # For company-wide trends, only count actual usage (issue) and waste
        # Transfers are internal movements and don't represent actual usage
        if tx_type == "issue":
            issued_30d += qty
            if is_within_7d:
                issued_7d += qty
            if is_first_half:
                issued_first_half += qty
            if is_second_half:
                issued_second_half += qty
        elif tx_type == "waste":
            wasted_30d += qty
            if is_within_7d:
                wasted_7d += qty

    # Calculate metrics
    avg_daily_usage = issued_7d / 7 if issued_7d > 0 else 0
    waste_rate_7d = (wasted_7d / issued_7d * 100) if issued_7d > 0 else 0
    waste_rate_30d = (wasted_30d / issued_30d * 100) if issued_30d > 0 else 0

    # Trend direction (compare first vs second half of 30-day period)
    # Second half is more recent, so if second > first, trend is up
    if issued_first_half > 0:
        trend_pct = ((issued_second_half - issued_first_half) / issued_first_half) * 100
    else:
        trend_pct = 0

    if trend_pct > 5:
        trend_direction = "up"
    elif trend_pct < -5:
        trend_direction = "down"
    else:
        trend_direction = "stable"

    return {
        "issued_7d_kg": round(issued_7d, 1),
        "issued_30d_kg": round(issued_30d, 1),
        "wasted_7d_kg": round(wasted_7d, 1),
        "wasted_30d_kg": round(wasted_30d, 1),
        "avg_daily_usage_kg": round(avg_daily_usage, 1),
        "waste_rate_7d_pct": round(waste_rate_7d, 1),
        "waste_rate_30d_pct": round(waste_rate_30d, 1),
        "usage_trend_direction": trend_direction,
        "usage_trend_pct": round(abs(trend_pct), 1),
    }


@router.get("", response_model=OwnerDashboardResponse)
async def get_owner_dashboard(user_data: dict = Depends(require_admin)):
    """Get consolidated daily status for all shops - admin only."""
    supabase = get_supabase_admin_client()

    try:
        # Get potato item IDs for filtering
        potato_item_ids = get_potato_item_ids(supabase)

        # 1. Get all locations (shops and warehouse)
        locations = supabase.table("locations").select("*").in_(
            "type", ["shop", "warehouse"]
        ).execute()

        if not locations.data:
            return OwnerDashboardResponse(
                generated_at=datetime.now().isoformat(),
                date=datetime.now().date().isoformat(),
                total_stock_bags=0,
                total_stock_kg=0,
                total_received_bags=0,
                total_issued_bags=0,
                total_wasted_bags=0,
                total_alerts=0,
                shops=[],
                warehouse=None,
            )

        # 2. Get stock totals per location from stock_batches (filter to potato items)
        if potato_item_ids:
            batches = supabase.table("stock_batches").select(
                "location_id, remaining_qty, expiry_date, item_id"
            ).gt("remaining_qty", 0).in_("item_id", list(potato_item_ids)).execute()
        else:
            # Fallback if no potato items found - get all
            batches = supabase.table("stock_batches").select(
                "location_id, remaining_qty, expiry_date, item_id"
            ).gt("remaining_qty", 0).execute()

        # Aggregate stock by location
        stock_by_location = defaultdict(float)
        for batch in (batches.data or []):
            stock_by_location[batch["location_id"]] += batch.get("remaining_qty", 0) or 0

        # 3. Get today's transactions (with BOTH location fields for proper attribution)
        today = datetime.now().date().isoformat()
        today_start = f"{today}T00:00:00"

        if potato_item_ids:
            transactions = supabase.table("stock_transactions").select(
                "location_id_from, location_id_to, type, qty, item_id"
            ).gte("created_at", today_start).in_("item_id", list(potato_item_ids)).execute()
        else:
            transactions = supabase.table("stock_transactions").select(
                "location_id_from, location_id_to, type, qty, item_id"
            ).gte("created_at", today_start).execute()

        # Aggregate transactions with proper attribution
        activity_by_location = defaultdict(lambda: {"received": 0.0, "issued": 0.0, "wasted": 0.0})

        for tx in (transactions.data or []):
            tx_type = tx.get("type")
            qty = tx.get("qty", 0) or 0

            if tx_type == "receive":
                # Receive goes TO a location
                loc_to = tx.get("location_id_to")
                if loc_to:
                    activity_by_location[loc_to]["received"] += qty

            elif tx_type == "issue":
                # Issue comes FROM a location
                loc_from = tx.get("location_id_from")
                if loc_from:
                    activity_by_location[loc_from]["issued"] += qty

            elif tx_type == "transfer":
                # Transfer counts at BOTH ends: issued at source, received at destination
                loc_from = tx.get("location_id_from")
                loc_to = tx.get("location_id_to")
                if loc_from:
                    activity_by_location[loc_from]["issued"] += qty
                if loc_to:
                    activity_by_location[loc_to]["received"] += qty

            elif tx_type == "waste":
                # Waste comes FROM a location
                loc_from = tx.get("location_id_from")
                if loc_from:
                    activity_by_location[loc_from]["wasted"] += qty

        # 4. Calculate trend metrics
        trends = calculate_trends(supabase, potato_item_ids)

        # 5. Build response
        shops = []
        warehouse = None
        total_stock_kg = 0.0
        total_received_kg = 0.0
        total_issued_kg = 0.0
        total_wasted_kg = 0.0
        total_alerts = 0

        for loc in locations.data:
            loc_id = loc["id"]
            loc_name = loc.get("name", "Unknown")
            loc_type = loc.get("type", "shop")

            stock_kg = stock_by_location.get(loc_id, 0)
            stock_bags = kg_to_bags(stock_kg)
            activity = activity_by_location.get(loc_id, {"received": 0, "issued": 0, "wasted": 0})

            received_kg = activity.get("received", 0)
            issued_kg = activity.get("issued", 0)
            wasted_kg = activity.get("wasted", 0)

            # Calculate alerts for this location (using bags)
            alert_counts = calculate_location_alerts(
                supabase, loc_id, stock_bags, batches.data or []
            )

            # Determine status (using bags)
            status = determine_status(stock_bags, alert_counts["total_alerts"])

            shop_status = ShopDailyStatus(
                location_id=loc_id,
                location_name=loc_name,
                location_type=loc_type,
                total_stock_bags=stock_bags,
                total_stock_kg=round(stock_kg, 2),
                activity=ShopDailyActivity(
                    received_bags=kg_to_bags(received_kg),
                    issued_bags=kg_to_bags(issued_kg),
                    wasted_bags=kg_to_bags(wasted_kg),
                    received_kg=round(received_kg, 2),
                    issued_kg=round(issued_kg, 2),
                    wasted_kg=round(wasted_kg, 2),
                ),
                alerts=ShopAlertSummary(**alert_counts),
                status=status,
            )

            if loc_type == "warehouse":
                warehouse = shop_status
            else:
                shops.append(shop_status)

            # Accumulate totals
            total_stock_kg += stock_kg
            total_received_kg += received_kg
            total_issued_kg += issued_kg
            total_wasted_kg += wasted_kg
            total_alerts += alert_counts["total_alerts"]

        # Sort shops by name for consistent display
        shops.sort(key=lambda s: s.location_name)

        return OwnerDashboardResponse(
            generated_at=datetime.now().isoformat(),
            date=today,
            total_stock_bags=kg_to_bags(total_stock_kg),
            total_stock_kg=round(total_stock_kg, 2),
            total_received_bags=kg_to_bags(total_received_kg),
            total_issued_bags=kg_to_bags(total_issued_kg),
            total_wasted_bags=kg_to_bags(total_wasted_kg),
            total_alerts=total_alerts,
            shops=shops,
            warehouse=warehouse,
            # Trend metrics
            issued_7d_kg=trends["issued_7d_kg"],
            issued_30d_kg=trends["issued_30d_kg"],
            wasted_7d_kg=trends["wasted_7d_kg"],
            wasted_30d_kg=trends["wasted_30d_kg"],
            avg_daily_usage_kg=trends["avg_daily_usage_kg"],
            waste_rate_7d_pct=trends["waste_rate_7d_pct"],
            waste_rate_30d_pct=trends["waste_rate_30d_pct"],
            usage_trend_direction=trends["usage_trend_direction"],
            usage_trend_pct=trends["usage_trend_pct"],
        )

    except Exception as e:
        import traceback
        print(f"[OWNER DASHBOARD ERROR] {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
