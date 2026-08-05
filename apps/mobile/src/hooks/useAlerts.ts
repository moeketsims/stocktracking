import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { alertsApi, type AcknowledgeAlertPayload } from '../api/alerts';
import { STALE_TIME } from '../constants/config';
import { assertOnlineBeforeMutation, isOfflineMutationError } from '../utils/offline';

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
    mutationFn: async (data: AcknowledgeAlertPayload) => {
      await assertOnlineBeforeMutation('acknowledge this alert');
      return alertsApi.acknowledge(data);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      if (isOfflineMutationError(error)) return;
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to acknowledge alert');
    },
  });
}
