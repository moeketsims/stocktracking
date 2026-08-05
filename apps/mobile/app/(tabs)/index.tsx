import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAvailableRequests } from '../../src/hooks/useRequests';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  FloatingFrameLabel,
} from '../../src/components/wp';
import {
  wp,
  fmtKickerDate,
  fmtSyncedAt,
  stockStatusColor,
  stockStatusLabel,
} from '../../src/constants/warehousePaper';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const isManagerRole = ['admin', 'zone_manager', 'location_manager'].includes(role ?? '');
  const dashboard = useDashboard(isManagerRole ? undefined : (user?.location_id ?? undefined));
  const available = useAvailableRequests();
  const pending = usePendingDeliveries();

  const stats: any = dashboard.data?.stats;
  const forecast: any = dashboard.data?.forecast;
  const balances = dashboard.data?.stock_balance ?? [];

  const isDriver = role === 'driver';
  const isManager = isManagerRole;
  const reqCount = available.data?.total ?? 0;
  const delCount = pending.data?.total ?? 0;

  if (dashboard.isLoading) return <Loading fullScreen message="" />;
  if (dashboard.isError) {
    return (
      <PaperBackground>
        <QueryErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      </PaperBackground>
    );
  }

  const bags = stats?.total_stock_bags ?? Math.round((stats?.total_stock_kg ?? 0) / 10);
  const received =
    stats?.received_today_bags ?? Math.round((stats?.received_today_kg ?? 0) / 10);
  const issued = stats?.issued_today_bags ?? Math.round((stats?.issued_today_kg ?? 0) / 10);
  const wasted = stats?.wasted_today_bags ?? Math.round((stats?.wasted_today_kg ?? 0) / 10);

  // TODO: replace with real forecast hook once available. These stubs keep
  // the Forecast classified-ad card visible for locations that don't yet
  // have consumption history — daysCover and suggestOrder fall back to
  // computed values derived from on-hand + a static target.
  const dailyUseRaw = forecast?.avg_daily_usage_bags ?? forecast?.avg_daily_usage ?? 0;
  const daysCoverRaw = forecast?.days_of_cover ?? (dailyUseRaw > 0 ? bags / dailyUseRaw : 0);
  const orderQtyRaw =
    forecast?.suggested_order_qty_bags ??
    forecast?.suggested_order_qty ??
    Math.max(0, (balances[0]?.low_threshold ? Math.round(balances[0].low_threshold / 10) * 2 : 100) - bags);

  const dailyUse = dailyUseRaw;
  const daysCover = daysCoverRaw;
  const orderQty = orderQtyRaw;
  const daysCoverDisplay = dailyUseRaw > 0 ? Math.min(daysCover, 999).toFixed(0) : '—';
  const dailyUseDisplay = dailyUseRaw > 0 ? dailyUseRaw.toFixed(1) : '—';
  const orderQtyDisplay = orderQty > 0 ? orderQty.toFixed(0) : '—';

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={dashboard.isRefetching}
              onRefresh={() => {
                dashboard.refetch();
                available.refetch();
                pending.refetch();
              }}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            variant="dashboard"
            kicker={fmtKickerDate()}
            rightKicker={user?.location_name ? user.location_name.toUpperCase() : undefined}
            title="Home"
            managerName={user?.full_name ?? user?.email ?? undefined}
            syncedLabel={fmtSyncedAt(dashboard.dataUpdatedAt)}
          />

          {/* Hero — On hand today */}
          <View style={styles.hero}>
            <KickerLabel size={11} tracking={1} weight={600} color={wp.color.ink}>
              On hand today
            </KickerLabel>
            <View style={styles.heroRow}>
              <View style={styles.heroNumberWrap}>
                {(() => {
                  const heroSize = heroSizeForDigits(String(bags).length);
                  return (
                    <SerifNumber
                      size={heroSize}
                      tracking={-4}
                      leading={1.0}
                      color={wp.color.ink}
                      autoShrink
                    >
                      {String(bags)}
                    </SerifNumber>
                  );
                })()}
              </View>
              <MonoText size={12} color={wp.color.ink2} style={styles.heroUnit}>
                bags
              </MonoText>
            </View>
            <View style={styles.deltaRow}>
              <Delta sign="+" value={received} label="IN" color={wp.color.green} />
              <Delta sign="−" value={issued} label="OUT" color={wp.color.red} />
              <Delta sign="" value={wasted} label="LOSS" color={wp.color.amber} />
            </View>
          </View>

          {/* Banner: pending deliveries (managers) */}
          {isManager && delCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.calloutBanner}
              onPress={() => router.push('/alerts')}
            >
              <View style={styles.calloutBar} />
              <View style={styles.calloutBody}>
                <MonoText size={11} weight={700} tracking={1} upper color={wp.color.ink}>
                  {delCount} {delCount === 1 ? 'delivery awaits' : 'deliveries await'} confirmation
                </MonoText>
                <MonoText size={10} tracking={1} upper color={wp.color.ink3}>
                  Tap to review
                </MonoText>
              </View>
            </TouchableOpacity>
          )}

          {/* Banner: available requests (drivers) */}
          {isDriver && reqCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.calloutBanner}
              onPress={() => router.push('/(tabs)/requests')}
            >
              <View style={[styles.calloutBar, { backgroundColor: wp.color.green }]} />
              <View style={styles.calloutBody}>
                <MonoText size={11} weight={700} tracking={1} upper color={wp.color.ink}>
                  {reqCount} {reqCount === 1 ? 'request available' : 'requests available'}
                </MonoText>
                <MonoText size={10} tracking={1} upper color={wp.color.ink3}>
                  Tap to view work
                </MonoText>
              </View>
            </TouchableOpacity>
          )}

          {/* Locations — Ledger */}
          <View style={styles.ledgerHeader}>
            <KickerLabel size={11} tracking={1} weight={600} color={wp.color.ink}>
              Locations — Ledger
            </KickerLabel>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
              {balances.length} {balances.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </KickerLabel>
          </View>

          {/* Table column headers */}
          <View style={styles.tableHeader}>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={{ flex: 1 }}>
              Location
            </KickerLabel>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={styles.colOnHand}>
              On hand
            </KickerLabel>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={styles.colMin}>
              Min
            </KickerLabel>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={styles.colStatus}>
              Status
            </KickerLabel>
          </View>

          {balances.length > 0 ? (
            balances.map((b: any, i: number) => {
              const oh = b.on_hand_bags ?? Math.round((b.on_hand_qty ?? 0) / 10);
              const min = Math.round((b.low_threshold ?? 0) / 10);
              const crit = oh <= Math.round((b.critical_threshold ?? 0) / 10);
              const low = !crit && oh <= min;
              const status = crit ? 'critical' : low ? 'low' : 'ok';
              return (
                <View key={`${b.location_id}-${b.item_id}`} style={styles.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={wp.fontScale.text}
                      style={styles.locationName}
                    >
                      {b.location_name}
                    </Text>
                    <MonoText size={10} color={wp.color.ink3} style={{ marginTop: 1 }}>
                      #{(b.location_id ?? '').toString().slice(-4).toUpperCase().padStart(4, '0')}
                      {' · '}
                      {b.item_name?.toLowerCase().includes('10kg') ? '10kg' : b.unit ?? '10kg'}
                    </MonoText>
                  </View>
                  <View style={styles.colOnHand}>
                    <MonoText size={18} weight={700} color={wp.color.ink} style={styles.numRight}>
                      {oh}
                    </MonoText>
                  </View>
                  <View style={styles.colMin}>
                    <MonoText size={12} color={wp.color.ink3} style={styles.numRight}>
                      {min || '—'}
                    </MonoText>
                  </View>
                  <View style={[styles.colStatus, styles.stampCol]}>
                    <Stamp colorHex={stockStatusColor(status)} rowIndex={i}>
                      {stockStatusLabel(status)}
                    </Stamp>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyRow}>
              <MonoText size={11} color={wp.color.ink3} upper tracking={1}>
                No inventory data
              </MonoText>
            </View>
          )}

          {/* Ghost rows — preserve the ruled-paper rhythm when fewer than 4
              real entries. Only renders for sparse accounts; locations with
              4+ real rows don't need padding. */}
          {balances.length > 0 && balances.length < 4 &&
            Array.from({ length: 3 }).map((_, i) => (
              <View key={`ghost-${i}`} style={styles.ghostRow}>
                <MonoText size={10} color="#D4CCB9" style={styles.ghostDash}>
                  —
                </MonoText>
              </View>
            ))}

          {/* Forecast — classified ad */}
          <View style={styles.forecastWrap}>
            <View style={styles.forecastBox}>
              <FloatingFrameLabel>Forecast</FloatingFrameLabel>
              <View style={styles.forecastRow}>
                <ForecastCol value={daysCoverDisplay} label="Days cover" />
                <ForecastCol value={dailyUseDisplay} label="Daily rate" />
                <ForecastCol
                  value={orderQtyDisplay}
                  label="Suggest order"
                  color={orderQty > 0 ? wp.color.red : wp.color.ink}
                  divider
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function Delta({
  sign,
  value,
  label,
  color,
}: {
  sign: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.delta}>
      <MonoText size={11} weight={700} color={color}>
        {sign}
        {value}
      </MonoText>
      <MonoText size={11} color={wp.color.ink3}>
        {' '}
        {label}
      </MonoText>
    </View>
  );
}

/**
 * Fraunces 900 italic at 96pt fits 3 digits comfortably on a standard iPhone.
 * Larger digit counts overflow the available width (screen minus hero
 * padding minus the "bags" label). Scale down deterministically so the
 * italic slant never clips, regardless of how far the stock count grows.
 */
function heroSizeForDigits(n: number): number {
  if (n <= 3) return 96;
  if (n === 4) return 80;
  if (n === 5) return 66;
  return 54;
}

function ForecastCol({
  value,
  label,
  color = wp.color.ink,
  divider,
}: {
  value: string;
  label: string;
  color?: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.forecastCol, divider && styles.forecastDivider]}>
      <SerifNumber size={32} weight={700} tracking={-1} color={color}>
        {value}
      </SerifNumber>
      <MonoText size={10} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 4 }}>
        {label}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 96 },

  hero: {
    // No full-bleed bottom rule between hero and ledger — use the section
    // kicker "LOCATIONS — LEDGER" as the divider instead. Only mastheads
    // and the ledger column-header rule remain full-bleed.
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    paddingBottom: wp.space.block,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12, // 12px between digits end and "bags" label per directive
    marginTop: 6,
  },
  heroNumberWrap: {
    flexShrink: 1,
    // Reserve room for Fraunces's italic slant beside the "bags" label.
    // Vertical font metrics are handled centrally by SerifNumber.
    paddingRight: 18,
  },
  heroUnit: {
    flexShrink: 0,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  calloutBanner: {
    flexDirection: 'row',
    marginHorizontal: wp.space.screenH,
    marginTop: wp.space.lg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
  },
  calloutBar: {
    width: 6,
    backgroundColor: wp.color.red,
  },
  calloutBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },

  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.xl,
    paddingBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: wp.space.screenH,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.lineD,
    alignItems: 'center',
  },
  // Inset dashed divider per global rule §4: marginHorizontal instead of
  // paddingHorizontal, so the 1px dashed rule lives inside the 20px screen
  // padding rather than touching the edges.
  row: {
    flexDirection: 'row',
    marginHorizontal: wp.space.screenH,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    gap: 8,
  },
  locationName: {
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  numRight: {
    textAlign: 'right',
  },
  colOnHand: {
    width: 56,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  colMin: {
    width: 48,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  colStatus: {
    width: 70,
    alignItems: 'flex-end',
    paddingRight: 4,
    textAlign: 'right',
  },
  stampCol: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyRow: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 32,
    alignItems: 'center',
  },
  // Ghost rows per directive: 32px tall, inset dashed bottom, centered
  // mono "—" in the explicit lighter tone (#D4CCB9, not the darker `line`
  // token used for real dividers).
  ghostRow: {
    marginHorizontal: wp.space.screenH,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4CCB9',
    borderStyle: 'dashed',
  },
  ghostDash: {
    textAlign: 'center',
    color: '#D4CCB9',
  },

  forecastWrap: {
    paddingHorizontal: wp.space.screenH,
    marginTop: wp.space.block,
  },
  forecastBox: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    padding: 16,
    paddingTop: 18,
    position: 'relative',
  },
  forecastRow: {
    flexDirection: 'row',
    gap: 16,
  },
  forecastCol: {
    flex: 1,
  },
  forecastDivider: {
    borderLeftWidth: 1,
    borderLeftColor: wp.color.line,
    borderStyle: 'dashed',
    paddingLeft: 16,
  },
});
