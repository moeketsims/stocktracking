import { api } from './client';
import type { LoginResponse, UserProfile } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login', { email, password }),

  logout: () =>
    api.post('/api/auth/logout'),

  getMe: () =>
    api.get<UserProfile>('/api/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<{ access_token: string }>('/api/auth/refresh', {
      refresh_token: refreshToken,
    }),

  /**
   * Redeem an in-person invite code. Returns the same shape as login()
   * — the recipient is signed in immediately and the AuthGuard will
   * route them to PIN setup since they have no PIN yet.
   */
  acceptInviteCode: (shortCode: string, password: string) =>
    api.post<LoginResponse>('/api/auth/accept-invite', {
      short_code: shortCode,
      password,
    }),

  validateInvite: (value: string) =>
    api.get<{
      valid: boolean;
      email: string;
      role: string;
      full_name?: string;
      zone_name?: string;
      location_name?: string;
      expires_at: string;
    }>(`/api/auth/validate-invite/${encodeURIComponent(value)}`),
};
