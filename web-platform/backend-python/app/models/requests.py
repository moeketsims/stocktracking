from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List
from datetime import date


# Auth Requests
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


# Stock Operations Requests
# Note: item_id is optional - if not provided, the system will use the default item (Potatoes)
class ReceiveStockRequest(BaseModel):
    item_id: Optional[str] = None  # Optional - auto-filled with default item
    quantity: float = Field(gt=0)
    unit: Literal["kg", "bag"] = "kg"
    supplier_id: str
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class IssueStockRequest(BaseModel):
    item_id: Optional[str] = None  # Optional - auto-filled with default item
    quantity: float = Field(gt=0)
    unit: Literal["kg", "bag"] = "kg"
    notes: Optional[str] = None


class TransferStockRequest(BaseModel):
    item_id: Optional[str] = None  # Optional - auto-filled with default item
    quantity: float = Field(gt=0)
    unit: Literal["kg", "bag"] = "kg"
    from_location_id: str
    to_location_id: str
    notes: Optional[str] = None


class WasteStockRequest(BaseModel):
    item_id: Optional[str] = None  # Optional - auto-filled with default item
    quantity: float = Field(gt=0)
    unit: Literal["kg", "bag"] = "kg"
    reason: Literal[
        "spoiled",
        "damaged",
        "trim_prep_loss",
        "contaminated",
        "other"
    ]
    notes: Optional[str] = None


# Alert Requests
class AcknowledgeAlertRequest(BaseModel):
    alert_type: Literal["low_stock", "reorder_now", "expiring_soon", "expired"]
    location_id: str
    item_id: str
    notes: Optional[str] = None


# Bag Usage Requests
class LogBagUsageRequest(BaseModel):
    item_id: str
    bag_count: int = Field(default=1, ge=1)


class UndoBagUsageRequest(BaseModel):
    bag_log_id: str


# Report Requests
class DailySummaryRequest(BaseModel):
    period_days: Literal[7, 14, 30] = 7
    location_id: Optional[str] = None


# Notification Requests
class MarkNotificationReadRequest(BaseModel):
    notification_id: str


# Adjustment Requests
class AdjustmentRequest(BaseModel):
    item_id: str
    quantity: float  # Can be positive or negative
    unit: Literal["kg", "bag"] = "kg"
    reason: Literal[
        "count_error",
        "theft",
        "found_stock",
        "damage_write_off",
        "system_correction",
        "other"
    ]
    batch_id: Optional[str] = None
    location_id: Optional[str] = None  # Required for zone_manager/admin if no location in profile
    notes: Optional[str] = None


# Batch Management Requests
class BatchEditRequest(BaseModel):
    quality_score: Optional[int] = None
    expiry_date: Optional[date] = None
    quality_notes: Optional[str] = None
    defect_pct: Optional[float] = None
    status: Optional[str] = None


# Return Stock Requests
class ReturnStockRequest(BaseModel):
    item_id: str
    quantity: float = Field(gt=0)
    unit: Literal["kg", "bag"] = "kg"
    batch_id: Optional[str] = None
    reason: Literal[
        "damaged_delivery",
        "quality_issue",
        "incorrect_order",
        "expired_at_delivery",
        "other"
    ]
    notes: Optional[str] = None


# Vehicle Requests
class CreateVehicleRequest(BaseModel):
    registration_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    capacity_kg: Optional[float] = None
    fuel_type: Optional[str] = None
    notes: Optional[str] = None


class UpdateVehicleRequest(BaseModel):
    registration_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    capacity_kg: Optional[float] = None
    fuel_type: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


# Trip Requests
class CreateTripRequest(BaseModel):
    vehicle_id: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    trip_type: Optional[Literal[
        "supplier_to_warehouse",
        "supplier_to_shop",
        "warehouse_to_shop",
        "shop_to_shop",
        "shop_to_warehouse",
        "other"
    ]] = None
    supplier_id: Optional[str] = None
    from_location_id: Optional[str] = None
    to_location_id: Optional[str] = None
    origin_description: Optional[str] = None
    destination_description: Optional[str] = None
    notes: Optional[str] = None


