import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAvailableRequests } from '../../src/hooks/useRequests';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  // Managers see all locations (like web), staff/drivers see only their own
  const isManagerRole = ['admin', 'zone_manager', 'location_manager'].includes(role ?? '');
  const dashboardLocationId = isManagerRole ? undefined : (user?.location_id ?? undefined);
  const dashboard = useDashboard(dashboardLocationId);
  const available = useAvailableRequests();
  const pending = usePendingDeliveries();

  const stats = dashboard.data?.stats;
  const forecast = dashboard.data?.forecast;
  const balances = dashboard.data?.stock_balance ?? [];

  const greeting = getGreeting();
  const isLoading = dashboard.isLoading;
  const isManager = ['admin', 'zone_manager', 'location_manager'].includes(role ?? '');

  if (isLoading) return <Loading fullScreen message="Loading dashboard..." />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching}
            onRefresh={() => {
              dashboard.refetch();
              available.refetch();
              pending.refetch();
            }}
          />
        }
      >
        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{user?.full_name ?? user?.email}</Text>
          <Badge
            label={formatRole(role ?? 'staff')}
            variant="primary"
          />
        </View>

        {/* Stock Summary */}
        {stats && (
          <Card>
            <Text style={styles.sectionTitle}>Stock Overview</Text>
            <View style={styles.statGrid}>
              <StatTile label="Total Stock" value={`${stats.total_stock_bags.toFixed(0)}`} unit="bags" icon="cube" color={colors.primary[500]} />
              <StatTile label="Received Today" value={`${stats.received_today_bags.toFixed(0)}`} unit="bags" icon="arrow-down" color={colors.success} />
              <StatTile label="Issued Today" value={`${stats.issued_today_bags.toFixed(0)}`} unit="bags" icon="arrow-up" color={colors.info} />
              <StatTile label="Wasted Today" value={`${stats.wasted_today_bags.toFixed(0)}`} unit="bags" icon="trash" color={colors.error} />
            </View>
          </Card>
        )}

        {/* Alerts Summary */}
        {stats && (stats.low_stock_alerts > 0 || stats.reorder_alerts > 0 || stats.expiring_soon_alerts > 0) && (
          <Card style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.sectionTitle}>Alerts</Text>
              <Button title="View All" variant="ghost" size="sm" onPress={() => router.push('/alerts')} />
            </View>
            <View style={styles.alertRow}>
              {stats.low_stock_alerts > 0 && (
                <AlertPill count={stats.low_stock_alerts} label="Low Stock" variant="error" />
              )}
              {stats.reorder_alerts > 0 && (
                <AlertPill count={stats.reorder_alerts} label="Reorder" variant="warning" />
              )}
              {stats.expiring_soon_alerts > 0 && (
                <AlertPill count={stats.expiring_soon_alerts} label="Expiring" variant="info" />
              )}
            </View>
          </Card>
        )}

        {/* Forecast */}
        {forecast && forecast.days_of_cover > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Forecast</Text>
            <View style={styles.forecastRow}>
              <View style={styles.forecastItem}>
                <Text style={styles.forecastValue}>{forecast.days_of_cover.toFixed(0)}</Text>
                <Text style={styles.forecastLabel}>Days of Cover</Text>
              </View>
              <View style={styles.forecastItem}>
                <Text style={styles.forecastValue}>{forecast.avg_daily_usage_bags.toFixed(1)}</Text>
                <Text style={styles.forecastLabel}>Avg Daily Usage</Text>
              </View>
              {forecast.suggested_order_qty_bags > 0 && (
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastValue}>{forecast.suggested_order_qty_bags.toFixed(0)}</Text>
                  <Text style={styles.forecastLabel}>Order Suggested</Text>
                </View>
              )}
            </View>
            {forecast.stock_out_date && (
              <Text style={styles.stockOutWarning}>
                Stock out: {new Date(forecast.stock_out_date).toLocaleDateString()}
              </Text>
            )}
          </Card>
        )}

        {/* Reports Quick Link (Managers) */}
        {isManager && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/reports')}>
            <Card>
              <View style={styles.reportsLink}>
                <View style={styles.reportsIconBg}>
                  <Ionicons name="stats-chart" size={20} color={colors.primary[500]} />
                </View>
                <View style={styles.reportsLinkInfo}>
                  <Text style={styles.reportsLinkTitle}>Reports & Analytics</Text>
                  <Text style={styles.reportsLinkSub}>Stock trends, usage, deliveries</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Driver: Available Requests */}
        {role === 'driver' && (
          <Card>
            <View style={styles.alertHeader}>
              <Text style={styles.sectionTitle}>Available Requests</Text>
              <Badge label={`${available.data?.total ?? 0}`} variant="primary" />
            </View>
            <Text style={styles.subtitleText}>
              {(available.data?.total ?? 0) > 0
                ? 'Pending requests waiting for a driver'
                : 'No pending requests'}
            </Text>
            <Button
              title="View Requests"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(tabs)/requests')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* Manager: Pending Deliveries */}
        {(role === 'location_manager' || role === 'zone_manager' || role === 'admin') && (
          <Card>
            <View style={styles.alertHeader}>
              <Text style={styles.sectionTitle}>Pending Deliveries</Text>
              <Badge label={`${pending.data?.total ?? 0}`} variant={pending.data?.total ? 'warning' : 'neutral'} />
            </View>
            {(pending.data?.total ?? 0) > 0 && (
              <Button
                title="Review Deliveries"
                variant="outline"
                size="sm"
                onPress={() => router.push('/alerts')}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </Card>
        )}

        {/* Stock by location */}
        {balances.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Stock by Location</Text>
            {balances.map((b) => {
              const status = b.on_hand_bags <= (b.critical_threshold ?? 0)
                ? 'error' : b.on_hand_bags <= (b.low_threshold ?? 0) ? 'warning' : 'success';
              return (
                <View key={`${b.location_id}-${b.item_id}`} style={styles.balanceRow}>
                  <View style={styles.balanceInfo}>
                    <Text style={styles.balanceName}>{b.location_name}</Text>
                    <Text style={styles.balanceItem}>{b.item_name}</Text>
                  </View>
                  <View style={styles.balanceRight}>
                    <Text style={styles.balanceQty}>{b.on_hand_bags.toFixed(0)} bags</Text>
                    <Badge label={status === 'error' ? 'Critical' : status === 'warning' ? 'Low' : 'OK'} variant={status} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value, unit, icon, color }: {
  label: string; value: string; unit: string;
  icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AlertPill({ count, label, variant }: { count: number; label: string; variant: 'error' | 'warning' | 'info' }) {
  const bgMap = { error: '#fee2e2', warning: '#fef9c3', info: '#dbeafe' };
  const textMap = { error: '#991b1b', warning: '#854d0e', info: '#1e40af' };
  return (
    <View style={[styles.alertPill, { backgroundColor: bgMap[variant] }]}>
      <Text style={[styles.alertPillCount, { color: textMap[variant] }]}>{count}</Text>
      <Text style={[styles.alertPillLabel, { color: textMap[variant] }]}>{label}</Text>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  welcome: { gap: spacing.xs },
  greeting: { fontSize: fontSize.md, color: colors.gray[500] },
  name: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  subtitleText: { fontSize: fontSize.sm, color: colors.gray[500] },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statTile: { width: '46%', alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.gray[50], borderRadius: 8 },
  statValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900], marginTop: spacing.xs },
  statUnit: { fontSize: fontSize.xs, color: colors.gray[500] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  alertCard: {},
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertRow: { flexDirection: 'row', gap: spacing.sm },
  alertPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  alertPillCount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  alertPillLabel: { fontSize: fontSize.xs },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-around' },
  forecastItem: { alignItems: 'center' },
  forecastValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  forecastLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  stockOutWarning: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.md, textAlign: 'center', fontWeight: fontWeight.medium },
  reportsLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reportsIconBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  reportsLinkInfo: { flex: 1 },
  reportsLinkTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  reportsLinkSub: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray[200] },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  balanceItem: { fontSize: fontSize.xs, color: colors.gray[500] },
  balanceRight: { alignItems: 'flex-end', gap: spacing.xs },
  balanceQty: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
});
