from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional
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


def calculate_location_alerts(
    supabase, location_id: str, stock_bags: int, batches_data: list
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


def determine_status(stock_bags: int, total_alerts: int) -> str:
    """Determine health status based on stock level (in bags) and alerts."""
    if total_alerts > 3 or stock_bags < 2:
        return "critical"
    elif total_alerts > 0 or stock_bags < 5:
        return "warning"
    return "healthy"


@router.get("", response_model=OwnerDashboardResponse)
async def get_owner_dashboard(user_data: dict = Depends(require_admin)):
    """Get consolidated daily status for all shops - admin only."""
    supabase = get_supabase_admin_client()

    try:
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

        # 2. Get stock totals per location from stock_batches (with expiry dates for alert calc)
        batches = supabase.table("stock_batches").select(
            "location_id, remaining_qty, expiry_date"
        ).gt("remaining_qty", 0).execute()

        # Aggregate stock by location
        stock_by_location = defaultdict(float)
        for batch in (batches.data or []):
            stock_by_location[batch["location_id"]] += batch.get("remaining_qty", 0) or 0

        # 3. Get today's transactions
        today = datetime.now().date().isoformat()
        today_start = f"{today}T00:00:00"

        transactions = supabase.table("stock_transactions").select(
            "location_id_from, type, qty"
        ).gte("created_at", today_start).execute()

        # Aggregate transactions by location and type
        activity_by_location = defaultdict(lambda: {"receive": 0, "issue": 0, "waste": 0})
        for tx in (transactions.data or []):
            loc_id = tx.get("location_id_from")
            tx_type = tx.get("type")
            if loc_id and tx_type in ["receive", "issue", "waste"]:
                activity_by_location[loc_id][tx_type] += tx.get("qty", 0) or 0

        # 4. Build response
        shops = []
        warehouse = None
        total_stock_kg = 0
        total_received_kg = 0
        total_issued_kg = 0
        total_wasted_kg = 0
        total_alerts = 0

        # Conversion factor: 10kg per bag for potatoes
        conversion_factor = 10

        def kg_to_bags(kg: float) -> int:
            """Convert kg to bags (round to nearest bag)."""
            return round(kg / conversion_factor)

        for loc in locations.data:
            loc_id = loc["id"]
            loc_name = loc.get("name", "Unknown")
            loc_type = loc.get("type", "shop")

            stock_kg = stock_by_location.get(loc_id, 0)
            stock_bags = kg_to_bags(stock_kg)
            activity = activity_by_location.get(loc_id, {"receive": 0, "issue": 0, "waste": 0})

            received_kg = activity.get("receive", 0)
            issued_kg = activity.get("issue", 0)
            wasted_kg = activity.get("waste", 0)

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
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
