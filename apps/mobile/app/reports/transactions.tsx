import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useTransactions } from '../../src/hooks/useReports';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { TransactionTypeFilter } from '../../src/api/reports';

const TYPE_FILTERS: { label: string; value: TransactionTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Receive', value: 'receive' },
  { label: 'Issue', value: 'issue' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Waste', value: 'waste' },
  { label: 'Return', value: 'return' },
];

const DAY_FILTERS: { label: string; value: number | undefined }[] = [
  { label: 'Today', value: 1 },
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: 'All', value: undefined },
];

const TYPE_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  receive: { icon: 'arrow-down', color: colors.success },
  issue: { icon: 'arrow-up', color: colors.info },
  transfer: { icon: 'swap-horizontal', color: colors.primary[500] },
  waste: { icon: 'trash', color: colors.error },
  return: { icon: 'arrow-undo', color: colors.warning },
  adjustment: { icon: 'construct', color: colors.gray[600] },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${min}`;
  } catch {
    return dateStr.slice(0, 16);
  }
}

export default function TransactionsScreen() {
  const user = useAuthStore((s) => s.user);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [days, setDays] = useState<number | undefined>(7);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const transactions = useTransactions({
    type_filter: typeFilter,
    view_location_id: user?.location_id ?? undefined,
    limit,
    offset,
    days,
  });

  const items = transactions.data?.transactions ?? [];
  const total = transactions.data?.total ?? 0;
  const issueCount = transactions.data?.issue_count ?? 0;
  const returnCount = transactions.data?.return_count ?? 0;
  const hasMore = items.length >= limit;

  const isLoading = transactions.isLoading;

  const handleFilterChange = useCallback((filter: TransactionTypeFilter) => {
    setTypeFilter(filter);
    setOffset(0);
  }, []);

  const handleDaysChange = useCallback((d: number | undefined) => {
    setDays(d);
    setOffset(0);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Transactions', headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff', headerShadowVisible: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={transactions.isRefetching}
            onRefresh={() => transactions.refetch()}
          />
        }
      >
        {/* Summary */}
        <Card>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.info }]}>{issueCount}</Text>
              <Text style={styles.summaryLabel}>Issues</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>{returnCount}</Text>
              <Text style={styles.summaryLabel}>Returns</Text>
            </View>
          </View>
        </Card>

        {/* Date Filter */}
        <View style={styles.filterRow}>
          {DAY_FILTERS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.filterBtn, days === opt.value && styles.filterBtnActive]}
              onPress={() => handleDaysChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, days === opt.value && styles.filterTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterScroll}>
          <View style={styles.typeFilterRow}>
            {TYPE_FILTERS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeBtn, typeFilter === opt.value && styles.typeBtnActive]}
                onPress={() => handleFilterChange(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeText, typeFilter === opt.value && styles.typeTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Transaction List */}
        {isLoading ? (
          <Loading message="Loading transactions..." />
        ) : items.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>Try changing your filters</Text>
            </View>
          </Card>
        ) : (
          <Card padded={false}>
            {items.map((tx, idx) => {
              const typeInfo = TYPE_ICON_MAP[tx.type] ?? { icon: 'help', color: colors.gray[500] };
              return (
                <View key={tx.id} style={[styles.txRow, idx === items.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.txIcon, { backgroundColor: typeInfo.color + '18' }]}>
                    <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
                  </View>
                  <View style={styles.txInfo}>
                    <View style={styles.txTopRow}>
                      <Text style={styles.txType}>{tx.type.toUpperCase()}</Text>
                      <Text style={styles.txQty}>{(tx.quantity / 10).toFixed(1)} bags</Text>
                    </View>
                    <Text style={styles.txItem}>{tx.item_name}</Text>
                    <View style={styles.txMetaRow}>
                      <Text style={styles.txMeta}>{formatDate(tx.created_at)}</Text>
                      {tx.location_from && (
                        <Text style={styles.txMeta}>From: {tx.location_from}</Text>
                      )}
                      {tx.location_to && (
                        <Text style={styles.txMeta}>To: {tx.location_to}</Text>
                      )}
                    </View>
                    {tx.notes && (
                      <Text style={styles.txNotes} numberOfLines={1}>{tx.notes}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Load More */}
        {hasMore && (
          <Button
            title="Load More"
            variant="outline"
            onPress={() => setOffset((prev) => prev + limit)}
            loading={transactions.isFetching && !transactions.isLoading}
          />
        )}

        {/* Pagination Info */}
        {items.length > 0 && (
          <Text style={styles.pageInfo}>
            Showing {offset + 1}-{offset + items.length} of {total}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  summaryLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterBtnActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  filterText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
  filterTextActive: { color: colors.white },
  typeFilterScroll: { marginHorizontal: -spacing.lg },
  typeFilterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  typeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  typeBtnActive: { backgroundColor: colors.primary[100] },
  typeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.gray[600] },
  typeTextActive: { color: colors.primary[700] },
  emptyState: { alignItems: 'center', padding: spacing['3xl'], gap: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.gray[500] },
  emptySubtext: { fontSize: fontSize.sm, color: colors.gray[400] },
  txRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txType: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[600] },
  txQty: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  txItem: { fontSize: fontSize.sm, color: colors.gray[800], marginTop: 2 },
  txMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  txMeta: { fontSize: fontSize.xs, color: colors.gray[400] },
  txNotes: { fontSize: fontSize.xs, color: colors.gray[500], fontStyle: 'italic', marginTop: 2 },
  pageInfo: { textAlign: 'center', fontSize: fontSize.xs, color: colors.gray[400] },
});
