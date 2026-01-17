// Enums
export type UserRole = 'admin' | 'zone_manager' | 'location_manager' | 'staff';
export type LocationType = 'shop' | 'warehouse';
export type TransactionType = 'receive' | 'issue' | 'transfer' | 'waste' | 'adjustment';
export type NotificationType = 'bag_used' | 'threshold_alert' | 'daily_summary';
export type QualityScore = 1 | 2 | 3;
export type WasteReason = 'spoiled' | 'damaged' | 'expired' | 'trim_prep_loss' | 'contaminated' | 'other';
export type AlertType = 'low_stock' | 'reorder_now' | 'expiring_soon' | 'expired';

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

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;
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
  location_name: string;
  item_name: string;
  unit: string;
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

export interface FIFOSuggestion {
  batch_id: string;
  batch_id_display: string;
  received_at: string;
  remaining_qty: number;
}

export interface StockScreenData {
  overview: StockOverview[];
  active_batches: BatchInfo[];
  fifo_suggestion: FIFOSuggestion | null;
}

// Transaction Types
export interface TransactionItem {
  id: string;
  type: TransactionType;
  created_at: string;
  quantity: number;
  unit: string;
  item_name: string;
  batch_id: string | null;
  notes: string | null;
  location_from: string | null;
  location_to: string | null;
  created_by_name: string;
}

