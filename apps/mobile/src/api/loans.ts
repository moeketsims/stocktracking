import { api } from './client';
import type { Loan } from '../types';

export interface LoansResponse {
  loans: Loan[];
  total: number;
}

export interface CreateLoanPayload {
  lender_location_id: string;
  quantity_requested: number;
  estimated_return_date?: string;
  notes?: string;
}

export interface AcceptLoanPayload {
  quantity_approved: number;
  notes?: string;
}

export interface AssignDriverPayload {
  driver_id: string;
  vehicle_id?: string;
  odometer_start?: number;
  estimated_arrival_time?: string;
}

export const loansApi = {
  list: (params?: { direction?: string; status?: string; include_history?: boolean }) =>
    api.get<LoansResponse>('/api/loans', { params }),

  get: (id: string) =>
    api.get<Loan>(`/api/loans/${id}`),

  create: (data: CreateLoanPayload) =>
    api.post('/api/loans', data),

  accept: (id: string, data: AcceptLoanPayload) =>
    api.post(`/api/loans/${id}/accept`, data),

  reject: (id: string, reason?: string) =>
    api.post(`/api/loans/${id}/reject`, { reason }),

  confirm: (id: string) =>
    api.post(`/api/loans/${id}/confirm`),

  assignPickup: (id: string, data: AssignDriverPayload) =>
    api.post(`/api/loans/${id}/assign-pickup`, data),

  assignReturn: (id: string, data: AssignDriverPayload) =>
    api.post(`/api/loans/${id}/assign-return`, data),

  confirmReceipt: (id: string) =>
    api.post(`/api/loans/${id}/confirm-receipt`),

  initiateReturn: (id: string) =>
    api.post(`/api/loans/${id}/initiate-return`),

  confirmReturn: (id: string) =>
    api.post(`/api/loans/${id}/confirm-return`),

  getLocations: () =>
    api.get<{ locations: Array<{ id: string; name: string; type: string; current_stock_bags: number }> }>('/api/loans/locations'),
};
