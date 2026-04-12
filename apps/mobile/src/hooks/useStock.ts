import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { stockApi, type IssueStockPayload } from '../api/stock';
import { useAuthStore } from '../stores/authStore';
import { STALE_TIME } from '../constants/config';

export function useStockBalance(locationId?: string) {
  return useQuery({
    queryKey: ['stock', 'balance', locationId],
    queryFn: () => stockApi.getBalance(locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useStockOverview(locationId?: string) {
  return useQuery({
    queryKey: ['stock', 'overview', locationId],
    queryFn: () => stockApi.getOverview(locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useStockByLocation() {
  return useQuery({
    queryKey: ['stock', 'byLocation'],
    queryFn: () => stockApi.getByLocation().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useTodayTransactions(locationId?: string) {
  return useQuery({
    queryKey: ['transactions', 'today', locationId],
    queryFn: () =>
      stockApi
        .getTransactions({
          days: 1,
          view_location_id: locationId,
          limit: 100,
        })
        .then((r) => r.data),
    staleTime: 10_000,
  });
}

export function useIssueStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IssueStockPayload) =>
      stockApi.issue(data).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to issue stock');
    },
  });
}

export function useReturnStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IssueStockPayload) =>
      stockApi.return(data).then((r) => r.data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to return stock');
    },
  });
}
