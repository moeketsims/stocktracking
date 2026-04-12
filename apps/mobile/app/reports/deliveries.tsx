import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useDailySummary, useShopEfficiency } from '../../src/hooks/useReports';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { PeriodDays } from '../../src/api/reports';

const PERIODS: { label: string; value: PeriodDays }[] = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
];

function MetricCard({ icon, label, value, subtitle, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <View style={metricStyles.card}>
      <View style={[metricStyles.iconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={metricStyles.value}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
      {subtitle && <Text style={metricStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: { width: '46%', alignItems: 'center', paddingVertical: spacing.lg, backgroundColor: colors.gray[50], borderRadius: borderRadius.md },
  iconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  value: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  label: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  subtitle: { fontSize: 10, color: colors.gray[400], marginTop: 1 },
});

export default function DeliveriesReportScreen() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<PeriodDays>(7);

  const summary = useDailySummary(period, user?.location_id ?? undefined);
  const efficiency = useShopEfficiency(period === 7 ? 7 : period === 14 ? 14 : 30);

  const totals = summary.data?.period_totals;
  const dailyData = summary.data?.daily_breakdown ?? [];
  const locations = efficiency.data?.locations ?? [];

  const isLoading = summary.isLoading;

  if (isLoading) return <Loading fullScreen message="Loading delivery data..." />;

  // Calculate delivery metrics from daily summary
  const daysWithReceived = dailyData.filter((d) => d.received_kg > 0).length;
  const avgDailyReceived = totals ? totals.total_received / Math.max(period, 1) : 0;
  const wasteRate = totals && totals.total_received > 0
    ? (totals.total_wasted / totals.total_received * 100)
    : 0;
  const netEfficiency = totals && totals.total_received > 0
    ? ((totals.total_received - totals.total_wasted) / totals.total_received * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching}
            onRefresh={() => {
              summary.refetch();
              efficiency.refetch();
            }}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((opt) => (
            <Text
              key={opt.value}
              style={[styles.periodText, period === opt.value && styles.periodActive]}
              onPress={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Text>
          ))}
        </View>

        {/* KPI Cards */}
        {totals && (
          <Card>
            <Text style={styles.sectionTitle}>Delivery Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                icon="cube"
                label="Total Received"
                value={`${(totals.total_received / 10).toFixed(0)} bags`}
                subtitle={`${totals.total_received.toFixed(0)} kg`}
                color={colors.success}
              />
              <MetricCard
                icon="calendar"
                label="Active Days"
                value={`${daysWithReceived}`}
                subtitle={`of ${period} days`}
                color={colors.info}
              />
              <MetricCard
                icon="speedometer"
                label="Avg Daily"
                value={`${(avgDailyReceived / 10).toFixed(1)} bags`}
                subtitle="per day"
                color={colors.primary[500]}
              />
              <MetricCard
                icon="shield-checkmark"
                label="Efficiency"
                value={`${netEfficiency.toFixed(1)}%`}
                subtitle="received minus waste"
                color={netEfficiency >= 95 ? colors.success : netEfficiency >= 85 ? colors.warning : colors.error}
              />
            </View>
          </Card>
        )}

        {/* Waste Analysis */}
        {totals && (
          <Card style={wasteRate > 5 ? styles.warningCard : undefined}>
            <View style={styles.wasteHeader}>
              <Ionicons
                name={wasteRate > 5 ? 'warning' : 'checkmark-circle'}
                size={18}
                color={wasteRate > 5 ? colors.error : colors.success}
              />
              <Text style={styles.sectionTitle}>Waste Analysis</Text>
            </View>
            <View style={styles.wasteRow}>
              <View style={styles.wasteItem}>
                <Text style={[styles.wasteValue, { color: wasteRate > 5 ? colors.error : colors.gray[900] }]}>
                  {wasteRate.toFixed(1)}%
                </Text>
                <Text style={styles.wasteLabel}>Waste Rate</Text>
              </View>
              <View style={styles.wasteItem}>
                <Text style={styles.wasteValue}>
                  {(totals.total_wasted / 10).toFixed(1)} bags
                </Text>
                <Text style={styles.wasteLabel}>Total Wasted</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Daily Breakdown */}
        {dailyData.length > 0 && (
          <Card padded={false}>
            <View style={styles.tableHeader}>
              <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            </View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cell, styles.cellDate, styles.cellBold]}>Date</Text>
              <Text style={[styles.cell, styles.cellNum, styles.cellBold]}>Received</Text>
              <Text style={[styles.cell, styles.cellNum, styles.cellBold]}>Issued</Text>
              <Text style={[styles.cell, styles.cellNum, styles.cellBold]}>Net</Text>
            </View>
            {[...dailyData].reverse().map((day) => {
              const netColor = day.net_change > 0 ? colors.success : day.net_change < 0 ? colors.error : colors.gray[500];
              return (
                <View key={day.date} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.cellDate]}>{day.date.slice(5)}</Text>
                  <Text style={[styles.cell, styles.cellNum, { color: colors.success }]}>
                    {(day.received_kg / 10).toFixed(0)}
                  </Text>
                  <Text style={[styles.cell, styles.cellNum, { color: colors.info }]}>
                    {(day.issued_kg / 10).toFixed(0)}
                  </Text>
                  <Text style={[styles.cell, styles.cellNum, { color: netColor }]}>
                    {day.net_change >= 0 ? '+' : ''}{(day.net_change / 10).toFixed(1)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Location Efficiency */}
        {locations.length > 1 && (
          <Card padded={false}>
            <View style={styles.tableHeader}>
              <Text style={styles.sectionTitle}>Location Comparison</Text>
            </View>
            {locations.map((loc) => {
              const scoreVariant = loc.efficiency_score >= 70
                ? 'success' : loc.efficiency_score >= 40 ? 'warning' : 'error';
              return (
                <View key={loc.location_id} style={styles.locationRow}>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{loc.location_name}</Text>
                    <Text style={styles.locationMeta}>
                      Waste: {loc.waste_rate_pct.toFixed(1)}% | Received: {(loc.total_received_kg / 10).toFixed(0)} bags
                    </Text>
                  </View>
                  <Badge label={`${loc.efficiency_score.toFixed(0)}pt`} variant={scoreVariant} />
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
  periodRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  periodText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[500], paddingVertical: spacing.sm },
  periodActive: { color: colors.primary[500], fontWeight: fontWeight.bold, borderBottomWidth: 2, borderBottomColor: colors.primary[500] },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  warningCard: { borderLeftWidth: 3, borderLeftColor: colors.error },
  wasteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wasteRow: { flexDirection: 'row', justifyContent: 'space-around' },
  wasteItem: { alignItems: 'center' },
  wasteValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  wasteLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
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
  cell: { fontSize: fontSize.sm },
  cellDate: { flex: 1, color: colors.gray[700] },
  cellNum: { width: 60, textAlign: 'right', fontWeight: fontWeight.medium },
  cellBold: { fontWeight: fontWeight.semibold, color: colors.gray[600] },
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
  locationName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  locationMeta: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
});
