from pydantic import BaseModel
from typing import Optional, Literal, Any
from datetime import datetime


# Enums
UserRole = Literal["admin", "zone_manager", "location_manager", "driver", "staff"]
LocationType = Literal["shop", "warehouse"]
TransactionType = Literal["receive", "issue", "transfer", "waste", "adjustment"]
NotificationType = Literal["bag_used", "threshold_alert", "daily_summary"]
QualityScore = Literal[1, 2, 3]


# Database Models
class Zone(BaseModel):
    id: str
    name: str
    created_at: datetime


class Location(BaseModel):
    id: str
    zone_id: str
    type: LocationType
    name: str
    created_at: datetime


class Item(BaseModel):
    id: str
    sku: str
    name: str
    unit: str
    conversion_factor: float
    created_at: datetime


class Supplier(BaseModel):
    id: str
    name: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    created_at: datetime


class Profile(BaseModel):
    id: str
    user_id: str
    role: UserRole
    zone_id: Optional[str] = None
    location_id: Optional[str] = None
    full_name: Optional[str] = None
    created_at: datetime


class StockBatch(BaseModel):
    id: str
    item_id: str
    location_id: str
    supplier_id: str
    receive_transaction_id: Optional[str] = None
    initial_qty: float
    remaining_qty: float
    received_at: datetime
    expiry_date: Optional[str] = None
    quality_score: int
    defect_pct: Optional[float] = None
    quality_notes: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime


class StockTransaction(BaseModel):
    id: str
    created_at: datetime
    created_by: str
    location_id_from: Optional[str] = None
    location_id_to: Optional[str] = None
    item_id: str
    batch_id: Optional[str] = None
    qty: float
    unit: str
    type: TransactionType
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class ReorderPolicy(BaseModel):
    id: str
    location_id: str
    item_id: str
    safety_stock_qty: float
    reorder_point_qty: float
    preferred_supplier_id: Optional[str] = None
    created_at: datetime


class BagUsageLog(BaseModel):
    id: str
    location_id: str
    item_id: str
    batch_id: Optional[str] = None
    logged_by: str
    bag_count: int
    kg_equivalent: float
    logged_at: datetime
    is_undone: bool
    undone_at: Optional[datetime] = None
    stock_transaction_id: Optional[str] = None
    created_at: datetime


class UsageNotification(BaseModel):
    id: str
    bag_usage_log_id: Optional[str] = None
    recipient_user_id: str
    notification_type: NotificationType
    title: str
    body: str
    data: dict
    is_sent: bool
    sent_at: Optional[datetime] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class DailyUsageSummary(BaseModel):
    id: str
    location_id: str
    item_id: str
    summary_date: str
    total_bags_used: int
    total_kg_used: float
    bags_remaining: Optional[int] = None
    kg_remaining: Optional[float] = None
    usage_vs_yesterday_pct: Optional[float] = None
    avg_bags_per_hour: Optional[float] = None
    peak_usage_hour: Optional[int] = None
    first_log_at: Optional[datetime] = None
    last_log_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# View Models
class StockBalance(BaseModel):
    location_id: str
    item_id: str
    on_hand_qty: float
    location_name: Optional[str] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None


class TodayBagUsage(BaseModel):
    location_id: str
    item_id: str
    bags_used_today: int
    kg_used_today: float
    log_count: int
    last_logged_at: Optional[datetime] = None
    first_logged_at: Optional[datetime] = None


class BagUsageStats(BaseModel):
    location_id: str
    item_id: str
    item_name: str
    conversion_factor: float
    kg_remaining: float
    bags_remaining: float
    bags_used_today: int
    kg_used_today: float
    last_logged_at: Optional[datetime] = None
    bags_used_yesterday: int
    usage_vs_yesterday_pct: Optional[float] = None