export interface TransactionsData {
  transactions: TransactionItem[];
  total: number;
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
  data: Record<string, any>;
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

// Batch Types
export interface BatchDetail {
  id: string;
  batch_id_display: string;
  item_id: string;
  item_name: string;
  supplier_name: string;
  location_name?: string;
  received_at: string;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  used_qty: number;
  quality_score: QualityScore;
  defect_pct: number | null;
  quality_notes: string | null;
  is_oldest: boolean;
}

export interface BatchesData {
  batches: BatchDetail[];
  counts: {
    all: number;
    expiring_soon: number;
    poor_quality: number;
  };
}

// Analytics Types
export interface DailyUsagePoint {
  date: string;
  bags_used: number;
  kg_used: number;
}

export interface HourlyUsagePoint {
  hour: number;
  bags_used: number;
}

export interface AnalyticsSummary {
  total_bags_7_days: number;
  daily_average: number;
  trend_pct: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  daily_usage: DailyUsagePoint[];
  hourly_pattern: HourlyUsagePoint[];
  peak_day: string | null;
  peak_day_bags: number;
}

// Report Types
export interface DailySummaryItem {
  date: string;
  received_kg: number;
  issued_kg: number;
  wasted_kg: number;
  net_change: number;
}

export interface PeriodTotals {
  total_received: number;
  total_issued: number;
  total_wasted: number;
  net_change: number;
}

export interface DailySummaryData {
  period_totals: PeriodTotals;
  daily_breakdown: DailySummaryItem[];
}

export interface SupplierQualityItem {
  supplier_id: string;
  supplier_name: string;
  delivery_count: number;
  avg_quality_score: number;
  avg_defect_pct: number;
  quality_trend: 'improving' | 'declining' | 'stable';
  needs_review: boolean;
  quality_breakdown: {
    good: number;
    ok: number;
    poor: number;
  };
}

export interface SupplierQualityData {
  suppliers: SupplierQualityItem[];
}

// Zone Types
export interface LocationStatus {
  location_id: string;
  location_name: string;
  location_type: LocationType;
  on_hand_qty: number;
  days_of_cover: number;
  avg_daily_usage: number;
  status: 'ok' | 'low_stock' | 'reorder';
}

export interface ReallocationSuggestion {
  from_location_id: string;
  from_location_name: string;
  to_location_id: string;
  to_location_name: string;
  quantity: number;
  reason: string;
}

export interface ZoneOverviewData {
  zone_id: string;
  zone_name: string;
  total_kg: number;
  shop_count: number;
  low_stock_count: number;
  warehouse: LocationStatus | null;
  shops: LocationStatus[];
  reallocation_suggestions: ReallocationSuggestion[];
}

// Notification Types
export interface NotificationItem {
  id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, any>;
}

export interface NotificationsData {
  notifications: NotificationItem[];
  unread_count: number;
}

// Settings Types
export interface UserSettings {
  profile: UserProfile;
  preferences: {
    dark_mode: boolean;
    language: string;
    default_unit: 'kg' | 'bag';
    notifications_enabled: boolean;
  };
}

// Reference Data Types
export interface Item {
  id: string;
  sku: string;
  name: string;
  unit: string;
  conversion_factor: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export interface Location {
  id: string;
  zone_id: string;
  type: LocationType;
  name: string;
  zone_name?: string;
}

export interface Zone {
  id: string;
  name: string;
}

// Form Types
export interface ReceiveStockForm {
  item_id: string;
  quantity: number;
  unit: 'kg' | 'bag';
  supplier_id: string;
  quality_score: QualityScore;
  defect_pct?: number;
  quality_notes?: string;
  expiry_date?: string;
  photo_url?: string;
  notes?: string;
}

export interface IssueStockForm {
  item_id: string;
  quantity: number;
  unit: 'kg' | 'bag';
  batch_id?: string;
  notes?: string;
}

export interface TransferStockForm {
  item_id: string;
  quantity: number;
  unit: 'kg' | 'bag';
  from_location_id: string;
  to_location_id: string;
  notes?: string;
}

export interface WasteStockForm {
  item_id: string;
  quantity: number;
  unit: 'kg' | 'bag';
  reason: WasteReason;
  notes?: string;
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
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

// Driver Types
export interface Driver {
  id: string;
  name: string;
  full_name: string;
  license_number: string | null;
  license_expiry: string | null;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

// Trip Types
export type TripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'supplier_to_warehouse' | 'supplier_to_shop' | 'warehouse_to_shop' | 'shop_to_shop' | 'shop_to_warehouse' | 'other';

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
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  is_multi_stop?: boolean;
  // Relations
  vehicles?: {
    registration_number: string;
    make?: string | null;
    model?: string | null;
  };
  suppliers?: {
    name: string;
  };
  from_location?: {
    name: string;
  };
  to_location?: {
    name: string;
  };
}

export interface TripsData {
  trips: Trip[];
  total: number;
}

export interface TripSummary {
  total_trips: number;
  total_cost: number;
  total_fuel_cost: number;
  total_toll_cost: number;
  avg_cost_per_trip: number;
}

// Trip Stop Types
export type StopType = 'pickup' | 'dropoff';

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
  // Relations
  locations?: {
    name: string;
  };
  suppliers?: {
    name: string;
  };
}

export interface TripStopsData {
  stops: TripStop[];
  total_stops: number;
  completed_stops: number;
}

// Trip Form Types
export interface CreateTripForm {
  vehicle_id: string;
  driver_id?: string;
  driver_name?: string;
  origin_description?: string;
  destination_description?: string;
  notes?: string;
  trip_type: TripType;
  from_location_id?: string;
  to_location_id?: string;
  supplier_id?: string;
}

// Owner Dashboard Types
export interface ShopDailyActivity {
  received_bags: number;  // Fractional bags (e.g., 2.5)
  issued_bags: number;    // Fractional bags
  wasted_bags: number;    // Fractional bags
  received_kg: number;
  issued_kg: number;
  wasted_kg: number;
}

export interface ShopAlertSummary {
  low_stock_count: number;
  reorder_count: number;
  expiring_soon_count: number;
  total_alerts: number;
}

export interface ShopDailyStatus {
  location_id: string;
  location_name: string;
  location_type: 'shop' | 'warehouse';
  total_stock_bags: number;  // Fractional bags
  total_stock_kg: number;
  activity: ShopDailyActivity;
  alerts: ShopAlertSummary;
  status: 'healthy' | 'warning' | 'critical';
}

export type TrendDirection = 'up' | 'down' | 'stable';

export interface OwnerDashboardData {
  generated_at: string;
  date: string;
  total_stock_bags: number;    // Fractional bags
  total_stock_kg: number;
  total_received_bags: number; // Fractional bags
  total_issued_bags: number;   // Fractional bags
  total_wasted_bags: number;   // Fractional bags
  total_alerts: number;
  shops: ShopDailyStatus[];
  warehouse: ShopDailyStatus | null;
  // Trend metrics
  issued_7d_kg: number;
  issued_30d_kg: number;
  wasted_7d_kg: number;
  wasted_30d_kg: number;
  avg_daily_usage_kg: number;
  waste_rate_7d_pct: number;
  waste_rate_30d_pct: number;
  usage_trend_direction: TrendDirection;
  usage_trend_pct: number;
}
