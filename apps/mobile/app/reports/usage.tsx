import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useAnalytics, useDailySummary } from '../../src/hooks/useReports';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { PeriodDays } from '../../src/api/reports';

const PERIODS: { label: string; value: PeriodDays }[] = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
];

function BarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  const barMax = maxValue || 1;
  return (
    <View style={barStyles.container}>
      {data.map((item, idx) => {
        const heightPct = Math.min(100, (item.value / barMax) * 100);
        return (
          <View key={idx} style={barStyles.barWrapper}>
            <Text style={barStyles.barValue}>{item.value.toFixed(0)}</Text>
            <View style={barStyles.barTrack}>
              <View
                style={[
                  barStyles.barFill,
                  { height: `${Math.max(2, heightPct)}%` },
                ]}
              />
            </View>
            <Text style={barStyles.barLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, gap: 2 },
  barWrapper: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: colors.gray[500], marginBottom: 2 },
  barTrack: { width: '60%', height: '70%', justifyContent: 'flex-end', borderRadius: 3, backgroundColor: colors.gray[100] },
  barFill: { width: '100%', backgroundColor: colors.primary[500], borderRadius: 3, minHeight: 2 },
  barLabel: { fontSize: 9, color: colors.gray[500], marginTop: 2 },
});

export default function UsageScreen() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<PeriodDays>(7);

  const analytics = useAnalytics(period, user?.location_id ?? undefined);
  const dailySummary = useDailySummary(period, user?.location_id ?? undefined);

  const summary = analytics.data?.summary;
  const dailyUsage = analytics.data?.daily_usage ?? [];
  const hourlyPattern = analytics.data?.hourly_pattern ?? [];
  const breakdown = analytics.data?.transaction_breakdown ?? [];

  const isLoading = analytics.isLoading;

  if (isLoading) return <Loading fullScreen message="Loading usage data..." />;

  // Build chart data from daily usage
  const dailyChartData = dailyUsage.map((d) => ({
    label: d.date.slice(5), // MM-DD
    value: d.bags_used,
  }));
  const maxDailyBags = Math.max(...dailyUsage.map((d) => d.bags_used), 1);

  // Build hourly chart data (filter business hours 6-22)
  const hourlyChartData = hourlyPattern
    .filter((h) => h.hour >= 6 && h.hour <= 22)
    .map((h) => ({
      label: `${h.hour}`,
      value: h.bags_used,
    }));
  const maxHourlyBags = Math.max(...hourlyPattern.map((h) => h.bags_used), 1);

  // Period totals
  const totals = dailySummary.data?.period_totals;

  const trendColor = summary?.trend_direction === 'up'
    ? colors.error
    : summary?.trend_direction === 'down'
      ? colors.success
      : colors.gray[500];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Usage Trends', headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff', headerShadowVisible: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={analytics.isRefetching}
            onRefresh={() => {
              analytics.refetch();
              dailySummary.refetch();
            }}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((opt) => (
            <View key={opt.value} style={styles.periodBtnWrap}>
              <Text
                style={[styles.periodText, period === opt.value && styles.periodTextActive]}
                onPress={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        {summary && (
          <Card>
            <Text style={styles.sectionTitle}>Usage Summary</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.total_bags_7_days}</Text>
                <Text style={styles.statLabel}>Total Bags</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.daily_average.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Daily Avg</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.trendRow}>
                  <Ionicons
                    name={summary.trend_direction === 'up' ? 'trending-up' : summary.trend_direction === 'down' ? 'trending-down' : 'remove-outline'}
                    size={16}
                    color={trendColor}
                  />
                  <Text style={[styles.statValue, { color: trendColor }]}>
                    {Math.abs(summary.trend_pct).toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.statLabel}>Trend</Text>
              </View>
            </View>
            {analytics.data?.peak_day && (
              <Text style={styles.peakDay}>
                Peak: {analytics.data.peak_day} ({analytics.data.peak_day_bags} bags)
              </Text>
            )}
          </Card>
        )}

        {/* Daily Usage Chart */}
        {dailyChartData.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Daily Consumption</Text>
            <BarChart data={dailyChartData} maxValue={maxDailyBags} />
          </Card>
        )}

        {/* Hourly Pattern */}
        {hourlyChartData.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Today's Hourly Pattern</Text>
            <BarChart data={hourlyChartData} maxValue={maxHourlyBags} />
          </Card>
        )}

        {/* Period Totals */}
        {totals && (
          <Card>
            <Text style={styles.sectionTitle}>Period Totals</Text>
            <View style={styles.totalsGrid}>
              <View style={styles.totalItem}>
                <Ionicons name="arrow-down" size={16} color={colors.success} />
                <Text style={styles.totalValue}>{totals.total_received.toFixed(1)} kg</Text>
                <Text style={styles.totalLabel}>Received</Text>
              </View>
              <View style={styles.totalItem}>
                <Ionicons name="arrow-up" size={16} color={colors.info} />
                <Text style={styles.totalValue}>{totals.total_issued.toFixed(1)} kg</Text>
                <Text style={styles.totalLabel}>Issued</Text>
              </View>
              <View style={styles.totalItem}>
                <Ionicons name="trash" size={16} color={colors.error} />
                <Text style={styles.totalValue}>{totals.total_wasted.toFixed(1)} kg</Text>
                <Text style={styles.totalLabel}>Wasted</Text>
              </View>
              <View style={styles.totalItem}>
                <Ionicons name="swap-vertical" size={16} color={colors.gray[600]} />
                <Text style={[styles.totalValue, { color: totals.net_change >= 0 ? colors.success : colors.error }]}>
                  {totals.net_change >= 0 ? '+' : ''}{totals.net_change.toFixed(1)} kg
                </Text>
                <Text style={styles.totalLabel}>Net Change</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Transaction Breakdown Table */}
        {breakdown.length > 0 && (
          <Card padded={false}>
            <View style={styles.tableHeader}>
              <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            </View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableCell, styles.tableCellDate]}>Date</Text>
              <Text style={[styles.tableCell, styles.tableCellNum]}>In</Text>
              <Text style={[styles.tableCell, styles.tableCellNum]}>Out</Text>
              <Text style={[styles.tableCell, styles.tableCellNum]}>Waste</Text>
            </View>
            {breakdown.slice(-7).reverse().map((row) => (
              <View key={row.date} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellDate]}>{row.date.slice(5)}</Text>
                <Text style={[styles.tableCell, styles.tableCellNum, { color: colors.success }]}>
                  {row.received_bags.toFixed(0)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellNum, { color: colors.info }]}>
                  {row.issued_bags.toFixed(0)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellNum, { color: row.wasted_bags > 0 ? colors.error : colors.gray[400] }]}>
                  {row.wasted_bags.toFixed(0)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  periodRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  periodBtnWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  periodText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[500] },
  periodTextActive: { color: colors.primary[500], fontWeight: fontWeight.bold },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  peakDay: { fontSize: fontSize.xs, color: colors.gray[500], textAlign: 'center', marginTop: spacing.md },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  totalItem: { width: '46%', alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.gray[50], borderRadius: borderRadius.md },
  totalValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.gray[900], marginTop: spacing.xs },
  totalLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  tableHeader: { padding: spacing.lg, paddingBottom: 0 },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  tableCell: { fontSize: fontSize.sm },
  tableCellDate: { flex: 1, color: colors.gray[700] },
  tableCellNum: { width: 50, textAlign: 'right', fontWeight: fontWeight.medium },
});
