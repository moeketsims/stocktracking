import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useStockBalance, useStockByLocation, useTodayTransactions, useIssueStock, useReturnStock } from '../../src/hooks/useStock';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { KitchenFAB } from '../../src/components/KitchenFAB';
import { UndoToast } from '../../src/components/UndoToast';
import { timeAgo } from '../../src/utils/dates';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

type FilterMode = 'all' | 'critical' | 'sufficient';
type StockCondition = 'critical' | 'low' | 'sufficient';

function classify(status: string): StockCondition {
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
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const stockItems = balance.data?.balance ?? [];
  const transactions = today.data?.transactions ?? [];
  const totalKg = stockItems.reduce((sum, item) => sum + item.on_hand_qty, 0);
  const totalBags = Math.round(totalKg / 10);

  const rawLocations = byLocation.data?.locations ?? [];

  const { needsAttention, sufficient, criticalCt, sufficientCt, totalBagsAll } = useMemo(() => {
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
      needsAttention: needs,
      sufficient: suf,
      criticalCt: rawLocations.filter(l => l.status === 'critical' || l.status === 'out' || l.status === 'low').length,
      sufficientCt: rawLocations.filter(l => l.status === 'in_stock').length,
      totalBagsAll: Math.round((byLocation.data?.total_stock_kg ?? 0) / 10),
    };
  }, [rawLocations, search, byLocation.data]);

  const sections = useMemo(() => {
    const result: { title: string; key: string; data: any[] }[] = [];
    if (filter !== 'sufficient' && needsAttention.length > 0) {
      result.push({ title: 'NEEDS ATTENTION', key: 'attention', data: needsAttention });
    }
    if (filter !== 'critical' && sufficient.length > 0) {
      result.push({ title: 'SUFFICIENT STOCK', key: 'sufficient', data: sufficient });
    }
    return result;
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

  if (isManager ? byLocation.isLoading : balance.isLoading) {
    return <Loading fullScreen message="Loading stock..." />;
  }

  // ══════════════════════════════════════
  //  MANAGER VIEW — Wireframe 1
  // ══════════════════════════════════════
  if (isManager) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.location_id}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={byLocation.isRefetching} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              {/* Search */}
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={spacing.lg} color={colors.gray[400]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search locations..."
                    placeholderTextColor={colors.gray[400]}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={spacing.lg} color={colors.gray[400]} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Filter chips */}
              <View style={styles.chipRow}>
                {([
                  { key: 'critical' as FilterMode, label: `Critical ${criticalCt}`, color: colors.error, bg: '#fee2e2' /* tinted red bg */ },
                  { key: 'sufficient' as FilterMode, label: `Sufficient ${sufficientCt}`, color: colors.success, bg: '#dcfce7' /* tinted green bg */ },
                  { key: 'all' as FilterMode, label: `All ${rawLocations.length}`, color: colors.gray[600], bg: '#f1f5f9' /* tinted slate bg */ },
                ]).map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.chip,
                      { backgroundColor: filter === c.key ? c.bg : colors.white, borderColor: filter === c.key ? c.color : colors.gray[200] },
                    ]}
                    onPress={() => setFilter(filter === c.key ? 'all' : c.key)}
                  >
                    <Text style={[styles.chipText, { color: filter === c.key ? c.color : colors.gray[500] }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pending deliveries */}
              {deliveriesList.length > 0 && (
                <TouchableOpacity style={styles.deliveryBar} onPress={() => router.push('/alerts')} activeOpacity={0.7}>
                  <View style={styles.deliveryPulse} />
                  <Text style={styles.deliveryText}>
                    {deliveriesList.length} deliver{deliveriesList.length === 1 ? 'y' : 'ies'} awaiting confirmation
                  </Text>
                  <Ionicons name="chevron-forward" size={fontSize.sm} color={colors.primary[600]} />
                </TouchableOpacity>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, section.key === 'attention' && styles.sectionTitleAttention]}>
                {section.title}
              </Text>
              {section.key === 'attention' && (
                <TouchableOpacity onPress={() => router.push('/stock/create-request')}>
                  <Text style={styles.sectionAction}>Request</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item, section }) =>
            section.key === 'attention'
              ? <AttentionCard item={item} onRequest={() => router.push('/stock/create-request')} />
              : <SufficientRow item={item} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{search ? 'No locations match' : 'No stock data available'}</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════
  //  STAFF / DRIVER VIEW
  // ══════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SectionList
        sections={[{ title: "Today's Activity", key: 'activity', data: transactions }]}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={balance.isRefetching || today.isRefetching} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.staffHero}>
              <Text style={styles.staffHeroLabel}>Current Stock</Text>
              <View style={styles.staffHeroRow}>
                <Text style={styles.staffHeroBags}>{totalBags}</Text>
                <Text style={styles.staffHeroUnit}>bags</Text>
                <Badge label={totalBags === 0 ? 'Out' : totalBags <= 5 ? 'Critical' : totalBags <= 15 ? 'Low' : 'OK'} variant={totalBags <= 5 ? 'error' : totalBags <= 15 ? 'warning' : 'success'} />
              </View>
              <Text style={styles.staffHeroKg}>{totalKg.toFixed(1)} kg</Text>
            </View>
            {isStaff && (
              <View style={styles.staffReturnRow}>
                <Button title="Return 1 bag" variant="outline" size="sm" onPress={() => handleReturn(1)} loading={returnMutation.isPending} />
              </View>
            )}
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.staffActHeader}>
            <Text style={styles.staffActTitle}>{section.title}</Text>
            {today.data && <Text style={styles.staffActCount}>{today.data.issue_count} out · {today.data.return_count} in</Text>}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={[styles.txDot, { backgroundColor: item.type === 'issue' ? '#fee2e2' /* tinted red bg */ : '#dcfce7' /* tinted green bg */ }]}>
              <Ionicons name={item.type === 'issue' ? 'arrow-down' : 'arrow-up'} size={fontSize.sm} color={item.type === 'issue' ? colors.error : colors.success} />
            </View>
            <View style={styles.txContent}>
              <Text style={styles.txLabel}>{item.type === 'issue' ? 'Withdrew' : 'Returned'} {(item.quantity / 10).toFixed(0)} bag{item.quantity !== 10 ? 's' : ''}</Text>
              {item.notes && <Text style={styles.txNotes} numberOfLines={1}>{item.notes}</Text>}
            </View>
            <Text style={styles.txTime}>{timeAgo(item.created_at)}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No activity today</Text></View>}
        contentContainerStyle={styles.list}
      />
      {isStaff && <KitchenFAB onWithdraw={handleWithdraw} disabled={issueMutation.isPending || totalBags === 0} />}
      {undoState && <UndoToast message={undoState.message} onUndo={handleUndo} onDismiss={() => setUndoState(null)} />}
    </SafeAreaView>
  );
}

