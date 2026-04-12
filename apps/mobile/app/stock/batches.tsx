import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBatches } from '../../src/hooks/useStock';
import { useExportBatches } from '../../src/hooks/useExports';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { brand, colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import type { BatchListItem } from '../../src/api/stock';

type FilterType = 'all' | 'expiring_soon';

function qualityBadge(score: number): { label: string; variant: 'success' | 'warning' | 'error' } {
  if (score >= 3) return { label: 'Good', variant: 'success' };
  if (score >= 2) return { label: 'Fair', variant: 'warning' };
  return { label: 'Poor', variant: 'error' };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BatchesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const query = useBatches(filter);
  const { exportBatches, loading: exportLoading } = useExportBatches();

  const batches = query.data?.batches ?? [];
  const counts = query.data?.counts ?? { all: 0, expiring_soon: 0 };

  const handlePress = (batch: BatchListItem) => {
    router.push(`/stock/batch/${batch.id}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Batches',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => exportBatches()}
              disabled={exportLoading}
              style={styles.headerExportBtn}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={exportLoading ? colors.gray[400] : colors.white}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Filter tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, filter === 'all' && styles.activeTab]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'expiring_soon' && styles.activeTab]}
            onPress={() => setFilter('expiring_soon')}
          >
            <Text style={[styles.tabText, filter === 'expiring_soon' && styles.activeTabText]}>
              Expiring Soon ({counts.expiring_soon})
            </Text>
          </TouchableOpacity>
        </View>

        {query.isLoading ? (
          <Loading fullScreen message="Loading batches..." />
        ) : (
          <FlatList
            data={batches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
            }
            renderItem={({ item }) => {
              const q = qualityBadge(item.quality_score);
              const usedPct = item.initial_qty > 0 ? ((item.used_qty / item.initial_qty) * 100).toFixed(0) : '0';
              return (
                <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.7}>
                  <Card style={styles.batchCard}>
                    <View style={styles.batchHeader}>
                      <View style={styles.batchIdRow}>
                        <Ionicons name="cube" size={16} color={colors.primary[500]} />
                        <Text style={styles.batchId}>#{item.batch_id_display}</Text>
                        {item.is_oldest && <Badge label="FIFO Next" variant="primary" />}
                      </View>
                      <Badge label={q.label} variant={q.variant} />
                    </View>

                    <View style={styles.batchDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Remaining</Text>
                        <Text style={styles.detailValue}>
                          {item.remaining_qty.toFixed(0)} kg ({Math.round(item.remaining_qty / 10)} bags)
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Used</Text>
                        <Text style={styles.detailValue}>{usedPct}%</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Received</Text>
                        <Text style={styles.detailValue}>{formatDate(item.received_at)}</Text>
                      </View>
                      {item.expiry_date && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Expires</Text>
                          <Text style={[
                            styles.detailValue,
                            new Date(item.expiry_date) < new Date() && { color: colors.error },
                          ]}>
                            {formatDate(item.expiry_date)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.batchFooter}>
                      <Text style={styles.supplierName}>{item.supplier_name}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="archive-outline" size={48} color={colors.gray[300]} />
                <Text style={styles.emptyTitle}>No batches</Text>
                <Text style={styles.emptyBody}>
                  {filter === 'expiring_soon'
                    ? 'No batches expiring within 7 days.'
                    : 'No active batches at your location.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerExportBtn: { marginRight: spacing.sm, padding: spacing.xs },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: brand.accent },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  list: { padding: spacing.lg, gap: spacing.md },
  batchCard: { gap: spacing.sm },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  batchId: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#0f172a',
  },
  batchDetails: { gap: spacing.xs, marginTop: spacing.xs },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#0f172a',
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  supplierName: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  emptyBody: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
