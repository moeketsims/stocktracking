import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUsageNotifications } from '../hooks/useBagUsage';
import { colors, spacing, typography, borderRadius } from '../constants/theme';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({ size = 24, color = colors.text.primary }: NotificationBellProps) {
  const { unreadCount } = useUsageNotifications();

  const handlePress = () => {
    router.push('/notifications');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons name="notifications-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error.main,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.primary,
    fontWeight: '700',
  },
});
