import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUsageNotifications } from '../src/hooks/useBagUsage';
import { colors, spacing, typography, borderRadius } from '../src/constants/theme';

interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: () => void;
}) {
  const getIcon = () => {
    switch (item.notification_type) {
      case 'bag_used':
        return 'bag-handle';
      case 'threshold_alert':
        return 'warning';
      case 'daily_summary':
        return 'analytics';
      default:
        return 'notifications';
    }
  };

  const getIconColor = () => {
    switch (item.notification_type) {
      case 'bag_used':
        return colors.success.main;
      case 'threshold_alert':
        return colors.warning.main;
      case 'daily_summary':
        return colors.info.main;
      default:
        return colors.primary[500];
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity
      style={[styles.notificationRow, !item.is_read && styles.unreadRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
        <Ionicons name={getIcon() as keyof typeof Ionicons.glyphMap} size={24} color={getIconColor()} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  } = useUsageNotifications();

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    // Could navigate to specific content based on notification.data
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You'll see bag usage alerts and daily summaries here
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.text.primary,
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={() => markAllAsRead()}
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item as NotificationItem}
              onPress={() => handleNotificationPress(item as NotificationItem)}
            />
          )}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  emptyList: {
    flex: 1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  unreadRow: {
    backgroundColor: colors.background.tertiary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  body: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
    marginLeft: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.background.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  markAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  markAllText: {
    ...typography.bodySmall,
    color: colors.primary[500],
    fontWeight: '600',
  },
});
