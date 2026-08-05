import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { deliveriesApi, type ConfirmDeliveryPayload, type CorrectKmPayload } from '../api/deliveries';
import { STALE_TIME, REFETCH_INTERVAL } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

export function usePendingDeliveries(params?: { status?: string; location_id?: string }) {
  return useQuery({
    queryKey: ['deliveries', 'pending', params],
    queryFn: () => deliveriesApi.list({ ...params, status: params?.status ?? 'pending' }).then((r) => r.data),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: ['deliveries', id],
    queryFn: () => deliveriesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ConfirmDeliveryPayload }) => {
      await assertOnlineBeforeMutation('confirm this delivery');
      return deliveriesApi.confirm(id, data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      const msg = data.has_discrepancy
        ? `Confirmed ${data.confirmed_bags} bags (discrepancy: ${data.discrepancy_bags})`
        : `Confirmed ${data.confirmed_bags} bags`;
      Alert.alert('Delivery Confirmed', msg);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to confirm delivery');
    },
  });
}

export function useResendKmEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      await assertOnlineBeforeMutation('resend this KM email');
      return deliveriesApi.resendKmEmail(deliveryId).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Email Sent', data.message ?? 'KM submission email resent to driver.');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to resend KM email');
    },
  });
}

export function useCorrectKm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CorrectKmPayload }) => {
      await assertOnlineBeforeMutation('correct this KM reading');
      return deliveriesApi.correctKm(tripId, data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      Alert.alert('KM Corrected', data.message ?? 'Closing KM has been corrected.');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to correct KM');
    },
  });
}

export function useRejectDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await assertOnlineBeforeMutation('reject this delivery');
      return deliveriesApi.reject(id, reason);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['deliveries'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to reject delivery');
    },
  });
}
