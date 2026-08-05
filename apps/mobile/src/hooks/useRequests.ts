import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  requestsApi,
  type ProposeTimePayload,
  type CreateTripPayload,
  type UpdateRequestPayload,
  type CancelRequestPayload,
  type DeclineProposalPayload,
} from '../api/requests';
import { STALE_TIME, REFETCH_INTERVAL } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

export function useAvailableRequests() {
  return useQuery({
    queryKey: ['requests', 'available'],
    queryFn: () => requestsApi.getAvailable().then((r) => r.data),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useMyRequests(status?: string) {
  return useQuery({
    queryKey: ['requests', 'mine', status],
    queryFn: () => requestsApi.list({ status }).then((r) => r.data),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useActiveRequests() {
  return useQuery({
    queryKey: ['requests', 'active'],
    queryFn: () => requestsApi.listActive().then((r) => r.data),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useRequestHistory(offset: number = 0, limit: number = 20) {
  return useQuery({
    queryKey: ['requests', 'history', offset, limit],
    queryFn: () => requestsApi.listHistory({ limit, offset }).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: () => requestsApi.get(id).then((r) => {
      // Backend returns { request: { ...data } }
      const data = r.data as any;
      return data.request ?? data;
    }),
    enabled: !!id,
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('accept this request');
      return requestsApi.accept(id).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to accept request');
    },
  });
}

export function useProposeTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProposeTimePayload }) => {
      await assertOnlineBeforeMutation('propose a delivery time');
      return requestsApi.proposeTime(id, data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to propose time');
    },
  });
}

export function useCreateTripFromRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateTripPayload }) => {
      await assertOnlineBeforeMutation('create a trip');
      return requestsApi.createTrip(id, data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['trips'] });
      Alert.alert('Trip Created', data.message);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create trip');
    },
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRequestPayload }) => {
      await assertOnlineBeforeMutation('update this request');
      return requestsApi.update(id, data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update request');
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CancelRequestPayload }) => {
      await assertOnlineBeforeMutation('cancel this request');
      return requestsApi.cancel(id, data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to cancel request');
    },
  });
}

export function useReRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('resend this request');
      return requestsApi.reRequest(id).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to re-request');
    },
  });
}

export function useAcceptProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('accept this proposal');
      return requestsApi.acceptProposal(id).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to accept proposal');
    },
  });
}

export function useDeclineProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DeclineProposalPayload }) => {
      await assertOnlineBeforeMutation('decline this proposal');
      return requestsApi.declineProposal(id, data).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to decline proposal');
    },
  });
}
