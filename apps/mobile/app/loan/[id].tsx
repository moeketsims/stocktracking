import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLoan, useAcceptLoan, useRejectLoan, useConfirmLoan } from '../../src/hooks/useLoans';
import { useAuthStore } from '../../src/stores/authStore';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { formatDateTime } from '../../src/utils/dates';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

// Loan flow steps for the progress indicator
const LOAN_STEPS = [
  'pending', 'accepted', 'confirmed', 'in_transit',
  'collected', 'active', 'return_initiated',
  'return_in_progress', 'completed',
] as const;

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: loan, isLoading } = useLoan(id);
  const acceptMutation = useAcceptLoan();
  const rejectMutation = useRejectLoan();
  const confirmMutation = useConfirmLoan();

  if (isLoading || !loan) {
    return <Loading fullScreen message="Loading loan..." />;
  }

  const isBorrower = user?.location_id === loan.borrower_location_id;
  const isLender = user?.location_id === loan.lender_location_id;
  const currentStepIndex = LOAN_STEPS.indexOf(loan.status as any);

  const handleAccept = () => {
    Alert.alert('Accept Loan', `Approve ${loan.quantity_requested} bags?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () =>
          acceptMutation.mutate({
            id: loan.id,
            data: { quantity_approved: loan.quantity_requested },
          }),
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Reject Loan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => rejectMutation.mutate({ id: loan.id }),
      },
    ]);
  };

  const handleConfirm = () => {
    Alert.alert('Confirm Loan', 'Confirm this loan and proceed to pickup assignment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => confirmMutation.mutate(loan.id) },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Loan Detail',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status + Progress */}
          <Card>
            <View style={styles.statusRow}>
              <StatusBadge status={loan.status} type="loan" />
              {loan.status === 'overdue' && (
                <Text style={styles.overdueText}>Past return date</Text>
              )}
            </View>

            {/* Step indicator */}
            <View style={styles.stepsContainer}>
              {LOAN_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <View key={step} style={styles.step}>
                    <View style={[
                      styles.stepDot,
                      isActive && styles.stepDotActive,
                      isCurrent && styles.stepDotCurrent,
                    ]}>
                      {isActive && idx < currentStepIndex && (
                        <Ionicons name="checkmark" size={10} color={colors.white} />
                      )}
                    </View>
                    {idx < LOAN_STEPS.length - 1 && (
                      <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
                    )}
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Loan Info */}
          <Card>
            <Text style={styles.sectionTitle}>Details</Text>
            <DetailRow icon="arrow-forward" label="Lender" value={loan.lender_location?.name ?? '—'} />
            <DetailRow icon="arrow-back" label="Borrower" value={loan.borrower_location?.name ?? '—'} />
            <DetailRow icon="cube" label="Requested" value={`${loan.quantity_requested} bags`} />
            {loan.quantity_approved != null && (
              <DetailRow icon="checkmark" label="Approved" value={`${loan.quantity_approved} bags`} />
            )}
            <DetailRow icon="time" label="Created" value={formatDateTime(loan.created_at)} />
            {loan.estimated_return_date && (
              <DetailRow icon="calendar" label="Return By" value={new Date(loan.estimated_return_date).toLocaleDateString()} />
            )}
            {loan.actual_return_date && (
              <DetailRow icon="checkmark-circle" label="Returned" value={formatDateTime(loan.actual_return_date)} />
            )}
            {loan.requester?.full_name && (
              <DetailRow icon="person" label="Requested By" value={loan.requester.full_name} />
            )}
            {loan.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{loan.notes}</Text>
              </View>
            )}
            {loan.rejection_reason && (
              <View style={styles.notesSection}>
                <Text style={[styles.notesLabel, { color: colors.error }]}>Rejection Reason</Text>
                <Text style={styles.notesText}>{loan.rejection_reason}</Text>
              </View>
            )}
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            {isLender && loan.status === 'pending' && (
              <>
                <Button title="Accept" onPress={handleAccept} loading={acceptMutation.isPending} size="lg" />
                <Button title="Reject" onPress={handleReject} variant="danger" loading={rejectMutation.isPending} size="lg" />
              </>
            )}
            {isBorrower && loan.status === 'accepted' && (
              <>
                <Button title="Confirm Loan" onPress={handleConfirm} loading={confirmMutation.isPending} size="lg" />
                <Button title="Reject Counter-Offer" onPress={handleReject} variant="outline" loading={rejectMutation.isPending} size="lg" />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.gray[400]} style={{ width: 24 }} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  overdueText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  stepsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.gray[200], alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.success },
  stepDotCurrent: { backgroundColor: colors.primary[500], width: 22, height: 22, borderRadius: 11 },
  stepLine: { width: 14, height: 2, backgroundColor: colors.gray[200] },
  stepLineActive: { backgroundColor: colors.success },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  detailLabel: { width: 90, fontSize: fontSize.sm, color: colors.gray[500] },
  detailValue: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  notesSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.gray[200] },
  notesLabel: { fontSize: fontSize.sm, color: colors.gray[500], marginBottom: spacing.xs },
  notesText: { fontSize: fontSize.sm, color: colors.gray[700] },
  actions: { gap: spacing.md },
});