class UpdateTripRequest(BaseModel):
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    origin_description: Optional[str] = None
    destination_description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    trip_type: Optional[str] = None
    from_location_id: Optional[str] = None
    to_location_id: Optional[str] = None
    supplier_id: Optional[str] = None


class CompleteTripRequest(BaseModel):
    distance_km: Optional[float] = Field(None, ge=0)
    fuel_cost: Optional[float] = Field(None, ge=0)
    fuel_litres: Optional[float] = Field(None, ge=0)
    toll_cost: Optional[float] = Field(None, ge=0)
    other_cost: Optional[float] = Field(None, ge=0)
    other_cost_description: Optional[str] = None
    odometer_start: Optional[float] = Field(None, ge=0)
    odometer_end: Optional[float] = Field(None, ge=0)
    arrival_time: Optional[str] = None
    linked_batch_ids: Optional[List[str]] = None
    notes: Optional[str] = None


# Trip Stop Requests
class TripStopInput(BaseModel):
    location_id: Optional[str] = None
    supplier_id: Optional[str] = None
    stop_type: Literal["pickup", "dropoff"]
    location_name: Optional[str] = None
    planned_qty_kg: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class CreateMultiStopTripRequest(BaseModel):
    vehicle_id: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    notes: Optional[str] = None
    stops: List[TripStopInput] = Field(min_length=2)


class CompleteStopRequest(BaseModel):
    actual_qty_kg: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


# Stock Request Requests (Replenishment Workflow)
class CreateStockRequestRequest(BaseModel):
    location_id: Optional[str] = None  # Optional if user has location_id in profile
    quantity_bags: int = Field(gt=0)
    urgency: Literal["urgent", "normal"] = "normal"
    notes: Optional[str] = None


class AcceptStockRequestRequest(BaseModel):
    pass  # No body needed, uses auth context


class CreateTripFromRequestRequest(BaseModel):
    vehicle_id: str
    driver_id: Optional[str] = None
    supplier_id: str
    notes: Optional[str] = None
    auto_start: bool = True  # Auto-start the trip (skip "planned" status)
    estimated_arrival_time: Optional[str] = None  # ISO datetime string for ETA
    odometer_start: Optional[int] = Field(None, ge=0)  # Starting odometer reading


class CreateTripFromMultipleRequestsRequest(BaseModel):
    """Create a multi-stop trip from multiple stock requests."""
    request_ids: List[str] = Field(min_length=1, description="List of stock request IDs to fulfill")
    vehicle_id: str
    driver_id: Optional[str] = None
    supplier_id: str
    notes: Optional[str] = None
    auto_start: bool = True  # Auto-start the trip (skip "planned" status)
    estimated_arrival_time: Optional[str] = None  # ISO datetime string for ETA


# Pending Delivery Requests
class ConfirmDeliveryRequest(BaseModel):
    confirmed_qty_kg: float = Field(ge=0)
    notes: Optional[str] = None


class RejectDeliveryRequest(BaseModel):
    reason: str


# Cancel Stock Request (with reason)
class CancelStockRequestRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


# Update/Modify Stock Request
class UpdateStockRequestRequest(BaseModel):
    quantity_bags: Optional[int] = Field(None, gt=0)
    urgency: Optional[Literal["urgent", "normal"]] = None
    notes: Optional[str] = None


# Start Trip with ETA
class StartTripRequest(BaseModel):
    estimated_arrival_time: Optional[str] = None  # ISO datetime string


# Fulfill Remaining (partial fulfillment)
class FulfillRemainingRequest(BaseModel):
    vehicle_id: str
    driver_id: Optional[str] = None
    supplier_id: str
    notes: Optional[str] = None


# Driver Closing Km Submission
class SubmitClosingKmRequest(BaseModel):
    closing_km: int = Field(ge=0, description="Closing odometer reading in km")
    notes: Optional[str] = None
