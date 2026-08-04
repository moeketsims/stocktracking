import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useStockBalance,
  useStockByLocation,
  useTodayTransactions,
  useIssueStock,
  useReturnStock,
} from '../../src/hooks/useStock';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { useExportStock } from '../../src/hooks/useExports';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import { UndoToast } from '../../src/components/UndoToast';
import { timeAgo } from '../../src/utils/dates';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  InkButton,
  TabStrip,
  TapeAccent,
  KitchenStampButton,
} from '../../src/components/wp';
import {
  wp,
  fmtKickerDate,
  stockStatusColor,
  stockStatusLabel,
} from '../../src/constants/warehousePaper';

type FilterMode = 'all' | 'critical' | 'sufficient';

function classify(status: string): 'critical' | 'low' | 'ok' {
  if (status === 'critical' || status === 'out') return 'critical';
  if (status === 'low') return 'low';
  return 'ok';
}

interface UndoState {
  message: string;
  bags: number;
}

export default function StockScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'staff';
  const isManager =
    user?.role === 'location_manager' ||
    user?.role === 'zone_manager' ||
    user?.role === 'admin';

  const balance = useStockBalance(user?.location_id ?? undefined);
  const today = useTodayTransactions(user?.location_id ?? undefined);
  const byLocation = useStockByLocation();
  const pendingDeliveries = usePendingDeliveries();
  const deliveriesList = pendingDeliveries.data?.deliveries ?? [];

  const issueMutation = useIssueStock();
  const returnMutation = useReturnStock();
  const { exportStock, loading: exportLoading } = useExportStock();

  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const stockItems = balance.data?.balance ?? [];
  const transactions = today.data?.transactions ?? [];
  const totalKg = stockItems.reduce((sum, item) => sum + item.on_hand_qty, 0);
  const totalBags = Math.round(totalKg / 10);
  const rawLocations = byLocation.data?.locations ?? [];
  const totalStockBags = Math.round((byLocation.data?.total_stock_kg ?? 0) / 10);

  const { needsAttention, sufficient, criticalCt, lowCt, sufficientCt } = useMemo(() => {
    let filtered = rawLocations;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((l) => l.location_name.toLowerCase().includes(q));
    }
    const needs: typeof filtered = [];
    const suf: typeof filtered = [];
    for (const loc of filtered) {
      const c = classify(loc.status);
      if (c === 'critical' || c === 'low') needs.push(loc);
      else suf.push(loc);
    }
    const sev: Record<string, number> = { out: 0, critical: 1, low: 2 };
    needs.sort(
      (a, b) =>
        (sev[a.status] ?? 2) - (sev[b.status] ?? 2) || a.on_hand_qty - b.on_hand_qty,
    );
    suf.sort((a, b) => a.location_name.localeCompare(b.location_name));
    return {
      needsAttention: needs,
      sufficient: suf,
      criticalCt: rawLocations.filter((l) => l.status === 'critical' || l.status === 'out')
        .length,
      lowCt: rawLocations.filter((l) => l.status === 'low').length,
      sufficientCt: rawLocations.filter((l) => l.status === 'in_stock').length,
    };
  }, [rawLocations, search]);

  const handleWithdraw = useCallback(
    (bags: number) => {
      issueMutation.mutate(
        { quantity: bags, unit: 'bag' },
        {
          onSuccess: () => {
            setUndoState({
              message: `Withdrew ${bags} bag${bags > 1 ? 's' : ''}`,
              bags,
            });
          },
        },
      );
    },
    [issueMutation],
  );

  const handleUndo = () => {
    if (!undoState) return;
    returnMutation.mutate({ quantity: undoState.bags, unit: 'bag' });
    setUndoState(null);
  };

  const onRefresh = useCallback(() => {
    balance.refetch();
    today.refetch();
    if (isManager) {
      byLocation.refetch();
      pendingDeliveries.refetch();
    }
  }, [balance, today, byLocation, pendingDeliveries, isManager]);

  if (isManager ? byLocation.isLoading : balance.isLoading) {
    return <Loading fullScreen message="" />;
  }

  if (isManager ? byLocation.isError : balance.isError) {
    return (
      <PaperBackground>
        <QueryErrorState
          error={isManager ? byLocation.error : balance.error}
          onRetry={() => {
            if (isManager) byLocation.refetch();
            else balance.refetch();
          }}
        />
      </PaperBackground>
    );
  }

  // ═════════════════════════════════════════════
  //  MANAGER VIEW — Stock Count
  // ═════════════════════════════════════════════
  if (isManager) {
    return (
      <PaperBackground>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={byLocation.isRefetching}
                onRefresh={onRefresh}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={fmtKickerDate()}
              title="Stock"
            />

            {/* Summary band */}
            <View style={styles.summary}>
              <SummaryCell label="Total" value={totalStockBags} />
              <SummaryCell label="Crit" value={criticalCt} color={wp.color.red} />
              <SummaryCell label="Low" value={lowCt} color={wp.color.amber} />
              <SummaryCell label="OK" value={sufficientCt} color={wp.color.green} />
            </View>

            {/* Action strip */}
            {/* One primary, five secondary. Six identically-weighted buttons
                gave no answer to "what do I press?" — Issue is the action a
                location manager performs daily, so it carries solid ink and the
                rest stay outlined. Each row is an even 3-up grid, which also
                removes the ragged 4-then-2 wrap. */}
            <View style={styles.actionStrip}>
              <InkButton
                label="Issue"
                variant="solid"
                onPress={() => router.push('/stock/issue')}
                style={styles.actionCell}
              />
              <InkButton label="Transfer" onPress={() => router.push('/stock/transfer')} style={styles.actionCell} />
              <InkButton label="Request" onPress={() => router.push('/stock/create-request')} style={styles.actionCell} />
              <InkButton label="Stocktake" onPress={() => router.push('/stock-take')} style={styles.actionCell} />
              <InkButton label="Waste" onPress={() => router.push('/stock/waste')} style={styles.actionCell} />
              <InkButton
                label="Export"
                onPress={() => exportStock()}
                loading={exportLoading}
                style={styles.actionCell}
              />
            </View>

            {/* Search */}
            {/* An uppercase tracked placeholder sitting on a hairline rule read
                as a section heading, not a field. A boxed input with a search
                glyph and sentence-case placeholder is unambiguously typeable. */}
            <View style={styles.searchWrap}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={15} color={wp.color.ink3} />
                <TextInput
                  maxFontSizeMultiplier={wp.fontScale.text}
                  placeholder="Search locations"
                  placeholderTextColor={wp.color.ink3}
                  value={search}
                  onChangeText={setSearch}
                  style={styles.search}
                  accessibilityLabel="Search locations"
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>
            </View>

            {/* Filters — the shared underline TabStrip, same as Trips, Users,
                Vehicles, Locations and Loans. This screen used to draw its own
                bordered chips, so Stock's filters looked like buttons while
                every other screen's looked like tabs. */}
            <View style={styles.filterWrap}>
              <TabStrip<FilterMode>
                items={[
                  { key: 'all', label: 'All', count: rawLocations.length },
                  { key: 'critical', label: 'Needs', count: criticalCt + lowCt },
                  { key: 'sufficient', label: 'In stock', count: sufficientCt },
                ]}
                active={filter}
                onChange={setFilter}
              />
            </View>

            {/* Pending deliveries banner */}
            {deliveriesList.length > 0 && filter !== 'sufficient' && (
              <View style={styles.deliveriesBanner}>
                <View style={[styles.calloutBar, { backgroundColor: wp.color.ink }]} />
                <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <MonoText size={11} weight={700} tracking={1} upper color={wp.color.ink}>
                    {deliveriesList.length}{' '}
                    {deliveriesList.length === 1 ? 'delivery pending' : 'deliveries pending'}
                  </MonoText>
                  <Text
                    onPress={() => router.push('/alerts')}
                    style={styles.bannerLink}
                  >
                    Review & confirm
                  </Text>
                </View>
              </View>
            )}

            {/* Needs Attention */}
            {(filter === 'all' || filter === 'critical') && needsAttention.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={11} weight={600} tracking={1} color={wp.color.ink}>
                    Needs attention
                  </KickerLabel>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    {needsAttention.length} of {rawLocations.length}
                  </KickerLabel>
                </View>
                {needsAttention.map((item, i) => {
                  const bags = Math.round(item.on_hand_qty / 10);
                  const minBags = Math.round((item.low_stock_threshold ?? 50) / 10);
                  const shortage = Math.max(0, minBags - bags);
                  const isCritical = item.status === 'critical' || item.status === 'out';
                  const accent = isCritical ? wp.color.red : wp.color.amber;
                  return (
                    <View
                      key={item.location_id}
                      style={[
                        styles.attRow,
                        i === 0 &&
                          isCritical && { backgroundColor: wp.color.criticalWash },
                      ]}
                    >
                      <View style={[styles.attBar, { backgroundColor: accent }]} />
                      <View style={styles.attInfo}>
                        <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.attName}>
                          {item.location_name}
                        </Text>
                        <View style={styles.attMetaRow}>
                          <MonoText size={10} tracking={0.5} upper color={wp.color.ink3}>
                            Need{' '}
                          </MonoText>
                          <MonoText size={10} weight={700} tracking={0.5} upper color={accent}>
                            +{shortage}
                          </MonoText>
                          <MonoText size={10} tracking={0.5} upper color={wp.color.ink3}>
                            {' / Min '}
                            {minBags}
                          </MonoText>
                        </View>
                      </View>
                      {/* Mono, not italic display serif. This is the number the
                          user acts on, and an italic Fraunces "0" is the least
                          legible glyph in the system — Fraunces is reserved for
                          screen titles and earned hero numbers. */}
                      <MonoText
                        size={wp.size.statBig}
                        weight={700}
                        color={accent}
                        style={styles.attBags}
                      >
                        {String(bags)}
                      </MonoText>
                      <Stamp colorHex={accent} rowIndex={i}>
                        {isCritical ? 'CRITICAL' : 'LOW'}
                      </Stamp>
                    </View>
                  );
                })}
              </>
            )}

            {/* In Stock */}
            {(filter === 'all' || filter === 'sufficient') && sufficient.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={11} weight={600} tracking={1} color={wp.color.ink}>
                    In stock
                  </KickerLabel>
                </View>
                {sufficient.map((item, i) => {
                  const bags = Math.round(item.on_hand_qty / 10);
                  return (
                    <View key={item.location_id} style={styles.okRow}>
                      <MonoText size={10} color={wp.color.ink3} style={styles.okIndex}>
                        {String(i + 1).padStart(2, '0')}
                      </MonoText>
                      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.okName}>
                        {item.location_name}
                      </Text>
                      <MonoText size={16} weight={600} color={wp.color.ink} style={styles.okBags}>
                        {bags}
                      </MonoText>
                      <Stamp color="green" rowIndex={i}>
                        OK
                      </Stamp>
                    </View>
                  );
                })}
              </>
            )}

            {needsAttention.length === 0 && sufficient.length === 0 && (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  {search ? 'No locations match' : 'No stock data'}
                </MonoText>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  // ═════════════════════════════════════════════
  //  STAFF VIEW — On the shelf
  // ═════════════════════════════════════════════
  const showRestockedTape = transactions.some((t) => t.type === 'receive');

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={balance.isRefetching || today.isRefetching}
              onRefresh={onRefresh}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            kicker={(user?.location_name ?? 'Kitchen').toUpperCase()}
            title="Stock"
          />

          {/* Hero bag counter */}
          <View style={styles.staffHero}>
            <SerifNumber
              size={staffHeroSizeForDigits(String(totalBags).length)}
              tracking={-10}
              leading={0.82}
              color={wp.color.ink}
              style={styles.staffHeroNumber}
              autoShrink
            >
              {String(totalBags)}
            </SerifNumber>
            <MonoText
              size={11}
              tracking={2}
              upper
              color={wp.color.ink3}
              style={styles.staffHeroLabel}
            >
              Bags · Charcoal 10kg
            </MonoText>
            {showRestockedTape && (
              <View style={styles.tapeWrap} pointerEvents="none">
                <TapeAccent />
              </View>
            )}
          </View>

          {/* Today's log */}
          <View style={styles.logHead}>
            <KickerLabel size={11} weight={600} tracking={1} color={wp.color.ink}>
              Today's log
            </KickerLabel>
          </View>

          {transactions.length > 0 ? (
            transactions.map((tx) => {
              const isOut = tx.type === 'issue';
              const bags = Math.round(tx.quantity / 10);
              const sign = isOut ? '−' : '+';
              const c = isOut ? wp.color.red : wp.color.green;
              return (
                <View key={tx.id} style={styles.logRow}>
                  <MonoText size={10} color={wp.color.ink3} upper style={styles.logTime}>
                    {timeAgo(tx.created_at).replace(' ago', '').toUpperCase()} AGO
                  </MonoText>
                  <View style={styles.logBody}>
                    <MonoText size={14} weight={700} color={c}>
                      {sign}
                      {bags} {bags === 1 ? 'BAG' : 'BAGS'}
                    </MonoText>
                    {tx.notes ? (
                      <Text style={styles.logNote} numberOfLines={1}>
                        "{tx.notes}"
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                No activity today
              </MonoText>
            </View>
          )}
        </ScrollView>

        <KitchenStampButton
          onWithdraw={handleWithdraw}
          disabled={issueMutation.isPending || totalBags === 0}
        />
        {undoState && (
          <UndoToast
            message={undoState.message}
            onUndo={handleUndo}
            onDismiss={() => setUndoState(null)}
          />
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

/**
 * 180pt Fraunces italic fits 2 digits. Longer counts need scaling so the
 * "RESTOCKED" tape still has room and the number doesn't overflow the
 * card. Matches the digit-count strategy used on the dashboard hero.
 */
function staffHeroSizeForDigits(n: number): number {
  if (n <= 2) return 180;
  if (n === 3) return 140;
  if (n === 4) return 108;
  return 88;
}

function SummaryCell({
  label,
  value,
  color = wp.color.ink,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.summaryCell}>
      <MonoText size={26} weight={700} tracking={-0.5} color={color}>
        {value}
      </MonoText>
      <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={{ marginTop: 2 }}>
        {label}
      </KickerLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 120 },

  summary: {
    flexDirection: 'row',
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: wp.color.line,
  },

  actionStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 16,
  },
  // Even 3-up grid. Auto-width buttons wrapped 4-then-2 with a ragged tail,
  // which read as an accident; a fixed basis makes the strip a deliberate block.
  actionCell: {
    flexGrow: 1,
    flexBasis: '30%',
  },

  searchWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: wp.border.thin,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
  },
  search: {
    flex: 1,
    fontFamily: wp.font.mono.fontFamily,
    fontWeight: wp.font.mono.fontWeight,
    fontSize: wp.size.body,
    color: wp.color.ink,
    letterSpacing: 0.2,
    paddingVertical: 10,
  },
  filterWrap: {
    marginBottom: 14,
  },

  deliveriesBanner: {
    flexDirection: 'row',
    marginHorizontal: wp.space.screenH,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
  },
  calloutBar: {
    width: 6,
  },
  bannerLink: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 10,
    letterSpacing: 1,
    color: wp.color.ink2,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // No full-bleed rule at the top — section is demarcated by the kicker.
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    paddingBottom: 8,
  },

  // Inset dashed divider per global rule §4 — marginHorizontal, not padding.
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp.space.screenH,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    gap: 12,
  },
  attBar: {
    width: 6,
    height: 50,
  },
  attInfo: {
    flex: 1,
  },
  attName: {
    fontFamily: wp.font.sansBold.fontFamily,
    fontWeight: wp.font.sansBold.fontWeight,
    fontSize: 15,
    color: wp.color.ink,
  },
  attMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  attBags: {
    minWidth: 56,
    textAlign: 'right',
  },

  okRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp.space.screenH,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    gap: 12,
  },
  okIndex: {
    width: 28,
  },
  okName: {
    flex: 1,
    fontFamily: wp.font.sansMid.fontFamily,
    fontWeight: wp.font.sansMid.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  okBags: {
    minWidth: 36,
    textAlign: 'right',
  },

  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },

  // STAFF — no full-bleed rule; rhythm comes from the "Today's log" kicker.
  staffHero: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 28,
    alignItems: 'center',
    position: 'relative',
  },
  staffHeroNumber: {
    textAlign: 'center',
  },
  staffHeroLabel: {
    marginTop: 6,
  },
  tapeWrap: {
    position: 'absolute',
    top: 18,
    right: -10,
  },

  logHead: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: wp.space.screenH,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  logTime: {
    width: 64,
  },
  logBody: {
    flex: 1,
  },
  logNote: {
    fontFamily: wp.font.sans.fontFamily,
    fontWeight: wp.font.sans.fontWeight,
    fontStyle: 'italic',
    fontSize: 12,
    color: wp.color.ink2,
    marginTop: 2,
  },
});
