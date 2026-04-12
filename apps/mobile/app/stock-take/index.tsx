import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useStockTakes,
  useStockTake,
  useCreateStockTake,
  useUpdateLineCount,
  useCompleteStockTake,
  useCancelStockTake,
} from '../../src/hooks/useStockTakes';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { UserRole, StockTakeLine, StockTakeStatus } from '../../src/types';

const STATUS_BADGE: Record<StockTakeStatus, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

export default function StockTakeScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const user = useAuthStore((s) => s.user);
  const canManage = hasRole('admin' as UserRole, 'zone_manager' as UserRole, 'location_manager' as UserRole);

  const [activeStockTakeId, setActiveStockTakeId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const { data: stockTakesData, isLoading: listLoading, isRefetching, refetch } = useStockTakes({ limit: 50 });
  const { data: activeData, isLoading: detailLoading } = useStockTake(activeStockTakeId ?? '');
  const createMutation = useCreateStockTake();
  const updateLineMutation = useUpdateLineCount();
  const completeMutation = useCompleteStockTake();
  const cancelMutation = useCancelStockTake();

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Stock Take' }} />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptySubtitle}>Manager access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stockTakes = stockTakesData?.stock_takes ?? [];
  const inProgressTake = stockTakes.find((st) => st.status === 'in_progress');
  const historyTakes = stockTakes.filter((st) => st.status !== 'in_progress');

  // Auto-select in-progress stock take
  useEffect(() => {
    if (inProgressTake && !activeStockTakeId) {
      setActiveStockTakeId(inProgressTake.id);
    }
  }, [inProgressTake, activeStockTakeId]);

  const handleStartNew = () => {
    if (inProgressTake) {
      Alert.alert('In Progress', 'A stock take is already in progress for this location.');
      return;
    }
    createMutation.mutate(
      { location_id: user?.location_id ?? undefined },
      {
        onSuccess: (data) => {
          setActiveStockTakeId(data.stock_take_id);
          setTab('active');
        },
      },
    );
  };

  const handleComplete = () => {
    if (!activeStockTakeId) return;
    Alert.alert(
      'Complete Stock Take',
      'This will create adjustment transactions for all variances. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            completeMutation.mutate(
              { id: activeStockTakeId },
              {
                onSuccess: () => {
                  setActiveStockTakeId(null);
                  refetch();
                },
              },
            );
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    if (!activeStockTakeId) return;
    Alert.alert(
      'Cancel Stock Take',
      'This will discard all counts. Are you sure?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(activeStockTakeId, {
              onSuccess: () => {
                setActiveStockTakeId(null);
                refetch();
              },
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Stock Take',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
        }}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'active' && styles.tabItemActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            Active Count
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'history' && styles.tabItemActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {listLoading ? (
        <Loading message="Loading stock takes..." fullScreen />
      ) : tab === 'active' ? (
        <ActiveTab
          activeStockTakeId={activeStockTakeId}
          activeData={activeData}
          detailLoading={detailLoading}
          onStartNew={handleStartNew}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onUpdateLine={(lineId, countedQty) => {
            if (!activeStockTakeId) return;
            updateLineMutation.mutate({
              stockTakeId: activeStockTakeId,
              lineId,
              data: { counted_qty: countedQty },
            });
          }}
          createLoading={createMutation.isPending}
          completeLoading={completeMutation.isPending}
          updateLoading={updateLineMutation.isPending}
          isRefetching={isRefetching}
          refetch={refetch}
        />
      ) : (
        <HistoryTab
          stockTakes={historyTakes}
          isRefetching={isRefetching}
          refetch={refetch}
        />
      )}
    </SafeAreaView>
  );
}

