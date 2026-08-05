import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  stockTakesApi,
  type CreateStockTakePayload,
  type UpdateLineCountPayload,
} from '../api/stockTakes';
import { STALE_TIME } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

export function useStockTakes(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['stock-takes', params],
    queryFn: () => stockTakesApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useStockTake(id: string) {
  return useQuery({
    queryKey: ['stock-takes', id],
    queryFn: () => stockTakesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateStockTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStockTakePayload) => {
      await assertOnlineBeforeMutation('start a stock take');
      return stockTakesApi.create(data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock-takes'] });
      Alert.alert('Stock Take Started', `${data.lines_created} items to count.`);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create stock take');
    },
  });
}

export function useUpdateLineCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stockTakeId,
      lineId,
      data,
    }: {
      stockTakeId: string;
      lineId: string;
      data: UpdateLineCountPayload;
    }) => {
      await assertOnlineBeforeMutation('save this stock count');
      return stockTakesApi.updateLineCount(stockTakeId, lineId, data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock-takes'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to save count');
    },
  });
}

export function useCompleteStockTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      await assertOnlineBeforeMutation('complete this stock take');
      return stockTakesApi.complete(id, notes).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock-takes'] });
      Alert.alert('Completed', `Stock take completed. ${data.adjustments_created} adjustments created.`);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to complete stock take');
    },
  });
}

export function useCancelStockTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('cancel this stock take');
      return stockTakesApi.cancel(id).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock-takes'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to cancel stock take');
    },
  });
}
