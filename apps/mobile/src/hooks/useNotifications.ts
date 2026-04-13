import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotifications, submitPushToken } from '../utils/notifications';
import { useAuthStore } from '../stores/authStore';

export function useNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

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
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, router]);
}
