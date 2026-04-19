import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Fraunces_700Bold_Italic, Fraunces_900Black_Italic } from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
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

function AuthGuard({ children, fontsLoaded }: { children: React.ReactNode; fontsLoaded: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pinConfigured = useAuthStore((s) => s.pinConfigured);
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  // Register push notifications when authenticated
  useNotifications();

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const currentRoute = segs[1];

    if (!isAuthenticated) {
      // No session at all → require email/password login OR an invite-code
      // redemption. Both are valid pre-authentication entry points.
      const allowedUnauth = currentRoute === 'login' || currentRoute === 'accept-code';
      if (!inAuthGroup || !allowedUnauth) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated branch — wait until we know whether a PIN is configured.
    if (pinConfigured === null) return;

    // No PIN configured → must set one before entering the app.
    if (!pinConfigured) {
      if (currentRoute !== 'pin-setup') {
        router.replace('/(auth)/pin-setup');
      }
      return;
    }

    // PIN configured. Leave the user on the PIN entry screen (the screen
    // routes home on success) or on pin-setup (used for "Change PIN" from
    // settings). Bounce them out of any other auth-group route — usually
    // a `login` left over from a fresh sign-in.
    if (inAuthGroup && currentRoute !== 'pin' && currentRoute !== 'pin-setup') {
      router.replace('/(auth)/pin');
    }
  }, [isAuthenticated, isLoading, fontsLoaded, segments, router, pinConfigured]);

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
    return <Loading fullScreen message="Loading..." />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_700Italic: Fraunces_700Bold_Italic,
    Fraunces_900Italic: Fraunces_900Black_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthGuard fontsLoaded={fontsLoaded}>
          <View style={styles.root}>
          <OfflineBanner />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: brand.gradientStart },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: '700', fontSize: 17 },
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
