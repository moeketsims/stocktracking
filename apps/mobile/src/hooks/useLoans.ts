import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { loansApi, type CreateLoanPayload, type AcceptLoanPayload, type AssignDriverPayload } from '../api/loans';
import { STALE_TIME } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

export function useLoans(params?: { direction?: string; status?: string; include_history?: boolean }) {
  return useQuery({
    queryKey: ['loans', params],
    queryFn: () => loansApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLoanPayload) => {
      await assertOnlineBeforeMutation('create a loan');
      return loansApi.create(data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Loan request sent');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create loan');
    },
  });
}

export function useAcceptLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AcceptLoanPayload }) => {
      await assertOnlineBeforeMutation('accept this loan');
      return loansApi.accept(id, data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to accept loan');
    },
  });
}

export function useRejectLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await assertOnlineBeforeMutation('reject this loan');
      return loansApi.reject(id, reason);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to reject loan');
    },
  });
}

export function useConfirmLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('confirm this loan');
      return loansApi.confirm(id);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to confirm loan');
    },
  });
}

export function useAssignPickup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignDriverPayload }) => {
      await assertOnlineBeforeMutation('assign a pickup driver');
      return loansApi.assignPickup(id, data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Pickup driver assigned');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to assign pickup driver');
    },
  });
}

export function useConfirmReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('confirm this receipt');
      return loansApi.confirmReceipt(id);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Receipt confirmed. Stock added to your inventory.');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to confirm receipt');
    },
  });
}

export function useInitiateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('initiate this return');
      return loansApi.initiateReturn(id);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Return initiated. Assign a driver to proceed.');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to initiate return');
    },
  });
}

export function useAssignReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignDriverPayload }) => {
      await assertOnlineBeforeMutation('assign a return driver');
      return loansApi.assignReturn(id, data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Return driver assigned');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to assign return driver');
    },
  });
}

export function useConfirmReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('confirm this return');
      return loansApi.confirmReturn(id);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Return confirmed. Loan completed.');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to confirm return');
    },
  });
}

export function useLoanLocations() {
  return useQuery({
    queryKey: ['loans', 'locations'],
    queryFn: () => loansApi.getLocations().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}
