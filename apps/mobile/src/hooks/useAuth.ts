import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { Alert } from 'react-native';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password).then((r) => r.data),
    onSuccess: async (data) => {
      await setAuth(data.user, data.access_token, data.refresh_token);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ?? 'Login failed. Please check your credentials.';
      Alert.alert('Login Error', message);
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      queryClient.clear();
      await clearAuth();
    },
  });
}
