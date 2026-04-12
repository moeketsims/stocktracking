import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { loansApi, type CreateLoanPayload, type AcceptLoanPayload } from '../api/loans';
import { STALE_TIME } from '../constants/config';

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
    mutationFn: (data: CreateLoanPayload) => loansApi.create(data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
      Alert.alert('Success', 'Loan request sent');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create loan');
    },
  });
}

export function useAcceptLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AcceptLoanPayload }) =>
      loansApi.accept(id, data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to accept loan');
    },
  });
}

export function useRejectLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      loansApi.reject(id, reason),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to reject loan');
    },
  });
}

export function useConfirmLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loansApi.confirm(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to confirm loan');
    },
  });
}
