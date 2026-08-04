import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTransactions } from '../../src/hooks/useReports';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  ChipStrip,
  SummaryBand,
  LedgerRow,
  Stamp,
  KickerLabel,
  MonoText,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { TransactionTypeFilter } from '../../src/api/reports';

const DAYS = ['TODAY', '7D', '30D', 'ALL'] as const;
type DayKey = (typeof DAYS)[number];
const DAY_MAP: Record<DayKey, number | undefined> = {
  TODAY: 1,
  '7D': 7,
  '30D': 30,
  ALL: undefined,
};

const TYPES: { label: string; value: TransactionTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Receive', value: 'receive' },
  { label: 'Issue', value: 'issue' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Waste', value: 'waste' },
  { label: 'Return', value: 'return' },
];

const TYPE_COLOR: Record<string, string> = {
  receive: wp.color.green,
  issue: '#1F3A8A',
  transfer: '#5B2CA5',
  waste: wp.color.red,
  return: wp.color.amber,
  adjustment: wp.color.ink3,
};

function formatStamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${min}`;
  } catch {
    return dateStr.slice(0, 16);
  }
}

export default function TransactionsScreen() {
  const user = useAuthStore((s) => s.user);
  const [dayKey, setDayKey] = useState<DayKey>('7D');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const transactions = useTransactions({
    type_filter: typeFilter,
    view_location_id: user?.location_id ?? undefined,
    limit,
    offset,
    days: DAY_MAP[dayKey],
  });

  const items = transactions.data?.transactions ?? [];
  const total = transactions.data?.total ?? 0;
  const issueCount = transactions.data?.issue_count ?? 0;
  const returnCount = transactions.data?.return_count ?? 0;
  const hasMore = items.length >= limit;

  const handleDay = useCallback((d: DayKey) => {
    setDayKey(d);
    setOffset(0);
  }, []);

  const handleType = useCallback((t: TransactionTypeFilter) => {
    setTypeFilter(t);
    setOffset(0);
  }, []);

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={transactions.isRefetching}
              onRefresh={() => transactions.refetch()}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            kicker={`TRANSACTION LEDGER — ${fmtKickerDate()}`}
            title="Transactions"
            backUseRouter
          />

          <ChipStrip<DayKey> items={DAYS} active={dayKey} onChange={handleDay} />

          <SummaryBand
            items={[
              { label: 'Total', value: total },
              { label: 'Issues', value: issueCount, color: '#1F3A8A' },
              { label: 'Returns', value: returnCount, color: wp.color.amber },
            ]}
          />

          {/* Horizontal type filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {TYPES.map((t) => {
              const on = typeFilter === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  activeOpacity={0.7}
                  onPress={() => handleType(t.value)}
                  style={[styles.typeBtn, on && styles.typeBtnActive]}
                >
                  <MonoText
                    size={10}
                    weight={on ? 700 : 500}
                    tracking={1.2}
                    upper
                    color={on ? wp.color.paper : wp.color.ink}
                  >
                    {t.label}
                  </MonoText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {transactions.isLoading ? (
            <Loading message="" />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                No transactions in range
              </MonoText>
            </View>
          ) : (
            items.map((tx, i) => {
              const bags = (tx.quantity / 10).toFixed(1);
              const color = TYPE_COLOR[tx.type] ?? wp.color.ink;
              const meta = [
                formatStamp(tx.created_at),
                tx.location_from ? `From ${tx.location_from}` : null,
                tx.location_to ? `To ${tx.location_to}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <LedgerRow
                  key={tx.id}
                  idx={i + 1}
                  primary={tx.item_name}
                  secondary={meta}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Stamp colorHex={color} rowIndex={i}>
                        {tx.type.toUpperCase()}
                      </Stamp>
                      <MonoText size={13} weight={700} color={wp.color.ink}>
                        {bags}
                      </MonoText>
                    </View>
                  }
                  chev={false}
                />
              );
            })
          )}

          {hasMore && (
            <View style={styles.loadMore}>
              <InkButton
                label="Load more"
                onPress={() => setOffset((p) => p + limit)}
                loading={transactions.isFetching && !transactions.isLoading}
              />
            </View>
          )}

          {items.length > 0 && (
            <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.pageInfo}>
              {`SHOWING ${offset + 1}–${offset + items.length} OF ${total}`}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 60 },
  typeRow: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 10,
    gap: 8,
  },
  typeBtn: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: wp.color.ink,
  },
  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadMore: {
    alignItems: 'center',
    paddingTop: 20,
  },
  pageInfo: {
    textAlign: 'center',
    marginTop: 14,
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 10,
    letterSpacing: 1,
    color: wp.color.ink3,
  },
});
