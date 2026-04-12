import React from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAvailableRequests } from '../../src/hooks/useRequests';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Loading } from '../../src/components/ui/Loading';

/*
 * Enterprise dashboard — restrained, structured, mobile-native.
 *
 * Layout: identity → stock position → action → locations table.
 * The locations table is the primary content and fills remaining space.
 * No decorative hero blocks. Typography and structure do the work.
 */

const C = {
  bg:      '#f5f5f0',
  surface: '#ffffff',
  border:  '#e8e6e1',
  borderL: '#f0eee9',
  t1:      '#111111',
  t2:      '#555555',
  t3:      '#999999',
  accent:  '#b44d1e',
  accentBg:'#fdf6f3',
  green:   '#1a7a3a',
  greenBg: '#f2f9f4',
  red:     '#b91c1c',
  redBg:   '#fef5f5',
  amber:   '#946b0a',
  amberBg: '#fefcf3',
};

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const { height: screenH } = useWindowDimensions();

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

  // Estimate minimum height for the locations section to fill the screen
  // Header ~68 + position ~88 + action ~48 + nav ~130 ≈ 334
  const locMinH = Math.max(300, screenH - 380);

  return (
    <SafeAreaView style={$.root} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching}
            tintColor={C.t3}
            onRefresh={() => { dashboard.refetch(); available.refetch(); pending.refetch(); }}
          />
        }
      >
        {/* ── Identity ── */}
        <View style={$.id}>
          <View style={$.idLeft}>
            <Text style={$.idGreet}>{greet()}</Text>
            <Text style={$.idName}>{user?.full_name ?? user?.email}</Text>
            {user?.location_name && (
              <Text style={$.idLoc}>{user.location_name}</Text>
            )}
          </View>
          <View style={$.idRight}>
            <Text style={$.idRole}>{fmtRole(role ?? 'staff')}</Text>
          </View>
        </View>

        {/* ── Stock position ── */}
        {stats && (
          <View style={$.pos}>
            <View style={$.posLeft}>
              <Text style={$.posVal}>{bags.toFixed(0)}</Text>
              <Text style={$.posUnit}>bags in stock</Text>
            </View>
            <View style={$.posDivider} />
            <View style={$.posRight}>
              <Metric label="Received" value={received.toFixed(0)} color={C.green} />
              <Metric label="Issued" value={issued.toFixed(0)} color={C.t1} />
              <Metric label="Wasted" value={wasted.toFixed(0)} color={wasted > 0 ? C.red : C.t3} />
            </View>
          </View>
        )}

        {/* ── Forecast (only with real data) ── */}
        {hasUsage && (
          <View style={$.forecast}>
            <ForecastCell v={Math.min(forecast!.days_of_cover, 999).toFixed(0)} l="days cover" />
            <View style={$.fSep} />
            <ForecastCell v={forecast!.avg_daily_usage_bags.toFixed(1)} l="daily use" />
            {forecast!.suggested_order_qty_bags > 0 && (
              <>
                <View style={$.fSep} />
                <ForecastCell v={forecast!.suggested_order_qty_bags.toFixed(0)} l="order qty" />
              </>
            )}
          </View>
        )}

        {/* ── Action ── */}
        {isDriver && reqCount > 0 && (
          <TouchableOpacity style={$.actionLive} onPress={() => router.push('/(tabs)/requests')} activeOpacity={0.6}>
            <View style={$.actionDot} />
            <Text style={$.actionText}>{reqCount} request{reqCount !== 1 ? 's' : ''} available</Text>
            <Ionicons name="arrow-forward" size={15} color={C.accent} />
          </TouchableOpacity>
        )}
        {isDriver && reqCount === 0 && (
          <View style={$.actionIdle}>
            <Text style={$.actionIdleText}>No requests available</Text>
          </View>
        )}
        {isManager && delCount > 0 && (
          <TouchableOpacity style={$.actionLive} onPress={() => router.push('/alerts')} activeOpacity={0.6}>
            <View style={$.actionDot} />
            <Text style={$.actionText}>{delCount} deliver{delCount !== 1 ? 'ies' : 'y'} pending</Text>
            <Ionicons name="arrow-forward" size={15} color={C.accent} />
          </TouchableOpacity>
        )}

        {/* ── Locations table — fills remaining space ── */}
        <View style={[$.loc, { minHeight: locMinH }]}>
          <View style={$.locHead}>
            <Text style={$.locHeadLabel}>LOCATIONS</Text>
            {isManager && (
              <TouchableOpacity onPress={() => router.push('/reports')} activeOpacity={0.6}>
                <Text style={$.locHeadLink}>Reports →</Text>
              </TouchableOpacity>
            )}
          </View>

          {balances.length > 0 ? (
            <View style={$.table}>
              {/* Column labels */}
              <View style={$.colHead}>
                <Text style={[$.colLabel, { flex: 1 }]}>Name</Text>
                <Text style={[$.colLabel, { width: 54, textAlign: 'right' }]}>Bags</Text>
                <Text style={[$.colLabel, { width: 52, textAlign: 'right' }]}>Status</Text>
              </View>

              {balances.map((b, i) => {
                const bg = b.on_hand_bags ?? 0;
                const crit = bg <= (b.critical_threshold ?? 0);
                const low = !crit && bg <= (b.low_threshold ?? 0);
                const sc = crit ? C.red : low ? C.amber : C.green;
                const sBg = crit ? C.redBg : low ? C.amberBg : C.greenBg;
                const sL = crit ? 'Critical' : low ? 'Low' : 'OK';
                return (
                  <View key={`${b.location_id}-${b.item_id}`} style={[$.tRow, i < balances.length - 1 && $.tRowB]}>
                    <View style={{ flex: 1 }}>
                      <Text style={$.tName}>{b.location_name}</Text>
                      <Text style={$.tSub}>{b.item_name}</Text>
                    </View>
                    <Text style={$.tBags}>{bg.toFixed(0)}</Text>
                    <View style={[$.tPill, { backgroundColor: sBg }]}>
                      <Text style={[$.tPillT, { color: sc }]}>{sL}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={$.tableEmpty}>
              <Text style={$.tableEmptyText}>No location data</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Components ── */

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={$.mRow}>
      <Text style={$.mLabel}>{label}</Text>
      <Text style={[$.mVal, { color }]}>{value}</Text>
    </View>
  );
}

function ForecastCell({ v, l }: { v: string; l: string }) {
  return (
    <View style={$.fCell}>
      <Text style={$.fVal}>{v}</Text>
      <Text style={$.fLbl}>{l}</Text>
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

/* ── Styles ── */

const elev = (n: number) => Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: n }, shadowOpacity: 0.02 + n * 0.01, shadowRadius: n * 3 },
  android: { elevation: n },
  default: { shadowColor: '#000', shadowOffset: { width: 0, height: n }, shadowOpacity: 0.02 + n * 0.01, shadowRadius: n * 3 },
}) as any;

const $ = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Identity */
  id: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  idLeft: {},
  idGreet: { fontSize: 13, fontWeight: '400', color: C.t3 },
  idName: { fontSize: 19, fontWeight: '700', color: C.t1, letterSpacing: -0.3, marginTop: 1 },
  idLoc: { fontSize: 12, fontWeight: '400', color: C.t3, marginTop: 3 },
  idRight: { marginTop: 2 },
  idRole: {
    fontSize: 10, fontWeight: '600', color: C.t2, letterSpacing: 0.5,
    textTransform: 'uppercase',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, overflow: 'hidden',
  },

  /* Stock position */
  pos: {
    flexDirection: 'row',
    backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    marginBottom: 10,
  },
  posLeft: { paddingVertical: 16, paddingHorizontal: 18, justifyContent: 'center' },
  posVal: { fontSize: 34, fontWeight: '800', color: C.t1, letterSpacing: -2, lineHeight: 36, fontFamily: mono },
  posUnit: { fontSize: 11, fontWeight: '500', color: C.t3, letterSpacing: 0.2, marginTop: 2 },
  posDivider: { width: 1, backgroundColor: C.border, marginVertical: 10 },
  posRight: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center', gap: 4 },
  mRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mLabel: { fontSize: 12, fontWeight: '400', color: C.t3 },
  mVal: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3, fontFamily: mono },

  /* Forecast — inline strip, not a card */
  forecast: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 12,
  },
  fCell: { flex: 1, alignItems: 'center' },
  fVal: { fontSize: 18, fontWeight: '700', color: C.t1, letterSpacing: -0.5, fontFamily: mono },
  fLbl: { fontSize: 9, fontWeight: '600', color: C.t3, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
  fSep: { width: 1, height: 24, backgroundColor: C.border },

  /* Action */
  actionLive: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.accentBg, borderRadius: 8,
    borderWidth: 1, borderColor: '#eeddd4',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  actionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  actionText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.accent, letterSpacing: -0.1 },
  actionIdle: {
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  actionIdleText: { fontSize: 13, fontWeight: '400', color: C.t3 },

  /* Locations — fills remaining viewport */
  loc: {
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 14, paddingHorizontal: 16,
    flexGrow: 1,
  },
  locHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  locHeadLabel: { fontSize: 10, fontWeight: '700', color: C.t3, letterSpacing: 1 },
  locHeadLink: { fontSize: 12, fontWeight: '500', color: C.t2 },

  /* Table */
  table: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden',
  },
  colHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#fafaf7', borderBottomWidth: 1, borderBottomColor: C.border,
  },
  colLabel: { fontSize: 9, fontWeight: '700', color: C.t3, letterSpacing: 0.6, textTransform: 'uppercase' },
  tRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  tRowB: { borderBottomWidth: 1, borderBottomColor: C.borderL },
  tName: { fontSize: 13, fontWeight: '600', color: C.t1, letterSpacing: -0.1 },
  tSub: { fontSize: 10, fontWeight: '400', color: C.t3, marginTop: 1 },
  tBags: { width: 54, textAlign: 'right', fontSize: 14, fontWeight: '700', color: C.t1, letterSpacing: -0.3, fontFamily: mono },
  tPill: { width: 52, alignItems: 'center', paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  tPillT: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  tableEmpty: { paddingVertical: 40, alignItems: 'center' },
  tableEmptyText: { fontSize: 13, color: C.t3 },
});
