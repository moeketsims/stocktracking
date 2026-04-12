import { api } from './client';
import type { Location, Zone } from '../types';

// ── Response types ──────────────────────────────────────────────────

export interface LocationDetail extends Location {
  address: string | null;
  critical_stock_threshold: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface LocationsResponse {
  locations: LocationDetail[];
}

export interface ZonesResponse {
  zones: Zone[];
}

export interface LocationsByZoneResponse {
  locations: LocationDetail[];
}

export interface CreateLocationPayload {
  name: string;
  zone_id: string;
  type: 'shop' | 'warehouse';
  address?: string;
}

export interface UpdateLocationPayload {
  name?: string;
  address?: string;
}

export interface UpdateThresholdsPayload {
  critical_stock_threshold: number;
  low_stock_threshold: number;
}

export interface MutationResponse {
  success: boolean;
  message: string;
  location?: LocationDetail;
}

export interface ThresholdsResponse {
  location_id: string;
  location_name: string;
  critical_stock_threshold: number;
  low_stock_threshold: number;
}

// ── Zone overview types ─────────────────────────────────────────────

export interface LocationStatus {
  location_id: string;
  location_name: string;
  location_type: 'shop' | 'warehouse';
  on_hand_qty: number;
  on_hand_bags: number;
  days_of_cover: number;
  avg_daily_usage: number;
  avg_daily_usage_bags: number;
  status: 'ok' | 'reorder' | 'low_stock';
}

export interface ZoneOverviewResponse {
  zone_id: string;
  zone_name: string;
  total_kg: number;
  total_bags: number;
  shop_count: number;
  low_stock_count: number;
  warehouse: LocationStatus | null;
  shops: LocationStatus[];
  reallocation_suggestions: unknown[];
}

// ── API functions ───────────────────────────────────────────────────

export const locationsApi = {
  // List all locations (with zone names, thresholds)
  list: (type?: string) =>
    api.get<LocationsResponse>('/api/locations', {
      params: type ? { type } : undefined,
    }),

  // Get single location detail
  get: (id: string) =>
    api.get<LocationDetail>(`/api/locations/${id}`),

  // Get location thresholds
  getThresholds: (id: string) =>
    api.get<ThresholdsResponse>(`/api/locations/${id}/thresholds`),

  // Update thresholds
  updateThresholds: (id: string, data: UpdateThresholdsPayload) =>
    api.patch<MutationResponse>(`/api/locations/${id}/thresholds`, data),

  // Create location (admin)
  create: (data: CreateLocationPayload) =>
    api.post<MutationResponse>('/api/reference/locations', data),

  // Update location (admin)
  update: (id: string, data: UpdateLocationPayload) =>
    api.patch<MutationResponse>(`/api/reference/locations/${id}`, data),

  // Delete location (admin)
  delete: (id: string) =>
    api.delete<MutationResponse>(`/api/reference/locations/${id}`),

  // List all zones
  listZones: () =>
    api.get<ZonesResponse>('/api/reference/zones'),

  // List locations in a zone
  listByZone: (zoneId: string) =>
    api.get<LocationsByZoneResponse>(`/api/reference/locations-by-zone/${zoneId}`),

  // Zone overview (manager's zone)
  getZoneOverview: () =>
    api.get<ZoneOverviewResponse>('/api/zone/overview'),
};
