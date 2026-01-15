from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Literal
from datetime import datetime, timedelta
from ..config import get_supabase_admin_client
from ..routers.auth import require_manager
from ..models.responses import (
    DailySummaryResponse,
    DailySummaryItem,
    PeriodTotals,
    SupplierQualityResponse,
    SupplierQualityItem
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/daily-summary", response_model=DailySummaryResponse)
async def get_daily_summary(
    period_days: Literal[7, 14, 30] = 7,
    user_data: dict = Depends(require_manager)
):
    """Get daily summary report - managers only."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]
    profile = user_data.get("profile", {})

    try:
        location_id = profile.get("location_id")
        start_date = (datetime.now() - timedelta(days=period_days)).date()

        daily_breakdown = []
        totals = {"received": 0, "issued": 0, "wasted": 0}

        for i in range(period_days):
            date = (start_date + timedelta(days=i+1))
            date_str = date.isoformat()
            day_start = f"{date_str}T00:00:00"
            day_end = f"{date_str}T23:59:59"

            # Get transactions for this day
            tx_query = supabase.table("stock_transactions").select(
                "type, qty"
            ).gte("created_at", day_start).lte("created_at", day_end)

            if location_id:
                tx_query = tx_query.eq("location_id_from", location_id)

            tx_data = tx_query.execute()

            received = sum(t["qty"] for t in (tx_data.data or []) if t["type"] == "receive")
            issued = sum(t["qty"] for t in (tx_data.data or []) if t["type"] == "issue")
            wasted = sum(t["qty"] for t in (tx_data.data or []) if t["type"] == "waste")
            net = received - issued - wasted

            totals["received"] += received
            totals["issued"] += issued
            totals["wasted"] += wasted

            daily_breakdown.append(DailySummaryItem(
                date=date_str,
                received_kg=round(received, 2),
                issued_kg=round(issued, 2),
                wasted_kg=round(wasted, 2),
                net_change=round(net, 2)
            ))

        period_totals = PeriodTotals(
            total_received=round(totals["received"], 2),
            total_issued=round(totals["issued"], 2),
            total_wasted=round(totals["wasted"], 2),
            net_change=round(totals["received"] - totals["issued"] - totals["wasted"], 2)
        )

        return DailySummaryResponse(
            period_totals=period_totals,
            daily_breakdown=daily_breakdown
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier-quality", response_model=SupplierQualityResponse)
async def get_supplier_quality(user_data: dict = Depends(require_manager)):
    """Get supplier quality metrics - managers only."""
    supabase = get_supabase_admin_client()
    profile = user_data.get("profile", {})

    try:
        location_id = profile.get("location_id")

        # Get all batches with supplier info
        batches_query = supabase.table("stock_batches").select(
            "supplier_id, quality_score, defect_pct, suppliers(name)"
        )
        if location_id:
            batches_query = batches_query.eq("location_id", location_id)

        batches = batches_query.execute()

        # Aggregate by supplier
        supplier_stats = {}
        for batch in (batches.data or []):
            supplier_id = batch["supplier_id"]
            if supplier_id not in supplier_stats:
                supplier_name = "Unknown"
                if batch.get("suppliers"):
                    supplier_name = batch["suppliers"].get("name", "Unknown")

                supplier_stats[supplier_id] = {
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "deliveries": [],
                    "quality_scores": [],
                    "defect_pcts": []
                }

            supplier_stats[supplier_id]["deliveries"].append(batch)
            supplier_stats[supplier_id]["quality_scores"].append(batch["quality_score"])
            if batch.get("defect_pct") is not None:
                supplier_stats[supplier_id]["defect_pcts"].append(batch["defect_pct"])

        # Calculate metrics
        suppliers = []
        for supplier_id, stats in supplier_stats.items():
            delivery_count = len(stats["deliveries"])
            scores = stats["quality_scores"]
            defects = stats["defect_pcts"]

            avg_quality = sum(scores) / len(scores) if scores else 0
            avg_defect = sum(defects) / len(defects) if defects else 0

            # Calculate quality breakdown
            good = sum(1 for s in scores if s == 1)
            ok = sum(1 for s in scores if s == 2)
            poor = sum(1 for s in scores if s == 3)
            total = len(scores)

            quality_breakdown = {
                "good": round((good / total) * 100, 1) if total > 0 else 0,
                "ok": round((ok / total) * 100, 1) if total > 0 else 0,
                "poor": round((poor / total) * 100, 1) if total > 0 else 0
            }

            # Determine trend (compare first half to second half)
            if len(scores) >= 4:
                first_half_avg = sum(scores[:len(scores)//2]) / (len(scores)//2)
                second_half_avg = sum(scores[len(scores)//2:]) / (len(scores) - len(scores)//2)

                if second_half_avg < first_half_avg - 0.2:
                    trend = "improving"
                elif second_half_avg > first_half_avg + 0.2:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "stable"

            suppliers.append(SupplierQualityItem(
                supplier_id=supplier_id,
                supplier_name=stats["supplier_name"],
                delivery_count=delivery_count,
                avg_quality_score=round(avg_quality, 2),
                avg_defect_pct=round(avg_defect, 2),
                quality_trend=trend,
                needs_review=(avg_quality > 2.0),
                quality_breakdown=quality_breakdown
            ))

        # Sort by average quality (best first)
        suppliers.sort(key=lambda s: s.avg_quality_score)

        return SupplierQualityResponse(suppliers=suppliers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/daily-summary")
async def export_daily_summary_csv(
    period_days: Literal[7, 14, 30] = 7,
    user_data: dict = Depends(require_manager)
):
    """Export daily summary as CSV data."""
    from fastapi.responses import Response

    try:
        # Get the data
        summary = await get_daily_summary(period_days, user_data)

        # Build CSV
        lines = ["Date,Received (kg),Issued (kg),Wasted (kg),Net Change (kg)"]
        for item in summary.daily_breakdown:
            lines.append(
                f"{item.date},{item.received_kg},{item.issued_kg},{item.wasted_kg},{item.net_change}"
            )

        # Add totals
        lines.append("")
        lines.append(
            f"TOTALS,{summary.period_totals.total_received},"
            f"{summary.period_totals.total_issued},{summary.period_totals.total_wasted},"
            f"{summary.period_totals.net_change}"
        )

        csv_content = "\n".join(lines)

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=daily_summary_{period_days}d.csv"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
