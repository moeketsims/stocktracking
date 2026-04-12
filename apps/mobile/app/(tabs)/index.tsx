import React from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAvailableRequests } from '../../src/hooks/useRequests';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

/* ── Design tokens ── */
const BRAND    = '#1e1b4b';
const BRAND_MID = '#312e81';
const WARM_BG  = '#faf9f7';
const CARD_R   = 16;

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const isManagerRole = ['admin', 'zone_manager', 'location_manager'].includes(role ?? '');
  const dashboardLocationId = isManagerRole ? undefined : (user?.location_id ?? undefined);
  const dashboard = useDashboard(dashboardLocationId);
  const available = useAvailableRequests();
  const pending = usePendingDeliveries();

  const stats = dashboard.data?.stats;
  const forecast = dashboard.data?.forecast;
  const balances = dashboard.data?.stock_balance ?? [];

  const isManager = isManagerRole;
  const isDriver = role === 'driver';
  const requestCount = available.data?.total ?? 0;
  const deliveryCount = pending.data?.total ?? 0;

  if (dashboard.isLoading) return <Loading fullScreen message="Loading dashboard..." />;

  const daysOfCover = forecast ? Math.min(forecast.days_of_cover, 999) : 0;
  const daysLabel = daysOfCover >= 999 ? '999+' : daysOfCover.toFixed(0);
  const totalBags = stats?.total_stock_bags?.toFixed(0) ?? '0';

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching}
            tintColor="#fff"
            onRefresh={() => { dashboard.refetch(); available.refetch(); pending.refetch(); }}
          />
        }
      >
        {/* ════════════════════════════════════
            HERO — branded header with primary metric
        ════════════════════════════════════ */}
        <View style={st.hero}>
          {/* Identity */}
          <Text style={st.heroGreeting}>{getGreeting()}</Text>
          <Text style={st.heroName}>{user?.full_name ?? user?.email}</Text>
          <View style={st.heroMeta}>
            <View style={st.heroRolePill}>
              <Text style={st.heroRoleText}>{formatRole(role ?? 'staff')}</Text>
            </View>
            {user?.location_name && (
              <View style={st.heroLocRow}>
                <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.55)" />
                <Text style={st.heroLocText}>{user.location_name}</Text>
              </View>
            )}
          </View>

          {/* Primary metric — fully visible, intentional */}
          {stats && (
            <View style={st.heroMetricRow}>
              <Text style={st.heroMetricValue}>{totalBags}</Text>
              <Text style={st.heroMetricUnit}>bags in stock</Text>
            </View>
          )}
        </View>

        {/* ════════════════════════════════════
            QUICK STATS — tight metrics bar
        ════════════════════════════════════ */}
        {stats && (
          <View style={st.metricsBar}>
            <Metric value={stats.received_today_bags.toFixed(0)} label="Received" icon="arrow-down-circle" color="#059669" bg="#ecfdf5" />
            <View style={st.metricDivider} />
            <Metric value={stats.issued_today_bags.toFixed(0)} label="Issued" icon="arrow-up-circle" color={BRAND_MID} bg="#ede9fe" />
            <View style={st.metricDivider} />
            <Metric value={stats.wasted_today_bags.toFixed(0)} label="Wasted" icon="close-circle" color="#dc2626" bg="#fef2f2" />
          </View>
        )}

        <View style={st.body}>
          {/* ════════════════════════════════════
              ALERTS — compact strip
          ════════════════════════════════════ */}
          {stats && (stats.low_stock_alerts > 0 || stats.reorder_alerts > 0 || stats.expiring_soon_alerts > 0) && (
            <TouchableOpacity style={st.alertBar} onPress={() => router.push('/alerts')} activeOpacity={0.7}>
              <View style={st.alertPulse} />
              <Text style={st.alertBarText}>
                {[
                  stats.low_stock_alerts > 0 && `${stats.low_stock_alerts} low stock`,
                  stats.reorder_alerts > 0 && `${stats.reorder_alerts} reorder`,
                  stats.expiring_soon_alerts > 0 && `${stats.expiring_soon_alerts} expiring`,
                ].filter(Boolean).join(' · ')}
              </Text>
              <Ionicons name="chevron-forward" size={15} color="#b91c1c" />
            </TouchableOpacity>
          )}

          {/* ════════════════════════════════════
              FORECAST — balanced card
          ════════════════════════════════════ */}
          {forecast && forecast.avg_daily_usage_bags > 0 && (
            <View style={st.card}>
              <View style={st.cardHeader}>
                <View style={st.cardIconBox}>
                  <Ionicons name="analytics-outline" size={15} color={BRAND} />
                </View>
                <Text style={st.cardTitle}>Forecast</Text>
              </View>
              <View style={st.forecastBody}>
                <View style={st.forecastLeft}>
                  <Text style={st.forecastBig}>{daysLabel}</Text>
                  <Text style={st.forecastBigLabel}>days of cover</Text>
                </View>
                <View style={st.forecastDivider} />
                <View style={st.forecastRight}>
                  <View style={st.forecastMiniBlock}>
                    <Text style={st.forecastMiniVal}>{forecast.avg_daily_usage_bags.toFixed(1)}</Text>
                    <Text style={st.forecastMiniLabel}>daily use</Text>
                  </View>
                  {forecast.suggested_order_qty_bags > 0 && (
                    <View style={st.forecastMiniBlock}>
                      <Text style={st.forecastMiniVal}>{forecast.suggested_order_qty_bags.toFixed(0)}</Text>
                      <Text style={st.forecastMiniLabel}>order qty</Text>
                    </View>
                  )}
                </View>
              </View>
              {forecast.stock_out_date && (
                <View style={st.stockOutRow}>
                  <Ionicons name="warning-outline" size={13} color="#dc2626" />
                  <Text style={st.stockOutText}>
                    Stock out projected {new Date(forecast.stock_out_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ════════════════════════════════════
              PRIMARY ACTION — requests / deliveries
          ════════════════════════════════════ */}
          {isDriver && (
            <TouchableOpacity
              style={[st.actionCard, requestCount > 0 ? st.actionActive : st.actionIdle]}
              onPress={() => router.push('/(tabs)/requests')}
              activeOpacity={0.75}
            >
              <View style={[st.actionIcon, requestCount > 0 ? st.actionIconActive : st.actionIconIdle]}>
                <Ionicons name="document-text" size={20} color={requestCount > 0 ? '#fff' : colors.gray[400]} />
              </View>
              <View style={st.actionContent}>
                <Text style={[st.actionTitle, requestCount > 0 && { color: BRAND }]}>
                  Available Requests
                </Text>
                <Text style={st.actionSub}>
                  {requestCount > 0 ? `${requestCount} pending — tap to accept` : 'No requests right now'}
                </Text>
              </View>
              {requestCount > 0 && (
                <View style={st.actionBubble}>
                  <Text style={st.actionBubbleText}>{requestCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={requestCount > 0 ? BRAND : colors.gray[300]} />
            </TouchableOpacity>
          )}

          {isManager && (
            <TouchableOpacity
              style={[st.actionCard, deliveryCount > 0 ? st.actionDelivery : st.actionIdle]}
              onPress={() => router.push('/alerts')}
              activeOpacity={0.75}
            >
              <View style={[st.actionIcon, deliveryCount > 0 ? st.actionIconDelivery : st.actionIconIdle]}>
                <Ionicons name="cube" size={20} color={deliveryCount > 0 ? '#fff' : colors.gray[400]} />
              </View>
              <View style={st.actionContent}>
                <Text style={[st.actionTitle, deliveryCount > 0 && { color: '#9a3412' }]}>
                  Pending Deliveries
                </Text>
                <Text style={st.actionSub}>
                  {deliveryCount > 0 ? `${deliveryCount} awaiting confirmation` : 'All confirmed'}
                </Text>
              </View>
              {deliveryCount > 0 && (
                <View style={[st.actionBubble, { backgroundColor: '#ea580c' }]}>
                  <Text style={st.actionBubbleText}>{deliveryCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={deliveryCount > 0 ? '#ea580c' : colors.gray[300]} />
            </TouchableOpacity>
          )}

          {/* ════════════════════════════════════
              REPORTS — managers
          ════════════════════════════════════ */}
          {isManager && (
            <TouchableOpacity style={st.linkRow} onPress={() => router.push('/reports')} activeOpacity={0.7}>
              <View style={st.linkIconBox}>
                <Ionicons name="stats-chart" size={16} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.linkTitle}>Reports & Analytics</Text>
                <Text style={st.linkSub}>Stock trends, usage, deliveries</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray[300]} />
            </TouchableOpacity>
          )}

          {/* ════════════════════════════════════
              STOCK BY LOCATION — refined list
          ════════════════════════════════════ */}
          {balances.length > 0 && (
            <View style={st.locSection}>
              <Text style={st.locHeader}>Stock by Location</Text>
              <View style={st.locList}>
                {balances.map((b, i) => {
                  const bags = b.on_hand_bags ?? 0;
                  const isCrit = bags <= (b.critical_threshold ?? 0);
                  const isLow = !isCrit && bags <= (b.low_threshold ?? 0);
                  const accent = isCrit ? '#dc2626' : isLow ? '#d97706' : '#059669';
                  const pillBg = isCrit ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4';
                  const label = isCrit ? 'Critical' : isLow ? 'Low' : 'Sufficient';
                  const isLast = i === balances.length - 1;
                  return (
                    <View key={`${b.location_id}-${b.item_id}`} style={[st.locRow, !isLast && st.locRowBorder]}>
                      <View style={[st.locAccent, { backgroundColor: accent }]} />
                      <View style={st.locInfo}>
                        <Text style={st.locName}>{b.location_name}</Text>
                        <Text style={st.locItem}>{b.item_name}</Text>
                      </View>
                      <Text style={st.locBags}>{bags.toFixed(0)}</Text>
                      <View style={[st.locPill, { backgroundColor: pillBg }]}>
                        <Text style={[st.locPillText, { color: accent }]}>{label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Metric component ── */
function Metric({ value, label, icon, color, bg }: {
  value: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string;
}) {
  return (
    <View style={st.metric}>
      <View style={[st.metricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={st.metricValue}>{value}</Text>
      <Text style={st.metricLabel}>{label}</Text>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WARM_BG },
  scroll: { paddingBottom: 24 },
  body: { paddingHorizontal: 16, gap: 14, marginTop: 14 },

  /* ── Hero ── */
  hero: {
    backgroundColor: BRAND,
    paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28,
  },
  heroGreeting: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.55)', marginBottom: 2 },
  heroName: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginBottom: 8 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  heroRolePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
  },
  heroRoleText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroLocText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  heroMetricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroMetricValue: { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -2, lineHeight: 48 },
  heroMetricUnit: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },

  /* ── Metrics bar ── */
  metricsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16,
    marginTop: -14, borderRadius: CARD_R,
    paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
    }),
  },
  metric: { flex: 1, alignItems: 'center' },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  metricValue: { fontSize: 18, fontWeight: '700', color: colors.gray[900], letterSpacing: -0.3 },
  metricLabel: { fontSize: 10, fontWeight: '600', color: colors.gray[400], marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  metricDivider: { width: 1, height: 28, backgroundColor: colors.gray[100] },

  /* ── Alert bar ── */
  alertBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#fecaca',
  },
  alertPulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#dc2626' },
  alertBarText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#991b1b' },

  /* ── Generic card ── */
  card: {
    backgroundColor: '#fff', borderRadius: CARD_R, padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.gray[800] },

  /* ── Forecast ── */
  forecastBody: { flexDirection: 'row', alignItems: 'center' },
  forecastLeft: { flex: 1 },
  forecastBig: { fontSize: 38, fontWeight: '800', color: BRAND, letterSpacing: -1.5, lineHeight: 42 },
  forecastBigLabel: { fontSize: 12, fontWeight: '500', color: colors.gray[400], marginTop: 2 },
  forecastDivider: { width: 1, height: 44, backgroundColor: colors.gray[100], marginHorizontal: 18 },
  forecastRight: { gap: 12 },
  forecastMiniBlock: { alignItems: 'flex-end' },
  forecastMiniVal: { fontSize: 20, fontWeight: '700', color: colors.gray[800], letterSpacing: -0.3 },
  forecastMiniLabel: { fontSize: 10, fontWeight: '500', color: colors.gray[400], textTransform: 'uppercase', letterSpacing: 0.3 },
  stockOutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.gray[100],
  },
  stockOutText: { fontSize: 13, fontWeight: '500', color: '#dc2626' },

  /* ── Action card ── */
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: CARD_R, padding: 14, borderWidth: 1,
  },
  actionIdle: { backgroundColor: '#fff', borderColor: colors.gray[100] },
  actionActive: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
  actionDelivery: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  actionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionIconIdle: { backgroundColor: colors.gray[100] },
  actionIconActive: { backgroundColor: BRAND },
  actionIconDelivery: { backgroundColor: '#ea580c' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: colors.gray[900] },
  actionSub: { fontSize: 12, fontWeight: '400', color: colors.gray[400], marginTop: 1 },
  actionBubble: {
    backgroundColor: BRAND, minWidth: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  actionBubbleText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* ── Link row ── */
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.gray[100],
  },
  linkIconBox: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  linkTitle: { fontSize: 14, fontWeight: '600', color: colors.gray[800] },
  linkSub: { fontSize: 11, fontWeight: '400', color: colors.gray[400], marginTop: 1 },

  /* ── Stock by location ── */
  locSection: { marginTop: 6 },
  locHeader: {
    fontSize: 11, fontWeight: '700', color: colors.gray[400],
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  locList: {
    backgroundColor: '#fff', borderRadius: CARD_R, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
    }),
  },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  locRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray[50] },
  locAccent: { width: 4, height: 28, borderRadius: 2 },
  locInfo: { flex: 1 },
  locName: { fontSize: 14, fontWeight: '600', color: colors.gray[900], letterSpacing: -0.1 },
  locItem: { fontSize: 11, fontWeight: '400', color: colors.gray[400], marginTop: 1 },
  locBags: { fontSize: 17, fontWeight: '700', color: colors.gray[900], letterSpacing: -0.3, marginRight: 6 },
  locPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  locPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});
