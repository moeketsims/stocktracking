import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { alertsApi, type AcknowledgeAlertPayload } from '../api/alerts';
import { STALE_TIME } from '../constants/config';

export function useAlerts(locationId?: string) {
  return useQuery({
    queryKey: ['alerts', locationId],
    queryFn: () => alertsApi.list(locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AcknowledgeAlertPayload) => alertsApi.acknowledge(data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to acknowledge alert');
    },
  });
}
