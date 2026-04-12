import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  locationsApi,
  type CreateLocationPayload,
  type UpdateLocationPayload,
  type UpdateThresholdsPayload,
} from '../api/locations';
import { STALE_TIME } from '../constants/config';

// ── Queries ─────────────────────────────────────────────────────────

export function useLocations(type?: string) {
  return useQuery({
    queryKey: ['locations', type],
    queryFn: () => locationsApi.list(type).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: ['locations', id],
    queryFn: () => locationsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useLocationThresholds(id: string) {
  return useQuery({
    queryKey: ['locations', id, 'thresholds'],
    queryFn: () => locationsApi.getThresholds(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: () => locationsApi.listZones().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useLocationsByZone(zoneId: string) {
  return useQuery({
    queryKey: ['zones', zoneId, 'locations'],
    queryFn: () => locationsApi.listByZone(zoneId).then((r) => r.data),
    enabled: !!zoneId,
  });
}

export function useZoneOverview() {
  return useQuery({
    queryKey: ['zone', 'overview'],
    queryFn: () => locationsApi.getZoneOverview().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

// ── Mutations ───────────────────────────────────────────────────────

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLocationPayload) =>
      locationsApi.create(data).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create location');
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationPayload }) =>
      locationsApi.update(id, data).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['locations'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update location');
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => locationsApi.delete(id).then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['zones'] });
      Alert.alert('Success', data.message);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to delete location');
    },
  });
}

export function useUpdateThresholds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateThresholdsPayload }) =>
      locationsApi.updateThresholds(id, data).then((r) => r.data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['locations'] });
      Alert.alert('Success', 'Thresholds updated');
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update thresholds');
    },
  });
}
