// Enums
export type UserRole = 'admin' | 'zone_manager' | 'location_manager' | 'vehicle_manager' | 'driver' | 'staff';
export type LocationType = 'shop' | 'warehouse';
export type TransactionType = 'receive' | 'issue' | 'return' | 'transfer' | 'waste' | 'adjustment';
export type NotificationType = 'bag_used' | 'threshold_alert' | 'daily_summary';
export type QualityScore = 1 | 2 | 3;
export type WasteReason = 'spoiled' | 'damaged' | 'trim_prep_loss' | 'contaminated' | 'other';
export type AlertType = 'low_stock' | 'reorder_now' | 'expiring_soon' | 'expired';
export type TripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'supplier_to_warehouse' | 'supplier_to_shop' | 'warehouse_to_shop' | 'shop_to_shop' | 'shop_to_warehouse' | 'other' | 'loan_pickup' | 'loan_return';
export type StopType = 'pickup' | 'dropoff';
export type StockRequestStatus = 'pending' | 'accepted' | 'trip_created' | 'in_delivery' | 'fulfilled' | 'delivered' | 'cancelled' | 'partially_fulfilled' | 'expired' | 'time_proposed';
export type StockRequestUrgency = 'urgent' | 'normal';
export type PendingDeliveryStatus = 'pending' | 'confirmed' | 'rejected';
export type LoanStatus =
  | 'pending' | 'accepted' | 'rejected' | 'confirmed'
  | 'in_transit' | 'collected' | 'active'
  | 'return_initiated' | 'return_assigned' | 'return_in_progress' | 'return_in_transit'
  | 'completed' | 'overdue';
export type BagStatus = 'registered' | 'issued' | 'wasted' | 'returned';

// Auth Types
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: UserRole;
  zone_id: string | null;
  location_id: string | null;
  full_name: string | null;
  zone_name: string | null;
  location_name: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

// Dashboard Types
export interface DashboardStats {
  total_stock_kg: number;
  received_today_kg: number;
  issued_today_kg: number;
  wasted_today_kg: number;
  active_batches: number;
  low_stock_alerts: number;
  reorder_alerts: number;
  expiring_soon_alerts: number;
}

export interface ForecastData {
  avg_daily_usage: number;
  days_of_cover: number;
  stock_out_date: string | null;
  reorder_by_date: string | null;
  safety_stock_qty: number;
  reorder_point_qty: number;
  suggested_order_qty: number;
}

export interface StockBalanceItem {
  location_id: string;
  item_id: string;
  on_hand_qty: number;
  on_hand_bags?: number;
  location_name: string;
  item_name: string;
  unit: string;
  critical_threshold?: number;
  low_threshold?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  forecast: ForecastData;
  stock_balance: StockBalanceItem[];
}

// Stock Types
export interface StockOverview {
  item_id: string;
  item_name: string;
  sku: string;
  on_hand_qty: number;
  unit: string;
  status: 'in_stock' | 'low' | 'out';
  active_batch_count: number;
}

export interface BatchInfo {
  id: string;
  batch_id_display: string;
  supplier_name: string;
  received_at: string;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  quality_score: QualityScore;
  defect_pct: number | null;
  is_oldest: boolean;
}

// Trip Types
export interface Trip {
  id: string;
  trip_number: string;
  vehicle_id: string;
  driver_id: string | null;
  driver_name: string;
  status: TripStatus;
  trip_type: TripType;
  supplier_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  origin_description: string | null;
  destination_description: string | null;
  distance_km: number | null;
  fuel_cost: number;
  toll_cost: number;
  other_cost: number;
  total_cost: number;
  notes: string | null;
  departure_time: string | null;
  completed_at: string | null;
  created_at: string;
  is_multi_stop?: boolean;
  estimated_arrival_time: string | null;
  vehicles?: {
    registration_number: string;
    make?: string | null;
    model?: string | null;
  };
  from_location?: { id?: string; name: string };
  to_location?: { id?: string; name: string };
}

export interface TripStop {
  id: string;
  trip_id: string;
  stop_order: number;
  stop_type: StopType;
  location_id: string | null;
  supplier_id: string | null;
  location_name: string | null;
  planned_qty_kg: number | null;
  actual_qty_kg: number | null;
  arrived_at: string | null;
  departed_at: string | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
}

// Stock Request Types
export interface StockRequest {
  id: string;
  location_id: string;
  requested_by: string;
  quantity_bags: number;
  urgency: StockRequestUrgency;
  status: StockRequestStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  trip_id: string | null;
  notes: string | null;
  current_stock_kg: number | null;
  target_stock_kg: number | null;
  created_at: string;
  updated_at: string;
  requested_delivery_time: string | null;
  proposed_delivery_time: string | null;
  agreed_delivery_time: string | null;
  proposal_reason: string | null;
  location?: { id: string; name: string; type: LocationType };
  requester?: { id: string; full_name: string | null; email: string };
  acceptor?: { id: string; full_name: string | null; email: string };
  trips?: Trip;
}

// Pending Delivery Types
export interface PendingDelivery {
  id: string;
  trip_id: string;
  trip_stop_id: string | null;
  request_id: string | null;
  location_id: string;
  supplier_id: string | null;
  driver_claimed_qty_kg: number;
  driver_scanned_qty_kg?: number | null;
  status: PendingDeliveryStatus;
  confirmed_qty_kg: number | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  discrepancy_notes: string | null;
  created_at: string;
  updated_at: string;
  driver_claimed_bags?: number;
  driver_scanned_bags?: number;
  confirmed_bags?: number;
  location?: { id: string; name: string; type?: LocationType };
  trip?: {
    id: string;
    trip_number: string;
    status?: TripStatus;
    driver_name?: string;
    driver_id?: string;
    vehicles?: { registration_number: string };
  };
}

// Loan Types
export interface Loan {
  id: string;
  borrower_location_id: string;
  lender_location_id: string;
  requested_by: string;
  approved_by: string | null;
  quantity_requested: number;
  quantity_approved: number | null;
  estimated_return_date: string;
  actual_return_date: string | null;
  status: LoanStatus;
  pickup_trip_id: string | null;
  return_trip_id: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  borrower_location?: { id: string; name: string };
  lender_location?: { id: string; name: string };
  requester?: { id: string; full_name: string | null; email: string };
  approver?: { id: string; full_name: string | null; email: string };
}

// Alert Types
export interface AlertItem {
  id: string;
  type: AlertType;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  item_id: string;
  item_name: string;
  location_id: string;
  location_name: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface AlertSummary {
  low_stock_count: number;
  reorder_now_count: number;
  expiring_soon_count: number;
}

export interface AlertsData {
  summary: AlertSummary;
  active_alerts: AlertItem[];
  recently_acknowledged: AlertItem[];
}

// Notification Types
export interface NotificationItem {
  id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

// Reference Data Types
export interface Item {
  id: string;
  sku: string;
  name: string;
  unit: string;
  conversion_factor: number;
}

export interface Location {
  id: string;
  zone_id: string;
  type: LocationType;
  name: string;
  address?: string | null;
  zone_name?: string;
}

export interface Zone {
  id: string;
  name: string;
}

// Vehicle Types
export interface Vehicle {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  capacity_kg: number | null;
  fuel_type: string | null;
  notes: string | null;
  is_active: boolean;
  is_available?: boolean;
  current_trip?: {
    trip_id: string;
    trip_number: string;
    driver_name: string;
    status: string;
  } | null;
  created_at?: string;
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
}
