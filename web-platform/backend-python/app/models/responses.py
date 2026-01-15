from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# Auth Responses
class UserProfile(BaseModel):
    id: str
    user_id: str
    email: str
    role: str
    zone_id: Optional[str] = None
    location_id: Optional[str] = None
    full_name: Optional[str] = None
    zone_name: Optional[str] = None
    location_name: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfile


class AuthStatusResponse(BaseModel):
    authenticated: bool
    user: Optional[UserProfile] = None


# Dashboard Responses
class DashboardStats(BaseModel):
    total_stock_kg: float
    total_stock_bags: float = 0.0  # Bag equivalent (kg / 10)
    received_today_kg: float
    received_today_bags: float = 0.0  # Bag equivalent
    issued_today_kg: float
    issued_today_bags: float = 0.0  # Bag equivalent
    wasted_today_kg: float
    wasted_today_bags: float = 0.0  # Bag equivalent
    active_batches: int
    low_stock_alerts: int
    reorder_alerts: int
    expiring_soon_alerts: int


class ForecastData(BaseModel):
    avg_daily_usage: float
    avg_daily_usage_bags: float = 0.0  # Bag equivalent
    days_of_cover: float
    stock_out_date: Optional[str] = None
    reorder_by_date: Optional[str] = None
    lead_time_days: int = 1  # Supplier lead time for delivery
    safety_stock_qty: float
    safety_stock_qty_bags: float = 0.0  # Bag equivalent
    reorder_point_qty: float
    reorder_point_qty_bags: float = 0.0  # Bag equivalent
    suggested_order_qty: float
    suggested_order_qty_bags: float = 0.0  # Bag equivalent


class DashboardResponse(BaseModel):
    stats: DashboardStats
    forecast: ForecastData
    stock_balance: List[Any]


# Stock Responses
class StockOverview(BaseModel):
    item_id: str
    item_name: str
    sku: str
    on_hand_qty: float
    on_hand_bags: float = 0.0  # Bag equivalent (kg / 10)
    unit: str
    status: str  # "in_stock", "low", "out"
    active_batch_count: int


class BatchInfo(BaseModel):
    id: str
    batch_id_display: str
    supplier_name: str
    received_at: str
    expiry_date: Optional[str] = None
    initial_qty: float
    initial_qty_bags: float = 0.0  # Bag equivalent
    remaining_qty: float
    remaining_qty_bags: float = 0.0  # Bag equivalent
    quality_score: int
    defect_pct: Optional[float] = None
    is_oldest: bool = False


class FIFOSuggestion(BaseModel):
    batch_id: str
    batch_id_display: str
    received_at: str
    remaining_qty: float
    remaining_qty_bags: float = 0.0  # Bag equivalent


class StockScreenResponse(BaseModel):
    overview: List[StockOverview]
    active_batches: List[BatchInfo]
    fifo_suggestion: Optional[FIFOSuggestion] = None


# Transaction Responses
class TransactionItem(BaseModel):
    id: str
    type: str
    created_at: str
    quantity: float
    unit: str
    item_name: str
    batch_id: Optional[str] = None
    notes: Optional[str] = None
    location_from: Optional[str] = None
    location_to: Optional[str] = None
    created_by_name: str


class TransactionsResponse(BaseModel):
    transactions: List[TransactionItem]
    total: int


# Alert Responses
class AlertItem(BaseModel):
    id: str
    type: str  # "low_stock", "reorder_now", "expiring_soon", "expired"
    severity: str  # "error", "warning", "info"
    title: str
    message: str
    item_id: str
    item_name: str
    location_id: str
    location_name: str
    data: dict  # Additional data based on alert type
    created_at: str


class AlertSummary(BaseModel):
    low_stock_count: int
    reorder_now_count: int
    expiring_soon_count: int


class AlertsResponse(BaseModel):
    summary: AlertSummary
    active_alerts: List[AlertItem]
    recently_acknowledged: List[AlertItem]


# Analytics Responses
class DailyUsagePoint(BaseModel):
    date: str
    bags_used: int
    kg_used: float


class HourlyUsagePoint(BaseModel):
    hour: int
    bags_used: int


class AnalyticsSummary(BaseModel):
    total_bags_7_days: int
    daily_average: float
    trend_pct: float
    trend_direction: str  # "up", "down", "stable"


class TransactionBreakdownPoint(BaseModel):
    date: str
    received_kg: float
    received_bags: float
    issued_kg: float
    issued_bags: float
    wasted_kg: float
    wasted_bags: float


class WasteBreakdownItem(BaseModel):
    reason: str
    qty_kg: float
    qty_bags: float
    percentage: float
    display_name: str  # Human-readable name


class WasteSummary(BaseModel):
    total_wasted_kg: float
    total_wasted_bags: float
    total_received_kg: float
    waste_rate_pct: float  # (wasted / received) * 100
    breakdown: List[WasteBreakdownItem]


class AnalyticsResponse(BaseModel):
    summary: AnalyticsSummary
    daily_usage: List[DailyUsagePoint]
    hourly_pattern: List[HourlyUsagePoint]
    transaction_breakdown: List[TransactionBreakdownPoint] = []
    waste_analysis: Optional[WasteSummary] = None
    peak_day: Optional[str] = None
    peak_day_bags: int = 0


