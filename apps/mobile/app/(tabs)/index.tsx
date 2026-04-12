import React from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAvailableRequests } from '../../src/hooks/useRequests';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Loading } from '../../src/components/ui/Loading';
import { brand } from '../../src/constants/theme';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const isManagerRole = ['admin', 'zone_manager', 'location_manager'].includes(role ?? '');
  const dashboard = useDashboard(isManagerRole ? undefined : (user?.location_id ?? undefined));
  const available = useAvailableRequests();
  const pending = usePendingDeliveries();

  const stats = dashboard.data?.stats;
  const forecast = dashboard.data?.forecast;
  const balances = dashboard.data?.stock_balance ?? [];
  const isDriver = role === 'driver';
  const isManager = isManagerRole;
  const reqCount = available.data?.total ?? 0;
  const delCount = pending.data?.total ?? 0;

  if (dashboard.isLoading) return <Loading fullScreen message="" />;

  const bags = stats?.total_stock_bags ?? 0;
  const received = stats?.received_today_bags ?? 0;
  const issued = stats?.issued_today_bags ?? 0;
  const wasted = stats?.wasted_today_bags ?? 0;
  const hasUsage = forecast && forecast.avg_daily_usage_bags > 0;
  const lowCount = balances.filter((b) => {
    const oh = b.on_hand_bags ?? 0;
    return oh <= (b.critical_threshold ?? 0) || oh <= (b.low_threshold ?? 0);
  }).length;

  return (
    <SafeAreaView style={$.root} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={$.scroll}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching}
            tintColor="#fff"
            onRefresh={() => { dashboard.refetch(); available.refetch(); pending.refetch(); }}
          />
        }
      >
        {/* ─── Gradient Hero Zone ─── */}
        <LinearGradient
          colors={[brand.gradientStart, brand.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={$.hero}
        >
          <View style={$.heroContent}>
            <Text style={$.heroGreet}>{greet()}</Text>
            <Text style={$.heroName}>{user?.full_name ?? user?.email}</Text>
            <View style={$.heroMeta}>
              <View style={$.rolePill}>
                <Text style={$.roleText}>{fmtRole(role ?? 'staff')}</Text>
              </View>
              {user?.location_name && (
                <View style={$.locPill}>
                  <Ionicons name="location" size={10} color="rgba(255,255,255,0.6)" />
                  <Text style={$.locText}>{user.location_name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Hero KPI strip inside gradient */}
          <View style={$.heroKpi}>
            <HeroMetric label="Total Stock" value={bags.toFixed(0)} unit="bags" />
            <View style={$.heroKpiDivider} />
            <HeroMetric label="Received" value={received.toFixed(0)} unit="today" highlight />
            <View style={$.heroKpiDivider} />
            <HeroMetric label="Issued" value={issued.toFixed(0)} unit="today" />
          </View>
        </LinearGradient>

        {/* ─── Overlapping Cards Zone ─── */}
        <View style={$.body}>
          {/* Wasted + Low alerts row — overlaps into gradient */}
          <View style={$.alertRow}>
            <AlertChip icon="flame-outline" label="Wasted" value={wasted.toFixed(0)} tone={wasted > 0 ? 'danger' : 'neutral'} />
            <AlertChip icon="warning-outline" label="Low Stock" value={lowCount.toString()} tone={lowCount > 0 ? 'warning' : 'neutral'} />
            <AlertChip icon="cube-outline" label="Pending" value={delCount.toString()} tone={delCount > 0 ? 'info' : 'neutral'} />
          </View>

          {/* Priority banner */}
          {isManager && delCount > 0 && (
            <TouchableOpacity style={$.banner} activeOpacity={0.7} onPress={() => router.push('/alerts')}>
              <View style={$.bannerDot} />
              <Text style={$.bannerText}>{delCount} deliver{delCount !== 1 ? 'ies' : 'y'} pending confirmation</Text>
              <Ionicons name="chevron-forward" size={16} color={brand.accent} />
            </TouchableOpacity>
          )}
          {isDriver && reqCount > 0 && (
            <TouchableOpacity style={$.banner} activeOpacity={0.7} onPress={() => router.push('/(tabs)/requests')}>
              <View style={[$.bannerDot, { backgroundColor: '#22c55e' }]} />
              <Text style={$.bannerText}>{reqCount} request{reqCount !== 1 ? 's' : ''} available</Text>
              <Ionicons name="chevron-forward" size={16} color={brand.accent} />
            </TouchableOpacity>
          )}

          {/* Quick Actions 2x2 */}
          {isManager && (
            <>
              <Text style={$.sectionTitle}>Quick Actions</Text>
              <View style={$.qaGrid}>
                <QACard icon="warning" label="Alerts" tint="#ef4444" onPress={() => router.push('/alerts')} />
                <QACard icon="stats-chart" label="Reports" tint="#6366f1" onPress={() => router.push('/reports')} />
                <QACard icon="document-text" label="Requests" tint="#0ea5e9" onPress={() => router.push('/(tabs)/requests')} />
                <QACard icon="add-circle" label="New Request" tint="#22c55e" onPress={() => router.push('/stock/create-request')} />
              </View>
            </>
          )}

          {/* Forecast */}
          {hasUsage && (
            <>
              <Text style={$.sectionTitle}>Forecast</Text>
              <View style={$.forecastRow}>
                <ForecastCard value={Math.min(forecast!.days_of_cover, 999).toFixed(0)} label="Days Cover" />
                <ForecastCard value={forecast!.avg_daily_usage_bags.toFixed(1)} label="Daily Use" />
                {forecast!.suggested_order_qty_bags > 0 && (
                  <ForecastCard value={forecast!.suggested_order_qty_bags.toFixed(0)} label="Order Qty" />
                )}
              </View>
            </>
          )}

          {/* Locations */}
          <View style={$.locHeader}>
            <Text style={$.sectionTitle}>Locations</Text>
            {isManager && (
              <TouchableOpacity onPress={() => router.push('/reports')} activeOpacity={0.7}>
                <Text style={$.locLink}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {balances.length > 0 ? (
            <View style={$.locCard}>
              {balances.map((b, i) => {
                const oh = b.on_hand_bags ?? 0;
                const crit = oh <= (b.critical_threshold ?? 0);
                const low = !crit && oh <= (b.low_threshold ?? 0);
                const dot = crit ? '#ef4444' : low ? '#f59e0b' : '#22c55e';
                return (
                  <View key={`${b.location_id}-${b.item_id}`} style={[$.locRow, i < balances.length - 1 && $.locBorder]}>
                    <View style={[$.locDot, { backgroundColor: dot }]} />
                    <View style={$.locMeta}>
                      <Text style={$.locName}>{b.location_name}</Text>
                      <Text style={$.locSub}>{b.item_name}</Text>
                    </View>
                    <Text style={$.locQty}>{oh.toFixed(0)}</Text>
                    <Text style={[$.locStatus, { color: dot }]}>
                      {crit ? 'Critical' : low ? 'Low' : 'OK'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={$.emptyCard}>
              <Ionicons name="cube-outline" size={24} color="#cbd5e1" />
              <Text style={$.emptyText}>No inventory data</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Sub-components ─── */

function HeroMetric({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <View style={$.heroMetric}>
      <Text style={$.heroMetricLabel}>{label}</Text>
      <Text style={[$.heroMetricValue, highlight && { color: brand.accent }]}>{value}</Text>
      <Text style={$.heroMetricUnit}>{unit}</Text>
    </View>
  );
}

function AlertChip({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: 'danger' | 'warning' | 'info' | 'neutral' }) {
  const toneColors = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6', neutral: '#94a3b8' };
  const toneBg = { danger: '#fef2f2', warning: '#fffbeb', info: '#eff6ff', neutral: '#f8fafc' };
  const c = toneColors[tone];
  return (
    <View style={[$.alertChip, { backgroundColor: toneBg[tone] }]}>
      <Ionicons name={icon} size={14} color={c} />
      <Text style={[$.alertChipVal, { color: c }]}>{value}</Text>
      <Text style={$.alertChipLabel}>{label}</Text>
    </View>
  );
}

function QACard({ icon, label, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={$.qaCard} activeOpacity={0.6} onPress={onPress}>
      <View style={[$.qaIcon, { backgroundColor: tint + '14' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={$.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ForecastCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={$.forecastCard}>
      <Text style={$.forecastVal}>{value}</Text>
      <Text style={$.forecastLbl}>{label}</Text>
    </View>
  );
}

function greet(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function fmtRole(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Styles ─── */

const elev = (n: number) => Platform.select({
  ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.03, shadowRadius: n * 4 },
  android: { elevation: n * 2 },
  default: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.03, shadowRadius: n * 4 },
}) as any;

const $ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 32 },

  hero: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heroGreet: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500', marginBottom: 6 },
  heroName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroMeta: { flexDirection: 'row', gap: 8, marginTop: 12 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  roleText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },

  heroKpi: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 18,
    marginBottom: -28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroMetric: { flex: 1, alignItems: 'center' },
  heroMetricLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroMetricValue: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 6, fontFamily: mono },
  heroMetricUnit: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: 2 },
  heroKpiDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },

  body: { paddingHorizontal: 16, paddingTop: 40 },

  alertRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  alertChip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    ...elev(1),
  },
  alertChipVal: { fontSize: 18, fontWeight: '800', fontFamily: mono },
  alertChipLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 20,
    ...elev(2),
  },
  bannerDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: brand.accent },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2, marginBottom: 12, marginTop: 8 },

  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  qaCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    ...elev(2),
  },
  qaIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  qaLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  forecastRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  forecastCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...elev(1),
  },
  forecastVal: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: mono },
  forecastLbl: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },

  locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  locLink: { fontSize: 13, fontWeight: '700', color: brand.accent },
  locCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...elev(2),
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  locBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  locMeta: { flex: 1 },
  locName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  locSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  locQty: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: mono, minWidth: 48, textAlign: 'right' },
  locStatus: { fontSize: 12, fontWeight: '700', minWidth: 50, textAlign: 'right' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
    ...elev(1),
  },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
});
