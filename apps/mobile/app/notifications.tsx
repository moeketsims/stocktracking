import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  InkButton,
  Stamp,
} from '../src/components/wp';
import { wp, fmtKickerDate } from '../src/constants/warehousePaper';
import { Loading } from '../src/components/ui/Loading';
import {
  useNotificationFeed,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../src/hooks/useNotifications';
import type { NotificationItem } from '../src/api/notifications';
import { timeAgo } from '../src/utils/dates';

const TYPE_COLOR: Record<string, string> = {
  delivery_arrived: wp.color.green,
  request_accepted: '#1F3A8A',
  trip_started: '#5B2CA5',
  trip_completed: wp.color.green,
  low_stock_alert: wp.color.amber,
  critical_stock_alert: wp.color.red,
  bag_used: wp.color.ink3,
  daily_summary: wp.color.ink2,
};

function deepLinkFor(n: NotificationItem): string | null {
  switch (n.notification_type) {
    case 'delivery_arrived':
      return '/alerts';
    case 'request_accepted':
      return '/(tabs)/requests';
    case 'trip_started':
    case 'trip_completed':
      return '/(tabs)/trips';
    case 'low_stock_alert':
    case 'critical_stock_alert':
      return '/(tabs)/stock';
    default:
      return null;
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'TODAY';
  if (sameDay(d, yest)) return 'YESTERDAY';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const feed = useNotificationFeed();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = feed.data?.notifications ?? [];
  const unread = feed.data?.unread_count ?? 0;

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of items) {
      const k = dayKey(n.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    }
    return Array.from(map.entries());
  }, [items]);

  const handleTap = (n: NotificationItem) => {
    if (!n.is_read) markRead.mutate(n.id);
    const link = deepLinkFor(n);
    if (link) router.push(link as never);
  };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {feed.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={feed.isRefetching}
                onRefresh={() => feed.refetch()}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`MAIL ROOM — ${fmtKickerDate()}`}
              title="Notifications"
              backUseRouter
            />

            {/* Unread + mark all */}
            <View style={styles.headerRow}>
              <View>
                <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                  Unread
                </KickerLabel>
                <MonoText
                  size={22}
                  weight={700}
                  tracking={-0.5}
                  color={unread > 0 ? wp.color.red : wp.color.ink}
                >
                  {unread}
                </MonoText>
              </View>
              {unread > 0 && (
                <InkButton
                  label="Mark all read"
                  onPress={() => markAll.mutate()}
                  loading={markAll.isPending}
                />
              )}
            </View>

            {grouped.length === 0 ? (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  No notifications yet
                </MonoText>
              </View>
            ) : (
              grouped.map(([day, group]) => (
                <View key={day}>
                  <View style={styles.dayHead}>
                    <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                      {day}
                    </KickerLabel>
                    <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                      {group.length}
                    </KickerLabel>
                  </View>
                  {group.map((n, i) => (
                    <Row
                      key={n.id}
                      n={n}
                      rowIndex={i}
                      onPress={() => handleTap(n)}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function Row({
  n,
  rowIndex,
  onPress,
}: {
  n: NotificationItem;
  rowIndex: number;
  onPress: () => void;
}) {
  const accent = TYPE_COLOR[n.notification_type] ?? wp.color.ink3;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, !n.is_read && styles.rowUnread]}
    >
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.title} numberOfLines={1}>
          {n.title}
        </Text>
        {n.body ? (
          <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.bodyText} numberOfLines={2}>
            {n.body}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <MonoText size={9} tracking={1} upper color={wp.color.ink3}>
          {timeAgo(n.created_at).replace(' ago', '').toUpperCase()} AGO
        </MonoText>
        {!n.is_read && (
          <Stamp colorHex={wp.color.red} rowIndex={rowIndex}>
            NEW
          </Stamp>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 16,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 8,
    borderTopWidth: 1.5,
    borderTopColor: wp.color.lineD,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp.space.screenH,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    gap: 12,
  },
  rowUnread: {
    backgroundColor: 'rgba(194, 59, 31, 0.04)',
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
    minHeight: 36,
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 15,
    color: wp.color.ink,
  },
  bodyText: {
    fontFamily: wp.font.sans.fontFamily,
    fontSize: 12,
    color: wp.color.ink2,
    marginTop: 3,
    lineHeight: 16,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
});
