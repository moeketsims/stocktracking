from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from uuid import uuid4
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, get_view_location_id
from ..models.requests import AcknowledgeAlertRequest
from ..models.responses import AlertsResponse, AlertSummary, AlertItem

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def generate_alerts(supabase, location_id: str = None) -> list:
    """Generate alerts based on current stock status."""
    alerts = []
    now = datetime.now()

    # Get stock balance
    balance_query = supabase.table("stock_balance").select(
        "*, items(id, name), locations(id, name)"
    )
    if location_id:
        balance_query = balance_query.eq("location_id", location_id)
    balance = balance_query.execute()

    # Get reorder policies
    policies_query = supabase.table("reorder_policies").select("*")
    if location_id:
        policies_query = policies_query.eq("location_id", location_id)
    policies = policies_query.execute()

    # Build policy lookup
    policy_map = {}
    for p in (policies.data or []):
        key = f"{p['location_id']}_{p['item_id']}"
        policy_map[key] = p

    # Check each stock item for alerts
    for item in (balance.data or []):
        location = item.get("locations", {})
        item_data = item.get("items", {})
        on_hand = item.get("on_hand_qty", 0)

        policy_key = f"{item['location_id']}_{item['item_id']}"
        policy = policy_map.get(policy_key, {})

        safety_stock = policy.get("safety_stock_qty", 20)
        reorder_point = policy.get("reorder_point_qty", 50)

        loc_name = location.get("name", "Unknown") if location else "Unknown"
        item_name = item_data.get("name", "Unknown") if item_data else "Unknown"

        # Low stock alert
        if on_hand < safety_stock:
            alerts.append(AlertItem(
                id=f"low_{item['location_id']}_{item['item_id']}",
                type="low_stock",
                severity="error",
                title="Low Stock Alert",
                message=f"{item_name} is critically low at {loc_name}",
                item_id=item["item_id"],
                item_name=item_name,
                location_id=item["location_id"],
                location_name=loc_name,
                data={
                    "current_qty": on_hand,
                    "safety_level": safety_stock,
                    "days_left": 0 if on_hand <= 0 else 1
                },
                created_at=now.isoformat()
            ))
        # Reorder alert
        elif on_hand < reorder_point:
            alerts.append(AlertItem(
                id=f"reorder_{item['location_id']}_{item['item_id']}",
                type="reorder_now",
                severity="warning",
                title="Reorder Required",
                message=f"{item_name} needs reordering at {loc_name}",
                item_id=item["item_id"],
                item_name=item_name,
                location_id=item["location_id"],
                location_name=loc_name,
                data={
                    "current_qty": on_hand,
                    "reorder_point": reorder_point,
                    "suggested_qty": reorder_point - on_hand + 50
                },
                created_at=now.isoformat()
            ))

    # Check expiring batches
    expiry_threshold = (now + timedelta(days=7)).date().isoformat()
    today = now.date().isoformat()

    batches_query = supabase.table("stock_batches").select(
        "*, items(name), locations(name)"
    ).gt("remaining_qty", 0).lte("expiry_date", expiry_threshold)
    if location_id:
        batches_query = batches_query.eq("location_id", location_id)
    batches = batches_query.execute()

    for batch in (batches.data or []):
        item_name = batch.get("items", {}).get("name", "Unknown") if batch.get("items") else "Unknown"
        loc_name = batch.get("locations", {}).get("name", "Unknown") if batch.get("locations") else "Unknown"
        expiry = batch.get("expiry_date")

        if expiry and expiry <= today:
            alert_type = "expired"
            severity = "error"
            title = "Batch Expired"
            message = f"Batch {batch['id'][:8]} of {item_name} has expired"
        else:
            alert_type = "expiring_soon"
            severity = "warning"
            title = "Expiring Soon"
            days_left = (datetime.fromisoformat(expiry) - now).days if expiry else 0
            message = f"Batch {batch['id'][:8]} of {item_name} expires in {days_left} days"

        alerts.append(AlertItem(
            id=f"expiry_{batch['id']}",
            type=alert_type,
            severity=severity,
            title=title,
            message=message,
            item_id=batch["item_id"],
            item_name=item_name,
            location_id=batch["location_id"],
            location_name=loc_name,
            data={
                "batch_id": batch["id"],
                "batch_id_display": batch["id"][:8],
                "remaining_qty": batch["remaining_qty"],
                "expiry_date": expiry
            },
            created_at=now.isoformat()
        ))

    return alerts


@router.get("", response_model=AlertsResponse)
async def get_alerts(
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    user_data: dict = Depends(require_auth)
):
    """Get all active alerts and recently acknowledged ones."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        # Generate alerts
        all_alerts = generate_alerts(supabase, location_id)

        # Get recent acknowledgments (last 3 days)
        three_days_ago = (datetime.now() - timedelta(days=3)).isoformat()
        ack_query = supabase.table("alert_acknowledgments").select("*").gte(
            "acknowledged_at", three_days_ago
        )
        if location_id:
            ack_query = ack_query.eq("location_id", location_id)
        acknowledgments = ack_query.execute()

        # Build set of acknowledged alert keys
        acked_keys = set()
        for ack in (acknowledgments.data or []):
            key = f"{ack['alert_type']}_{ack['location_id']}_{ack['item_id']}"
            acked_keys.add(key)

        # Filter active vs acknowledged
        active_alerts = []
        recently_acked = []

        for alert in all_alerts:
            key = f"{alert.type}_{alert.location_id}_{alert.item_id}"
            if key in acked_keys:
                recently_acked.append(alert)
            else:
                active_alerts.append(alert)

        # Calculate summary
        summary = AlertSummary(
            low_stock_count=sum(1 for a in active_alerts if a.type == "low_stock"),
            reorder_now_count=sum(1 for a in active_alerts if a.type == "reorder_now"),
            expiring_soon_count=sum(1 for a in active_alerts if a.type in ["expiring_soon", "expired"])
        )

        return AlertsResponse(
            summary=summary,
            active_alerts=active_alerts,
            recently_acknowledged=recently_acked
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/acknowledge")
async def acknowledge_alert(request: AcknowledgeAlertRequest, user_data: dict = Depends(require_auth)):
    """Acknowledge an alert."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Create acknowledgment record
        ack_data = {
            "id": str(uuid4()),
            "alert_type": request.alert_type,
            "location_id": request.location_id,
            "item_id": request.item_id,
            "acknowledged_by": user.id,
            "notes": request.notes,
            "acknowledged_at": datetime.now().isoformat()
        }

        supabase.table("alert_acknowledgments").insert(ack_data)

        return {"success": True, "message": "Alert acknowledged"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_alert_summary(
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    user_data: dict = Depends(require_auth)
):
    """Get just the alert counts for dashboard."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        alerts = generate_alerts(supabase, location_id)

        return {
            "low_stock": sum(1 for a in alerts if a.type == "low_stock"),
            "reorder_now": sum(1 for a in alerts if a.type == "reorder_now"),
            "expiring_soon": sum(1 for a in alerts if a.type in ["expiring_soon", "expired"])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
