import { api } from './client';
import type { AlertsData } from '../types';

export interface AcknowledgeAlertPayload {
  alert_type: string;
  location_id: string;
  item_id: string;
  notes?: string;
}

export const alertsApi = {
  list: (locationId?: string) =>
    api.get<AlertsData>('/api/alerts', {
      params: locationId ? { view_location_id: locationId } : undefined,
    }),

  acknowledge: (data: AcknowledgeAlertPayload) =>
    api.post('/api/alerts/acknowledge', data),
};
