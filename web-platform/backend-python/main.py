from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.config import get_settings
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Potato Stock Tracking API...")
    yield
    # Shutdown
    print("Shutting down...")


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


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True
    )
