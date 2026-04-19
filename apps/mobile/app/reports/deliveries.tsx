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
import { useDailySummary, useShopEfficiency } from '../../src/hooks/useReports';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  ChipStrip,
  SummaryBand,
  LedgerRow,
  Stamp,
  PaperChart,
  KickerLabel,
  MonoText,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { PeriodDays } from '../../src/api/reports';

const PERIODS = ['7D', '14D', '30D'] as const;
type PeriodKey = (typeof PERIODS)[number];
const PERIOD_MAP: Record<PeriodKey, PeriodDays> = { '7D': 7, '14D': 14, '30D': 30 };

export default function DeliveriesReportScreen() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<PeriodKey>('7D');
  const days = PERIOD_MAP[period];

  const summary = useDailySummary(days, user?.location_id ?? undefined);
  const efficiency = useShopEfficiency(days);

  const totals = summary.data?.period_totals;
  const dailyData = summary.data?.daily_breakdown ?? [];
  const locations = efficiency.data?.locations ?? [];

  const daysWithReceived = dailyData.filter((d) => d.received_kg > 0).length;
  const avgDailyReceivedKg = totals ? totals.total_received / Math.max(days, 1) : 0;
  const wasteRate =
    totals && totals.total_received > 0 ? (totals.total_wasted / totals.total_received) * 100 : 0;
  const netEff =
    totals && totals.total_received > 0
      ? ((totals.total_received - totals.total_wasted) / totals.total_received) * 100
      : 0;

  const recvSeries = useMemo(
    () =>
      dailyData.map((d) => {
        const dt = new Date(d.date);
        return {
          label: String(dt.getDate()).padStart(2, '0'),
          value: d.received_kg / 10,
        };
      }),
    [dailyData],
  );

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {summary.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={summary.isRefetching}
                onRefresh={() => {
                  summary.refetch();
                  efficiency.refetch();
                }}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`DELIVERY REPORT — ${fmtKickerDate()}`}
              title="Deliveries"
              backUseRouter
            />

            <ChipStrip<PeriodKey> items={PERIODS} active={period} onChange={setPeriod} />

            {totals && (
              <SummaryBand
                items={[
                  {
                    label: 'Bags in',
                    value: (totals.total_received / 10).toFixed(0),
                    color: wp.color.green,
                  },
                  { label: 'Days', value: `${daysWithReceived}/${days}` },
                  { label: 'Avg/day', value: (avgDailyReceivedKg / 10).toFixed(1) },
                  {
                    label: 'Efficiency',
                    value: `${netEff.toFixed(0)}%`,
                    color:
                      netEff >= 95
                        ? wp.color.green
                        : netEff >= 85
                          ? wp.color.amber
                          : wp.color.red,
                  },
                ]}
              />
            )}

            {/* Waste band */}
            {totals && (
              <View style={styles.wasteRow}>
                <View>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    Waste
                  </KickerLabel>
                  <MonoText size={22} weight={700} tracking={-0.5} color={wasteRate > 5 ? wp.color.red : wp.color.ink}>
                    {wasteRate.toFixed(1)}%
                  </MonoText>
                </View>
                <View>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    Wasted
                  </KickerLabel>
                  <MonoText size={22} weight={700} tracking={-0.5} color={wp.color.ink}>
                    {(totals.total_wasted / 10).toFixed(1)}
                  </MonoText>
                  <KickerLabel size={9} tracking={1.2} color={wp.color.ink3}>
                    BAGS
                  </KickerLabel>
                </View>
                <Stamp
                  colorHex={wasteRate > 5 ? wp.color.red : wp.color.green}
                  rotate={-3}
                >
                  {wasteRate > 5 ? 'ABOVE TARGET' : 'ON TARGET'}
                </Stamp>
              </View>
            )}

            {recvSeries.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Daily received · bags
                  </KickerLabel>
                </View>
                <View style={styles.chartWrap}>
                  <PaperChart series={recvSeries} height={150} />
                </View>
              </>
            )}

            {dailyData.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Daily breakdown
                  </KickerLabel>
                </View>
                {[...dailyData].reverse().slice(0, 14).map((day, i) => {
                  const netBags = day.net_change / 10;
                  const c =
                    netBags > 0
                      ? wp.color.green
                      : netBags < 0
                        ? wp.color.red
                        : wp.color.ink3;
                  return (
                    <LedgerRow
                      key={day.date}
                      idx={i + 1}
                      primary={day.date.slice(5)}
                      secondary={`IN ${(day.received_kg / 10).toFixed(0)} · OUT ${(day.issued_kg / 10).toFixed(0)}`}
                      trailing={
                        <MonoText size={14} weight={700} color={c}>
                          {netBags >= 0 ? '+' : ''}
                          {netBags.toFixed(1)}
                        </MonoText>
                      }
                      chev={false}
                    />
                  );
                })}
              </>
            )}

            {locations.length > 1 && (
              <>
                <View style={[styles.sectionHead, styles.sectionHeadRule]}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Location comparison
                  </KickerLabel>
                </View>
                {locations.map((loc, i) => {
                  const c =
                    loc.efficiency_score >= 70
                      ? wp.color.green
                      : loc.efficiency_score >= 40
                        ? wp.color.amber
                        : wp.color.red;
                  return (
                    <LedgerRow
                      key={loc.location_id}
                      idx={i + 1}
                      primary={loc.location_name}
                      secondary={`WASTE ${loc.waste_rate_pct.toFixed(1)}% · RECV ${(loc.total_received_kg / 10).toFixed(0)} BAGS`}
                      trailing={
                        <Stamp colorHex={c} rowIndex={i}>
                          {`${loc.efficiency_score.toFixed(0)}pt`}
                        </Stamp>
                      }
                      chev={false}
                    />
                  );
                })}
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
  wasteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 16,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  sectionHead: {
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
