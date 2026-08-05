import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  useLoan,
  useAcceptLoan,
  useRejectLoan,
  useConfirmLoan,
  useInitiateReturn,
  useConfirmReturn,
} from '../../src/hooks/useLoans';
import { useAuthStore } from '../../src/stores/authStore';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import {
  PaperBackground,
  Masthead,
  MonoText,
  KickerLabel,
  Stamp,
  SerifNumber,
  HardShadowFrame,
  ActionStack,
  type StackAction,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';
import { formatDateTime } from '../../src/utils/dates';
import type { LoanStatus } from '../../src/types';

const LOAN_STEPS: LoanStatus[] = [
  'pending',
  'accepted',
  'confirmed',
  'in_transit',
  'collected',
  'active',
  'return_initiated',
  'return_in_progress',
  'completed',
];

const STEP_LABEL: Record<string, string> = {
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  confirmed: 'CONFIRMED',
  in_transit: 'IN TRANSIT',
  collected: 'COLLECTED',
  active: 'ACTIVE',
  return_initiated: 'RETURN INIT',
  return_in_progress: 'RETURN WIP',
  completed: 'DONE',
};

function stampFor(status: LoanStatus): { label: string; color: string; rotate: number } {
  if (status === 'completed') return { label: 'DONE', color: wp.color.green, rotate: -3 };
  if (status === 'active') return { label: 'ACTIVE', color: wp.color.green, rotate: 3 };
  if (status === 'rejected') return { label: 'REJECTED', color: wp.color.red, rotate: -3 };
  if (status === 'overdue') return { label: 'OVERDUE', color: wp.color.red, rotate: 3 };
  if (status.startsWith('return_')) return { label: 'RETURNING', color: wp.color.amber, rotate: 3 };
  if (status === 'in_transit' || status === 'collected') {
    return { label: 'IN TRANSIT', color: wp.color.pipeline.in_delivery ?? '#5B2CA5', rotate: -3 };
  }
  if (status === 'accepted' || status === 'confirmed') {
    return { label: 'APPROVED', color: wp.color.pipeline.accepted ?? '#1F3A8A', rotate: 3 };
  }
  return { label: 'PENDING', color: wp.color.amber, rotate: -3 };
}

function shortLoanNumber(id: string): string {
  return id.slice(-4).toUpperCase();
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: loan, isLoading, isError, error, refetch } = useLoan(id);

  const acceptMutation = useAcceptLoan();
  const rejectMutation = useRejectLoan();
  const confirmMutation = useConfirmLoan();
  const initiateReturnMutation = useInitiateReturn();
  const confirmReturnMutation = useConfirmReturn();

  if (isLoading || !loan) {
    return (
      <PaperBackground>
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }
  if (isError) {
    return (
      <PaperBackground>
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PaperBackground>
    );
  }

  const stamp = stampFor(loan.status);
  const currentStepIdx = LOAN_STEPS.indexOf(loan.status as any);
  const isLender = user?.location_id === loan.lender_location_id;
  const isBorrower = user?.location_id === loan.borrower_location_id;
  const qty = loan.quantity_approved ?? loan.quantity_requested;

  const handleAccept = () => {
    Alert.alert('Accept loan', `Approve ${qty} bag${qty > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () => acceptMutation.mutate({ id: loan.id, data: { quantity_approved: qty } }),
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Reject loan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ id: loan.id }) },
    ]);
  };

  const handleConfirm = () => {
    confirmMutation.mutate(loan.id);
  };

  const handleInitiateReturn = () => {
    Alert.alert('Initiate return', 'Start the return flow for this loan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => initiateReturnMutation.mutate(loan.id) },
    ]);
  };

  const handleConfirmReturn = () => {
    confirmReturnMutation.mutate(loan.id);
  };

  const actions: StackAction[] = [];
  if (isLender && loan.status === 'pending') {
    actions.push({ label: 'Approve loan →', onPress: handleAccept, filled: true });
    actions.push({ label: 'Reject', onPress: handleReject, color: wp.color.red });
  } else if (isBorrower && loan.status === 'accepted') {
    actions.push({ label: 'Confirm', onPress: handleConfirm, filled: true });
  } else if (loan.status === 'active' && isBorrower) {
    actions.push({ label: 'Initiate return →', onPress: handleInitiateReturn, filled: true });
  } else if (loan.status === 'return_in_progress' && isLender) {
    actions.push({ label: 'Confirm return', onPress: handleConfirmReturn, filled: true });
  }

  const metaRows: { key: string; value: string }[] = [
    { key: 'BORROWER', value: loan.borrower_location?.name ?? '—' },
    { key: 'LENDER', value: loan.lender_location?.name ?? '—' },
    { key: 'REQUESTED', value: formatDateTime(loan.created_at) },
    { key: 'EST. RETURN', value: loan.estimated_return_date ? formatDateTime(loan.estimated_return_date) : '—' },
    { key: 'ACTUAL RETURN', value: loan.actual_return_date ? formatDateTime(loan.actual_return_date) : '—' },
  ];

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Masthead
            kicker={`LOAN · N°${shortLoanNumber(loan.id)} · ${new Date(loan.created_at)
              .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
              .toUpperCase()}`}
            title="Loan record"
            backUseRouter
          />

          {/* Hero voucher */}
          <HardShadowFrame style={{ marginTop: 14, marginBottom: 18 }}>
            <View style={styles.voucher}>
              <View style={styles.voucherHead}>
                <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
                  VOUCHER N° {shortLoanNumber(loan.id)}
                </KickerLabel>
                <Stamp colorHex={stamp.color} rotate={stamp.rotate}>
                  {stamp.label}
                </Stamp>
              </View>

              <View style={styles.heroRow}>
                <SerifNumber size={84} tracking={-3} leading={0.9} color={wp.color.ink} autoShrink>
                  {String(qty)}
                </SerifNumber>
                <MonoText size={11} tracking={1.5} color={wp.color.ink3} style={{ marginLeft: 10 }}>
                  BAGS
                </MonoText>
              </View>

              <View style={styles.metaLedger}>
                {metaRows.map((r, i) => (
                  <View
                    key={r.key}
                    style={[styles.metaRow, i < metaRows.length - 1 && styles.metaRowDivider]}
                  >
                    <MonoText size={10} tracking={1.5} upper color={wp.color.ink3}>
                      {r.key}
                    </MonoText>
                    <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.metaValue} numberOfLines={2}>
                      {r.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </HardShadowFrame>

          {/* Progress ticker */}
          <View style={styles.progWrap}>
            <KickerLabel size={10} tracking={2} color={wp.color.ink} style={{ marginBottom: 8 }}>
              Progress — Step {Math.max(currentStepIdx, 0) + 1} / {LOAN_STEPS.length}
            </KickerLabel>
            <View style={styles.progBar}>
              {LOAN_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progCell,
                    i <= currentStepIdx && styles.progCellFilled,
                    i < LOAN_STEPS.length - 1 && styles.progCellDivider,
                  ]}
                />
              ))}
            </View>
            <View style={styles.progLabels}>
              <MonoText size={8} tracking={1} upper color={wp.color.ink3}>
                {STEP_LABEL[LOAN_STEPS[0]]}
              </MonoText>
              <MonoText size={8} weight={700} tracking={1} upper color={wp.color.ink}>
                {STEP_LABEL[loan.status] ?? loan.status.toUpperCase()}
              </MonoText>
              <MonoText size={8} tracking={1} upper color={wp.color.ink3}>
                {STEP_LABEL[LOAN_STEPS[LOAN_STEPS.length - 1]]}
              </MonoText>
            </View>
          </View>

          {actions.length > 0 && (
            <View style={{ marginTop: 22 }}>
              <ActionStack actions={actions} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: wp.space.screenH,
    paddingBottom: 40,
  },

  voucher: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    padding: 14,
  },
  voucherHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  metaLedger: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: wp.color.line,
    borderStyle: 'dashed',
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
    gap: 10,
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

  progWrap: {
    paddingHorizontal: 0,
  },
  progBar: {
    flexDirection: 'row',
    height: 10,
    borderWidth: 1,
    borderColor: wp.color.lineD,
  },
  progCell: {
    flex: 1,
  },
  progCellFilled: {
    backgroundColor: wp.color.ink,
  },
  progCellDivider: {
    borderRightWidth: 1,
    borderRightColor: wp.color.paper,
  },
  progLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
