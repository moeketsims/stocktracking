const mockPost = jest.fn();
const mockGetPermissionsAsync = jest.fn();

jest.mock('../../api/client', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'expo',
    expoConfig: { extra: { eas: { projectId: 'test-project' } } },
  },
}));

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { registerForPushNotifications, submitPushToken } from '../../utils/notifications';

describe('push notification registration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips unsupported remote push registration in Expo Go', async () => {
    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });

  it('treats an authentication 401 as a normal session transition', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });

    await expect(submitPushToken('ExponentPushToken[test]')).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it('still reports unexpected push-token submission failures', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });

    await submitPushToken('ExponentPushToken[test]');

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
