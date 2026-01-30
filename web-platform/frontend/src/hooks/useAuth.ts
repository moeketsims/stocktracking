import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { LoginResponse } from '../types';

export function useLogin() {
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login(email, password);
      return response.data as LoginResponse;
    },
    onSuccess: (data) => {
      // Clear query cache before setting auth state to prevent race conditions
      // where old queries refetch before the new token is set
      queryClient.clear();
      login(data.access_token, data.refresh_token, data.user);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Ignore errors, we're logging out anyway
      }
    },
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useAuthStatus() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => {
      const response = await authApi.getMe();
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
