import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registerForPushNotifications, submitPushToken } from '../utils/notifications';
import { useAuthStore } from '../stores/authStore';
import { notificationsApi } from '../api/notifications';
import { STALE_TIME } from '../constants/config';
import { assertOnlineBeforeMutation } from '../utils/offline';

export function useNotificationFeed() {
  return useQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data.unread_count),
    staleTime: STALE_TIME,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertOnlineBeforeMutation('mark this notification read');
      return notificationsApi.markRead(id).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await assertOnlineBeforeMutation('mark notifications read');
      return notificationsApi.markAllRead().then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

function cleanupSubscription(subscription?: Notifications.EventSubscription) {
  if (!subscription) return;

  if (typeof subscription.remove === 'function') {
    subscription.remove();
    return;
  }

  const legacyRemove = (Notifications as typeof Notifications & {
    removeNotificationSubscription?: (sub: Notifications.EventSubscription) => void;
  }).removeNotificationSubscription;

  if (typeof legacyRemove === 'function') {
    legacyRemove(subscription);
  }
}

export function useNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register and submit token
    registerForPushNotifications().then((token) => {
      if (token) submitPushToken(token);
    });

    // Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      },
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        // Navigate based on notification data
        if (data?.type === 'delivery_arrived') {
          router.push('/alerts');
        } else if (data?.type === 'request_accepted') {
          router.push('/(tabs)/requests');
        } else if (data?.type === 'trip_started') {
          router.push('/(tabs)/trips');
        }
      },
    );

    return () => {
      cleanupSubscription(notificationListener.current);
      cleanupSubscription(responseListener.current);
    };
  }, [isAuthenticated, router]);
}
