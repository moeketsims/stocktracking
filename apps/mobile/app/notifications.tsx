import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { brand, colors, spacing, fontSize, fontWeight } from '../src/constants/theme';
import { registerForPushNotifications } from '../src/utils/notifications';

export default function NotificationsScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        Alert.alert('Notifications Enabled', 'Push notifications are enabled for this device.');
      } else {
        // Attempt to request permission
        const token = await registerForPushNotifications();
        if (token) {
          setPermissionStatus('granted');
          Alert.alert('Notifications Enabled', 'Push notifications have been enabled.');
        } else {
          setPermissionStatus('denied');
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to receive alerts.',
          );
        }
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      Alert.alert('Error', 'Could not check notification permissions. Please try again.');
    }
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
          </View>

          <Text style={styles.title}>Push Notifications</Text>
          <Text style={styles.description}>
            Stay informed about stock requests, delivery updates, and important alerts in real time.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            <Text style={styles.cardText}>
              {'\u2022'} Receive alerts when deliveries arrive{'\n'}
              {'\u2022'} Get notified when requests are accepted{'\n'}
              {'\u2022'} Stay updated on trip progress{'\n'}
              {'\u2022'} Low stock warnings sent directly to you
            </Text>
          </View>

          {permissionStatus !== null && (
            <View
              style={[
                styles.statusBadge,
                permissionStatus === 'granted' ? styles.statusGranted : styles.statusDenied,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  permissionStatus === 'granted'
                    ? styles.statusTextGranted
                    : styles.statusTextDenied,
                ]}
              >
                {permissionStatus === 'granted'
                  ? 'Notifications are enabled'
                  : 'Notifications are disabled'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={checkPermissions} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Check Notification Permissions</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            If notifications are not working, check your device settings and ensure notifications are
            allowed for Potato Stock.
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brand.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  statusGranted: { backgroundColor: '#dcfce7' },
  statusDenied: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  statusTextGranted: { color: '#166534' },
  statusTextDenied: { color: '#991b1b' },
  button: {
    backgroundColor: brand.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});
