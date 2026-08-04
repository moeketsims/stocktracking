import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBatches } from '../../src/hooks/useStock';
import { useExportBatches } from '../../src/hooks/useExports';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  MonoText,
  KickerLabel,
  Stamp,
  SerifNumber,
  HardShadowFrame,
  TabStrip,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { BatchListItem } from '../../src/api/stock';

type FilterType = 'all' | 'expiring_soon';

function qualityStamp(score: number): { label: string; color: 'red' | 'amber' | 'green' } {
  if (score >= 3) return { label: 'GOOD', color: 'green' };
  if (score >= 2) return { label: 'FAIR', color: 'amber' };
  return { label: 'POOR', color: 'red' };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr)
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

export default function BatchesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const query = useBatches(filter);
  const { exportBatches, loading: exportLoading } = useExportBatches();

  const batches = query.data?.batches ?? [];
  const counts = query.data?.counts ?? { all: 0, expiring_soon: 0 };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Masthead
          kicker={`BATCH RECORDS — ${fmtKickerDate()}`}
          title="Batches"
          backUseRouter
        />

        {/* Was a local copy of the tab strip with the Export *action* wedged in
            as a fourth tab — so a button that writes a file looked like a view
            filter. Filters now use the shared TabStrip; Export is a button. */}
        <TabStrip<FilterType>
          items={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'expiring_soon', label: 'Expiring', count: counts.expiring_soon },
          ]}
          active={filter}
          onChange={setFilter}
        />

        <View style={styles.actionRow}>
          <InkButton
            label="Export"
            onPress={() => exportBatches()}
            loading={exportLoading}
          />
        </View>

        {query.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <FlatList
            data={batches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={wp.color.ink2} />}
            renderItem={({ item, index }) => <BatchVoucher item={item} rowIndex={index} onPress={() => router.push(`/stock/batch/${item.id}`)} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text maxFontSizeMultiplier={wp.fontScale.display} style={styles.emptyTitle}>
                  No batches
                </Text>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
                  {filter === 'expiring_soon'
                    ? 'Nothing expiring within 7 days'
                    : 'No active batches at your location'}
                </MonoText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function BatchVoucher({
  item,
  rowIndex,
  onPress,
}: {
  item: BatchListItem;
  rowIndex: number;
  onPress: () => void;
}) {
  const stamp = qualityStamp(item.quality_score ?? 1);
  const remainingBags = Math.round(item.remaining_qty / 10);
  const usedBags = Math.round(item.used_qty / 10);
  const pctUsed = item.initial_qty > 0 ? Math.round((item.used_qty / item.initial_qty) * 100) : 0;

  return (
    <HardShadowFrame style={{ marginBottom: 10 }}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.voucher}>
        <View style={styles.voucherHead}>
          <View style={{ flex: 1 }}>
            <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
              BATCH N° {item.batch_id_display}
            </KickerLabel>
            <Text maxFontSizeMultiplier={wp.fontScale.display} style={styles.voucherTitle} numberOfLines={1}>
              {item.item_name}
            </Text>
          </View>
          <Stamp color={stamp.color} rowIndex={rowIndex}>
            {stamp.label}
          </Stamp>
        </View>

        <View style={styles.heroRow}>
          <SerifNumber
            size={48}
            tracking={-1.5}
            leading={1}
            color={wp.color.ink}
            autoShrink
            style={{ flexShrink: 1 }}
          >
            {remainingBags.toLocaleString()}
          </SerifNumber>
          <View style={{ marginLeft: 10 }}>
            <MonoText size={10} tracking={1.5} color={wp.color.ink3}>BAGS</MonoText>
            <MonoText size={10} tracking={1} color={wp.color.ink3} style={{ marginTop: 2 }}>
              {pctUsed}% USED
            </MonoText>
          </View>
          {item.is_oldest && (
            <View style={{ marginLeft: 'auto' }}>
              <Stamp color="ink" rotate={-3}>
                FIFO
              </Stamp>
            </View>
          )}
        </View>

        <View style={styles.metaLedger}>
          <MetaRow label="SUPPLIER" value={item.supplier_name ?? '—'} />
          <MetaRow label="RECEIVED" value={formatDate(item.received_at)} last={!item.expiry_date} />
          {item.expiry_date && (
            <MetaRow label="EXPIRES" value={formatDate(item.expiry_date)} last />
          )}
        </View>
      </TouchableOpacity>
    </HardShadowFrame>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowDivider]}>
      <MonoText size={10} tracking={1.3} upper color={wp.color.ink3}>
        {label}
      </MonoText>
      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tab strip
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: wp.space.screenH,
    paddingTop: 12,
  },

  list: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 16,
    paddingBottom: 40,
  },

  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 28,
    letterSpacing: -1,
    color: wp.color.ink,
  },

  // Voucher
  voucher: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    padding: 14,
  },
  voucherHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  voucherTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 20,
    color: wp.color.ink,
    marginTop: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  metaLedger: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: wp.color.line,
    borderStyle: 'dashed',
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  metaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 13,
    color: wp.color.ink,
  },
});
