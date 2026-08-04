import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  stockApi,
  type IssueStockPayload,
  type WastePayload,
  type AdjustmentPayload,
  type BatchEditPayload,
  type CreateStockRequestPayload,
  type TransferStockPayload,
} from '../api/stock';
import { useAuthStore } from '../stores/authStore';
import { STALE_TIME } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

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
    mutationFn: async (data: IssueStockPayload) => {
      await assertOnlineBeforeMutation('issue stock');
      return stockApi.issue(data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to issue stock');
    },
  });
}

export function useReturnStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: IssueStockPayload) => {
      await assertOnlineBeforeMutation('return stock');
      return stockApi.return(data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to return stock');
    },
  });
}

// --- Transfer ---

export function useTransferStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: TransferStockPayload) => {
      await assertOnlineBeforeMutation('transfer stock');
      return stockApi.transfer(data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to transfer stock');
    },
  });
}

// --- Waste ---

export function useLogWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: WastePayload) => {
      await assertOnlineBeforeMutation('log waste');
      return stockApi.waste(data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to log waste');
    },
  });
}

// --- Adjustments ---

export function useAdjustmentReasons() {
  return useQuery({
    queryKey: ['adjustments', 'reasons'],
    queryFn: () => stockApi.getAdjustmentReasons().then((r) => r.data),
    staleTime: Infinity,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdjustmentPayload) => {
      await assertOnlineBeforeMutation('create an adjustment');
      return stockApi.createAdjustment(data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create adjustment');
    },
  });
}

// --- Batches ---

export function useBatches(filterType?: 'all' | 'expiring_soon') {
  return useQuery({
    queryKey: ['batches', filterType],
    queryFn: () => stockApi.getBatches({ filter_type: filterType }).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useBatchDetail(id: string) {
  return useQuery({
    queryKey: ['batches', 'detail', id],
    queryFn: () => stockApi.getBatchDetail(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useBatchHistory(id: string) {
  return useQuery({
    queryKey: ['batches', 'history', id],
    queryFn: () => stockApi.getBatchHistory(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useEditBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BatchEditPayload }) => {
      await assertOnlineBeforeMutation('edit this batch');
      return stockApi.editBatch(id, data).then((r) => r.data);
    },
    onSuccess: (data, variables) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to edit batch');
    },
  });
}

// --- Create Stock Request ---

export function useCreateStockRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStockRequestPayload) => {
      await assertOnlineBeforeMutation('create a stock request');
      return stockApi.createStockRequest(data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create request');
    },
  });
}
