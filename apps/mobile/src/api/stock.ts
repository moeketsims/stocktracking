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

// Waste
export interface WastePayload {
  item_id?: string;
  quantity: number;
  unit: 'kg' | 'bag';
  reason: 'spoiled' | 'damaged' | 'trim_prep_loss' | 'contaminated' | 'other';
  notes?: string;
}

export interface WasteResponse {
  success: boolean;
  message: string;
  transaction_id?: string;
}

// Adjustment
export interface AdjustmentPayload {
  item_id: string;
  quantity: number;
  unit: 'kg' | 'bag';
  reason: 'count_error' | 'theft' | 'found_stock' | 'damage_write_off' | 'system_correction' | 'other';
  batch_id?: string;
  location_id?: string;
  notes?: string;
}

export interface AdjustmentResponse {
  success: boolean;
  message: string;
  transaction_id: string;
}

export interface AdjustmentReason {
  value: string;
  label: string;
  description: string;
}

// Batches
export interface BatchListResponse {
  batches: BatchListItem[];
  counts: { all: number; expiring_soon: number };
}

export interface BatchListItem {
  id: string;
  batch_id_display: string;
  item_id: string;
  item_name: string;
  supplier_name: string;
  location_name: string;
  received_at: string;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  used_qty: number;
  quality_score: number;
  defect_pct: number | null;
  quality_notes: string | null;
  is_oldest: boolean;
}

export interface BatchDetailResponse {
  id: string;
  batch_id_display: string;
  item: { name: string; sku: string } | null;
  supplier: { name: string; contact_name: string | null; contact_phone: string | null } | null;
  received_at: string;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  used_qty: number;
  quality_score: number;
  defect_pct: number | null;
  quality_notes: string | null;
  photo_url: string | null;
  edit_count?: number;
}

export interface BatchEditPayload {
  quality_score?: number;
  expiry_date?: string;
  quality_notes?: string;
  defect_pct?: number;
  status?: string;
}

export interface BatchEditResponse {
  success: boolean;
  message: string;
  changes: string[];
}

// Create stock request
export interface CreateStockRequestPayload {
  location_id?: string;
  quantity_bags: number;
  urgency: 'urgent' | 'normal';
  requested_delivery_time?: string;
  notes?: string;
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

  waste: (data: WastePayload) =>
    api.post<WasteResponse>('/api/stock/waste', data),

  getTransactions: (params?: {
    type_filter?: string;
    view_location_id?: string;
    limit?: number;
    offset?: number;
    days?: number;
  }) =>
    api.get<TransactionsResponse>('/api/transactions', { params }),

  // Adjustments
  createAdjustment: (data: AdjustmentPayload) =>
    api.post<AdjustmentResponse>('/api/adjustments', data),

  getAdjustmentReasons: () =>
    api.get<{ reasons: AdjustmentReason[] }>('/api/adjustments/reasons'),

  // Batches
  getBatches: (params?: { filter_type?: 'all' | 'expiring_soon'; item_id?: string; limit?: number }) =>
    api.get<BatchListResponse>('/api/batches', { params }),

  getBatch: (id: string) =>
    api.get<BatchDetailResponse>(`/api/batches/${id}`),

  // Batch management
  getBatchDetail: (id: string) =>
    api.get<BatchDetailResponse>(`/api/batch-management/${id}`),

  editBatch: (id: string, data: BatchEditPayload) =>
    api.patch<BatchEditResponse>(`/api/batch-management/${id}`, data),

  getBatchHistory: (id: string) =>
    api.get<{ history: Array<{ id: string; field_changed: string; old_value: string | null; new_value: string | null; edit_reason: string | null; editor_name: string; edited_at: string }> }>(`/api/batch-management/${id}/history`),

  // Stock requests (create)
  createStockRequest: (data: CreateStockRequestPayload) =>
    api.post<{ success: boolean; message: string; request: Record<string, unknown> }>('/api/stock-requests', data),
};
