import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useAnalytics } from '../../src/hooks/useReports';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { PeriodDays } from '../../src/api/reports';

const PERIOD_OPTIONS: { label: string; value: PeriodDays }[] = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
];

interface ReportCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  value?: string;
  valueColor?: string;
}

function ReportCard({ icon, title, subtitle, color, onPress, value, valueColor }: ReportCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card>
        <View style={styles.reportCardRow}>
          <View style={[styles.reportIconBg, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.reportCardInfo}>
            <Text style={styles.reportCardTitle}>{title}</Text>
            <Text style={styles.reportCardSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.reportCardRight}>
            {value && (
              <Text style={[styles.reportCardValue, valueColor ? { color: valueColor } : undefined]}>
                {value}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function ReportsHubScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<PeriodDays>(7);

  const analytics = useAnalytics(period, user?.location_id ?? undefined);
  const summary = analytics.data?.summary;
  const waste = analytics.data?.waste_analysis;

  const trendColor = summary?.trend_direction === 'up'
    ? colors.error
    : summary?.trend_direction === 'down'
      ? colors.success
      : colors.gray[500];

  const trendIcon = summary?.trend_direction === 'up'
    ? 'trending-up'
    : summary?.trend_direction === 'down'
      ? 'trending-down'
      : 'remove-outline';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodBtn, period === opt.value && styles.periodBtnActive]}
              onPress={() => setPeriod(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === opt.value && styles.periodTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        {analytics.isLoading ? (
          <Loading message="Loading analytics..." />
        ) : summary ? (
          <Card>
            <Text style={styles.sectionTitle}>Quick Overview</Text>
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{summary.total_bags_7_days}</Text>
                <Text style={styles.quickStatLabel}>Bags Used ({period}d)</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{summary.daily_average.toFixed(1)}</Text>
                <Text style={styles.quickStatLabel}>Daily Average</Text>
              </View>
              <View style={styles.quickStatItem}>
                <View style={styles.trendRow}>
                  <Ionicons name={trendIcon as keyof typeof Ionicons.glyphMap} size={16} color={trendColor} />
                  <Text style={[styles.quickStatValue, { color: trendColor }]}>
                    {Math.abs(summary.trend_pct).toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.quickStatLabel}>Trend</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Report Links */}
        <Text style={styles.sectionHeader}>Reports</Text>

        <ReportCard
          icon="layers"
          title="Stock Summary"
          subtitle="Current stock levels across locations"
          color={colors.primary[500]}
          onPress={() => router.push('/reports/stock-summary')}
        />

        <ReportCard
          icon="bar-chart"
          title="Usage Trends"
          subtitle="Daily consumption and patterns"
          color={colors.info}
          onPress={() => router.push('/reports/usage')}
          value={summary ? `${summary.daily_average.toFixed(1)} bags/day` : undefined}
        />

        <ReportCard
          icon="car"
          title="Delivery Performance"
          subtitle="Delivery metrics and efficiency"
          color={colors.success}
          onPress={() => router.push('/reports/deliveries')}
        />

        <ReportCard
          icon="receipt"
          title="Transaction History"
          subtitle="All stock movements and operations"
          color={colors.brown[500]}
          onPress={() => router.push('/reports/transactions')}
        />

        {waste && waste.total_wasted_kg > 0 && (
          <Card style={styles.wasteCard}>
            <View style={styles.wasteHeader}>
              <Ionicons name="warning" size={18} color={colors.warning} />
              <Text style={styles.wasteTitle}>Waste Summary</Text>
            </View>
            <View style={styles.wasteRow}>
              <View style={styles.wasteItem}>
                <Text style={styles.wasteValue}>{waste.total_wasted_bags.toFixed(1)}</Text>
                <Text style={styles.wasteLabel}>Bags Wasted</Text>
              </View>
              <View style={styles.wasteItem}>
                <Text style={[styles.wasteValue, { color: waste.waste_rate_pct > 5 ? colors.error : colors.gray[900] }]}>
                  {waste.waste_rate_pct.toFixed(1)}%
                </Text>
                <Text style={styles.wasteLabel}>Waste Rate</Text>
              </View>
            </View>
            {waste.breakdown.length > 0 && (
              <View style={styles.wasteBreakdown}>
                {waste.breakdown.slice(0, 3).map((item) => (
                  <View key={item.reason} style={styles.wasteBreakdownItem}>
                    <Text style={styles.wasteBreakdownName}>{item.display_name}</Text>
                    <Text style={styles.wasteBreakdownPct}>{item.percentage.toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.md },
  periodRow: { flexDirection: 'row', gap: spacing.sm },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  periodBtnActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  periodText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
  periodTextActive: { color: colors.white },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  sectionHeader: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginTop: spacing.sm },
  quickStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickStatItem: { alignItems: 'center' },
  quickStatValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900] },
  quickStatLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reportIconBg: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  reportCardInfo: { flex: 1 },
  reportCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  reportCardSubtitle: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  reportCardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reportCardValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
  wasteCard: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  wasteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  wasteTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  wasteRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  wasteItem: { alignItems: 'center' },
  wasteValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  wasteLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  wasteBreakdown: { gap: spacing.xs },
  wasteBreakdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  wasteBreakdownName: { fontSize: fontSize.sm, color: colors.gray[700] },
  wasteBreakdownPct: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
});
