import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usersApi, type ListUsersParams, type UpdateUserPayload } from '../api/users';
import { STALE_TIME } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

export function useUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserPayload }) => {
      await assertOnlineBeforeMutation('update this user');
      return usersApi.update(id, data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update user');
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('deactivate this user');
      return usersApi.deactivate(id).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to deactivate user');
    },
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('activate this user');
      return usersApi.activate(id).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to activate user');
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('send a password reset');
      return usersApi.resetPassword(id).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to send password reset');
    },
  });
}
