import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useLoan,
  useAcceptLoan,
  useRejectLoan,
  useConfirmLoan,
  useAssignPickup,
  useConfirmReceipt,
  useInitiateReturn,
  useAssignReturn,
  useConfirmReturn,
} from '../../src/hooks/useLoans';
import { useDrivers } from '../../src/hooks/useDrivers';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useAuthStore } from '../../src/stores/authStore';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import { formatDateTime } from '../../src/utils/dates';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

// Loan flow steps for the progress indicator
const LOAN_STEPS = [
  'pending', 'accepted', 'confirmed', 'in_transit',
  'collected', 'active', 'return_initiated',
  'return_in_progress', 'completed',
] as const;

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: loan, isLoading, isError, error, refetch } = useLoan(id);

  const acceptMutation = useAcceptLoan();
  const rejectMutation = useRejectLoan();
  const confirmMutation = useConfirmLoan();
  const assignPickupMutation = useAssignPickup();
  const confirmReceiptMutation = useConfirmReceipt();
  const initiateReturnMutation = useInitiateReturn();
  const assignReturnMutation = useAssignReturn();
  const confirmReturnMutation = useConfirmReturn();

  // For assign driver modals
  const [showPickupAssign, setShowPickupAssign] = useState(false);
  const [showReturnAssign, setShowReturnAssign] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const { data: driversData } = useDrivers(true);
  const { data: vehiclesData } = useVehicles(true);

  const drivers = driversData?.drivers ?? [];
  const vehicles = vehiclesData?.vehicles ?? [];

  if (isLoading || !loan) {
    return <Loading fullScreen message="Loading loan..." />;
  }
  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  const isBorrower = user?.location_id === loan.borrower_location_id;
  const isLender = user?.location_id === loan.lender_location_id;
  const isManager = user?.role === 'location_manager' || user?.role === 'zone_manager' || user?.role === 'admin';
  const currentStepIndex = LOAN_STEPS.indexOf(loan.status as any);

  // ── Action handlers ──

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

  const handleAssignPickup = () => {
    if (!selectedDriverId || !selectedVehicleId) {
      Alert.alert('Missing Info', 'Please select both a driver and a vehicle.');
      return;
    }
    assignPickupMutation.mutate(
      { id: loan.id, data: { driver_id: selectedDriverId, vehicle_id: selectedVehicleId } },
      {
        onSuccess: () => {
          setShowPickupAssign(false);
          setSelectedDriverId('');
          setSelectedVehicleId('');
        },
      },
    );
  };

  const handleConfirmReceipt = () => {
    Alert.alert(
      'Confirm Receipt',
      `Confirm you received ${loan.quantity_approved ?? loan.quantity_requested} bags? This adds stock to your inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Receipt', onPress: () => confirmReceiptMutation.mutate(loan.id) },
      ],
    );
  };

  const handleInitiateReturn = () => {
    Alert.alert('Start Return', 'Initiate the return process for this loan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Return', onPress: () => initiateReturnMutation.mutate(loan.id) },
    ]);
  };

  const handleAssignReturn = () => {
    if (!selectedDriverId || !selectedVehicleId) {
      Alert.alert('Missing Info', 'Please select both a driver and a vehicle.');
      return;
    }
    assignReturnMutation.mutate(
      { id: loan.id, data: { driver_id: selectedDriverId, vehicle_id: selectedVehicleId } },
      {
        onSuccess: () => {
          setShowReturnAssign(false);
          setSelectedDriverId('');
          setSelectedVehicleId('');
        },
      },
    );
  };

  const handleConfirmReturn = () => {
    Alert.alert(
      'Confirm Return',
      `Confirm that ${loan.quantity_approved ?? loan.quantity_requested} bags have been returned? This completes the loan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Return', onPress: () => confirmReturnMutation.mutate(loan.id) },
      ],
    );
  };

  // ── Determine which actions to show ──

  const showAcceptReject = isLender && loan.status === 'pending';
  const showConfirm = isBorrower && loan.status === 'accepted';
  const showAssignPickup = isManager && loan.status === 'confirmed' && !loan.pickup_trip_id;
  const showConfirmReceipt = isBorrower && ['active', 'collected', 'in_transit'].includes(loan.status);
  const showInitiateReturn = isBorrower && ['active', 'overdue'].includes(loan.status);
  const showAssignReturnBtn = isBorrower && isManager && ['return_initiated', 'active', 'overdue'].includes(loan.status);
  const showConfirmReturnBtn = isLender && loan.status === 'return_in_progress';

  const anyLoading =
    acceptMutation.isPending || rejectMutation.isPending || confirmMutation.isPending ||
    assignPickupMutation.isPending || confirmReceiptMutation.isPending ||
    initiateReturnMutation.isPending || assignReturnMutation.isPending || confirmReturnMutation.isPending;

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
            <DetailRow icon="arrow-forward" label="Lender" value={loan.lender_location?.name ?? '\u2014'} />
            <DetailRow icon="arrow-back" label="Borrower" value={loan.borrower_location?.name ?? '\u2014'} />
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

          {/* Assign Pickup Driver form */}
          {showAssignPickup && !showPickupAssign && (
            <Button
              title="Assign Pickup Driver"
              onPress={() => setShowPickupAssign(true)}
              icon={<Ionicons name="car-outline" size={18} color={colors.white} />}
              size="lg"
            />
          )}

          {showPickupAssign && (
            <Card>
              <Text style={styles.sectionTitle}>Assign Pickup Driver</Text>
              <Text style={styles.fieldLabel}>Driver</Text>
              <View style={styles.optionList}>
                {drivers.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.optionItem, selectedDriverId === d.id && styles.optionSelected]}
                    onPress={() => setSelectedDriverId(d.id)}
                  >
                    <Text style={[styles.optionText, selectedDriverId === d.id && styles.optionTextSelected]}>
                      {d.full_name}
                    </Text>
                    {selectedDriverId === d.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Vehicle</Text>
              <View style={styles.optionList}>
                {vehicles.map((v: any) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.optionItem, selectedVehicleId === v.id && styles.optionSelected]}
                    onPress={() => setSelectedVehicleId(v.id)}
                  >
                    <Text style={[styles.optionText, selectedVehicleId === v.id && styles.optionTextSelected]}>
                      {v.registration_number} {v.make ? `- ${v.make}` : ''}
                    </Text>
                    {selectedVehicleId === v.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.assignActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => { setShowPickupAssign(false); setSelectedDriverId(''); setSelectedVehicleId(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Assign"
                  onPress={handleAssignPickup}
                  loading={assignPickupMutation.isPending}
                  disabled={!selectedDriverId || !selectedVehicleId}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Assign Return Driver form */}
          {showAssignReturnBtn && !showReturnAssign && (
            <Button
              title="Assign Return Driver"
              onPress={() => setShowReturnAssign(true)}
              icon={<Ionicons name="return-down-back-outline" size={18} color={colors.white} />}
              size="lg"
            />
          )}

          {showReturnAssign && (
            <Card>
              <Text style={styles.sectionTitle}>Assign Return Driver</Text>
              <Text style={styles.fieldLabel}>Driver</Text>
              <View style={styles.optionList}>
                {drivers.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.optionItem, selectedDriverId === d.id && styles.optionSelected]}
                    onPress={() => setSelectedDriverId(d.id)}
                  >
                    <Text style={[styles.optionText, selectedDriverId === d.id && styles.optionTextSelected]}>
                      {d.full_name}
                    </Text>
                    {selectedDriverId === d.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Vehicle</Text>
              <View style={styles.optionList}>
                {vehicles.map((v: any) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.optionItem, selectedVehicleId === v.id && styles.optionSelected]}
                    onPress={() => setSelectedVehicleId(v.id)}
                  >
                    <Text style={[styles.optionText, selectedVehicleId === v.id && styles.optionTextSelected]}>
                      {v.registration_number} {v.make ? `- ${v.make}` : ''}
                    </Text>
                    {selectedVehicleId === v.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.assignActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => { setShowReturnAssign(false); setSelectedDriverId(''); setSelectedVehicleId(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Assign"
                  onPress={handleAssignReturn}
                  loading={assignReturnMutation.isPending}
                  disabled={!selectedDriverId || !selectedVehicleId}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Primary actions */}
          <View style={styles.actions}>
            {showAcceptReject && (
              <>
                <Button title="Accept" onPress={handleAccept} loading={acceptMutation.isPending} size="lg" />
                <Button title="Reject" onPress={handleReject} variant="danger" loading={rejectMutation.isPending} size="lg" />
              </>
            )}
            {showConfirm && (
              <>
                <Button title="Confirm Loan" onPress={handleConfirm} loading={confirmMutation.isPending} size="lg" />
                <Button title="Reject Counter-Offer" onPress={handleReject} variant="outline" loading={rejectMutation.isPending} size="lg" />
              </>
            )}
            {showConfirmReceipt && (
              <Button
                title="Confirm Receipt"
                onPress={handleConfirmReceipt}
                loading={confirmReceiptMutation.isPending}
                size="lg"
                icon={<Ionicons name="checkmark-done-outline" size={18} color={colors.white} />}
              />
            )}
            {showInitiateReturn && !showReturnAssign && (
              <Button
                title="Start Return"
                onPress={handleInitiateReturn}
                loading={initiateReturnMutation.isPending}
                variant="secondary"
                size="lg"
                icon={<Ionicons name="return-down-back-outline" size={18} color={colors.gray[800]} />}
              />
            )}
            {showConfirmReturnBtn && (
              <Button
                title="Confirm Return"
                onPress={handleConfirmReturn}
                loading={confirmReturnMutation.isPending}
                size="lg"
                icon={<Ionicons name="checkmark-done-outline" size={18} color={colors.white} />}
              />
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

  // Assign driver form styles
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  optionList: { gap: spacing.xs },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary[700],
    fontWeight: fontWeight.medium,
  },
  assignActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
