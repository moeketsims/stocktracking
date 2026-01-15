from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth
from ..models.responses import DashboardResponse, DashboardStats, ForecastData

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(user_data: dict = Depends(require_auth)):
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

        location_id = profile.data.get("location_id") if profile.data else None

        # Get stock balance (simple query without joins - views don't support joins in PostgREST)
        stock_query = supabase.table("stock_balance").select("*")
        if location_id:
            stock_query = stock_query.eq("location_id", location_id)
        stock_balance = stock_query.execute()
        if stock_balance.error:
            raise HTTPException(status_code=500, detail=f"Stock balance query failed: {stock_balance.error}")

        # Calculate total stock
        total_stock = sum(item.get("on_hand_qty", 0) or 0 for item in (stock_balance.data or []))

        # Get today's transactions
        today = datetime.now().date().isoformat()
        today_start = f"{today}T00:00:00"

        transactions_query = supabase.table("stock_transactions").select("*").gte(
            "created_at", today_start
        )

        if location_id:
            transactions_query = transactions_query.eq("location_id_from", location_id)

        transactions = transactions_query.execute()
        if transactions.error:
            raise HTTPException(status_code=500, detail=f"Transactions query failed: {transactions.error}")

        # Calculate today's totals
        received_today = sum(
            t.get("qty", 0) for t in (transactions.data or [])
            if t.get("type") == "receive"
        )
        issued_today = sum(
            t.get("qty", 0) for t in (transactions.data or [])
            if t.get("type") == "issue"
        )
        wasted_today = sum(
            t.get("qty", 0) for t in (transactions.data or [])
            if t.get("type") == "waste"
        )

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
            1 for item in (stock_balance.data or [])
            if item.get("on_hand_qty", 0) < 20
        )

        # Reorder now: qty < 50kg
        reorder_count = sum(
            1 for item in (stock_balance.data or [])
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
        formatted_balance = []
        for item in (stock_balance.data or []):
            locations_data = item.get("locations") or {}
            items_data = item.get("items") or {}
            formatted_balance.append({
                "location_id": item.get("location_id"),
                "item_id": item.get("item_id"),
                "on_hand_qty": item.get("on_hand_qty", 0),
                "location_name": locations_data.get("name", "Unknown") if isinstance(locations_data, dict) else "Unknown",
                "item_name": items_data.get("name", "Unknown") if isinstance(items_data, dict) else "Unknown",
                "unit": items_data.get("unit", "kg") if isinstance(items_data, dict) else "kg"
            })

        return DashboardResponse(
            stats=stats,
            forecast=forecast,
            stock_balance=formatted_balance
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/today-stats")
async def get_today_stats(user_data: dict = Depends(require_auth)):
    """Get quick stats for today."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("location_id").eq(
            "user_id", user.id
        ).single().execute()

        location_id = profile.data.get("location_id") if profile.data else None

        today = datetime.now().date().isoformat()
        today_start = f"{today}T00:00:00"

        transactions_query = supabase.table("stock_transactions").select("type, qty").gte(
            "created_at", today_start
        )

        if location_id:
            transactions_query = transactions_query.eq("location_id_from", location_id)

        transactions = transactions_query.execute()

        received = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") == "receive")
        issued = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") == "issue")
        wasted = sum(t.get("qty", 0) for t in (transactions.data or []) if t.get("type") == "waste")

        return {
            "received_today_kg": round(received, 2),
            "issued_today_kg": round(issued, 2),
            "wasted_today_kg": round(wasted, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
