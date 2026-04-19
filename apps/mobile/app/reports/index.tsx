import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useAnalytics } from '../../src/hooks/useReports';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  ChipStrip,
  LedgerRow,
  SerifNumber,
  MonoText,
  KickerLabel,
  Stamp,
  HardShadowFrame,
  FloatingFrameLabel,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { PeriodDays } from '../../src/api/reports';

const PERIODS = ['7D', '14D', '30D'] as const;
type PeriodKey = (typeof PERIODS)[number];

const PERIOD_MAP: Record<PeriodKey, PeriodDays> = { '7D': 7, '14D': 14, '30D': 30 };

export default function ReportsHubScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<PeriodKey>('7D');
  const days = PERIOD_MAP[period];

  const analytics = useAnalytics(days, user?.location_id ?? undefined);
  const summary = analytics.data?.summary;
  const waste = analytics.data?.waste_analysis;

  const trendDir = summary?.trend_direction;
  const trendSign = trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : '–';
  const trendColor =
    trendDir === 'up' ? wp.color.red : trendDir === 'down' ? wp.color.green : wp.color.ink3;

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
                onRefresh={() => analytics.refetch()}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`ANALYTICS — ${fmtKickerDate()}`}
              title="Reports"
              backUseRouter
            />

            <ChipStrip<PeriodKey> items={PERIODS} active={period} onChange={setPeriod} />

            {/* Quick stats voucher */}
            {summary && (
              <View style={styles.statsWrap}>
                <HardShadowFrame>
                  <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                      <View style={styles.statsCol}>
                        <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                          Bags used
                        </KickerLabel>
                        <SerifNumber size={48} tracking={-1.5} leading={1} autoShrink>
                          {String(summary.total_bags_7_days)}
                        </SerifNumber>
                      </View>
                      <View style={styles.statsColRight}>
                        <View style={styles.statsMini}>
                          <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                            Daily avg
                          </KickerLabel>
                          <MonoText size={22} weight={700} tracking={-0.5} color={wp.color.ink}>
                            {summary.daily_average.toFixed(1)}
                          </MonoText>
                        </View>
                        <View style={styles.statsMini}>
                          <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                            Trend
                          </KickerLabel>
                          <MonoText size={22} weight={700} tracking={-0.5} color={trendColor}>
                            {trendSign} {Math.abs(summary.trend_pct).toFixed(1)}%
                          </MonoText>
                        </View>
                      </View>
                    </View>
                  </View>
                </HardShadowFrame>
              </View>
            )}

            {/* Report ledger */}
            <View style={styles.sectionHead}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                Reports
              </KickerLabel>
            </View>

            <LedgerRow
              idx={1}
              primary="Stock summary"
              secondary="CURRENT LEVELS ACROSS LOCATIONS"
              onPress={() => router.push('/reports/stock-summary')}
            />
            <LedgerRow
              idx={2}
              primary="Usage trends"
              secondary={
                summary
                  ? `${summary.daily_average.toFixed(1)} BAGS/DAY · ${days}D AVG`
                  : 'DAILY CONSUMPTION · HOURLY PATTERN'
              }
              onPress={() => router.push('/reports/usage')}
            />
            <LedgerRow
              idx={3}
              primary="Delivery performance"
              secondary="METRICS · EFFICIENCY · WASTE"
              onPress={() => router.push('/reports/deliveries')}
            />
            <LedgerRow
              idx={4}
              primary="Transaction history"
              secondary="ALL STOCK MOVEMENTS"
              onPress={() => router.push('/reports/transactions')}
            />

            {/* Waste flag */}
            {waste && waste.total_wasted_kg > 0 && (
              <View style={styles.wasteWrap}>
                <FloatingFrameLabel color={wp.color.red}>Waste</FloatingFrameLabel>
                <View style={styles.wasteCard}>
                  <View style={styles.wasteRow}>
                    <View>
                      <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                        Wasted
                      </KickerLabel>
                      <MonoText size={26} weight={700} tracking={-0.5} color={wp.color.red}>
                        {waste.total_wasted_bags.toFixed(1)}
                      </MonoText>
                      <KickerLabel size={9} tracking={1.2} color={wp.color.ink3}>
                        BAGS
                      </KickerLabel>
                    </View>
                    <View>
                      <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                        Rate
                      </KickerLabel>
                      <MonoText
                        size={26}
                        weight={700}
                        tracking={-0.5}
                        color={waste.waste_rate_pct > 5 ? wp.color.red : wp.color.ink}
                      >
                        {waste.waste_rate_pct.toFixed(1)}%
                      </MonoText>
                    </View>
                    <Stamp colorHex={wp.color.red} rotate={-4}>
                      {waste.waste_rate_pct > 5 ? 'ABOVE TARGET' : 'ON TARGET'}
                    </Stamp>
                  </View>
                </View>
              </View>
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

  statsWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
    paddingBottom: wp.space.block,
  },
  statsCard: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statsCol: { flex: 1 },
  statsColRight: { gap: 12 },
  statsMini: {},

  sectionHead: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 12,
    paddingBottom: 4,
  },

  wasteWrap: {
    marginHorizontal: wp.space.screenH,
    marginTop: wp.space.section,
    position: 'relative',
  },
  wasteCard: {
    borderWidth: 2,
    borderColor: wp.color.red,
    padding: 16,
    backgroundColor: wp.color.criticalCallout,
  },
  wasteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
});
