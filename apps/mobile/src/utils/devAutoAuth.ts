import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

const DEFAULT_TEST_EMAIL = 'test@admin.com';
const DEFAULT_TEST_PASSWORD = 'password123';

let autoAuthPromise: Promise<void> | null = null;

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export function isDevAutoAuthEnabled(): boolean {
  return (
    __DEV__ &&
    Platform.OS === 'web' &&
    extra.testAuthAlways === true
  );
}

export async function ensureDevAutoAuth(): Promise<void> {
  if (!isDevAutoAuthEnabled()) return;

  const state = useAuthStore.getState();
  if (state.isAuthenticated) {
    state.unlockPin();
    return;
  }

  if (autoAuthPromise) {
    return autoAuthPromise;
  }

  autoAuthPromise = (async () => {
    const email =
      typeof extra.testAuthEmail === 'string' && extra.testAuthEmail
        ? extra.testAuthEmail
        : DEFAULT_TEST_EMAIL;
    const password =
      typeof extra.testAuthPassword === 'string' && extra.testAuthPassword
        ? extra.testAuthPassword
        : DEFAULT_TEST_PASSWORD;
    const response = await authApi.login(email, password);
    await useAuthStore
      .getState()
      .setAuth(response.data.user, response.data.access_token, response.data.refresh_token);
    useAuthStore.getState().unlockPin();
  })().finally(() => {
    autoAuthPromise = null;
  });

  return autoAuthPromise;
}
