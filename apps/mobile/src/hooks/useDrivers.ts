import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { driversApi } from '../api/drivers';
import type { CreateDriverPayload, UpdateDriverPayload } from '../types';
import { STALE_TIME } from '../constants/config';

export function useDrivers(activeOnly = true) {
  return useQuery({
    queryKey: ['drivers', activeOnly],
    queryFn: () => driversApi.list(activeOnly).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: ['drivers', id],
    queryFn: () => driversApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDriverPayload) =>
      driversApi.create(data).then((r) => r.data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      // Note: no Alert here. The caller (drivers/create.tsx) routes to
      // the invite-success screen so the manager can read the short_code
      // to the driver in person and share via WhatsApp / SMS.
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create driver');
    },
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDriverPayload }) =>
      driversApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update driver');
    },
  });
}

export function useDeactivateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driversApi.deactivate(id).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to deactivate driver');
    },
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driversApi.resendInvitation(id).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to resend invitation');
    },
  });
}
