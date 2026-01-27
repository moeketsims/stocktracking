from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager
from ..models.responses import (
    ZoneOverviewResponse,
    LocationStatus,
    ReallocationSuggestion
)
from ..utils.conversion import kg_to_bags

router = APIRouter(prefix="/zone", tags=["Zone Overview"])


@router.get("/overview", response_model=ZoneOverviewResponse)
async def get_zone_overview(user_data: dict = Depends(require_manager)):
    """Get zone overview with all locations - managers only."""
    supabase = get_supabase_admin_client()
    profile = user_data.get("profile", {})

    try:
        zone_id = profile.get("zone_id")

        if not zone_id:
            raise HTTPException(status_code=400, detail="User has no assigned zone")

        # Get zone info
        zone = supabase.table("zones").select("*").eq("id", zone_id).single().execute()

        if not zone.data:
            raise HTTPException(status_code=404, detail="Zone not found")

        # Get all locations in zone (including thresholds)
        locations = supabase.table("locations").select(
            "*, critical_stock_threshold, low_stock_threshold"
        ).eq("zone_id", zone_id).execute()

        # Get stock balance for all locations
        balance = supabase.table("stock_balance").select("*").execute()
        balance_map = {}
        for b in (balance.data or []):
            if b["location_id"] not in balance_map:
                balance_map[b["location_id"]] = 0
            balance_map[b["location_id"]] += b.get("on_hand_qty", 0)

        # Calculate average daily usage per location
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        usage_data = supabase.table("stock_transactions").select(
            "location_id_from, qty"
        ).eq("type", "issue").gte("created_at", week_ago).execute()

        usage_map = {}
        for tx in (usage_data.data or []):
            loc_id = tx.get("location_id_from")
            if loc_id:
                if loc_id not in usage_map:
                    usage_map[loc_id] = 0
                usage_map[loc_id] += tx["qty"]

        # Build location status list
        warehouse = None
        shops = []
        total_kg = 0
        low_stock_count = 0

        for loc in (locations.data or []):
            on_hand = balance_map.get(loc["id"], 0)
            total_usage = usage_map.get(loc["id"], 0)
            avg_daily = total_usage / 7 if total_usage > 0 else 0
            days_of_cover = on_hand / avg_daily if avg_daily > 0 else 999

            # Get location-specific thresholds (or use defaults)
            critical_threshold = loc.get("critical_stock_threshold") or 20
            low_threshold = loc.get("low_stock_threshold") or 50

            # Determine status based on location thresholds
            if on_hand < critical_threshold:
                status = "low_stock"
                low_stock_count += 1
            elif on_hand < low_threshold:
                status = "reorder"
            else:
                status = "ok"

            total_kg += on_hand

            loc_status = LocationStatus(
                location_id=loc["id"],
                location_name=loc["name"],
                location_type=loc["type"],
                on_hand_qty=round(on_hand, 2),
                on_hand_bags=kg_to_bags(on_hand),
                days_of_cover=round(min(days_of_cover, 999), 1),
                avg_daily_usage=round(avg_daily, 2),
                avg_daily_usage_bags=kg_to_bags(avg_daily),
                status=status
            )

            if loc["type"] == "warehouse":
                warehouse = loc_status
            else:
                shops.append(loc_status)

        # Generate reallocation suggestions
        suggestions = []

        # Build location threshold lookup for reallocation calculations
        location_thresholds = {
            loc["id"]: {
                "critical": loc.get("critical_stock_threshold") or 20,
                "low": loc.get("low_stock_threshold") or 50
            }
            for loc in (locations.data or [])
        }

        # Find shops with excess and shops in need
        if warehouse:
            for shop in shops:
                shop_thresholds = location_thresholds.get(shop.location_id, {"critical": 20, "low": 50})
                if shop.status == "low_stock" and warehouse.on_hand_qty > 100:
                    needed = shop_thresholds["low"] - shop.on_hand_qty
                    if needed > 0 and warehouse.on_hand_qty > needed:
                        transfer_qty = round(min(needed, shop_thresholds["low"]), 2)
                        suggestions.append(ReallocationSuggestion(
                            from_location_id=warehouse.location_id,
                            from_location_name=warehouse.location_name,
                            to_location_id=shop.location_id,
                            to_location_name=shop.location_name,
                            quantity=transfer_qty,
                            quantity_bags=kg_to_bags(transfer_qty),
                            reason=f"{shop.location_name} is low on stock"
                        ))

        # Also check for imbalanced shops
        high_stock_shops = [s for s in shops if s.on_hand_qty > 100]
        low_stock_shops = [s for s in shops if s.status == "low_stock"]

        for high_shop in high_stock_shops:
            for low_shop in low_stock_shops:
                if high_shop.location_id != low_shop.location_id:
                    low_shop_thresholds = location_thresholds.get(low_shop.location_id, {"critical": 20, "low": 50})
                    excess = high_shop.on_hand_qty - 80
                    needed = low_shop_thresholds["low"] - low_shop.on_hand_qty
                    transfer_amount = min(excess, needed)

                    if transfer_amount > 10:
                        transfer_qty = round(transfer_amount, 2)
                        suggestions.append(ReallocationSuggestion(
                            from_location_id=high_shop.location_id,
                            from_location_name=high_shop.location_name,
                            to_location_id=low_shop.location_id,
                            to_location_name=low_shop.location_name,
                            quantity=transfer_qty,
                            quantity_bags=kg_to_bags(transfer_qty),
                            reason=f"Balance stock between {high_shop.location_name} and {low_shop.location_name}"
                        ))
                        break

        return ZoneOverviewResponse(
            zone_id=zone_id,
            zone_name=zone.data["name"],
            total_kg=round(total_kg, 2),
            total_bags=kg_to_bags(total_kg),
            shop_count=len(shops),
            low_stock_count=low_stock_count,
            warehouse=warehouse,
            shops=shops,
            reallocation_suggestions=suggestions[:5]  # Limit to 5 suggestions
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations")
async def get_zone_locations(user_data: dict = Depends(require_manager)):
    """Get all locations in user's zone."""
    supabase = get_supabase_admin_client()
    profile = user_data.get("profile", {})

    try:
        zone_id = profile.get("zone_id")

        if not zone_id:
            raise HTTPException(status_code=400, detail="User has no assigned zone")

        locations = supabase.table("locations").select("*").eq(
            "zone_id", zone_id
        ).order("type", desc=True).order("name").execute()

        return {"locations": locations.data or []}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
