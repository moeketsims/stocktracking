import { api } from './client';

export interface Vehicle {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  capacity_kg: number | null;
  fuel_type: string | null;
  notes: string | null;
  is_active: boolean;
  is_available?: boolean;
  current_trip?: {
    trip_id: string;
    trip_number: string;
    driver_name: string;
    status: string;
  } | null;
  created_at?: string;
}

export interface CreateVehiclePayload {
  registration_number: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  capacity_kg?: number | null;
  fuel_type?: string | null;
  notes?: string | null;
}

export interface UpdateVehiclePayload {
  registration_number?: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  capacity_kg?: number | null;
  fuel_type?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export const vehiclesApi = {
  list: (activeOnly = false) =>
    api.get<{ vehicles: Vehicle[]; total: number }>('/api/vehicles', {
      params: { active_only: activeOnly, include_trip_status: true },
    }),

  get: (id: string) =>
    api.get<Vehicle>(`/api/vehicles/${id}`),

  create: (data: CreateVehiclePayload) =>
    api.post<{ success: boolean; message: string; vehicle: Vehicle }>('/api/vehicles', data),

  update: (id: string, data: UpdateVehiclePayload) =>
    api.patch<{ success: boolean; message: string; vehicle: Vehicle }>(`/api/vehicles/${id}`, data),

  deactivate: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/vehicles/${id}`),
};
