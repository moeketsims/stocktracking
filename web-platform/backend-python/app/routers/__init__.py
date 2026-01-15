from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .stock import router as stock_router
from .transactions import router as transactions_router
from .alerts import router as alerts_router
from .batches import router as batches_router
from .analytics import router as analytics_router
from .reports import router as reports_router
from .zone import router as zone_router
from .notifications import router as notifications_router
from .settings import router as settings_router
from .reference import router as reference_router
from .owner_dashboard import router as owner_dashboard_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "stock_router",
    "transactions_router",
    "alerts_router",
    "batches_router",
    "analytics_router",
    "reports_router",
    "zone_router",
    "notifications_router",
    "settings_router",
    "reference_router",
    "owner_dashboard_router",
]
