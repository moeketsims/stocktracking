import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

// Configure how notifications are handled when app is in foreground.
// expo-notifications ≥0.29 deprecated `shouldShowAlert` in favor of
// `shouldShowBanner` + `shouldShowList`; both are required by the type.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getExpoProjectId(): string | undefined {
  const expoProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  return typeof expoProjectId === 'string' && expoProjectId.trim()
    ? expoProjectId
    : undefined;
}

function getResponseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null || !('status' in response)) {
    return undefined;
  }

  const status = (response as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Expo Go no longer supports remote push notifications. Registration is
  // reserved for development and store builds that include native support.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      console.log('Skipping push notification registration: no Expo project ID configured');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

export async function submitPushToken(token: string): Promise<void> {
  try {
    await api.post('/api/users/push-token', { push_token: token, platform: Platform.OS });
  } catch (error) {
    // Authentication expiry is handled by the shared API interceptor. It is
    // an expected session transition, not a notification failure to surface.
    if (getResponseStatus(error) === 401) {
      return;
    }

    console.warn('Failed to submit push token:', error);
  }
}
