import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL: string =
  extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const APP_VERSION: string =
  Constants.expoConfig?.version ?? '1.0.0';

export const STALE_TIME = 30_000; // 30 seconds
export const REFETCH_INTERVAL = 30_000; // 30 seconds for active polling
