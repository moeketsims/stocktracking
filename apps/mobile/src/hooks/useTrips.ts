import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  tripsApi,
  type CompleteStopPayload,
  type CompleteTripPayload,
} from '../api/trips';
import { STALE_TIME } from '../constants/config';

export function useTrips(params?: { status?: string }) {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripsApi.list(params).then((r) => r.data),
    staleTime: STALE_TIME,
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

export function useStartTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eta }: { id: string; eta?: string }) =>
      tripsApi.start(id, eta ? { estimated_arrival_time: eta } : undefined),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to start trip');
    },
  });
}

export function useCompleteStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stopId, data }: { stopId: string; data: CompleteStopPayload }) =>
      tripsApi.completeStop(stopId, data).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      if (data.trip_completed) {
        Alert.alert('Trip Complete', 'All stops have been completed.');
      }
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to complete stop');
    },
  });
}

export function useCompleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteTripPayload }) =>
      tripsApi.complete(id, data).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to complete trip');
    },
  });
}

export function useSubmitKm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closingKm }: { id: string; closingKm: number }) =>
      tripsApi.submitKm(id, closingKm).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['awaitingKm'] });
      Alert.alert('KM Submitted', `Distance: ${data.distance} km`);
    },
    onError: (error: any) => {
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
