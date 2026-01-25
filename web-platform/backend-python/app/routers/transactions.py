from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Literal
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth, get_view_location_id
from ..models.responses import TransactionsResponse, TransactionItem

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=TransactionsResponse)
async def get_transactions(
    type_filter: Optional[Literal["all", "receive", "issue", "return", "transfer", "waste"]] = "all",
    view_location_id: Optional[str] = Query(None, description="Location ID to view (location_manager can view other shops read-only)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_data: dict = Depends(require_auth)
):
    """Get transaction history with optional type filter."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get user profile for location filter
        profile = supabase.table("profiles").select("*").eq(
            "user_id", user.id
        ).single().execute()

        # Get effective location for viewing (location_manager can view other shops)
        location_id = get_view_location_id(profile.data, view_location_id) if profile.data else None

        print(f"[TRANSACTIONS] Fetching transactions for user {user.id}, location_id={location_id}, view_location_id={view_location_id}, type_filter={type_filter}")

        # Build base query
        select_fields = "*, items(name), profiles!stock_transactions_created_by_fkey(full_name)"

        # Apply location filter - fetch both from and to transactions
        if location_id:
            # Fetch transactions FROM this location (issues, waste, transfers out)
            query_from = supabase.table("stock_transactions").select(select_fields)
            if type_filter and type_filter != "all":
                query_from = query_from.eq("type", type_filter)
            query_from = query_from.eq("location_id_from", location_id)
            result_from = query_from.order("created_at", desc=True).limit(limit).execute()

            # Fetch transactions TO this location (receives, returns, transfers in)
            query_to = supabase.table("stock_transactions").select(select_fields)
            if type_filter and type_filter != "all":
                query_to = query_to.eq("type", type_filter)
            query_to = query_to.eq("location_id_to", location_id)
            result_to = query_to.order("created_at", desc=True).limit(limit).execute()

            # Combine and deduplicate by id
            combined = {t["id"]: t for t in (result_from.data or [])}
            for t in (result_to.data or []):
                combined[t["id"]] = t
            all_data = list(combined.values())

            print(f"[TRANSACTIONS] Found {len(result_from.data or [])} from-transactions, {len(result_to.data or [])} to-transactions, {len(all_data)} total unique")

            # Sort by created_at descending
            all_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        else:
            query = supabase.table("stock_transactions").select(select_fields)
            if type_filter and type_filter != "all":
                query = query.eq("type", type_filter)
            query = query.order("created_at", desc=True).limit(limit)
            result = query.execute()
            all_data = result.data or []

        # Manual pagination (offset)
        paginated_data = all_data[offset:offset + limit] if offset > 0 else all_data[:limit]

        # Get location names
        locations = supabase.table("locations").select("id, name").execute()
        location_map = {loc["id"]: loc["name"] for loc in (locations.data or [])}

        # Format transactions
        transactions = []
        for t in paginated_data:
            item_name = t.get("items", {}).get("name", "Unknown") if t.get("items") else "Unknown"
            created_by_name = "Unknown"
            if t.get("profiles"):
                created_by_name = t["profiles"].get("full_name") or "Unknown"

            location_from = location_map.get(t.get("location_id_from")) if t.get("location_id_from") else None
            location_to = location_map.get(t.get("location_id_to")) if t.get("location_id_to") else None

            transactions.append(TransactionItem(
                id=t["id"],
                type=t["type"],
                created_at=t["created_at"],
                quantity=t["qty"],
                unit=t["unit"],
                item_name=item_name,
                batch_id=t.get("batch_id"),
                notes=t.get("notes"),
                location_from=location_from,
                location_to=location_to,
                created_by_name=created_by_name
            ))

        return TransactionsResponse(
            transactions=transactions,
            total=len(all_data)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str, user_data: dict = Depends(require_auth)):
    """Get single transaction details."""
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("stock_transactions").select(
            "*, items(name, sku), profiles!stock_transactions_created_by_fkey(full_name), "
            "stock_batches(id, supplier_id, quality_score)"
        ).eq("id", transaction_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Get location names
        locations = supabase.table("locations").select("id, name").execute()
        location_map = {loc["id"]: loc["name"] for loc in (locations.data or [])}

        t = result.data
        return {
            "id": t["id"],
            "type": t["type"],
            "created_at": t["created_at"],
            "quantity": t["qty"],
            "unit": t["unit"],
            "item": t.get("items"),
            "batch": t.get("stock_batches"),
            "notes": t.get("notes"),
            "metadata": t.get("metadata"),
            "location_from": location_map.get(t.get("location_id_from")),
            "location_to": location_map.get(t.get("location_id_to")),
            "created_by": t.get("profiles", {}).get("full_name") if t.get("profiles") else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
