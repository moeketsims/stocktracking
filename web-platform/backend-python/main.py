from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
# Force reload

from app.config import get_settings
from app.scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
from app.routers import (
    auth_router,
    dashboard_router,
    stock_router,
    transactions_router,
    alerts_router,
    batches_router,
    analytics_router,
    reports_router,
    zone_router,
    notifications_router,
    settings_router,
    reference_router,
    owner_dashboard_router,
)
from app.routers.adjustments import router as adjustments_router
from app.routers.batch_management import router as batch_management_router
from app.routers.returns import router as returns_router
from app.routers.vehicles import router as vehicles_router
from app.routers.trips import router as trips_router
from app.routers.drivers import router as drivers_router
from app.routers.barcode import router as barcode_router
from app.routers.demo_data import router as demo_data_router
from app.routers.users import router as users_router
from app.routers.invitations import router as invitations_router
from app.routers.stock_requests import router as stock_requests_router
from app.routers.pending_deliveries import router as pending_deliveries_router
from app.routers.locations import router as locations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Potato Stock Tracking API...")
    # Start the background scheduler for automated jobs
    start_scheduler()
    print("Background scheduler started")
    yield
    # Shutdown
    print("Shutting down...")
    shutdown_scheduler()
    print("Background scheduler stopped")


app = FastAPI(
    title="Potato Stock Tracking API",
    description="Backend API for the Potato Stock Tracking Web Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "potato-stock-api"}


# Debug endpoint to check transactions
@app.get("/debug/transactions", tags=["Debug"])
async def debug_all_transactions():
    """Debug: Get all transactions without auth."""
    from app.config import get_supabase_admin_client
    print("[DEBUG] Checking all transactions in database", flush=True)
    supabase = get_supabase_admin_client()
    result = supabase.table("stock_transactions").select("id, type, location_id_from, location_id_to, qty, created_at").order("created_at", desc=True).limit(20).execute()
    print(f"[DEBUG] Found {len(result.data or [])} transactions", flush=True)
    return {"count": len(result.data or []), "transactions": result.data}


@app.get("/debug/test-query/{location_id}", tags=["Debug"])
async def debug_test_query(location_id: str):
    """Debug: Test the exact query used by transactions API."""
    from app.config import get_supabase_admin_client
    print(f"[DEBUG-TEST] Testing query for location: {location_id}", flush=True)
    supabase = get_supabase_admin_client()

    # Query FROM this location
    result_from = supabase.table("stock_transactions").select("*").eq(
        "location_id_from", location_id
    ).order("created_at", desc=True).limit(10).execute()

    # Query TO this location
    result_to = supabase.table("stock_transactions").select("*").eq(
        "location_id_to", location_id
    ).order("created_at", desc=True).limit(10).execute()

    print(f"[DEBUG-TEST] FROM: {len(result_from.data or [])}, TO: {len(result_to.data or [])}", flush=True)

    return {
        "location_id": location_id,
        "from_count": len(result_from.data or []),
        "to_count": len(result_to.data or []),
        "from_transactions": result_from.data[:3] if result_from.data else [],
        "to_transactions": result_to.data[:3] if result_to.data else []
    }


@app.get("/debug/transactions/{location_id}", tags=["Debug"])
async def debug_location_transactions(location_id: str):
    """Debug: Check transactions for a specific location (mimics the API query)."""
    from app.config import get_supabase_admin_client
    print(f"[DEBUG] Checking transactions for location: {location_id}", flush=True)
    supabase = get_supabase_admin_client()

    # Query FROM this location (issues, waste, transfers out)
    result_from = supabase.table("stock_transactions").select(
        "id, type, location_id_from, location_id_to, qty, created_at"
    ).eq("location_id_from", location_id).order("created_at", desc=True).limit(50).execute()

    # Query TO this location (receives, returns, transfers in)
    result_to = supabase.table("stock_transactions").select(
        "id, type, location_id_from, location_id_to, qty, created_at"
    ).eq("location_id_to", location_id).order("created_at", desc=True).limit(50).execute()

    from_data = result_from.data or []
    to_data = result_to.data or []

    # Combine and deduplicate
    combined = {t["id"]: t for t in from_data}
    for t in to_data:
        combined[t["id"]] = t

    all_transactions = list(combined.values())
    all_transactions.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    # Count by type
    issues = [t for t in all_transactions if t["type"] == "issue"]
    returns = [t for t in all_transactions if t["type"] == "return"]
    receives = [t for t in all_transactions if t["type"] == "receive"]

    print(f"[DEBUG] Found: {len(from_data)} from-transactions, {len(to_data)} to-transactions", flush=True)
    print(f"[DEBUG] Total unique: {len(all_transactions)}, Issues: {len(issues)}, Returns: {len(returns)}, Receives: {len(receives)}", flush=True)

    return {
        "location_id": location_id,
        "from_count": len(from_data),
        "to_count": len(to_data),
        "total_unique": len(all_transactions),
        "issues_count": len(issues),
        "returns_count": len(returns),
        "receives_count": len(receives),
        "transactions": all_transactions[:20]  # Return first 20
    }


@app.get("/debug/user/{user_id}", tags=["Debug"])
async def debug_user_profile(user_id: str):
    """Debug: Check user profile and their location."""
    from app.config import get_supabase_admin_client
    supabase = get_supabase_admin_client()

    profile = supabase.table("profiles").select("*").eq("user_id", user_id).single().execute()

    if not profile.data:
        return {"error": "Profile not found", "user_id": user_id}

    location_id = profile.data.get("location_id")

    return {
        "user_id": user_id,
        "profile": profile.data,
        "location_id": location_id,
        "has_location": location_id is not None
    }


# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(stock_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(batches_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(zone_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(reference_router, prefix="/api")
app.include_router(owner_dashboard_router, prefix="/api")
app.include_router(adjustments_router, prefix="/api")
app.include_router(batch_management_router, prefix="/api")
app.include_router(returns_router, prefix="/api")
app.include_router(vehicles_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(drivers_router, prefix="/api")
app.include_router(barcode_router, prefix="/api")
app.include_router(demo_data_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(invitations_router, prefix="/api")
app.include_router(stock_requests_router, prefix="/api")
app.include_router(pending_deliveries_router, prefix="/api")
app.include_router(locations_router, prefix="/api")


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True
    )
