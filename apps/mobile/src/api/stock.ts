import { api } from './client';
import type { StockOverview, BatchInfo } from '../types';

export interface StockBalanceResponse {
  balance: Array<{
    location_id: string;
    item_id: string;
    on_hand_qty: number;
    location_name: string | null;
    item_name: string | null;
    unit: string;
  }>;
  batch_totals: Array<{
    location_id: string;
    item_id: string;
    on_hand_qty: number;
    item_name: string | null;
  }>;
}

export interface StockScreenResponse {
  overview: Array<
    StockOverview & { on_hand_bags?: number }
  >;
  active_batches: Array<
    BatchInfo & {
      initial_qty_bags?: number;
      remaining_qty_bags?: number;
    }
  >;
  fifo_suggestion: {
    batch_id: string;
    batch_id_display: string;
    received_at: string;
    remaining_qty: number;
    remaining_qty_bags?: number;
  } | null;
}

export interface IssueStockPayload {
  item_id?: string;
  quantity: number;
  unit: 'kg' | 'bag';
  notes?: string;
}

export interface IssueStockResponse {
  success: boolean;
  message: string;
  transaction_id: string | null;
  batch_id: string | null;
  debug?: {
    qty_deducted_kg: number;
    new_total_kg: number;
    new_total_bags: number;
  };
}

export interface TransactionsResponse {
  transactions: Array<{
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
  }>;
  total: number;
  issue_count: number;
  return_count: number;
}

export interface LocationStockResponse {
  locations: Array<{
    location_id: string;
    location_name: string;
    location_type: string;
    on_hand_qty: number;
    status: 'in_stock' | 'low' | 'critical' | 'out';
    critical_stock_threshold: number;
    low_stock_threshold: number;
    last_activity: string | null;
    recent_activity: Array<{
      id: string;
      type: string;
      qty: number;
      created_at: string;
      notes: string | null;
    }>;
  }>;
  total_stock_kg: number;
}

export const stockApi = {
  getBalance: (locationId?: string) =>
    api.get<StockBalanceResponse>('/api/stock/balance', {
      params: locationId ? { view_location_id: locationId } : undefined,
    }),

  getOverview: (locationId?: string) =>
    api.get<StockScreenResponse>('/api/stock', {
      params: locationId ? { view_location_id: locationId } : undefined,
    }),

  getByLocation: () =>
    api.get<LocationStockResponse>('/api/stock/by-location'),

  issue: (data: IssueStockPayload) =>
    api.post<IssueStockResponse>('/api/stock/issue', data),

  return: (data: IssueStockPayload) =>
    api.post<IssueStockResponse>('/api/stock/return', data),

  waste: (data: IssueStockPayload & { reason: string }) =>
    api.post<{ success: boolean; message: string }>('/api/stock/waste', data),

  getTransactions: (params?: {
    type_filter?: string;
    view_location_id?: string;
    limit?: number;
    offset?: number;
    days?: number;
  }) =>
    api.get<TransactionsResponse>('/api/transactions', { params }),
};
