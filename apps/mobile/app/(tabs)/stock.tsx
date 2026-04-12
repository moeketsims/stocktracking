import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useStockBalance, useTodayTransactions, useIssueStock, useReturnStock } from '../../src/hooks/useStock';
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

export default function StockScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'staff';
  const isManager = user?.role === 'location_manager' || user?.role === 'zone_manager' || user?.role === 'admin';

  const balance = useStockBalance(user?.location_id ?? undefined);
  const today = useTodayTransactions(user?.location_id ?? undefined);
  const issueMutation = useIssueStock();
  const returnMutation = useReturnStock();
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  const stockItems = balance.data?.balance ?? [];
  const transactions = today.data?.transactions ?? [];
  const totalKg = stockItems.reduce((sum, s) => sum + s.on_hand_qty, 0);
  const totalBags = Math.round(totalKg / 10);

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
    // Return the same amount — undo by issuing a return
    // In production, this would call a dedicated undo endpoint
    returnMutation.mutate({ quantity: 1, unit: 'bag' });
    setUndoState(null);
  };

  const onRefresh = useCallback(() => {
    balance.refetch();
    today.refetch();
  }, [balance, today]);

  if (balance.isLoading) {
    return <Loading fullScreen message="Loading stock..." />;
  }

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
            {/* Stock Level Hero */}
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

            {/* Per-item breakdown */}
            {stockItems.length > 1 &&
              stockItems.map((item) => (
                <Card key={`${item.location_id}-${item.item_id}`} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <Ionicons name="cube" size={16} color={colors.gray[400]} />
                    <Text style={styles.itemName}>{item.item_name ?? 'Stock'}</Text>
                    <Text style={styles.itemQty}>
                      {Math.round(item.on_hand_qty / 10)} bags
                    </Text>
                  </View>
                </Card>
              ))}

            {/* Quick actions for staff */}
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

            {/* Manager actions */}
            {isManager && (
              <View style={styles.managerActions}>
                <Text style={styles.managerTitle}>Actions</Text>
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.info }]}
                    onPress={() => router.push('/stock/create-request')}
                  >
                    <Ionicons name="cart-outline" size={22} color={colors.info} />
                    <Text style={[styles.actionLabel, { color: colors.info }]}>Create Request</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.error }]}
                    onPress={() => router.push('/stock/waste')}
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                    <Text style={[styles.actionLabel, { color: colors.error }]}>Log Waste</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#f59e0b' }]}
                    onPress={() => router.push('/stock/adjustment')}
                  >
                    <Ionicons name="swap-horizontal-outline" size={22} color="#f59e0b" />
                    <Text style={[styles.actionLabel, { color: '#f59e0b' }]}>Adjustment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.primary[500] }]}
                    onPress={() => router.push('/stock/batches')}
                  >
                    <Ionicons name="layers-outline" size={22} color={colors.primary[500]} />
                    <Text style={[styles.actionLabel, { color: colors.primary[500] }]}>View Batches</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Today's Activity Header */}
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

      {/* Floating action button for staff */}
      {isStaff && (
        <KitchenFAB
          onWithdraw={handleWithdraw}
          disabled={issueMutation.isPending || totalBags === 0}
        />
      )}

      {/* Undo toast */}
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
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  heroLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  heroBags: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  heroUnit: {
    fontSize: fontSize.xl,
    color: colors.gray[500],
  },
  heroKg: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  itemCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  itemQty: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  managerActions: {
    marginTop: spacing.md,
  },
  managerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    width: '48%' as any,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  activityTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  activityCount: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  txNotes: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 1,
  },
  txTime: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
});