# Shop Efficiency Responses
class LocationEfficiency(BaseModel):
    location_id: str
    location_name: str
    location_type: str  # "shop" or "warehouse"
    waste_rate_pct: float  # (wasted / received) * 100
    usage_rate_pct: float  # (issued / avg_stock) * 100 - how much stock was used
    current_stock_kg: float
    current_stock_bags: float
    total_received_kg: float
    total_issued_kg: float
    total_wasted_kg: float
    efficiency_score: float  # 0-100 composite score
    rank: int  # Rank among all locations


class ShopEfficiencyResponse(BaseModel):
    period_days: int
    locations: List[LocationEfficiency]
    best_performer: Optional[str] = None
    worst_performer: Optional[str] = None
    avg_waste_rate: float
    avg_usage_rate: float


# Usage Comparison Responses (for historical comparison charts)
class HourlyDataPoint(BaseModel):
    hour: int  # 0-23
    bags_used: float
    kg_used: float


class DailyDataPoint(BaseModel):
    day: str  # Day name (Mon, Tue, etc.) or date
    day_index: int  # 0-6 for day of week
    bags_used: float
    kg_used: float


class MonthlyDataPoint(BaseModel):
    month: str  # Month name or YYYY-MM
    month_index: int  # 1-12
    bags_used: float
    kg_used: float


class PeriodData(BaseModel):
    label: str  # "Today", "Yesterday", "Last Week", etc.
    data: List[Any]  # HourlyDataPoint, DailyDataPoint, or MonthlyDataPoint


class UsageComparisonResponse(BaseModel):
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    chart_type: str  # "hourly", "daily", "monthly"
    periods: List[PeriodData]


# Report Responses
class DailySummaryItem(BaseModel):
    date: str
    received_kg: float
    issued_kg: float
    wasted_kg: float
    net_change: float


class PeriodTotals(BaseModel):
    total_received: float
    total_issued: float
    total_wasted: float
    net_change: float


class DailySummaryResponse(BaseModel):
    period_totals: PeriodTotals
    daily_breakdown: List[DailySummaryItem]


class SupplierQualityItem(BaseModel):
    supplier_id: str
    supplier_name: str
    delivery_count: int
    avg_quality_score: float
    avg_defect_pct: float
    quality_trend: str  # "improving", "declining", "stable"
    needs_review: bool
    quality_breakdown: dict  # {"good": %, "ok": %, "poor": %}


class SupplierQualityResponse(BaseModel):
    suppliers: List[SupplierQualityItem]


# Zone Overview Responses
class LocationStatus(BaseModel):
    location_id: str
    location_name: str
    location_type: str
    on_hand_qty: float
    on_hand_bags: float = 0.0  # Bag equivalent (kg / 10)
    days_of_cover: float
    avg_daily_usage: float
    avg_daily_usage_bags: float = 0.0  # Bag equivalent
    status: str  # "ok", "low_stock", "reorder"


class ReallocationSuggestion(BaseModel):
    from_location_id: str
    from_location_name: str
    to_location_id: str
    to_location_name: str
    quantity: float
    quantity_bags: float = 0.0  # Bag equivalent
    reason: str


class ZoneOverviewResponse(BaseModel):
    zone_id: str
    zone_name: str
    total_kg: float
    total_bags: float = 0.0  # Bag equivalent (kg / 10)
    shop_count: int
    low_stock_count: int
    warehouse: Optional[LocationStatus] = None
    shops: List[LocationStatus]
    reallocation_suggestions: List[ReallocationSuggestion]


# Owner Dashboard Responses
class ShopDailyActivity(BaseModel):
    received_bags: int
    issued_bags: int
    wasted_bags: int
    received_kg: float  # Optional detail
    issued_kg: float  # Optional detail
    wasted_kg: float  # Optional detail


class ShopAlertSummary(BaseModel):
    low_stock_count: int
    reorder_count: int
    expiring_soon_count: int
    total_alerts: int


class ShopDailyStatus(BaseModel):
    location_id: str
    location_name: str
    location_type: str  # 'shop' or 'warehouse'
    total_stock_bags: int  # Primary unit
    total_stock_kg: float  # Secondary/optional
    activity: ShopDailyActivity
    alerts: ShopAlertSummary
    status: str  # 'healthy', 'warning', 'critical'


class OwnerDashboardResponse(BaseModel):
    generated_at: str
    date: str
    total_stock_bags: int  # Primary unit
    total_stock_kg: float  # Secondary/optional
    total_received_bags: int
    total_issued_bags: int
    total_wasted_bags: int
    total_alerts: int
    shops: List[ShopDailyStatus]
    warehouse: Optional[ShopDailyStatus] = None


# Notification Responses
class NotificationItem(BaseModel):
    id: str
    notification_type: str
    title: str
    body: str
    is_read: bool
    created_at: str
    data: dict


class NotificationsResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count: int


# Settings Response
class UserSettingsResponse(BaseModel):
    profile: UserProfile
    preferences: dict


# Generic Responses
class SuccessResponse(BaseModel):
    success: bool
    message: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