// ══════════════════════════════════════
//  ATTENTION CARD
//  Tinted, prominent, action-oriented.
//  Shows: name, stock, minimum, shortage, action.
// ══════════════════════════════════════
function AttentionCard({ item, onRequest }: { item: any; onRequest: () => void }) {
  const bags = Math.round(item.on_hand_qty / 10);
  const minBags = Math.round((item.low_stock_threshold ?? 50) / 10);
  const shortage = Math.max(0, minBags - bags);
  const isCritical = item.status === 'critical' || item.status === 'out';
  const accent = isCritical ? colors.error : colors.warning;
  const bg = isCritical ? '#fef2f2' /* tinted red bg */ : '#fffbeb' /* tinted amber bg */;

  return (
    <View style={[styles.attCard, { backgroundColor: bg, borderLeftColor: accent }]}>
      {/* Name + badge */}
      <View style={styles.attTopRow}>
        <Text style={styles.attName} numberOfLines={1}>{item.location_name}</Text>
        <View style={[styles.attBadge, { backgroundColor: accent }]}>
          <Text style={styles.attBadgeText}>{isCritical ? 'Critical' : 'Low'}</Text>
        </View>
      </View>

      {/* Stock info */}
      <Text style={[styles.attStock, { color: accent }]}>{bags} bags</Text>
      <Text style={styles.attMeta}>Minimum: {minBags}</Text>
      {shortage > 0 && <Text style={[styles.attShortage, { color: accent }]}>Need +{shortage}</Text>}

      {/* Action */}
      <TouchableOpacity style={[styles.attBtn, { backgroundColor: accent }]} onPress={onRequest} activeOpacity={0.7}>
        <Text style={styles.attBtnText}>Request stock</Text>
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════
//  SUFFICIENT ROW
//  Compact, quiet, informational.
//  Shows: name, bags, minimum, above-minimum.
// ══════════════════════════════════════
function SufficientRow({ item }: { item: any }) {
  const bags = Math.round(item.on_hand_qty / 10);
  const minBags = Math.round((item.low_stock_threshold ?? 50) / 10);
  const above = bags - minBags;

  return (
    <View style={styles.sufRow}>
      <View style={styles.sufInfo}>
        <Text style={styles.sufName} numberOfLines={1}>{item.location_name}</Text>
        <Text style={styles.sufMeta}>Minimum: {minBags}   Above minimum: <Text style={styles.sufAbove}>+{above}</Text></Text>
      </View>
      <View style={styles.sufRight}>
        <Text style={styles.sufBags}>{bags}</Text>
        <Text style={styles.sufUnit}>bags</Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════
//  STYLES
// ══════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  list: { paddingBottom: spacing['2xl'] },

  // Header area
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchRow: { marginBottom: spacing.md },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200],
    borderRadius: 10, paddingHorizontal: spacing.md, height: spacing['5xl'] - spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.gray[900], padding: 0 },

  // Filter chips
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, borderRadius: spacing.lg,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: fontWeight.semibold },

  // Delivery bar
  deliveryBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200],
    borderRadius: 10, paddingHorizontal: fontSize.sm, paddingVertical: spacing.md, marginBottom: spacing.sm,
  },
  deliveryPulse: { width: spacing.sm, height: spacing.sm, borderRadius: spacing.xs, backgroundColor: colors.primary[600] },
  deliveryText: { flex: 1, fontSize: 13, fontWeight: fontWeight.medium, color: colors.primary[800] },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[500], letterSpacing: 0.8 },
  sectionTitleAttention: { color: '#991b1b' /* dark red for attention header */ },
  sectionAction: { fontSize: 13, fontWeight: fontWeight.semibold, color: colors.primary[600] },

  // ── Attention card ──
  attCard: {
    marginHorizontal: spacing.lg, marginBottom: 10, borderRadius: borderRadius.lg,
    borderLeftWidth: spacing.xs, padding: spacing.lg,
  },
  attTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  attName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.gray[900], flex: 1, marginRight: spacing.sm },
  attBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  attBadgeText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.white },
  attStock: { fontSize: 28, fontWeight: fontWeight.bold, marginBottom: 2 },
  attMeta: { fontSize: 13, color: colors.gray[500], marginBottom: 2 },
  attShortage: { fontSize: 13, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  attBtn: { alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  attBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white },

  // ── Sufficient row ──
  sufRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: 2,
    backgroundColor: colors.white, borderRadius: 10,
    paddingHorizontal: spacing.lg, paddingVertical: fontSize.sm,
  },
  sufInfo: { flex: 1 },
  sufName: { fontSize: 15, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: 2 },
  sufMeta: { fontSize: fontSize.xs, color: colors.gray[400] },
  sufAbove: { color: colors.success, fontWeight: fontWeight.semibold },
  sufRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  sufBags: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  sufUnit: { fontSize: 11, color: colors.gray[400] },

  // Empty
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyText: { fontSize: fontSize.sm, color: colors.gray[400] },

  // ── Staff view ──
  staffHero: { alignItems: 'center', paddingVertical: 28, marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: borderRadius.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  staffHeroLabel: { fontSize: 13, color: colors.gray[500], marginBottom: spacing.xs },
  staffHeroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  staffHeroBags: { fontSize: 48, fontWeight: fontWeight.bold, color: colors.gray[900] },
  staffHeroUnit: { fontSize: fontSize.lg, color: colors.gray[500] },
  staffHeroKg: { fontSize: 13, color: colors.gray[400], marginTop: spacing.xs },
  staffReturnRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  staffActHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm - 2 },
  staffActTitle: { fontSize: 15, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  staffActCount: { fontSize: fontSize.xs, color: colors.gray[500] },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: spacing.lg, backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs,
  },
  txDot: { width: 28, height: 28, borderRadius: borderRadius.sm + 8, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1 },
  txLabel: { fontSize: 13, fontWeight: fontWeight.medium, color: colors.gray[900] },
  txNotes: { fontSize: 11, color: colors.gray[400], marginTop: 1 },
  txTime: { fontSize: 11, color: colors.gray[400] },
});