function ActiveTab({
  activeStockTakeId,
  activeData,
  detailLoading,
  onStartNew,
  onComplete,
  onCancel,
  onUpdateLine,
  createLoading,
  completeLoading,
  updateLoading,
  isRefetching,
  refetch,
}: {
  activeStockTakeId: string | null;
  activeData: { stock_take: any; lines: StockTakeLine[] } | undefined;
  detailLoading: boolean;
  onStartNew: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onUpdateLine: (lineId: string, countedQty: number) => void;
  createLoading: boolean;
  completeLoading: boolean;
  updateLoading: boolean;
  isRefetching: boolean;
  refetch: () => void;
}) {
  if (!activeStockTakeId) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="clipboard-outline" size={56} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No Active Stock Take</Text>
        <Text style={styles.emptySubtitle}>
          Start a new stock take to count your current inventory
        </Text>
        <Button
          title="Start Stock Take"
          onPress={onStartNew}
          loading={createLoading}
          icon={<Ionicons name="add-circle-outline" size={20} color={colors.white} />}
        />
      </View>
    );
  }

  if (detailLoading) {
    return <Loading message="Loading stock take..." fullScreen />;
  }

  const stockTake = activeData?.stock_take;
  const lines = activeData?.lines ?? [];
  const countedLines = lines.filter((l) => l.counted_qty !== null).length;
  const allCounted = countedLines === lines.length && lines.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Progress header */}
      <Card>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            {stockTake?.locations?.name ?? 'Stock Take'}
          </Text>
          <Text style={styles.progressCount}>
            {countedLines} / {lines.length} items counted
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: lines.length > 0 ? `${(countedLines / lines.length) * 100}%` : '0%',
                  backgroundColor: allCounted ? colors.success : colors.primary[500],
                },
              ]}
            />
          </View>
        </View>
      </Card>

      {/* Count lines */}
      {lines.map((line) => (
        <StockTakeLineRow
          key={line.id}
          line={line}
          onSave={(qty) => onUpdateLine(line.id, qty)}
          saving={updateLoading}
        />
      ))}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {allCounted && (
          <Button
            title="Complete Stock Take"
            onPress={onComplete}
            loading={completeLoading}
            style={{ flex: 1 }}
          />
        )}
        <Button
          title="Cancel"
          variant="danger"
          onPress={onCancel}
          style={allCounted ? undefined : { flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

function StockTakeLineRow({
  line,
  onSave,
  saving,
}: {
  line: StockTakeLine;
  onSave: (qty: number) => void;
  saving: boolean;
}) {
  const [countText, setCountText] = useState(
    line.counted_qty !== null ? String(line.counted_qty) : '',
  );
  const [dirty, setDirty] = useState(false);

  const handleChange = (text: string) => {
    setCountText(text);
    setDirty(true);
  };

  const handleSave = () => {
    const qty = parseFloat(countText);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Invalid', 'Enter a valid quantity');
      return;
    }
    onSave(qty);
    setDirty(false);
  };

  const variance = line.variance;
  const hasVariance = variance !== null && Math.abs(variance) > 0.01;

  return (
    <Card style={styles.lineCard}>
      <View style={styles.lineHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{line.items?.name ?? 'Unknown Item'}</Text>
          <Text style={styles.itemSku}>
            {line.items?.sku ?? ''} {line.items?.unit ? `(${line.items.unit})` : ''}
          </Text>
        </View>
        {line.counted_qty !== null && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={hasVariance ? colors.warning : colors.success}
          />
        )}
      </View>

      <View style={styles.countRow}>
        <View style={styles.countCol}>
          <Text style={styles.countLabel}>Expected</Text>
          <Text style={styles.countValue}>{line.expected_qty}</Text>
        </View>
        <View style={styles.countCol}>
          <Text style={styles.countLabel}>Counted</Text>
          <TextInput
            style={styles.countInput}
            value={countText}
            onChangeText={handleChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray[400]}
          />
        </View>
        <View style={styles.countCol}>
          <Text style={styles.countLabel}>Variance</Text>
          <Text
            style={[
              styles.countValue,
              hasVariance && {
                color: (variance ?? 0) > 0 ? colors.success : colors.error,
                fontWeight: fontWeight.bold,
              },
            ]}
          >
            {variance !== null ? (variance > 0 ? `+${variance}` : String(variance)) : '---'}
          </Text>
        </View>
      </View>

      {dirty && (
        <Button
          title="Save Count"
          size="sm"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: spacing.sm }}
        />
      )}
    </Card>
  );
}

function HistoryTab({
  stockTakes,
  isRefetching,
  refetch,
}: {
  stockTakes: any[];
  isRefetching: boolean;
  refetch: () => void;
}) {
  if (stockTakes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={48} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No History</Text>
        <Text style={styles.emptySubtitle}>Completed stock takes will appear here</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {stockTakes.map((st) => {
        const badge = STATUS_BADGE[st.status as StockTakeStatus] ?? STATUS_BADGE.cancelled;
        return (
          <Card key={st.id}>
            <View style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyLocation}>
                  {st.locations?.name ?? 'Unknown Location'}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(st.started_at).toLocaleDateString()}
                  {st.initiated_by_name ? ` by ${st.initiated_by_name}` : ''}
                </Text>
                <Text style={styles.historyMeta}>
                  {st.total_lines} items | {st.variance_count ?? 0} variance{(st.variance_count ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>
              <Badge label={badge.label} variant={badge.variant} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  tabTextActive: {
    color: colors.primary[500],
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing['5xl'],
  },
  progressHeader: {
    gap: spacing.sm,
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  progressCount: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  lineCard: {
    marginBottom: 0,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  itemSku: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  countRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  countCol: {
    flex: 1,
    gap: 2,
  },
  countLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    fontWeight: fontWeight.medium,
  },
  countValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  countInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    backgroundColor: colors.white,
    minHeight: 40,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyLocation: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  historyMeta: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
