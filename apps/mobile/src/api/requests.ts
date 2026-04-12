import { api } from './client';
import type { StockRequest } from '../types';

export interface StockRequestsResponse {
  requests: StockRequest[];
  total: number;
}

export interface AcceptRequestResponse {
  success: boolean;
  message: string;
  request: StockRequest;
}

export interface ProposeTimePayload {
  proposed_delivery_time: string;
  reason: 'vehicle_issue' | 'another_urgent_request' | 'route_conditions' | 'schedule_conflict' | 'other';
  notes?: string;
}

export interface CreateTripPayload {
  vehicle_id: string;
  driver_id?: string;
  supplier_id?: string;
  from_location_id?: string;
  notes?: string;
  auto_start?: boolean;
  estimated_arrival_time?: string;
  odometer_start?: number;
}

export interface CreateTripResponse {
  success: boolean;
  message: string;
  trip: {
    id: string;
    trip_number: string;
    status: string;
    vehicle_id: string;
    driver_id: string | null;
    trip_type: string;
  };
  request_id: string;
}

export interface UpdateRequestPayload {
  quantity_bags?: number;
  urgency?: 'urgent' | 'normal';
  notes?: string;
}

export interface CancelRequestPayload {
  reason: string;
}

export interface DeclineProposalPayload {
  notes?: string;
}

export const requestsApi = {
  getAvailable: (limit = 50) =>
    api.get<StockRequestsResponse>('/api/stock-requests/available', {
      params: { limit },
    }),

  list: (params?: { status?: string; limit?: number }) =>
    api.get<StockRequestsResponse>('/api/stock-requests', { params }),

  get: (id: string) =>
    api.get<StockRequest>(`/api/stock-requests/${id}`),

  accept: (id: string) =>
    api.post<AcceptRequestResponse>(`/api/stock-requests/${id}/accept`),

  proposeTime: (id: string, data: ProposeTimePayload) =>
    api.post(`/api/stock-requests/${id}/propose-time`, data),

  createTrip: (id: string, data: CreateTripPayload) =>
    api.post<CreateTripResponse>(`/api/stock-requests/${id}/create-trip`, data),

  update: (id: string, data: UpdateRequestPayload) =>
    api.patch(`/api/stock-requests/${id}`, data),

  cancel: (id: string, data: CancelRequestPayload) =>
    api.post(`/api/stock-requests/${id}/cancel`, data),

  reRequest: (id: string) =>
    api.post(`/api/stock-requests/${id}/re-request`),

  acceptProposal: (id: string) =>
    api.post(`/api/stock-requests/${id}/accept-proposal`),

  declineProposal: (id: string, data: DeclineProposalPayload) =>
    api.post(`/api/stock-requests/${id}/decline-proposal`, data),
};
