import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  tripsApi,
  type CreateTripPayload,
  type CompleteStopPayload,
  type CompleteTripPayload,
} from '../api/trips';
import { STALE_TIME, REFETCH_INTERVAL } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

export function useTrips(params?: { status?: string }) {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripsApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ['trips', id],
    queryFn: () => tripsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useTripStops(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId, 'stops'],
    queryFn: () => tripsApi.getStops(tripId).then((r) => r.data),
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTripPayload) => {
      await assertOnlineBeforeMutation('create a trip');
      return tripsApi.create(data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      Alert.alert('Trip Created', data.message ?? `Trip ${data.trip_number} created`);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create trip');
    },
  });
}

export function useCancelTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('cancel this trip');
      return tripsApi.cancel(id).then((r) => r.data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      Alert.alert('Trip Cancelled', 'The trip has been cancelled.');
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to cancel trip');
    },
  });
}

export function useStartTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, eta }: { id: string; eta?: string }) => {
      await assertOnlineBeforeMutation('start this trip');
      return tripsApi.start(id, eta ? { estimated_arrival_time: eta } : undefined);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to start trip');
    },
  });
}

export function useCompleteStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stopId, data }: { stopId: string; data: CompleteStopPayload }) => {
      await assertOnlineBeforeMutation('complete this stop');
      return tripsApi.completeStop(stopId, data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      if (data.trip_completed) {
        Alert.alert('Trip Complete', 'All stops have been completed.');
      }
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to complete stop');
    },
  });
}

export function useCompleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompleteTripPayload }) => {
      await assertOnlineBeforeMutation('complete this trip');
      return tripsApi.complete(id, data).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to complete trip');
    },
  });
}

export function useSubmitKm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, closingKm }: { id: string; closingKm: number }) => {
      await assertOnlineBeforeMutation('submit closing KM');
      return tripsApi.submitKm(id, closingKm).then((r) => r.data);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['awaitingKm'] });
      Alert.alert('KM Submitted', `Distance: ${data.distance} km`);
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to submit KM');
    },
  });
}

export function useAwaitingKm() {
  return useQuery({
    queryKey: ['awaitingKm'],
    queryFn: () => tripsApi.getAwaitingKm().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useLoanTrips() {
  return useQuery({
    queryKey: ['trips', 'loan'],
    queryFn: () => tripsApi.getLoanTrips().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}
