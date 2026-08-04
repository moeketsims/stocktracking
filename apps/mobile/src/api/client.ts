import axios, { type AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/config';

// expo-secure-store doesn't support web; fall back to localStorage.
async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setToken(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteToken(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

type RetryableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

// Request interceptor: inject Bearer token.
api.interceptors.request.use(async (config) => {
  const token = await getToken('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refresh an expired access token once before logout.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';
    const canAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes('/api/auth/login') &&
      !requestUrl.includes('/api/auth/refresh');

    if (canAttemptRefresh) {
      const refreshToken = await getToken('refresh_token');
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const response = await axios.post<{
            access_token: string;
            refresh_token?: string;
          }>(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token: accessToken, refresh_token: nextRefreshToken } = response.data;
          await setToken('access_token', accessToken);
          if (nextRefreshToken) {
            await setToken('refresh_token', nextRefreshToken);
          }

          const { useAuthStore } = await import('../stores/authStore');
          await useAuthStore.getState().setAccessToken(accessToken);

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${accessToken}`,
          };
          return api(originalRequest);
        } catch {
          // Fall through to full auth clear below.
        }
      }
    }

    if (error.response?.status === 401) {
      await deleteToken('access_token');
      await deleteToken('refresh_token');
      const { useAuthStore } = await import('../stores/authStore');
      await useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);
