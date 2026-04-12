import { api } from './client';

// --- Daily Summary (reports router) ---

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

export interface DailySummaryResponse {
  period_totals: PeriodTotals;
  daily_breakdown: DailySummaryItem[];
}

// --- Supplier Quality (reports router) ---

export interface SupplierQualityItem {
  supplier_id: string;
  supplier_name: string;
  delivery_count: number;
  avg_quality_score: number;
  avg_defect_pct: number;
  quality_trend: 'improving' | 'stable' | 'declining';
  needs_review: boolean;
  quality_breakdown: { good: number; ok: number; poor: number };
}

export interface SupplierQualityResponse {
  suppliers: SupplierQualityItem[];
}

// --- Analytics ---

export interface AnalyticsSummary {
  total_bags_7_days: number;
  daily_average: number;
  trend_pct: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export interface DailyUsagePoint {
  date: string;
  bags_used: number;
  kg_used: number;
}

export interface HourlyUsagePoint {
  hour: number;
  bags_used: number;
}

export interface TransactionBreakdownPoint {
  date: string;
  received_kg: number;
  received_bags: number;
  issued_kg: number;
  issued_bags: number;
  wasted_kg: number;
  wasted_bags: number;
}

export interface WasteBreakdownItem {
  reason: string;
  qty_kg: number;
  qty_bags: number;
  percentage: number;
  display_name: string;
}

export interface WasteSummary {
  total_wasted_kg: number;
  total_wasted_bags: number;
  total_received_kg: number;
  waste_rate_pct: number;
  breakdown: WasteBreakdownItem[];
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  daily_usage: DailyUsagePoint[];
  hourly_pattern: HourlyUsagePoint[];
  transaction_breakdown: TransactionBreakdownPoint[];
  waste_analysis: WasteSummary;
  peak_day: string | null;
  peak_day_bags: number;
}

// --- Stock Levels (analytics router) ---

export interface StockLevelItem {
  item_id: string;
  item_name: string;
  kg_remaining: number;
  bags_remaining: number;
}

export interface StockLevelsResponse {
  stock_levels: StockLevelItem[];
}

// --- Shop Efficiency (analytics router) ---

export interface LocationEfficiency {
  location_id: string;
  location_name: string;
  location_type: string;
  waste_rate_pct: number;
  usage_rate_pct: number;
  current_stock_kg: number;
  current_stock_bags: number;
  total_received_kg: number;
  total_issued_kg: number;
  total_wasted_kg: number;
  efficiency_score: number;
  rank: number;
}

export interface ShopEfficiencyResponse {
  period_days: number;
  locations: LocationEfficiency[];
  best_performer: string | null;
  worst_performer: string | null;
  avg_waste_rate: number;
  avg_usage_rate: number;
}

// --- Transactions ---

export interface TransactionItem {
  id: string;
  type: string;
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

export interface TransactionsResponse {
  transactions: TransactionItem[];
  total: number;
  issue_count: number;
  return_count: number;
}

// --- Owner Dashboard ---

export interface ShopDailyActivity {
  received_bags: number;
  issued_bags: number;
  wasted_bags: number;
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
  location_type: string;
  total_stock_bags: number;
  total_stock_kg: number;
  activity: ShopDailyActivity;
  alerts: ShopAlertSummary;
  status: 'healthy' | 'warning' | 'critical';
}

export interface OwnerDashboardResponse {
  generated_at: string;
  date: string;
  total_stock_bags: number;
  total_stock_kg: number;
  total_received_bags: number;
  total_issued_bags: number;
  total_wasted_bags: number;
  total_alerts: number;
  shops: ShopDailyStatus[];
  warehouse: ShopDailyStatus | null;
  issued_7d_kg: number;
  issued_30d_kg: number;
  wasted_7d_kg: number;
  wasted_30d_kg: number;
  avg_daily_usage_kg: number;
  waste_rate_7d_pct: number;
  waste_rate_30d_pct: number;
  usage_trend_direction: 'up' | 'down' | 'stable';
  usage_trend_pct: number;
}

// --- API Functions ---

export type PeriodDays = 7 | 14 | 30;
export type TransactionTypeFilter = 'all' | 'receive' | 'issue' | 'return' | 'transfer' | 'waste';

export const reportsApi = {
  // Reports
  getDailySummary: (periodDays: PeriodDays = 7, locationId?: string) =>
    api.get<DailySummaryResponse>('/api/reports/daily-summary', {
      params: { period_days: periodDays, view_location_id: locationId },
    }),

  getSupplierQuality: (locationId?: string) =>
    api.get<SupplierQualityResponse>('/api/reports/supplier-quality', {
      params: { view_location_id: locationId },
    }),

  // Analytics
  getAnalytics: (periodDays = 30, locationId?: string) =>
    api.get<AnalyticsResponse>('/api/analytics', {
      params: { period_days: periodDays, view_location_id: locationId },
    }),

  getStockLevels: (locationId?: string) =>
    api.get<StockLevelsResponse>('/api/analytics/stock-levels', {
      params: { view_location_id: locationId },
    }),

  getShopEfficiency: (periodDays = 30) =>
    api.get<ShopEfficiencyResponse>('/api/analytics/shop-efficiency', {
      params: { period_days: periodDays },
    }),

  // Transactions
  getTransactions: (params: {
    type_filter?: TransactionTypeFilter;
    view_location_id?: string;
    limit?: number;
    offset?: number;
    days?: number;
  }) =>
    api.get<TransactionsResponse>('/api/transactions', { params }),

  getTransaction: (id: string) =>
    api.get(`/api/transactions/${id}`),

  // Owner Dashboard
  getOwnerDashboard: () =>
    api.get<OwnerDashboardResponse>('/api/owner-dashboard'),
};
