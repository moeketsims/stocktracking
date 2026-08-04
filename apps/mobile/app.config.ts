import type { ExpoConfig } from 'expo/config';

const easProjectId =
  process.env.EXPO_EAS_PROJECT_ID ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  '412d6a6e-d94f-4a14-adce-779b409be29a';

const config: ExpoConfig = {
  name: 'Potato Stock',
  slug: 'potato-stock',
  version: '1.0.0',
  updates: {
    url: `https://u.expo.dev/${easProjectId}`,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'potato-stock',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.potatostock.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a',
    },
    package: 'com.potatostock.mobile',
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
    testAuthAlways: process.env.EXPO_PUBLIC_TEST_AUTH_ALWAYS === 'true',
    testAuthEmail: process.env.EXPO_PUBLIC_TEST_AUTH_EMAIL,
    testAuthPassword: process.env.EXPO_PUBLIC_TEST_AUTH_PASSWORD,
    eas: easProjectId ? { projectId: easProjectId } : {},
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    'expo-font',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Potato Stock to use the camera for barcode scanning.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#f97316',
        sounds: [],
      },
    ],
  ],
};

export default config;
