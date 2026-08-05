import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useLoans } from '../src/hooks/useLoans';
import { useAuthStore } from '../src/stores/authStore';
import { Loading } from '../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  SummaryBand,
  TabStrip,
  MonoText,
  Stamp,
  SerifNumber,
  HardShadowFrame,
} from '../src/components/wp';
import { wp, fmtKickerDate } from '../src/constants/warehousePaper';
import { timeAgo } from '../src/utils/dates';
import type { Loan } from '../src/types';

type Tab = 'borrow' | 'lend';

const STATUS_STAMP: Record<string, { label: string; color: string; rotate: number }> = {
  pending: { label: 'PENDING', color: wp.color.amber, rotate: -3 },
  accepted: { label: 'APPROVED', color: wp.color.pipeline.accepted ?? '#1F3A8A', rotate: 3 },
  confirmed: { label: 'APPROVED', color: wp.color.pipeline.accepted ?? '#1F3A8A', rotate: -3 },
  in_transit: { label: 'IN TRANSIT', color: wp.color.pipeline.in_delivery ?? '#5B2CA5', rotate: 3 },
  collected: { label: 'IN TRANSIT', color: wp.color.pipeline.in_delivery ?? '#5B2CA5', rotate: -3 },
  active: { label: 'ACTIVE', color: wp.color.green, rotate: 3 },
  return_initiated: { label: 'RETURN DUE', color: wp.color.amber, rotate: -3 },
  return_assigned: { label: 'RETURN DUE', color: wp.color.amber, rotate: 3 },
  return_in_progress: { label: 'RETURNING', color: wp.color.pipeline.in_delivery ?? '#5B2CA5', rotate: -3 },
  return_in_transit: { label: 'RETURNING', color: wp.color.pipeline.in_delivery ?? '#5B2CA5', rotate: 3 },
  completed: { label: 'DONE', color: wp.color.green, rotate: -3 },
  overdue: { label: 'OVERDUE', color: wp.color.red, rotate: 3 },
  rejected: { label: 'REJECTED', color: wp.color.red, rotate: -3 },
};

function shortLoanNumber(id: string): string {
  return id.slice(-4).toUpperCase();
}

export default function LoansScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('borrow');
  const query = useLoans();
  const all = query.data?.loans ?? [];

  const { borrowing, lending, counts } = useMemo(() => {
    const b: Loan[] = [];
    const l: Loan[] = [];
    let active = 0;
    let awaitingReturn = 0;
    let completed = 0;
    for (const loan of all) {
      if (loan.borrower_location_id === user?.location_id) b.push(loan);
      else if (loan.lender_location_id === user?.location_id) l.push(loan);
      if (loan.status === 'completed') completed++;
      else if (loan.status === 'active') active++;
      else if (loan.status.startsWith('return_')) awaitingReturn++;
    }
    return { borrowing: b, lending: l, counts: { active, awaitingReturn, completed } };
  }, [all, user?.location_id]);

  const visible = tab === 'borrow' ? borrowing : lending;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {query.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`LOAN LEDGER — ${fmtKickerDate()}`}
              title="Loans"
              backUseRouter
            />

            <SummaryBand
              items={[
                { label: 'Active', value: counts.active },
                { label: 'Awaiting return', value: counts.awaitingReturn, color: wp.color.amber },
                { label: 'Completed', value: counts.completed, color: wp.color.ink3 },
              ]}
            />

            <TabStrip<Tab>
              items={[
                { key: 'borrow', label: 'Borrowing', count: borrowing.length },
                { key: 'lend', label: 'Lending', count: lending.length },
              ]}
              active={tab}
              onChange={setTab}
            />

            <View style={styles.list}>
              {visible.length === 0 ? (
                <View style={styles.empty}>
                  <Text maxFontSizeMultiplier={wp.fontScale.display} style={styles.emptyTitle}>
                    Nothing here
                  </Text>
                  <MonoText size={11} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
                    {tab === 'borrow' ? 'You have no active borrows' : 'Nobody is borrowing from you'}
                  </MonoText>
                </View>
              ) : (
                visible.map((loan, i) => (
                  <LoanVoucher
                    key={loan.id}
                    loan={loan}
                    rowIndex={i}
                    onPress={() => router.push(`/loan/${loan.id}`)}
                  />
                ))
              )}
            </View>

            <View style={styles.ctaRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/loan/create')}
                style={styles.newPill}
              >
                <MonoText size={11} weight={700} tracking={1.5} upper color={wp.color.ink}>
                  + Request loan
                </MonoText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function LoanVoucher({
  loan,
  rowIndex,
  onPress,
}: {
  loan: Loan;
  rowIndex: number;
  onPress: () => void;
}) {
  const stamp = STATUS_STAMP[loan.status] ?? STATUS_STAMP.pending;
  const qty = loan.quantity_approved ?? loan.quantity_requested;
  const borrower = loan.borrower_location?.name ?? 'Unknown';
  const lender = loan.lender_location?.name ?? 'Unknown';

  return (
    <HardShadowFrame style={{ marginBottom: 10 }}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.voucher}>
        <View style={styles.stub}>
          <MonoText size={9} color={wp.color.ink3}>N°</MonoText>
          <MonoText size={12} weight={700} color={wp.color.ink}>
            {shortLoanNumber(loan.id)}
          </MonoText>
        </View>
        <View style={styles.stubDivider}>
          <View style={styles.stubDividerLine} />
        </View>
        <View style={styles.body}>
          <View style={styles.routeRow}>
            <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.name} numberOfLines={1}>
              {lender}
            </Text>
            <MonoText size={12} color={wp.color.ink3}>↔</MonoText>
            <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.name} numberOfLines={1}>
              {borrower}
            </Text>
          </View>
          <MonoText
            size={9}
            tracking={1.2}
            upper
            color={wp.color.ink3}
            style={{ marginTop: 4 }}
          >
            {timeAgo(loan.created_at)}
          </MonoText>
        </View>
        <View style={styles.qtyCol}>
          <SerifNumber size={22} tracking={-0.5} leading={1} color={wp.color.ink}>
            {String(qty)}
          </SerifNumber>
          <MonoText size={9} color={wp.color.ink3} tracking={0.5} upper>
            Bags
          </MonoText>
        </View>
        <Stamp colorHex={stamp.color} rotate={stamp.rotate}>
          {stamp.label}
        </Stamp>
      </TouchableOpacity>
    </HardShadowFrame>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  list: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
  },
  voucher: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 14,
    minHeight: 72,
  },
  stub: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  stubDivider: {
    width: 1,
    justifyContent: 'center',
  },
  stubDividerLine: {
    width: 1,
    height: 48,
    borderLeftWidth: 1,
    borderLeftColor: wp.color.line,
    borderStyle: 'dashed',
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingLeft: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 15,
    color: wp.color.ink,
    flexShrink: 1,
  },
  qtyCol: {
    alignItems: 'center',
    minWidth: 36,
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

  ctaRow: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    alignItems: 'flex-start',
  },
  newPill: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});
