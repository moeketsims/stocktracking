import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/stores/authStore';
import { Loading } from '../src/components/ui/Loading';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { STALE_TIME } from '../src/constants/config';
import { brand } from '../src/constants/theme';
import { useNotifications } from '../src/hooks/useNotifications';
import OfflineBanner from '../src/components/OfflineBanner';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      retry: 2,
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 30,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  // Register push notifications when authenticated
  useNotifications();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <Loading fullScreen message="Loading..." />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthGuard>
          <View style={styles.root}>
          <OfflineBanner />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: brand.gradientStart },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: '700', fontSize: 17 },
              headerBackTitleVisible: false,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          </View>
        </AuthGuard>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
