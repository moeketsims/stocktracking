import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface PushNotificationState {
  token: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    isRegistered: false,
    isLoading: false,
    error: null,
  });

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!user?.id) return null;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Dynamically import to avoid initialization errors
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      // Check if physical device (required for push notifications)
      if (!Device.isDevice) {
        throw new Error('Push notifications require a physical device');
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Push notification permission not granted');
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      const token = tokenData.data;

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#f5b42e',
        });
      }

      // Save token to Supabase
      const deviceId = Constants.installationId || 'unknown';
      const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;

      await supabase
        .from('user_push_tokens')
        .upsert(
          {
            user_id: user.id,
            expo_push_token: token,
            device_id: deviceId,
            platform: platform,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,expo_push_token',
          }
        );

      setState({
        token,
        isRegistered: true,
        isLoading: false,
        error: null,
      });

      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to register');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err,
      }));
      return null;
    }
  }, [user?.id]);

  // Unregister push notifications
  const unregisterPushNotifications = useCallback(async () => {
    if (!user?.id || !state.token) return;

    try {
      await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('expo_push_token', state.token);

      setState({
        token: null,
        isRegistered: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }, [user?.id, state.token]);

  return {
    ...state,
    registerForPushNotifications,
    unregisterPushNotifications,
  };
}
