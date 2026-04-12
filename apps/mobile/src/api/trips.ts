import { api } from './client';
import type { Trip, TripStop } from '../types';

export interface TripsResponse {
  trips: Trip[];
  total: number;
}

export interface TripStopsResponse {
  stops: TripStop[];
  total_stops: number;
  completed_stops: number;
}

export interface CompleteStopPayload {
  actual_bags?: number;
  actual_qty_kg?: number;
  notes?: string;
  scanned_barcodes?: string[];
}

export interface CompleteStopResponse {
  success: boolean;
  message: string;
  stop: TripStop;
  trip_completed: boolean;
  pending_delivery_id: string | null;
}

export interface CompleteTripPayload {
  fuel_cost?: number;
  toll_cost?: number;
  other_cost?: number;
  fuel_litres?: number;
  other_cost_description?: string;
  odometer_start?: number;
  odometer_end?: number;
  notes?: string;
  linked_batch_ids?: string[];
}

export interface CompleteTripResponse {
  success: boolean;
  message: string;
  trip: Trip;
  pending_delivery_id: string | null;
}

export interface AwaitingKmResponse {
  trip: {
    id: string;
    trip_number: string;
    vehicle_id: string;
    vehicle_registration: string;
    vehicle_name: string;
    destination: string;
    driver_name: string;
    odometer_start: number | null;
    completed_at: string;
  } | null;
}

export interface SubmitKmResponse {
  success: boolean;
  message: string;
  trip_number: string;
  starting_km: number;
  closing_km: number;
  distance: number;
}

export interface LoanTrip extends Trip {
  loan_id: string;
  quantity_bags: number;
  loan?: {
    id: string;
    quantity_approved: number;
    borrower: { id: string; name: string };
    lender: { id: string; name: string };
  };
}

export const tripsApi = {
  list: (params?: { status?: string; vehicle_id?: string; from_date?: string; to_date?: string; limit?: number }) =>
    api.get<TripsResponse>('/api/trips', { params }),

  get: (id: string) =>
    api.get<Trip>(`/api/trips/${id}`),

  getStops: (tripId: string) =>
    api.get<TripStopsResponse>(`/api/trips/${tripId}/stops`),

  start: (id: string, data?: { estimated_arrival_time?: string }) =>
    api.post(`/api/trips/${id}/start`, data ?? {}),

  completeStop: (stopId: string, data: CompleteStopPayload) =>
    api.post<CompleteStopResponse>(`/api/trips/stops/${stopId}/complete`, data),

  complete: (id: string, data: CompleteTripPayload) =>
    api.post<CompleteTripResponse>(`/api/trips/${id}/complete`, data),

  submitKm: (id: string, closingKm: number) =>
    api.post<SubmitKmResponse>(`/api/trips/${id}/submit-km`, null, {
      params: { closing_km: closingKm },
    }),

  getAwaitingKm: () =>
    api.get<AwaitingKmResponse>('/api/trips/driver/awaiting-km'),

  getLoanTrips: () =>
    api.get<{ trips: LoanTrip[]; total: number }>('/api/trips/driver/loan-trips'),
};
