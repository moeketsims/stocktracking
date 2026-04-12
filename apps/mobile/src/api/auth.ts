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
};
