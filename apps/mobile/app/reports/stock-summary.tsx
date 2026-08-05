import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useStockLevels, useShopEfficiency } from '../../src/hooks/useReports';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  SummaryBand,
  LedgerRow,
  Stamp,
  KickerLabel,
  MonoText,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

function stockStatus(bags: number): { label: string; color: string } {
  if (bags <= 0) return { label: 'OUT', color: wp.color.red };
  if (bags < 5) return { label: 'LOW', color: wp.color.amber };
  return { label: 'OK', color: wp.color.green };
}

export default function StockSummaryScreen() {
  const user = useAuthStore((s) => s.user);
  const canSeeFleet = user?.role === 'admin' || user?.role === 'zone_manager';

  const stockLevels = useStockLevels(user?.location_id ?? undefined);
  const efficiency = useShopEfficiency(30);

  const levels = stockLevels.data?.stock_levels ?? [];
  const locations = efficiency.data?.locations ?? [];

  const totalBags = levels.reduce((sum, l) => sum + l.bags_remaining, 0);
  const lowCount = levels.filter((l) => l.bags_remaining > 0 && l.bags_remaining < 5).length;
  const outCount = levels.filter((l) => l.bags_remaining <= 0).length;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {stockLevels.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={stockLevels.isRefetching}
                onRefresh={() => {
                  stockLevels.refetch();
                  efficiency.refetch();
                }}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`STOCK LEVELS — ${fmtKickerDate()}`}
              title="Stock summary"
              backUseRouter
            />

            <SummaryBand
              items={[
                { label: 'Bags', value: totalBags },
                { label: 'Low', value: lowCount, color: wp.color.amber },
                { label: 'Out', value: outCount, color: wp.color.red },
              ]}
            />

            <View style={styles.sectionHead}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                On hand
              </KickerLabel>
              <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                {levels.length} {levels.length === 1 ? 'item' : 'items'}
              </KickerLabel>
            </View>

            {levels.length === 0 ? (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  No stock data
                </MonoText>
              </View>
            ) : (
              levels.map((item, i) => {
                const status = stockStatus(item.bags_remaining);
                return (
                  <LedgerRow
                    key={item.item_id}
                    idx={i + 1}
                    primary={item.item_name}
                    secondary={`${item.kg_remaining.toFixed(1)} kg · ${item.bags_remaining} bags`}
                    trailing={
                      <Stamp colorHex={status.color} rowIndex={i}>
                        {status.label}
                      </Stamp>
                    }
                    chev={false}
                  />
                );
              })
            )}

            {canSeeFleet && locations.length > 0 && (
              <>
                <View style={[styles.sectionHead, styles.sectionHeadRule]}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Location performance
                  </KickerLabel>
                  {efficiency.data?.best_performer ? (
                    <KickerLabel size={9} tracking={1.5} color={wp.color.green}>
                      Best · {efficiency.data.best_performer}
                    </KickerLabel>
                  ) : null}
                </View>
                {locations.map((loc, i) => {
                  const color =
                    loc.efficiency_score >= 70
                      ? wp.color.green
                      : loc.efficiency_score >= 40
                        ? wp.color.amber
                        : wp.color.red;
                  return (
                    <LedgerRow
                      key={loc.location_id}
                      idx={loc.rank}
                      primary={loc.location_name}
                      secondary={`${loc.current_stock_bags} bags · waste ${loc.waste_rate_pct.toFixed(1)}%`}
                      trailing={
                        <Stamp colorHex={color} rowIndex={i}>
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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 6,
  },
  sectionHeadRule: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
  },
  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },
});
