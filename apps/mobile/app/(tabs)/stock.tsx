import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, TouchableOpacity, TextInput, ScrollView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useStockBalance, useStockByLocation, useTodayTransactions, useIssueStock, useReturnStock } from '../../src/hooks/useStock';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { useExportStock } from '../../src/hooks/useExports';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { KitchenFAB } from '../../src/components/KitchenFAB';
import { UndoToast } from '../../src/components/UndoToast';
import { timeAgo } from '../../src/utils/dates';
import { brand } from '../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

type FilterMode = 'all' | 'critical' | 'sufficient';

function classify(status: string): 'critical' | 'low' | 'sufficient' {
  if (status === 'critical' || status === 'out') return 'critical';
  if (status === 'low') return 'low';
  return 'sufficient';
}

interface UndoState { message: string; transactionId: string | null; }

export default function StockScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'staff';
  const isManager = user?.role === 'location_manager' || user?.role === 'zone_manager' || user?.role === 'admin';

  const balance = useStockBalance(user?.location_id ?? undefined);
  const today = useTodayTransactions(user?.location_id ?? undefined);
  const byLocation = useStockByLocation();
  const pendingDeliveries = usePendingDeliveries();
  const deliveriesList = pendingDeliveries.data?.deliveries ?? [];

  const issueMutation = useIssueStock();
  const returnMutation = useReturnStock();
  const { exportStock, loading: exportLoading } = useExportStock();
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const stockItems = balance.data?.balance ?? [];
  const transactions = today.data?.transactions ?? [];
  const totalKg = stockItems.reduce((sum, item) => sum + item.on_hand_qty, 0);
  const totalBags = Math.round(totalKg / 10);
  const rawLocations = byLocation.data?.locations ?? [];
  const totalStockBags = Math.round((byLocation.data?.total_stock_kg ?? 0) / 10);

  const { needsAttention, sufficient, criticalCt, sufficientCt } = useMemo(() => {
    let filtered = rawLocations;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => l.location_name.toLowerCase().includes(q));
    }
    const needs: typeof filtered = [];
    const suf: typeof filtered = [];
    for (const loc of filtered) {
      const c = classify(loc.status);
      if (c === 'critical' || c === 'low') needs.push(loc);
      else suf.push(loc);
    }
    const sev: Record<string, number> = { out: 0, critical: 1, low: 2 };
    needs.sort((a, b) => (sev[a.status] ?? 2) - (sev[b.status] ?? 2) || a.on_hand_qty - b.on_hand_qty);
    suf.sort((a, b) => a.location_name.localeCompare(b.location_name));
    return {
      needsAttention: needs, sufficient: suf,
      criticalCt: rawLocations.filter(l => l.status === 'critical' || l.status === 'out' || l.status === 'low').length,
      sufficientCt: rawLocations.filter(l => l.status === 'in_stock').length,
    };
  }, [rawLocations, search, byLocation.data]);

  const sections = useMemo(() => {
    const r: { title: string; key: string; data: any[] }[] = [];
    if (filter !== 'sufficient' && needsAttention.length > 0)
      r.push({ title: 'Needs Attention', key: 'attention', data: needsAttention });
    if (filter !== 'critical' && sufficient.length > 0)
      r.push({ title: 'Sufficient Stock', key: 'sufficient', data: sufficient });
    return r;
  }, [needsAttention, sufficient, filter]);

  const handleWithdraw = useCallback((bags: number) => {
    issueMutation.mutate({ quantity: bags, unit: 'bag' }, {
      onSuccess: (data) => setUndoState({ message: `Withdrew ${bags} bag${bags > 1 ? 's' : ''}`, transactionId: data.transaction_id }),
    });
  }, [issueMutation]);
  const handleReturn = useCallback((bags: number) => { returnMutation.mutate({ quantity: bags, unit: 'bag' }); }, [returnMutation]);
  const handleUndo = () => { returnMutation.mutate({ quantity: 1, unit: 'bag' }); setUndoState(null); };

  const onRefresh = useCallback(() => {
    balance.refetch(); today.refetch();
    if (isManager) { byLocation.refetch(); pendingDeliveries.refetch(); }
  }, [balance, today, byLocation, pendingDeliveries, isManager]);

  if (isManager ? byLocation.isLoading : balance.isLoading) return <Loading fullScreen message="" />;

  // ═══════════════════════════════════
  //  MANAGER VIEW
  // ═══════════════════════════════════
  if (isManager) {
    return (
      <SafeAreaView style={$.safe} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={$.scroll}
          refreshControl={<RefreshControl refreshing={byLocation.isRefetching} onRefresh={onRefresh} tintColor="#fff" />}
        >
          {/* ── Gradient Header KPIs ── */}
          <LinearGradient
            colors={[brand.gradientStart, brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={$.header}
          >
            <View style={$.kpiRow}>
              <KPI value={totalStockBags.toString()} label="Total Stock" unit="bags" />
              <View style={$.kpiDiv} />
              <KPI value={criticalCt.toString()} label="Critical" highlight={criticalCt > 0} />
              <View style={$.kpiDiv} />
              <KPI value={sufficientCt.toString()} label="Sufficient" />
            </View>
          </LinearGradient>

          <View style={$.body}>
            {/* ── Search ── */}
            <View style={$.searchBar}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" />
              <TextInput
                style={$.searchInput}
                placeholder="Search locations"
                placeholderTextColor="#bbb"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Pending deliveries banner ── */}
            {deliveriesList.length > 0 && (
              <TouchableOpacity style={$.banner} activeOpacity={0.7} onPress={() => router.push('/alerts')}>
                <View style={$.bannerIcon}>
                  <Ionicons name="cube" size={20} color="#fff" />
                </View>
                <View style={$.bannerBody}>
                  <Text style={$.bannerTitle}>{deliveriesList.length} deliver{deliveriesList.length !== 1 ? 'ies' : 'y'} pending</Text>
                  <Text style={$.bannerSub}>Tap to review and confirm</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* ── Quick Actions ── */}
            <Text style={$.sectionTitle}>Quick Actions</Text>
            <View style={$.qaGrid}>
              <QA icon="arrow-down-circle" label="Issue" tint="#ef4444" onPress={() => router.push('/stock/issue')} />
              <QA icon="swap-horizontal" label="Transfer" tint="#6366f1" onPress={() => router.push('/stock/transfer')} />
              <QA icon="add-circle" label="Request" tint="#22c55e" onPress={() => router.push('/stock/create-request')} />
              <QA icon="download-outline" label="Export" tint="#0ea5e9" onPress={() => exportStock()} loading={exportLoading} />
            </View>

            {/* ── Filter chips ── */}
            <Text style={$.sectionTitle}>Locations</Text>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={$.chipScroll} contentContainerStyle={$.chipRow}
              nestedScrollEnabled removeClippedSubviews={false}
            >
              {([
                { key: 'all' as FilterMode, label: 'All', count: rawLocations.length },
                { key: 'critical' as FilterMode, label: 'Critical', count: criticalCt },
                { key: 'sufficient' as FilterMode, label: 'Sufficient', count: sufficientCt },
              ]).map(f => {
                const active = filter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[$.chip, active && $.chipActive]}
                    onPress={() => setFilter(filter === f.key ? 'all' : f.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[$.chipText, active && $.chipTextActive]}>{f.label}</Text>
                    <View style={[$.chipBadge, active && $.chipBadgeActive]}>
                      <Text style={[$.chipBadgeText, active && $.chipBadgeTextActive]}>{f.count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Needs Attention ── */}
            {(filter === 'all' || filter === 'critical') && needsAttention.length > 0 && (
              <>
                <View style={$.secHead}>
                  <Text style={$.secHeadLabel}>Needs Attention</Text>
                  <TouchableOpacity onPress={() => router.push('/stock/create-request')}>
                    <Text style={$.secHeadLink}>Request</Text>
                  </TouchableOpacity>
                </View>
                <View style={$.listCard}>
                  {needsAttention.map((item, i) => {
                    const bags = Math.round(item.on_hand_qty / 10);
                    const minBags = Math.round((item.low_stock_threshold ?? 50) / 10);
                    const shortage = Math.max(0, minBags - bags);
                    const isCritical = item.status === 'critical' || item.status === 'out';
                    const accent = isCritical ? '#ef4444' : '#f59e0b';
                    return (
                      <View key={item.location_id} style={[$.attRow, i < needsAttention.length - 1 && $.attRowBorder]}>
                        <View style={[$.attDot, { backgroundColor: accent }]} />
                        <View style={$.attInfo}>
                          <Text style={$.attName}>{item.location_name}</Text>
                          <Text style={$.attMeta}>Min {minBags} · Need +{shortage}</Text>
                        </View>
                        <Text style={[$.attBags, { color: accent }]}>{bags}</Text>
                        <View style={[$.statusPill, { backgroundColor: accent + '18' }]}>
                          <Text style={[$.statusPillText, { color: accent }]}>{isCritical ? 'Critical' : 'Low'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Sufficient Stock ── */}
            {(filter === 'all' || filter === 'sufficient') && sufficient.length > 0 && (
              <>
                <View style={$.secHead}>
                  <Text style={$.secHeadLabel}>Sufficient Stock</Text>
                </View>
                <View style={$.listCard}>
                  {sufficient.map((item, i) => {
                    const bags = Math.round(item.on_hand_qty / 10);
                    return (
                      <View key={item.location_id} style={[$.sufRow, i < sufficient.length - 1 && $.sufRowBorder]}>
                        <View style={[$.attDot, { backgroundColor: '#22c55e' }]} />
                        <View style={$.attInfo}>
                          <Text style={$.attName}>{item.location_name}</Text>
                          <Text style={$.attMeta}>{item.item_name}</Text>
                        </View>
                        <Text style={$.sufBags}>{bags}</Text>
                        <Text style={$.sufOK}>OK</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {needsAttention.length === 0 && sufficient.length === 0 && (
              <View style={$.emptyCard}>
                <Ionicons name="cube-outline" size={24} color="#cbd5e1" />
                <Text style={$.emptyText}>{search ? 'No locations match' : 'No stock data'}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════
  //  STAFF / DRIVER VIEW
  // ═══════════════════════════════════
  return (
    <SafeAreaView style={$.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={$.scroll}
        refreshControl={<RefreshControl refreshing={balance.isRefetching || today.isRefetching} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <LinearGradient
          colors={[brand.gradientStart, brand.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={$.header}
        >
          <View style={$.staffHero}>
            <Text style={$.staffHeroLabel}>Current Stock</Text>
            <Text style={$.staffHeroVal}>{totalBags}</Text>
            <Text style={$.staffHeroUnit}>bags · {totalKg.toFixed(0)} kg</Text>
          </View>
        </LinearGradient>

        <View style={$.body}>
          {isStaff && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Button title="Return 1 bag" variant="outline" size="sm" onPress={() => handleReturn(1)} loading={returnMutation.isPending} />
            </View>
          )}

          <Text style={$.sectionTitle}>Today's Activity</Text>
          {transactions.length > 0 ? (
            <View style={$.listCard}>
              {transactions.map((item, i) => (
                <View key={item.id} style={[$.txRow, i < transactions.length - 1 && $.txRowBorder]}>
                  <View style={[$.txIcon, { backgroundColor: item.type === 'issue' ? '#fef2f2' : '#f0fdf4' }]}>
                    <Ionicons name={item.type === 'issue' ? 'arrow-down' : 'arrow-up'} size={14} color={item.type === 'issue' ? '#ef4444' : '#22c55e'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={$.txLabel}>{item.type === 'issue' ? 'Withdrew' : 'Returned'} {(item.quantity / 10).toFixed(0)} bag{item.quantity !== 10 ? 's' : ''}</Text>
                    {item.notes && <Text style={$.txNotes} numberOfLines={1}>{item.notes}</Text>}
                  </View>
                  <Text style={$.txTime}>{timeAgo(item.created_at)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={$.emptyCard}>
              <Text style={$.emptyText}>No activity today</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {isStaff && <KitchenFAB onWithdraw={handleWithdraw} disabled={issueMutation.isPending || totalBags === 0} />}
      {undoState && <UndoToast message={undoState.message} onUndo={handleUndo} onDismiss={() => setUndoState(null)} />}
    </SafeAreaView>
  );
}

/* ── Sub-components ── */

function KPI({ value, label, unit, highlight }: { value: string; label: string; unit?: string; highlight?: boolean }) {
  return (
    <View style={$.kpiItem}>
      <Text style={$.kpiLabel}>{label}</Text>
      <Text style={[$.kpiValue, highlight && { color: brand.accent }]}>{value}</Text>
      {unit && <Text style={$.kpiUnit}>{unit}</Text>}
    </View>
  );
}

function QA({ icon, label, tint, onPress, loading }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity style={$.qaCard} onPress={onPress} activeOpacity={0.6} disabled={loading}>
      <View style={[$.qaIcon, { backgroundColor: tint + '14' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={$.qaLabel}>{loading ? '...' : label}</Text>
    </TouchableOpacity>
  );
}

const elev = (n: number) => Platform.select({
  ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.02, shadowRadius: n * 4 },
  android: { elevation: n * 2 },
  default: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.02, shadowRadius: n * 4 },
}) as any;

const $ = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 96 },

  // Gradient header
  header: { paddingVertical: 22, paddingHorizontal: 24 },
  kpiRow: { flexDirection: 'row', alignItems: 'center' },
  kpiItem: { flex: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 6, fontFamily: mono },
  kpiUnit: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: 2 },
  kpiDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  body: { paddingHorizontal: 16, paddingTop: 18 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, height: 44,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '400', color: '#0f172a', padding: 0 },

  // Banner (matches requests page)
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12,
    marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: brand.accent,
    ...elev(2),
  },
  bannerIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  bannerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Section title (matches requests page)
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2, marginBottom: 10, marginTop: 8 },

  // Quick actions (matches dashboard)
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  qaCard: {
    width: '47%',
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    ...elev(2),
  },
  qaIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  qaLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  // Filter chips (matches requests page pipeline)
  chipScroll: { marginBottom: 14, alignSelf: 'stretch' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 20, paddingVertical: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0,
    backgroundColor: '#fff', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  chipBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  chipBadgeTextActive: { color: '#fff' },

  // Section headers
  secHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, marginTop: 4,
  },
  secHeadLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  secHeadLink: { fontSize: 13, fontWeight: '700', color: brand.accent },

  // List card (matches requests page)
  listCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    marginBottom: 12,
    ...elev(2),
  },

  // Attention rows (compact, inside listCard)
  attRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  attRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  attDot: { width: 8, height: 8, borderRadius: 4 },
  attInfo: { flex: 1 },
  attName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  attMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  attBags: { fontSize: 18, fontWeight: '800', fontFamily: mono, minWidth: 36, textAlign: 'right' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Sufficient rows (compact, inside listCard)
  sufRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  sufRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sufBags: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: mono, minWidth: 36, textAlign: 'right' },
  sufOK: { fontSize: 12, fontWeight: '700', color: '#22c55e', minWidth: 36, textAlign: 'right' },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 32, alignItems: 'center', gap: 8,
    ...elev(1),
  },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  // Staff hero (inside gradient)
  staffHero: { alignItems: 'center', paddingVertical: 8 },
  staffHeroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  staffHeroVal: { fontSize: 48, fontWeight: '800', color: '#fff', fontFamily: mono, marginTop: 4 },
  staffHeroUnit: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: 4 },

  // Transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  txNotes: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  txTime: { fontSize: 11, color: '#94a3b8', fontFamily: mono },
});
