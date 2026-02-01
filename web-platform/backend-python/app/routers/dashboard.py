from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from collections import defaultdict
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, get_view_location_id
from ..models.responses import DashboardResponse, DashboardStats, ForecastData

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_stock_from_batches(supabase, location_id: str = None) -> list:
    """
    Calculate stock totals from active batches (same method as Stocks page).
    Returns list of dicts with location_id, item_id, on_hand_qty (in kg), on_hand_bags.
    """
    try:
        all_batches = []
        last_id = None
        page_size = 1000
        page_count = 0

        # Paginate through ALL batches using cursor-based pagination
        while page_count < 50:  # Safety limit
            query = supabase.table("stock_batches").select(
                "id, location_id, item_id, remaining_qty"
            ).gt("remaining_qty", 0)

            if location_id:
                query = query.eq("location_id", location_id)

            if last_id:
                query = query.gt("id", last_id)

            batches = query.order("id").limit(page_size).execute()

            if not batches.data:
                break

            all_batches.extend(batches.data)
            last_id = batches.data[-1]["id"]
            page_count += 1

            if len(batches.data) < page_size:
                break

        # Group by location_id + item_id and sum remaining_qty
        stock_map = defaultdict(lambda: {"qty": 0})
        for batch in all_batches:
            key = (batch["location_id"], batch["item_id"])
            stock_map[key]["qty"] += batch.get("remaining_qty", 0) or 0

        # Convert to list format
        result = []
        for (loc_id, item_id), data in stock_map.items():
            qty_kg = data["qty"]
            result.append({
                "location_id": loc_id,
                "item_id": item_id,
                "on_hand_qty": qty_kg,
                "on_hand_bags": round(qty_kg / 10, 1)  # 1 bag = 10 kg
            })

        return result

    except Exception as e:
        print(f"Error getting stock from batches: {e}")
        return []


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    user_data: dict = Depends(require_auth)
):
    """Get dashboard data including stats, forecasts, and stock balance."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile for location filter
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()
        if profile.error:
            raise HTTPException(status_code=500, detail=f"Profile query failed: {profile.error}")

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        # Get stock balance from batches (same method as Stocks page for consistency)
        stock_data = get_stock_from_batches(supabase, location_id)

        # Calculate total stock
        total_stock = sum(item.get("on_hand_qty", 0) or 0 for item in stock_data)

        # Get today's transactions
        today = datetime.now().date().isoformat()
        today_start = f"{today}T00:00:00"

        # For received: filter by location_id_to (destination - where stock was received)
        # For issued/wasted: filter by location_id_from (source - where stock was taken from)

        if location_id:
            # Query received transactions (location is the destination)
            # Includes: receive, transfer IN (e.g., receiving a loan)
            received_query = supabase.table("stock_transactions").select("qty").gte(
                "created_at", today_start
            ).eq("type", "receive").eq("location_id_to", location_id)
            received_result = received_query.execute()

            # Also count transfers INTO this location (e.g., receiving loaned stock)
            transfer_in_query = supabase.table("stock_transactions").select("qty").gte(
                "created_at", today_start
            ).eq("type", "transfer").eq("location_id_to", location_id)
            transfer_in_result = transfer_in_query.execute()

            # Query issued/wasted/transfer OUT transactions (location is the source)
            # Includes: issue (consumed), waste (discarded), transfer OUT (e.g., loaning out stock)
            issued_wasted_query = supabase.table("stock_transactions").select("type, qty").gte(
                "created_at", today_start
            ).in_("type", ["issue", "waste", "transfer"]).eq("location_id_from", location_id)
            issued_wasted_result = issued_wasted_query.execute()

            received_today = sum(t.get("qty", 0) for t in (received_result.data or []))
            received_today += sum(t.get("qty", 0) for t in (transfer_in_result.data or []))  # Add transfers in
            # Issued includes both "issue" (consumed) and "transfer" out (loaned/moved)
            issued_today = sum(t.get("qty", 0) for t in (issued_wasted_result.data or []) if t.get("type") in ["issue", "transfer"])
            wasted_today = sum(t.get("qty", 0) for t in (issued_wasted_result.data or []) if t.get("type") == "waste")
        else:
            # No location filter - get all transactions
            transactions_query = supabase.table("stock_transactions").select("type, qty, location_id_from, location_id_to").gte(
                "created_at", today_start
            )
            transactions = transactions_query.execute()

            received_today = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") == "receive")
            # For global view, count issues and transfers out
            issued_today = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") in ["issue", "transfer"])
            wasted_today = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") == "waste")

        # Get active batches count
        batches_query = supabase.table("stock_batches").select("id").gt("remaining_qty", 0)
        if location_id:
            batches_query = batches_query.eq("location_id", location_id)
        batches = batches_query.execute()
        if batches.error:
            raise HTTPException(status_code=500, detail=f"Batches query failed: {batches.error}")
        active_batches = len(batches.data or [])

        # Calculate alerts
        # Low stock: qty < 20kg
        low_stock_count = sum(
            1 for item in stock_data
            if item.get("on_hand_qty", 0) < 20
        )

        # Reorder now: qty < 50kg
        reorder_count = sum(
            1 for item in stock_data
            if 20 <= item.get("on_hand_qty", 0) < 50
        )

        # Expiring soon: batches with expiry_date within 7 days
        expiry_threshold = (datetime.now() + timedelta(days=7)).date().isoformat()
        expiring_query = supabase.table("stock_batches").select("id").gt(
            "remaining_qty", 0
        ).lte("expiry_date", expiry_threshold).gte(
            "expiry_date", datetime.now().date().isoformat()
        )
        if location_id:
            expiring_query = expiring_query.eq("location_id", location_id)
        expiring = expiring_query.execute()
        expiring_count = len(expiring.data or [])

        stats = DashboardStats(
            total_stock_kg=total_stock,
            received_today_kg=received_today,
            issued_today_kg=issued_today,
            wasted_today_kg=wasted_today,
            active_batches=active_batches,
            low_stock_alerts=low_stock_count,
            reorder_alerts=reorder_count,
            expiring_soon_alerts=expiring_count
        )

        # Calculate forecast
        # Get last 7 days usage
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        usage_query = supabase.table("stock_transactions").select("qty").eq(
            "type", "issue"
        ).gte("created_at", week_ago)
        if location_id:
            usage_query = usage_query.eq("location_id_from", location_id)
        usage = usage_query.execute()

        total_usage_7_days = sum(t.get("qty", 0) for t in (usage.data or []))
        avg_daily_usage = total_usage_7_days / 7 if total_usage_7_days > 0 else 0

        # Calculate days of cover
        days_of_cover = total_stock / avg_daily_usage if avg_daily_usage > 0 else 999

        # Stock out date
        stock_out_date = None
        reorder_by_date = None
        if avg_daily_usage > 0 and days_of_cover < 999:
            stock_out_date = (datetime.now() + timedelta(days=days_of_cover)).date().isoformat()
            reorder_by_date = (datetime.now() + timedelta(days=max(0, days_of_cover - 2))).date().isoformat()

        # Get reorder policy or use defaults
        safety_stock = 20.0
        reorder_point = 50.0

        policy_query = supabase.table("reorder_policies").select("*")
        if location_id:
            policy_query = policy_query.eq("location_id", location_id)
        policy = policy_query.limit(1).execute()

        if policy.data and len(policy.data) > 0:
            safety_stock = policy.data[0].get("safety_stock_qty", 20.0)
            reorder_point = policy.data[0].get("reorder_point_qty", 50.0)

        # Suggested order quantity
        suggested_order = max(0, reorder_point - total_stock + (avg_daily_usage * 7))

        forecast = ForecastData(
            avg_daily_usage=round(avg_daily_usage, 2),
            days_of_cover=round(min(days_of_cover, 999), 1),
            stock_out_date=stock_out_date,
            reorder_by_date=reorder_by_date,
            safety_stock_qty=safety_stock,
            reorder_point_qty=reorder_point,
            suggested_order_qty=round(suggested_order, 2)
        )

        # Format stock balance for response
        # Fetch location and item names separately to ensure we get them
        # stock_data is already populated from get_stock_from_batches() above

        # Get unique location IDs and item IDs
        location_ids = list(set(item.get("location_id") for item in stock_data if item.get("location_id")))
        item_ids = list(set(item.get("item_id") for item in stock_data if item.get("item_id")))

        # Fetch location names and thresholds
        location_info = {}
        if location_ids:
            locations_result = supabase.table("locations").select(
                "id, name, critical_stock_threshold, low_stock_threshold"
            ).in_("id", location_ids).execute()
            for loc in (locations_result.data or []):
                location_info[loc.get("id")] = {
                    "name": loc.get("name", "Unknown"),
                    "critical_threshold": loc.get("critical_stock_threshold") or 20,  # Default 20 bags
                    "low_threshold": loc.get("low_stock_threshold") or 50  # Default 50 bags
                }

        # Fetch item names and units
        item_info = {}
        if item_ids:
            items_result = supabase.table("items").select("id, name, unit").in_("id", item_ids).execute()
            for itm in (items_result.data or []):
                item_info[itm.get("id")] = {"name": itm.get("name", "Unknown"), "unit": itm.get("unit", "kg")}

        formatted_balance = []
        for item in stock_data:
            loc_id = item.get("location_id")
            itm_id = item.get("item_id")
            itm_data = item_info.get(itm_id, {"name": "Unknown", "unit": "kg"})
            loc_data = location_info.get(loc_id, {"name": "Unknown", "critical_threshold": 20, "low_threshold": 50})
            formatted_balance.append({
                "location_id": loc_id,
                "item_id": itm_id,
                "on_hand_qty": item.get("on_hand_qty", 0),
                "on_hand_bags": item.get("on_hand_bags", 0),
                "location_name": loc_data["name"],
                "item_name": itm_data["name"],
                "unit": itm_data["unit"],
                "critical_threshold": loc_data["critical_threshold"],
                "low_threshold": loc_data["low_threshold"]
            })

        return DashboardResponse(
            stats=stats,
            forecast=forecast,
            stock_balance=formatted_balance
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/today-stats")
async def get_today_stats(
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    user_data: dict = Depends(require_auth)
):
    """Get quick stats for today."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        today = datetime.now().date().isoformat()
        today_start = f"{today}T00:00:00"

        if location_id:
            # Query received transactions (location is the destination)
            received_query = supabase.table("stock_transactions").select("qty").gte(
                "created_at", today_start
            ).eq("type", "receive").eq("location_id_to", location_id)
            received_result = received_query.execute()

            # Also count transfers INTO this location (e.g., receiving loaned stock)
            transfer_in_query = supabase.table("stock_transactions").select("qty").gte(
                "created_at", today_start
            ).eq("type", "transfer").eq("location_id_to", location_id)
            transfer_in_result = transfer_in_query.execute()

            # Query issued/wasted/transfer OUT transactions (location is the source)
            issued_wasted_query = supabase.table("stock_transactions").select("type, qty").gte(
                "created_at", today_start
            ).in_("type", ["issue", "waste", "transfer"]).eq("location_id_from", location_id)
            issued_wasted_result = issued_wasted_query.execute()

            received = sum(t.get("qty", 0) for t in (received_result.data or []))
            received += sum(t.get("qty", 0) for t in (transfer_in_result.data or []))  # Add transfers in
            issued = sum(t.get("qty", 0) for t in (issued_wasted_result.data or []) if t.get("type") in ["issue", "transfer"])
            wasted = sum(t.get("qty", 0) for t in (issued_wasted_result.data or []) if t.get("type") == "waste")
        else:
            transactions_query = supabase.table("stock_transactions").select("type, qty").gte(
                "created_at", today_start
            )
            transactions = transactions_query.execute()

            received = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") in ["receive"])
            issued = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") in ["issue", "transfer"])
            wasted = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") == "waste")

        return {
            "received_today_kg": round(received, 2),
            "issued_today_kg": round(issued, 2),
            "wasted_today_kg": round(wasted, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
