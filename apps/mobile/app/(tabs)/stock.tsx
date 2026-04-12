import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
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

interface UndoState {
  message: string;
  transactionId: string | null;
}

const statusColors = {
  in_stock: { bg: '#dcfce7', text: '#15803d', label: 'Healthy' },
  low: { bg: '#fef9c3', text: '#a16207', label: 'Low' },
  critical: { bg: '#fee2e2', text: '#dc2626', label: 'Critical' },
  out: { bg: '#fef2f2', text: '#991b1b', label: 'Supply Critical' },
};

export default function StockScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'staff';
  const isManager = user?.role === 'location_manager' || user?.role === 'zone_manager' || user?.role === 'admin';

  // Staff/drivers see their own location stock
  const balance = useStockBalance(user?.location_id ?? undefined);
  const today = useTodayTransactions(user?.location_id ?? undefined);
  // Managers see all locations
  const byLocation = useStockByLocation();
  const pendingDeliveries = usePendingDeliveries();
  const deliveriesList = pendingDeliveries.data?.deliveries ?? [];

  const issueMutation = useIssueStock();
  const returnMutation = useReturnStock();
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  // Staff view data
  const stockItems = balance.data?.balance ?? [];
  const transactions = today.data?.transactions ?? [];
  const totalKg = stockItems.reduce((sum, s) => sum + s.on_hand_qty, 0);
  const totalBags = Math.round(totalKg / 10);

  // Manager view data
  const locations = byLocation.data?.locations ?? [];
  const totalStockKg = byLocation.data?.total_stock_kg ?? 0;
  const totalStockBags = Math.round(totalStockKg / 10);

  const getStockStatus = (kg: number): 'success' | 'warning' | 'error' => {
    const bags = kg / 10;
    if (bags <= 5) return 'error';
    if (bags <= 15) return 'warning';
    return 'success';
  };

  const handleWithdraw = useCallback(
    (bags: number) => {
      issueMutation.mutate(
        { quantity: bags, unit: 'bag' },
        {
          onSuccess: (data) => {
            setUndoState({
              message: `Withdrew ${bags} bag${bags > 1 ? 's' : ''}`,
              transactionId: data.transaction_id,
            });
          },
        },
      );
    },
    [issueMutation],
  );

  const handleReturn = useCallback(
    (bags: number) => {
      returnMutation.mutate({ quantity: bags, unit: 'bag' });
    },
    [returnMutation],
  );

  const handleUndo = () => {
    returnMutation.mutate({ quantity: 1, unit: 'bag' });
    setUndoState(null);
  };

  const onRefresh = useCallback(() => {
    balance.refetch();
    today.refetch();
    if (isManager) byLocation.refetch();
  }, [balance, today, byLocation, isManager]);

  if (isManager ? byLocation.isLoading : balance.isLoading) {
    return <Loading fullScreen message="Loading stock..." />;
  }

  // ── Manager view: per-location cards like the web Stocks page ──
  if (isManager) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={locations}
          keyExtractor={(item) => item.location_id}
          refreshControl={
            <RefreshControl
              refreshing={byLocation.isRefetching}
              onRefresh={onRefresh}
            />
          }
          ListHeaderComponent={
            <>
              {/* Summary tiles — Healthy / Low / Critical counts */}
              <View style={styles.summaryTiles}>
                {[
                  { label: 'Healthy', count: locations.filter(l => l.status === 'in_stock').length, bg: '#dcfce7', text: '#15803d' },
                  { label: 'Low', count: locations.filter(l => l.status === 'low').length, bg: '#fef9c3', text: '#a16207' },
                  { label: 'Critical', count: locations.filter(l => l.status === 'critical' || l.status === 'out').length, bg: '#fee2e2', text: '#dc2626' },
                ].map((tile) => (
                  <View key={tile.label} style={[styles.summaryTile, { backgroundColor: tile.bg }]}>
                    <Text style={[styles.summaryCount, { color: tile.text }]}>{tile.count}</Text>
                    <Text style={[styles.summaryLabel, { color: tile.text }]}>{tile.label}</Text>
                  </View>
                ))}
              </View>

              {/* Pending Deliveries banner */}
              {deliveriesList.length > 0 && (
                <TouchableOpacity
                  style={styles.deliveryBanner}
                  onPress={() => router.push('/alerts')}
                  activeOpacity={0.7}
                >
                  <View style={styles.deliveryBannerHeader}>
                    <Ionicons name="car" size={18} color="#ea580c" />
                    <Text style={styles.deliveryBannerTitle}>Pending Deliveries</Text>
                    <View style={styles.deliveryBadge}>
                      <Text style={styles.deliveryBadgeText}>{deliveriesList.length} awaiting confirmation</Text>
                    </View>
                  </View>
                  {deliveriesList.slice(0, 3).map((d: any) => (
                    <View key={d.id} style={styles.deliveryItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deliveryTrip}>
                          Trip #{d.trip?.trip_number ?? '—'}
                        </Text>
                        <Text style={styles.deliveryFrom}>
                          From: {d.trip?.from_location?.name ?? d.supplier?.name ?? 'Unknown'}
                        </Text>
                      </View>
                      <Text style={styles.deliveryBags}>
                        {d.driver_claimed_bags ?? Math.round((d.driver_claimed_qty_kg ?? 0) / 10)} bags
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#ea580c" />
                    </View>
                  ))}
                </TouchableOpacity>
              )}

              {/* Request Stock button */}
              <TouchableOpacity
                style={styles.requestStockBtn}
                onPress={() => router.push('/stock/create-request')}
                activeOpacity={0.7}
              >
                <Ionicons name="clipboard-outline" size={18} color={colors.white} />
                <Text style={styles.requestStockText}>Request Stock</Text>
              </TouchableOpacity>

              {/* Location count */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{locations.length} Locations</Text>
                <Text style={styles.totalBags}>{totalStockBags} bags total</Text>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const bags = Math.round(item.on_hand_qty / 10);
            const targetBags = Math.round((item.low_stock_threshold ?? 50) / 10);
            const pct = targetBags > 0 ? Math.min(100, (bags / targetBags) * 100) : 0;
            const sc = statusColors[item.status] ?? statusColors.in_stock;
            const isShop = item.location_type === 'shop';
            const deficit = Math.max(0, targetBags - bags);

            return (
              <Card style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <View style={styles.locationTitleRow}>
                    <Ionicons
                      name={isShop ? 'storefront-outline' : 'cube-outline'}
                      size={20}
                      color={colors.gray[500]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationName}>{item.location_name}</Text>
                      <Text style={styles.locationType}>{isShop ? 'Shop' : 'Warehouse'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>

                <View style={styles.stockRow}>
                  <Text style={styles.stockBags}>{bags}</Text>
                  <Text style={styles.stockUnit}>bags</Text>
                  <Text style={styles.stockTarget}>Target: {targetBags} bags</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.pctText, { color: sc.text }]}>
                  {pct.toFixed(0)}% of target
                </Text>

                {deficit > 0 && (
                  <View style={styles.deficitRow}>
                    <Text style={styles.deficitText}>
                      Need +{deficit} bags to reach target
                    </Text>
                    <TouchableOpacity
                      style={[styles.requestBtn, { backgroundColor: isShop ? '#fff7ed' : '#f5f3ff', borderColor: isShop ? '#ea580c' : '#7c3aed' }]}
                      onPress={() => router.push('/stock/create-request')}
                    >
                      <Ionicons name="add" size={14} color={isShop ? '#ea580c' : '#7c3aed'} />
                      <Text style={[styles.requestBtnText, { color: isShop ? '#ea580c' : '#7c3aed' }]}>Request</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Last activity */}
                <View style={styles.activityLine}>
                  <Ionicons name="time-outline" size={14} color={colors.gray[400]} />
                  <Text style={styles.activityText}>
                    {item.last_activity ? timeAgo(item.last_activity) : 'No activity'}
                  </Text>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyText}>No locations found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    );
  }

  // ── Staff/Driver view: single location stock ──
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={balance.isRefetching || today.isRefetching}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <>
            <Card style={styles.heroCard}>
              <Text style={styles.heroLabel}>Current Stock</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroBags}>{totalBags}</Text>
                <Text style={styles.heroUnit}>bags</Text>
                <Badge
                  label={totalBags === 0 ? 'Out' : totalBags <= 5 ? 'Critical' : totalBags <= 15 ? 'Low' : 'OK'}
                  variant={getStockStatus(totalKg)}
                />
              </View>
              <Text style={styles.heroKg}>{totalKg.toFixed(1)} kg total</Text>
            </Card>

            {stockItems.length > 1 &&
              stockItems.map((item) => (
                <Card key={`${item.location_id}-${item.item_id}`} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <Ionicons name="cube" size={16} color={colors.gray[400]} />
                    <Text style={styles.itemName}>{item.item_name ?? 'Stock'}</Text>
                    <Text style={styles.itemQty}>{Math.round(item.on_hand_qty / 10)} bags</Text>
                  </View>
                </Card>
              ))}

            {isStaff && (
              <View style={styles.quickActions}>
                <Button
                  title="Return 1 bag"
                  variant="outline"
                  size="sm"
                  onPress={() => handleReturn(1)}
                  loading={returnMutation.isPending}
                  icon={<Ionicons name="add" size={16} color={colors.primary[500]} />}
                />
              </View>
            )}

            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>Today's Activity</Text>
              {today.data && (
                <Text style={styles.activityCount}>
                  {today.data.issue_count} issued, {today.data.return_count} returned
                </Text>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={styles.txIcon}>
              <Ionicons
                name={item.type === 'issue' ? 'arrow-down' : item.type === 'return' ? 'arrow-up' : 'swap-horizontal'}
                size={16}
                color={item.type === 'issue' ? colors.error : colors.success}
              />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txType}>
                {item.type === 'issue' ? 'Withdrew' : item.type === 'return' ? 'Returned' : item.type}{' '}
                {(item.quantity / 10).toFixed(0)} bag{item.quantity !== 10 ? 's' : ''}
              </Text>
              {item.notes && (
                <Text style={styles.txNotes} numberOfLines={1}>{item.notes}</Text>
              )}
            </View>
            <Text style={styles.txTime}>{timeAgo(item.created_at)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>No activity today</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {isStaff && (
        <KitchenFAB
          onWithdraw={handleWithdraw}
          disabled={issueMutation.isPending || totalBags === 0}
        />
      )}

      {undoState && (
        <UndoToast
          message={undoState.message}
          onUndo={handleUndo}
          onDismiss={() => setUndoState(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },

  // Summary tiles
  summaryTiles: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryTile: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md },
  summaryCount: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  summaryLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: 2 },

  // Pending deliveries banner
  deliveryBanner: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  deliveryBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  deliveryBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#9a3412', flex: 1 },
  deliveryBadge: { backgroundColor: '#ffedd5', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 10 },
  deliveryBadgeText: { fontSize: 10, fontWeight: fontWeight.semibold, color: '#ea580c' },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#fed7aa',
  },
  deliveryTrip: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#9a3412' },
  deliveryFrom: { fontSize: fontSize.xs, color: '#c2410c' },
  deliveryBags: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#9a3412' },

  // Request stock button
  requestStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#ea580c',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  requestStockText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  totalLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  totalBags: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700] },

  // Location card
  locationCard: { paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  locationName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  locationType: { fontSize: fontSize.xs, color: colors.gray[500] },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  stockRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm },
  stockBags: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  stockUnit: { fontSize: fontSize.sm, color: colors.gray[500] },
  stockTarget: { fontSize: fontSize.xs, color: colors.gray[400], marginLeft: 'auto' },
  progressBg: { height: 6, backgroundColor: colors.gray[200], borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  pctText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: spacing.xs },
  deficitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  deficitText: { fontSize: fontSize.xs, color: colors.gray[500] },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  requestBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  activityLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  activityText: { fontSize: fontSize.xs, color: colors.gray[400] },

  // Staff view
  heroCard: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  heroLabel: { fontSize: fontSize.sm, color: colors.gray[500], marginBottom: spacing.xs },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  heroBags: { fontSize: 48, fontWeight: fontWeight.bold, color: colors.gray[900] },
  heroUnit: { fontSize: fontSize.xl, color: colors.gray[500] },
  heroKg: { fontSize: fontSize.sm, color: colors.gray[400], marginTop: spacing.xs },
  itemCard: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { flex: 1, fontSize: fontSize.sm, color: colors.gray[700] },
  itemQty: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  quickActions: { flexDirection: 'row', gap: spacing.md },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  activityTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  activityCount: { fontSize: fontSize.xs, color: colors.gray[500] },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, padding: spacing.md, borderRadius: 8, gap: spacing.md,
  },
  txIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txType: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  txNotes: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  txTime: { fontSize: fontSize.xs, color: colors.gray[400] },
  emptyActivity: { alignItems: 'center', paddingVertical: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, color: colors.gray[500] },
});
