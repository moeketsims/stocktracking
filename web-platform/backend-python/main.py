from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
import os
# Force reload v4

from app.config import get_settings
from app.scheduler import start_scheduler, shutdown_scheduler

# Environment check for development-only features
IS_DEVELOPMENT = os.environ.get("ENVIRONMENT", "production").lower() == "development"

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
from app.routers.users import router as users_router

# Conditionally import demo router only in development
if IS_DEVELOPMENT:
    from app.routers.demo_data import router as demo_data_router
from app.routers.invitations import router as invitations_router
from app.routers.stock_requests import router as stock_requests_router
from app.routers.pending_deliveries import router as pending_deliveries_router
from app.routers.locations import router as locations_router
from app.routers.loans import router as loans_router


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Potato Stock Tracking API...")
    # Start the background scheduler for automated jobs
    start_scheduler()
    logger.info("Background scheduler started")
    yield
    # Shutdown
    logger.info("Shutting down...")
    shutdown_scheduler()
    logger.info("Background scheduler stopped")


app = FastAPI(
    title="Potato Stock Tracking API",
    description="Backend API for the Potato Stock Tracking Web Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - configure allowed origins
settings = get_settings()
cors_origins = settings.cors_origins.split(",") if settings.cors_origins else ["http://localhost:5173"]
# Strip whitespace from origins
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check with database connectivity verification
@app.get("/health", tags=["Health"])
async def health_check():
    from app.config import get_supabase_client
    try:
        # Verify Supabase connectivity
        supabase = get_supabase_client()
        supabase.table("locations").select("id").limit(1).execute()
        return {"status": "ok", "service": "potato-stock-api", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check database connection failed: {e}")
        return {"status": "degraded", "service": "potato-stock-api", "database": "error"}


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
# Only include demo router in development environment
if IS_DEVELOPMENT:
    app.include_router(demo_data_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(invitations_router, prefix="/api")
app.include_router(stock_requests_router, prefix="/api")
app.include_router(pending_deliveries_router, prefix="/api")
app.include_router(locations_router, prefix="/api")
app.include_router(loans_router, prefix="/api")


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=IS_DEVELOPMENT  # Only enable hot reload in development
    )
