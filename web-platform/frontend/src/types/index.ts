// Enums
export type UserRole = 'admin' | 'zone_manager' | 'location_manager' | 'vehicle_manager' | 'driver' | 'staff';
export type LocationType = 'shop' | 'warehouse';
export type TransactionType = 'receive' | 'issue' | 'return' | 'transfer' | 'waste' | 'adjustment';
export type NotificationType = 'bag_used' | 'threshold_alert' | 'daily_summary';
export type QualityScore = 1 | 2 | 3;
export type WasteReason = 'spoiled' | 'damaged' | 'trim_prep_loss' | 'contaminated' | 'other';
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
  on_hand_bags?: number;
  location_name: string;
  item_name: string;
  unit: string;
  critical_threshold?: number;  // in bags
  low_threshold?: number;  // in bags
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

// Location-centric stock view (simplified)
export interface RecentActivity {
  id: string;
  type: TransactionType;
  qty: number;
  created_at: string;
  notes: string | null;
}

export interface LocationStockItem {
  location_id: string;
  location_name: string;
  location_type: LocationType;
  on_hand_qty: number;
  status: 'in_stock' | 'low' | 'out';
  last_activity: string | null;
  recent_activity: RecentActivity[];
}

export interface LocationStockData {
  locations: LocationStockItem[];
  total_stock_kg: number;
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

// Form Types (simplified - item_id is optional, auto-filled with default item)
export interface ReceiveStockForm {
  quantity: number;
  unit: 'kg' | 'bag';
  supplier_id: string;
  notes?: string;
}

export interface IssueStockForm {
  quantity: number;
  unit: 'kg' | 'bag';
  notes?: string;
}

export interface TransferStockForm {
  quantity: number;
  unit: 'kg' | 'bag';
  from_location_id: string;
  to_location_id: string;
  notes?: string;
}

export interface WasteStockForm {
  quantity: number;
  unit: 'kg' | 'bag';
  reason: WasteReason;
  notes?: string;
}

// Driver Form Types
export interface CreateDriverForm {
  email: string;
  full_name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  notes?: string;
}

// Vehicle Health Types
export type HealthStatus = 'ok' | 'soon' | 'due';

export interface TyreHealth {
  position: 'front_left' | 'front_right' | 'rear_left' | 'rear_right';
  status: HealthStatus;
  last_replaced_at: string | null;
  last_replaced_km: number | null;
  notes: string | null;
}

export interface BrakePadHealth {
  position: 'front' | 'rear';
  status: HealthStatus;
  last_replaced_at: string | null;
  last_replaced_km: number | null;
  notes: string | null;
}

export interface VehicleHealth {
  // Service
  last_service_date: string | null;
  last_service_km: number | null;
  next_service_due_km: number | null;
  service_status: HealthStatus;
  service_notes: string | null;

  // Tyres
  tyres: TyreHealth[];
  tyres_status: HealthStatus; // Worst status of all tyres

  // Brake pads (front and rear)
  brake_pads: BrakePadHealth[];
  brake_pads_status: HealthStatus; // Worst status of front/rear

  // Last driver
  last_driver_id: string | null;
  last_driver_name: string | null;
  last_trip_at: string | null;

