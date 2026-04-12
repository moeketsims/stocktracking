import { api } from './client';
import type { PendingDelivery } from '../types';

export interface PendingDeliveriesResponse {
  deliveries: PendingDelivery[];
  total: number;
}

export interface ConfirmDeliveryPayload {
  confirmed_bags?: number;
  confirmed_qty_kg?: number;
  notes?: string;
}

export interface ConfirmDeliveryResponse {
  success: boolean;
  message: string;
  batch_id: string;
  has_discrepancy: boolean;
  confirmed_bags: number;
  confirmed_qty_kg: number;
  discrepancy_bags: number;
  discrepancy_kg: number;
  request_status: string;
  total_delivered_bags: number;
  requested_bags: number;
  remaining_bags: number;
}

export const deliveriesApi = {
  list: (params?: { status?: string; location_id?: string; limit?: number }) =>
    api.get<PendingDeliveriesResponse>('/api/pending-deliveries', { params }),

  get: (id: string) =>
    api.get<PendingDelivery>(`/api/pending-deliveries/${id}`),

  confirm: (id: string, data: ConfirmDeliveryPayload) =>
    api.post<ConfirmDeliveryResponse>(`/api/pending-deliveries/${id}/confirm`, data),

  reject: (id: string, reason: string) =>
    api.post(`/api/pending-deliveries/${id}/reject`, { reason }),
};
