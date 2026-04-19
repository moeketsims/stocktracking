import { api } from './client';
import type {
  DriversResponse,
  Driver,
  CreateDriverPayload,
  UpdateDriverPayload,
} from '../types';

export const driversApi = {
  list: (activeOnly = true) =>
    api.get<DriversResponse>('/api/drivers', {
      params: { active_only: activeOnly, include_profiles: true },
    }),

  get: (id: string) =>
    api.get<Driver>(`/api/drivers/${id}`),

  create: (data: CreateDriverPayload) =>
    api.post<{
      success: boolean;
      message: string;
      invitation_id: string;
      email_sent: boolean;
      short_code: string;
      expires_at: string;
    }>('/api/drivers', data),

  update: (id: string, data: UpdateDriverPayload) =>
    api.patch<{ success: boolean; message: string; driver: Driver }>(
      `/api/drivers/${id}`,
      data,
    ),

  deactivate: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/drivers/${id}`),

  resendInvitation: (id: string) =>
    api.post<{
      success: boolean;
      message: string;
      email_sent: boolean;
      short_code: string;
      expires_at: string;
    }>(`/api/drivers/${id}/resend-invitation`),
};
