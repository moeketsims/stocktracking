import React from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useStockLevels, useShopEfficiency } from '../../src/hooks/useReports';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

function getStockStatus(bags: number): { label: string; variant: 'error' | 'warning' | 'success' } {
  if (bags <= 0) return { label: 'Out', variant: 'error' };
  if (bags < 5) return { label: 'Low', variant: 'warning' };
  return { label: 'OK', variant: 'success' };
}

export default function StockSummaryScreen() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'zone_manager';

  const stockLevels = useStockLevels(user?.location_id ?? undefined);
  const efficiency = useShopEfficiency(30);

  const levels = stockLevels.data?.stock_levels ?? [];
  const locations = efficiency.data?.locations ?? [];

  const totalBags = levels.reduce((sum, l) => sum + l.bags_remaining, 0);
  const lowStockCount = levels.filter((l) => l.bags_remaining > 0 && l.bags_remaining < 5).length;
  const outOfStockCount = levels.filter((l) => l.bags_remaining <= 0).length;

  const isLoading = stockLevels.isLoading;

  if (isLoading) return <Loading fullScreen message="Loading stock levels..." />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Stock Summary', headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff', headerShadowVisible: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={stockLevels.isRefetching}
            onRefresh={() => {
              stockLevels.refetch();
              efficiency.refetch();
            }}
          />
        }
      >
        {/* Summary */}
        <Card>
          <Text style={styles.sectionTitle}>Stock Overview</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalBags}</Text>
              <Text style={styles.summaryLabel}>Total Bags</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, lowStockCount > 0 ? { color: colors.warning } : undefined]}>
                {lowStockCount}
              </Text>
              <Text style={styles.summaryLabel}>Low Stock</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, outOfStockCount > 0 ? { color: colors.error } : undefined]}>
                {outOfStockCount}
              </Text>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
            </View>
          </View>
        </Card>

        {/* Stock Items */}
        <Card padded={false}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Stock Levels</Text>
          </View>
          {levels.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={40} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No stock data available</Text>
            </View>
          ) : (
            levels.map((item) => {
              const status = getStockStatus(item.bags_remaining);
              return (
                <View key={item.item_id} style={styles.stockRow}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName}>{item.item_name}</Text>
                    <Text style={styles.stockKg}>{item.kg_remaining.toFixed(1)} kg</Text>
                  </View>
                  <View style={styles.stockRight}>
                    <Text style={styles.stockBags}>{item.bags_remaining} bags</Text>
                    <Badge label={status.label} variant={status.variant} />
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Shop Efficiency (admin/zone_manager only) */}
        {isAdmin && locations.length > 0 && (
          <Card padded={false}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Location Performance</Text>
              {efficiency.data?.best_performer && (
                <Text style={styles.bestPerformer}>
                  Best: {efficiency.data.best_performer}
                </Text>
              )}
            </View>
            {locations.map((loc) => {
              const statusColor = loc.efficiency_score >= 70
                ? colors.success
                : loc.efficiency_score >= 40
                  ? colors.warning
                  : colors.error;
              return (
                <View key={loc.location_id} style={styles.locationRow}>
                  <View style={styles.locationInfo}>
                    <View style={styles.locationNameRow}>
                      <Text style={styles.locationRank}>#{loc.rank}</Text>
                      <Text style={styles.locationName}>{loc.location_name}</Text>
                    </View>
                    <Text style={styles.locationMeta}>
                      {loc.current_stock_bags} bags | Waste: {loc.waste_rate_pct.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreValue, { color: statusColor }]}>
                      {loc.efficiency_score.toFixed(0)}
                    </Text>
                    <Text style={styles.scoreLabel}>score</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  summaryLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  listHeader: { padding: spacing.lg, paddingBottom: 0 },
  emptyState: { alignItems: 'center', padding: spacing['3xl'], gap: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.gray[400] },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  stockInfo: { flex: 1 },
  stockName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  stockKg: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  stockRight: { alignItems: 'flex-end', gap: spacing.xs },
  stockBags: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  bestPerformer: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.medium },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  locationInfo: { flex: 1 },
  locationNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationRank: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[400] },
  locationName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  locationMeta: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2, marginLeft: spacing.xl },
  scoreContainer: { alignItems: 'center' },
  scoreValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  scoreLabel: { fontSize: 10, color: colors.gray[400] },
});
