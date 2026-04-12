import { api } from './client';
import type { StockTake, StockTakeDetail } from '../types';

export interface CreateStockTakePayload {
  location_id?: string;
  notes?: string;
}

export interface UpdateLineCountPayload {
  counted_qty: number;
  notes?: string;
}

export const stockTakesApi = {
  list: (params?: { status?: string; limit?: number; view_location_id?: string }) =>
    api.get<{ stock_takes: StockTake[] }>('/api/stock-takes', { params }),

  get: (id: string) =>
    api.get<StockTakeDetail>(`/api/stock-takes/${id}`),

  create: (data: CreateStockTakePayload) =>
    api.post<{ success: boolean; stock_take_id: string; lines_created: number }>(
      '/api/stock-takes',
      data,
    ),

  updateLineCount: (stockTakeId: string, lineId: string, data: UpdateLineCountPayload) =>
    api.patch<{
      success: boolean;
      variance: number;
      variance_pct: number;
      lines_counted: number;
    }>(`/api/stock-takes/${stockTakeId}/lines/${lineId}`, data),

  complete: (id: string, notes?: string) =>
    api.post<{ success: boolean; adjustments_created: number }>(
      `/api/stock-takes/${id}/complete`,
      { notes },
    ),

  cancel: (id: string) =>
    api.post<{ success: boolean }>(`/api/stock-takes/${id}/cancel`),
};
