import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useAnalytics, useDailySummary } from '../../src/hooks/useReports';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  ChipStrip,
  SummaryBand,
  PaperChart,
  KickerLabel,
  MonoText,
  LedgerRow,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { PeriodDays } from '../../src/api/reports';

const PERIODS = ['7D', '14D', '30D'] as const;
type PeriodKey = (typeof PERIODS)[number];
const PERIOD_MAP: Record<PeriodKey, PeriodDays> = { '7D': 7, '14D': 14, '30D': 30 };

export default function UsageScreen() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<PeriodKey>('7D');
  const days = PERIOD_MAP[period];

  const analytics = useAnalytics(days, user?.location_id ?? undefined);
  const dailySummary = useDailySummary(days, user?.location_id ?? undefined);

  const summary = analytics.data?.summary;
  const dailyUsage = analytics.data?.daily_usage ?? [];
  const hourlyPattern = analytics.data?.hourly_pattern ?? [];
  const breakdown = analytics.data?.transaction_breakdown ?? [];
  const totals = dailySummary.data?.period_totals;

  const dailySeries = useMemo(
    () =>
      dailyUsage.map((d) => {
        const date = new Date(d.date);
        const day = date.getDate();
        return { label: String(day).padStart(2, '0'), value: d.bags_used };
      }),
    [dailyUsage],
  );

  const hourlySeries = useMemo(
    () =>
      hourlyPattern
        .filter((h) => h.hour >= 6 && h.hour <= 22)
        .map((h) => ({ label: String(h.hour), value: h.bags_used })),
    [hourlyPattern],
  );

  const trendSign =
    summary?.trend_direction === 'up' ? '▲' : summary?.trend_direction === 'down' ? '▼' : '–';
  const trendColor =
    summary?.trend_direction === 'up'
      ? wp.color.red
      : summary?.trend_direction === 'down'
        ? wp.color.green
        : wp.color.ink3;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {analytics.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={analytics.isRefetching}
                onRefresh={() => {
                  analytics.refetch();
                  dailySummary.refetch();
                }}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`USAGE TRENDS — ${fmtKickerDate()}`}
              title="Usage"
              backUseRouter
            />

            <ChipStrip<PeriodKey> items={PERIODS} active={period} onChange={setPeriod} />

            {summary && (
              <SummaryBand
                items={[
                  { label: 'Bags', value: summary.total_bags_7_days },
                  { label: 'Avg/day', value: summary.daily_average.toFixed(1) },
                  {
                    label: 'Trend',
                    value: `${trendSign}${Math.abs(summary.trend_pct).toFixed(0)}%`,
                    color: trendColor,
                  },
                ]}
              />
            )}

            {analytics.data?.peak_day ? (
              <View style={styles.peakRow}>
                <MonoText size={10} tracking={1.5} upper color={wp.color.ink3}>
                  Peak — {analytics.data.peak_day} · {analytics.data.peak_day_bags} bags
                </MonoText>
              </View>
            ) : null}

            {dailySeries.length > 0 && (
              <View style={styles.block}>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Daily consumption
                  </KickerLabel>
                </View>
                <View style={styles.chartWrap}>
                  <PaperChart series={dailySeries} height={150} />
                </View>
              </View>
            )}

            {hourlySeries.length > 0 && (
              <View style={styles.block}>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Hourly pattern · today
                  </KickerLabel>
                </View>
                <View style={styles.chartWrap}>
                  <PaperChart series={hourlySeries} height={140} />
                </View>
              </View>
            )}

            {totals && (
              <>
                <View style={[styles.sectionHead, styles.sectionHeadRule]}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Period totals
                  </KickerLabel>
                </View>
                <SummaryBand
                  items={[
                    {
                      label: 'Recv kg',
                      value: totals.total_received.toFixed(0),
                      color: wp.color.green,
                    },
                    {
                      label: 'Iss kg',
                      value: totals.total_issued.toFixed(0),
                    },
                    {
                      label: 'Waste',
                      value: totals.total_wasted.toFixed(0),
                      color: wp.color.red,
                    },
                    {
                      label: 'Net',
                      value: `${totals.net_change >= 0 ? '+' : ''}${totals.net_change.toFixed(0)}`,
                      color: totals.net_change >= 0 ? wp.color.green : wp.color.red,
                    },
                  ]}
                />
              </>
            )}

            {breakdown.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Breakdown · last 7 days
                  </KickerLabel>
                </View>
                {breakdown.slice(-7).reverse().map((row, i) => (
                  <LedgerRow
                    key={row.date}
                    idx={i + 1}
                    primary={row.date.slice(5)}
                    secondary={`IN ${row.received_bags.toFixed(0)} · OUT ${row.issued_bags.toFixed(0)} · WASTE ${row.wasted_bags.toFixed(0)}`}
                    chev={false}
                  />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  peakRow: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 12,
    paddingBottom: 4,
  },
  block: {
    paddingBottom: 6,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionHeadRule: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
  },
  chartWrap: {
    paddingHorizontal: wp.space.screenH,
  },
});