  // Metadata
  updated_at: string | null;
  updated_by: string | null;
}

// Vehicle Trip Status (when include_trip_status=true)
export interface VehicleCurrentTrip {
  trip_id: string;
  trip_number: string;
  driver_name: string | null;
  status: 'planned' | 'in_progress' | 'completed';
  awaiting_km: boolean;
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
  kilometers_traveled: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  // Health fields (optional - populated when fetched with health data)
  health?: VehicleHealth;
  // Trip status fields (optional - populated when include_trip_status=true)
  current_trip?: VehicleCurrentTrip | null;
  is_available?: boolean;
}

export interface CreateVehicleForm {
  registration_number: string;
  make?: string;
  model?: string;
  fuel_type: 'diesel' | 'petrol';
  kilometers_traveled?: number;
  notes?: string;
}

// Driver Types
export type DriverInvitationStatus = 'active' | 'pending' | 'expired' | 'no_invitation';

export interface Driver {
  id: string;
  name: string;
  full_name: string;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  invitation_status: DriverInvitationStatus;
  user_id: string | null;
  created_at: string;
}

// Trip Types
export type TripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'supplier_to_warehouse' | 'supplier_to_shop' | 'warehouse_to_shop' | 'shop_to_shop' | 'shop_to_warehouse' | 'other' | 'loan_pickup' | 'loan_return';

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
  // ETA field
  estimated_arrival_time: string | null;
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
    id?: string;
    name: string;
  };
  to_location?: {
    id?: string;
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

// User Management Types
export interface ManagedUser {
  id: string;
  user_id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  zone_id: string | null;
  location_id: string | null;
  zone_name: string | null;
  location_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UsersData {
  users: ManagedUser[];
  total: number;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  zone_id: string | null;
  location_id: string | null;
  zone_name: string | null;
  location_name: string | null;
  full_name: string | null;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface InvitationsData {
  invitations: UserInvitation[];
  total: number;
}

export interface InviteUserForm {
  email: string;
  role: UserRole;
  zone_id?: string;
  location_id?: string;
  full_name?: string;
}

export interface UpdateUserForm {
  role?: UserRole;
  zone_id?: string;
  location_id?: string;
  full_name?: string;
  phone?: string;
}

export interface InviteValidation {
  valid: boolean;
  email: string;
  role: UserRole;
  full_name: string | null;
  zone_name: string | null;
  location_name: string | null;
  expires_at: string;
}

export interface AcceptInviteForm {
  token: string;
  password: string;
}

// Stock Request Types (Replenishment Workflow)
export type StockRequestStatus = 'pending' | 'accepted' | 'trip_created' | 'in_delivery' | 'fulfilled' | 'delivered' | 'cancelled' | 'partially_fulfilled' | 'expired' | 'time_proposed';

// Proposal reason types for counter-proposal flow
export type ProposalReason = 'vehicle_issue' | 'another_urgent_request' | 'route_conditions' | 'schedule_conflict' | 'other';
export type StockRequestUrgency = 'urgent' | 'normal';

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
  // Delivery time scheduling
  requested_delivery_time: string | null;
  proposed_delivery_time: string | null;
  agreed_delivery_time: string | null;
  proposal_reason: string | null;
  time_confirmed_at: string | null;
  // Cancellation fields
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  // Joined relations
  location?: {
    id: string;
    name: string;
    type: LocationType;
  };
  requester?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  acceptor?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  trips?: Trip;
  capacity_percent?: number;
}

export interface StockRequestsData {
  requests: StockRequest[];
  total: number;
}

export interface CreateStockRequestForm {
  location_id?: string;
  quantity_bags: number;
  urgency: StockRequestUrgency;
  requested_delivery_time?: string; // ISO datetime string
  notes?: string;
}

export interface CreateTripFromRequestForm {
  vehicle_id: string;
  driver_id?: string;
  supplier_id: string;
  notes?: string;
}

export interface UpdateStockRequestForm {
  quantity_bags?: number;
  urgency?: StockRequestUrgency;
  notes?: string;
}

export interface FulfillRemainingForm {
  vehicle_id: string;
  driver_id?: string;
  supplier_id: string;
  notes?: string;
}

// Pending Delivery Types
export type PendingDeliveryStatus = 'pending' | 'confirmed' | 'rejected';

export interface PendingDelivery {
  id: string;
  trip_id: string;
  trip_stop_id: string | null;
  request_id: string | null;
  location_id: string;
  supplier_id: string | null;
  driver_claimed_qty_kg: number;
  status: PendingDeliveryStatus;
  confirmed_qty_kg: number | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  discrepancy_notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  driver_claimed_bags?: number;
  confirmed_bags?: number;
  // Joined relations
  location?: {
    id: string;
    name: string;
    type?: LocationType;
  };
  supplier?: {
    id: string;
    name: string;
  };
  trip?: {
    id: string;
    trip_number: string;
    status?: TripStatus;
    driver_name?: string;
    driver_id?: string;
    vehicles?: {
      registration_number: string;
      make?: string | null;
      model?: string | null;
    };
    fuel_cost?: number;
    toll_cost?: number;
    other_cost?: number;
  };
  stock_request?: {
    id: string;
    quantity_bags: number;
    urgency: StockRequestUrgency;
    notes?: string;
  };
  confirmer?: {
    id: string;
    full_name: string | null;
  };
}

export interface PendingDeliveriesData {
  deliveries: PendingDelivery[];
  total: number;
}

export interface ConfirmDeliveryForm {
  confirmed_qty_kg: number;
  notes?: string;
}

export interface RejectDeliveryForm {
  reason: string;
}

// Loan Types (Inter-shop Stock Borrowing)
export type LoanStatus =
  | 'pending'           // Initial request, awaiting lender response
  | 'accepted'          // Lender accepted (possibly with modified qty), awaiting borrower confirmation
  | 'rejected'          // Lender or borrower rejected the request/counter-offer
  | 'confirmed'         // Borrower confirmed, awaiting pickup assignment
  | 'in_transit'        // Driver assigned, pickup in progress
  | 'collected'         // Lender confirmed collection, driver en route to borrower
  | 'active'            // Stock delivered to borrower, loan is ongoing
  | 'return_initiated'  // Borrower clicked "Start Return", email sent to lender
  | 'return_assigned'   // Borrower assigned driver, waiting for driver to accept
  | 'return_in_progress' // Driver accepted return, stock deducted from borrower
  | 'return_in_transit' // Legacy: Return delivery in progress
  | 'completed'         // Stock returned to lender
  | 'overdue';          // Past return date and not yet returned

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
  driver_confirmed_at: string | null;  // Timestamp when driver accepted return
  status: LoanStatus;
  pickup_trip_id: string | null;
  return_trip_id: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  borrower_location?: {
    id: string;
    name: string;
  };
  lender_location?: {
    id: string;
    name: string;
  };
  requester?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  approver?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  pickup_trip?: Trip;
  return_trip?: Trip;
}

export interface LoansData {
  loans: Loan[];
  total: number;
}

export interface CreateLoanForm {
  lender_location_id: string;
  quantity_requested: number;
  estimated_return_date: string;
  notes?: string;
}

export interface AcceptLoanForm {
  quantity_approved: number;
  notes?: string;
}

export interface RejectLoanForm {
  reason: string;
}

export interface AssignLoanDriverForm {
  driver_id?: string;
  vehicle_id: string;
  notes?: string;
}
