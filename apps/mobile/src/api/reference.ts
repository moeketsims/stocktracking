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
    api.get<Item[]>('/api/reference/items'),

  getLocations: () =>
    api.get<Location[]>('/api/reference/locations'),

  getVehicles: () =>
    api.get<Vehicle[]>('/api/vehicles'),

  getSuppliers: () =>
    api.get<Supplier[]>('/api/suppliers'),
};
