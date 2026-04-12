import { api } from './client';

export interface DashboardStatsResponse {
  total_stock_kg: number;
  total_stock_bags: number;
  received_today_kg: number;
  received_today_bags: number;
  issued_today_kg: number;
  issued_today_bags: number;
  wasted_today_kg: number;
  wasted_today_bags: number;
  active_batches: number;
  low_stock_alerts: number;
  reorder_alerts: number;
  expiring_soon_alerts: number;
}

export interface DashboardForecastResponse {
  avg_daily_usage: number;
  avg_daily_usage_bags: number;
  days_of_cover: number;
  stock_out_date: string | null;
  reorder_by_date: string | null;
  lead_time_days: number;
  safety_stock_qty: number;
  safety_stock_qty_bags: number;
  reorder_point_qty: number;
  reorder_point_qty_bags: number;
  suggested_order_qty: number;
  suggested_order_qty_bags: number;
}

export interface DashboardBalanceItem {
  location_id: string;
  item_id: string;
  on_hand_qty: number;
  on_hand_bags: number;
  location_name: string;
  item_name: string;
  unit: string;
  critical_threshold: number;
  low_threshold: number;
}

export interface DashboardResponse {
  stats: DashboardStatsResponse;
  forecast: DashboardForecastResponse;
  stock_balance: DashboardBalanceItem[];
}

export const dashboardApi = {
  get: (locationId?: string) =>
    api.get<DashboardResponse>('/api/dashboard', {
      params: locationId ? { view_location_id: locationId } : undefined,
    }),
};
