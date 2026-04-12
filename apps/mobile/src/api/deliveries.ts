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

export interface ResendKmEmailResponse {
  success: boolean;
  message: string;
}

export interface CorrectKmPayload {
  new_closing_km: number;
  reason: string;
}

export interface CorrectKmResponse {
  success: boolean;
  message: string;
  old_closing_km: number;
  new_closing_km: number;
  distance_km: number;
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

  resendKmEmail: (id: string) =>
    api.post<ResendKmEmailResponse>(`/api/pending-deliveries/${id}/resend-km-email`),

  correctKm: (tripId: string, data: CorrectKmPayload) =>
    api.post<CorrectKmResponse>(`/api/pending-deliveries/trips/${tripId}/correct-km`, data),
};
