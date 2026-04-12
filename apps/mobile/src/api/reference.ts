import { api } from './client';
import type { Item, Location } from '../types';

export interface Vehicle {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  is_active: boolean;
  is_available?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
}

export const referenceApi = {
  getItems: () =>
    api.get<{ items: Item[] }>('/api/reference/items').then((r) => ({
      ...r,
      data: r.data.items ?? [],
    })),

  getLocations: () =>
    api.get<{ locations: Location[] }>('/api/reference/locations').then((r) => ({
      ...r,
      data: r.data.locations ?? [],
    })),

  getVehicles: () =>
    api.get<{ vehicles: Vehicle[]; total: number }>('/api/vehicles').then((r) => ({
      ...r,
      data: r.data.vehicles ?? [],
    })),

  getSuppliers: () =>
    api.get<{ suppliers: Supplier[] }>('/api/suppliers').then((r) => ({
      ...r,
      data: r.data.suppliers ?? [],
    })),
};
