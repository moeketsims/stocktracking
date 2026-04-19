import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  useStockTakes,
  useStockTake,
  useCreateStockTake,
  useUpdateLineCount,
  useCompleteStockTake,
  useCancelStockTake,
} from '../../src/hooks/useStockTakes';
import { useAuthStore } from '../../src/stores/authStore';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  MonoText,
  KickerLabel,
  Stamp,
  SerifNumber,
  HardShadowFrame,
  TickerProgressBar,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { UserRole, StockTakeLine } from '../../src/types';

type Tab = 'active' | 'history';

export default function StockTakeScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const user = useAuthStore((s) => s.user);
  const canManage = hasRole('admin' as UserRole, 'zone_manager' as UserRole, 'location_manager' as UserRole);

  const [activeStockTakeId, setActiveStockTakeId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('active');

  const { data: stockTakesData, isLoading: listLoading, isRefetching, refetch } = useStockTakes({ limit: 50 });
  const { data: activeData, isLoading: detailLoading } = useStockTake(activeStockTakeId ?? '');
  const createMutation = useCreateStockTake();
  const updateLineMutation = useUpdateLineCount();
  const completeMutation = useCompleteStockTake();
  const cancelMutation = useCancelStockTake();

  const stockTakes = stockTakesData?.stock_takes ?? [];
  const inProgressTake = stockTakes.find((st) => st.status === 'in_progress');
  const historyTakes = stockTakes.filter((st) => st.status !== 'in_progress');

  // Effect must run on every render path to satisfy rules of hooks — keep it
  // above any early `return`. The body itself no-ops when canManage is false
  // because stockTakesData won't be populated anyway.
  useEffect(() => {
    if (inProgressTake && !activeStockTakeId) {
      setActiveStockTakeId(inProgressTake.id);
    }
  }, [inProgressTake, activeStockTakeId]);

  if (!canManage) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <Masthead kicker="ACCESS" title="Restricted" backUseRouter />
          <View style={styles.emptyState}>
            <KickerLabel size={11} tracking={1.5} color={wp.color.ink3}>
              Manager access required
            </KickerLabel>
          </View>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const handleStartNew = () => {
    if (inProgressTake) {
      Alert.alert('In Progress', 'A stock take is already in progress for this location.');
      return;
    }
    createMutation.mutate(
      { location_id: user?.location_id ?? undefined },
      {
        onSuccess: (data) => {
          setActiveStockTakeId(data.stock_take_id);
          setTab('active');
        },
      },
    );
  };

  const handleComplete = () => {
    if (!activeStockTakeId) return;
    Alert.alert(
      'Complete Stock Take',
      'This will create adjustment transactions for all variances. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () =>
            completeMutation.mutate(
              { id: activeStockTakeId },
              {
                onSuccess: () => {
                  setActiveStockTakeId(null);
                  refetch();
                },
              },
            ),
        },
      ],
    );
  };

  const handleCancel = () => {
    if (!activeStockTakeId) return;
    Alert.alert('Cancel Stock Take', 'This will discard all counts. Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(activeStockTakeId, {
            onSuccess: () => {
              setActiveStockTakeId(null);
              refetch();
            },
          }),
      },
    ]);
  };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Masthead
          kicker={`STOCK TAKE — ${fmtKickerDate()}`}
          title="Count it up"
          backUseRouter
        />

        {/* Tab strip — mono labels, 3px ink underline on active */}
        <View style={styles.tabStrip}>
          {(['active', 'history'] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.7}
                onPress={() => setTab(t)}
                style={[styles.tab, on && styles.tabActive]}
              >
                <MonoText
                  size={11}
                  weight={on ? 700 : 500}
                  tracking={1.5}
                  upper
                  color={on ? wp.color.ink : wp.color.ink3}
                >
                  {t === 'active' ? 'Active count' : 'History'}
                </MonoText>
              </TouchableOpacity>
            );
          })}
        </View>

        {listLoading ? (
          <Loading message="" fullScreen />
        ) : tab === 'active' ? (
          <ActiveTab
            activeStockTakeId={activeStockTakeId}
            activeData={activeData}
            detailLoading={detailLoading}
            onStartNew={handleStartNew}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onUpdateLine={(lineId, countedQty) => {
              if (!activeStockTakeId) return;
              updateLineMutation.mutate({
                stockTakeId: activeStockTakeId,
                lineId,
                data: { counted_qty: countedQty },
              });
            }}
            createLoading={createMutation.isPending}
            completeLoading={completeMutation.isPending}
            updateLoading={updateLineMutation.isPending}
            isRefetching={isRefetching}
            refetch={refetch}
          />
        ) : (
          <HistoryTab
            stockTakes={historyTakes}
            isRefetching={isRefetching}
            refetch={refetch}
            onOpen={(id) => {
              setActiveStockTakeId(id);
              setTab('active');
            }}
          />
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function ActiveTab({
  activeStockTakeId,
  activeData,
  detailLoading,
  onStartNew,
  onComplete,
  onCancel,
  onUpdateLine,
  createLoading,
  completeLoading,
  updateLoading,
  isRefetching,
  refetch,
}: {
  activeStockTakeId: string | null;
  activeData: { stock_take: any; lines: StockTakeLine[] } | undefined;
  detailLoading: boolean;
  onStartNew: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onUpdateLine: (lineId: string, countedQty: number) => void;
  createLoading: boolean;
  completeLoading: boolean;
  updateLoading: boolean;
  isRefetching: boolean;
  refetch: () => void;
}) {
  if (!activeStockTakeId) {
    return (
      <View style={styles.noActiveWrap}>
        <Text allowFontScaling={false} style={styles.noActiveTitle}>
          No active count
        </Text>
        <MonoText size={11} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
          Start a new stock take to begin counting
        </MonoText>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onStartNew}
          disabled={createLoading}
          style={styles.startBtn}
        >
          <Text allowFontScaling={false} style={styles.startBtnLabel}>
            {createLoading ? 'STARTING…' : 'START STOCK TAKE'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (detailLoading) return <Loading message="" fullScreen />;

  const stockTake = activeData?.stock_take;
  const lines = activeData?.lines ?? [];
  const countedLines = lines.filter((l) => l.counted_qty !== null).length;
  const totalLines = lines.length;
  const allCounted = countedLines === totalLines && totalLines > 0;
  const progress = totalLines > 0 ? countedLines / totalLines : 0;
  const locationName = stockTake?.locations?.name ?? 'Location';

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={wp.color.ink2} />}
    >
      {/* Progress voucher */}
      <HardShadowFrame style={{ marginBottom: 12 }}>
        <View style={styles.voucher}>
          <View style={styles.progHead}>
            <Text allowFontScaling={false} style={styles.progTitle} numberOfLines={1}>
              {locationName}
            </Text>
            <MonoText size={11} color={wp.color.ink2}>
              <Text style={{ fontWeight: '700', color: wp.color.ink }}>{countedLines}</Text>
              {' / '}{totalLines} COUNTED
            </MonoText>
          </View>
          <View style={{ marginTop: 12 }}>
            <TickerProgressBar progress={progress} />
          </View>
        </View>
      </HardShadowFrame>

      {/* Item vouchers */}
      {lines.map((line) => (
        <StockTakeLineVoucher
          key={line.id}
          line={line}
          onSave={(qty) => onUpdateLine(line.id, qty)}
          saving={updateLoading}
        />
      ))}

      {/* Action stack */}
      <View style={styles.actionStack}>
        {allCounted && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onComplete}
            disabled={completeLoading}
            style={styles.primaryBtn}
          >
            <Text allowFontScaling={false} style={styles.primaryBtnLabel}>
              {completeLoading ? 'COMPLETING…' : 'COMPLETE STOCK TAKE'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={styles.cancelBtn}>
          <Text allowFontScaling={false} style={styles.cancelBtnLabel}>
            CANCEL COUNT
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StockTakeLineVoucher({
  line,
  onSave,
  saving,
}: {
  line: StockTakeLine;
  onSave: (qty: number) => void;
  saving: boolean;
}) {
  const [count, setCount] = useState(line.counted_qty !== null ? String(line.counted_qty) : '');
  const [dirty, setDirty] = useState(false);

  const expected = line.expected_qty;
  const counted = line.counted_qty;
  const variance = counted !== null ? counted - expected : null;
  const isCounted = counted !== null;

  const handleBlur = () => {
    if (!dirty) return;
    const parsed = parseInt(count, 10);
    if (!isNaN(parsed) && parsed >= 0) onSave(parsed);
    setDirty(false);
  };

  return (
    <HardShadowFrame style={{ marginBottom: 12 }}>
      <View style={styles.voucher}>
        <View style={styles.itemHead}>
          <View style={{ flex: 1 }}>
            <Text allowFontScaling={false} style={styles.itemTitle} numberOfLines={1}>
              {line.items?.name ?? 'Item'}
            </Text>
            <MonoText size={10} tracking={1.3} upper color={wp.color.ink3} style={{ marginTop: 2 }}>
              SKU {line.items?.sku ?? '—'}
            </MonoText>
          </View>
          {isCounted && (
            <Stamp color="green" rotate={3}>
              COUNTED
            </Stamp>
          )}
        </View>

        <View style={styles.gridWrap}>
          <View style={styles.gridCol}>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>Expected</KickerLabel>
            <MonoText size={22} weight={700} color={wp.color.ink} style={{ marginTop: 4 }}>
              {expected.toLocaleString()}
            </MonoText>
          </View>

          <View style={styles.gridCol}>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>Counted</KickerLabel>
            <TextInput
              value={count}
              onChangeText={(v) => {
                setCount(v);
                setDirty(true);
              }}
              onBlur={handleBlur}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={wp.color.ink3}
              editable={!saving}
              style={styles.countedInput}
            />
          </View>

          <View style={styles.gridCol}>
            <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>Variance</KickerLabel>
            {variance === null ? (
              <MonoText size={22} color={wp.color.ink3} style={{ marginTop: 4 }}>—</MonoText>
            ) : (
              <SerifNumber
                size={24}
                tracking={-1}
                leading={1}
                color={variance < 0 ? wp.color.red : variance > 0 ? wp.color.green : wp.color.ink}
                style={{ marginTop: 2 }}
              >
                {variance > 0 ? `+${variance}` : String(variance)}
              </SerifNumber>
            )}
          </View>
        </View>
      </View>
    </HardShadowFrame>
  );
}

function HistoryTab({
  stockTakes,
  isRefetching,
  refetch,
  onOpen,
}: {
  stockTakes: any[];
  isRefetching: boolean;
  refetch: () => void;
  onOpen: (id: string) => void;
}) {
  if (stockTakes.length === 0) {
    return (
      <View style={styles.noActiveWrap}>
        <Text allowFontScaling={false} style={styles.noActiveTitle}>
          No history
        </Text>
        <MonoText size={11} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
          Completed stock takes will appear here
        </MonoText>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={wp.color.ink2} />}
    >
      {stockTakes.map((st) => (
        <HardShadowFrame key={st.id} style={{ marginBottom: 10 }}>
          <TouchableOpacity activeOpacity={0.75} onPress={() => onOpen(st.id)} style={styles.voucher}>
            <View style={styles.itemHead}>
              <View style={{ flex: 1 }}>
                <Text allowFontScaling={false} style={styles.itemTitle} numberOfLines={1}>
                  {st.locations?.name ?? 'Unknown'}
                </Text>
                <MonoText size={10} tracking={1.3} upper color={wp.color.ink3} style={{ marginTop: 2 }}>
                  {new Date(st.started_at).toLocaleDateString().toUpperCase()}
                  {st.initiated_by_name ? ` · ${st.initiated_by_name.toUpperCase()}` : ''}
                </MonoText>
              </View>
              <Stamp
                color={st.status === 'completed' ? 'green' : 'ink'}
                rotate={st.status === 'completed' ? 3 : -3}
              >
                {st.status === 'completed' ? 'COMPLETE' : 'CANCELLED'}
              </Stamp>
            </View>

            <View style={[styles.gridWrap, { borderTopWidth: 1, borderTopColor: wp.color.line, borderStyle: 'dashed', paddingTop: 12, marginTop: 10 }]}>
              <View style={styles.gridCol}>
                <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>Items</KickerLabel>
                <MonoText size={18} weight={700} color={wp.color.ink} style={{ marginTop: 2 }}>
                  {st.total_lines}
                </MonoText>
              </View>
              <View style={styles.gridCol}>
                <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>Counted</KickerLabel>
                <MonoText size={18} weight={700} color={wp.color.ink} style={{ marginTop: 2 }}>
                  {st.lines_counted}
                </MonoText>
              </View>
              <View style={styles.gridCol}>
                <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>Variance</KickerLabel>
                <SerifNumber
                  size={20}
                  tracking={-0.5}
                  leading={1}
                  color={(st.variance_count ?? 0) > 0 ? wp.color.amber : wp.color.ink}
                  style={{ marginTop: 2 }}
                >
                  {st.variance_count ?? 0}
                </SerifNumber>
              </View>
            </View>
          </TouchableOpacity>
        </HardShadowFrame>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tab strip
  tabStrip: {
    flexDirection: 'row',
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    // 3px ink underline, -1.5px so it sits flush with the masthead rule
    borderBottomWidth: 3,
    borderBottomColor: wp.color.ink,
    marginBottom: -1.5,
  },

  // Scroll / content
  scroll: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.screenH,
  },

  // No-active state
  noActiveWrap: {
    padding: wp.space.screenH,
    paddingTop: 60,
    alignItems: 'center',
  },
  noActiveTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 32,
    letterSpacing: -1,
    color: wp.color.ink,
  },
  startBtn: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: wp.color.ink,
    borderWidth: 2,
    borderColor: wp.color.lineD,
  },
  startBtnLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 12,
    letterSpacing: 2,
    color: wp.color.paper,
  },

  // Voucher (shared)
  voucher: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    padding: 14,
  },

  // Progress voucher
  progHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  progTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 22,
    letterSpacing: -0.5,
    color: wp.color.ink,
    flexShrink: 1,
  },

  // Item voucher
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 20,
    color: wp.color.ink,
  },

  // 3-col grid
  gridWrap: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: wp.color.line,
    borderStyle: 'dashed',
    paddingTop: 12,
  },
  gridCol: {
    flex: 1,
  },
  countedInput: {
    marginTop: 4,
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 22,
    color: wp.color.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    padding: 0,
    paddingBottom: 2,
    minWidth: 60,
  },

  // Action stack
  actionStack: {
    marginTop: 18,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: wp.color.ink,
    borderWidth: 2,
    borderColor: wp.color.lineD,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 13,
    letterSpacing: 2,
    color: wp.color.paper,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: wp.color.red,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 11,
    letterSpacing: 2,
    color: wp.color.red,
  },
});
