import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useRequest,
  useAcceptRequest,
  useCreateTripFromRequest,
  useProposeTime,
  useUpdateRequest,
  useCancelRequest,
  useReRequest,
  useAcceptProposal,
  useDeclineProposal,
} from '../../src/hooks/useRequests';
import { referenceApi } from '../../src/api/reference';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import { useAuthStore } from '../../src/stores/authStore';
import { formatDateTime, timeAgo } from '../../src/utils/dates';
import { getUrgencyVariant } from '../../src/utils/status';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

/* ── Design tokens (matching dashboard) ── */
const BRAND    = '#0f172a';
const WARM_BG  = '#f8fafc';
const CARD_R   = 16;
import type { ProposeTimePayload } from '../../src/api/requests';

type ActiveForm = null | 'accept' | 'proposeTime' | 'edit' | 'cancel' | 'createTrip' | 'declineProposal';

const PROPOSE_REASONS: { value: ProposeTimePayload['reason']; label: string }[] = [
  { value: 'vehicle_issue', label: 'Vehicle Issue' },
  { value: 'another_urgent_request', label: 'Another Urgent Request' },
  { value: 'route_conditions', label: 'Route Conditions' },
  { value: 'schedule_conflict', label: 'Schedule Conflict' },
  { value: 'other', label: 'Other' },
];

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: request, isLoading, isError, error, refetch } = useRequest(id);

  // Mutations
  const acceptMutation = useAcceptRequest();
  const createTripMutation = useCreateTripFromRequest();
  const proposeTimeMutation = useProposeTime();
  const updateMutation = useUpdateRequest();
  const cancelMutation = useCancelRequest();
  const reRequestMutation = useReRequest();
  const acceptProposalMutation = useAcceptProposal();
  const declineProposalMutation = useDeclineProposal();

  // Reference data
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => referenceApi.getVehicles().then((r) => r.data),
    enabled: false,
  });
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => referenceApi.getLocations().then((r) => r.data),
    enabled: false,
  });
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then((r) => r.data),
    enabled: false,
  });

  // Active inline form
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  // Accept form state
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [acceptFromType, setAcceptFromType] = useState<'supplier' | 'warehouse'>('supplier');
  const [acceptFromId, setAcceptFromId] = useState('');

  // Propose time form state
  const [proposedTime, setProposedTime] = useState('');
  const [proposeReason, setProposeReason] = useState<ProposeTimePayload['reason']>('schedule_conflict');
  const [proposeNotes, setProposeNotes] = useState('');

  // Edit form state
  const [editQuantity, setEditQuantity] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  // Create trip form state
  const [tripVehicleId, setTripVehicleId] = useState('');
  const [tripOdometerStart, setTripOdometerStart] = useState('');
  const [tripSupplierId, setTripSupplierId] = useState('');
  const [tripFromLocationId, setTripFromLocationId] = useState('');
  const [tripEstimatedArrival, setTripEstimatedArrival] = useState('');

  // Decline proposal form state
  const [declineNotes, setDeclineNotes] = useState('');

  // Populate edit form when request loads
  useEffect(() => {
    if (request && activeForm === 'edit') {
      setEditQuantity(String(request.quantity_bags));
      setEditNotes(request.notes ?? '');
    }
  }, [request, activeForm]);

  if (isLoading || !request) {
    return <Loading fullScreen message="Loading request..." />;
  }
  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  const isDriver = user?.role === 'driver';
  const isManager = user?.role === 'location_manager' || user?.role === 'zone_manager' || user?.role === 'admin';
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isTimeProposed = request.status === 'time_proposed';
  const isPartiallyFulfilled = request.status === 'partially_fulfilled';
  const isMyRequest = request.accepted_by === user?.id;
  const isRequester = request.requested_by === user?.id;

  const canAccept = isPending && isDriver;
  const canProposeTime = isPending && isDriver && !!request.requested_delivery_time;
  const canEdit = (isPending || isAccepted) && (isRequester || isManager) && !request.trip_id;
  const canCancel = (isPending || isAccepted) && (isRequester || isMyRequest || isManager);
  const canCreateTrip = isAccepted && isMyRequest && !request.trip_id;
  const canReview = isTimeProposed && (isRequester || isManager);
  const canReRequest = (isPending || isPartiallyFulfilled) && isManager;

  const openForm = (form: ActiveForm) => {
    setActiveForm(form);
    if (form === 'accept' || form === 'createTrip') {
      vehiclesQuery.refetch();
      locationsQuery.refetch();
      suppliersQuery.refetch();
    }
  };

  const closeForm = () => {
    setActiveForm(null);
    // Reset all form state
    setSelectedVehicleId('');
    setOdometerStart('');
    setEstimatedArrival('');
    setAcceptFromType('supplier');
    setAcceptFromId('');
    setProposedTime('');
    setProposeReason('schedule_conflict');
    setProposeNotes('');
    setEditQuantity('');
    setEditNotes('');
    setCancelReason('');
    setTripVehicleId('');
    setTripOdometerStart('');
    setTripSupplierId('');
    setTripFromLocationId('');
    setTripEstimatedArrival('');
    setDeclineNotes('');
  };

  // --- Submit handlers ---

  const handleAcceptSubmit = () => {
    if (!selectedVehicleId) {
      Alert.alert('Required', 'Please select a vehicle.');
      return;
    }
    if (!odometerStart) {
      Alert.alert('Required', 'Please enter the odometer start reading.');
      return;
    }
    if (!acceptFromId) {
      Alert.alert('Required', `Please select a ${acceptFromType === 'supplier' ? 'supplier' : 'pickup location'}.`);
      return;
    }
    // Call createTrip directly — the backend endpoint handles accepting
    // pending requests atomically (sets accepted_by + creates trip in one call),
    // avoiding the stuck "accepted with no trip" state.
    createTripMutation.mutate(
      {
        id: request.id,
        data: {
          vehicle_id: selectedVehicleId,
          driver_id: user?.id,
          odometer_start: Number(odometerStart),
          auto_start: true,
          estimated_arrival_time: estimatedArrival || undefined,
          supplier_id: acceptFromType === 'supplier' ? acceptFromId : undefined,
          from_location_id: acceptFromType === 'warehouse' ? acceptFromId : undefined,
        },
      },
      {
        onSuccess: () => {
          closeForm();
          router.back();
        },
      },
    );
  };

  const handleProposeTimeSubmit = () => {
    if (!proposedTime.trim()) {
      Alert.alert('Required', 'Please enter a proposed delivery time (e.g. 2026-04-13 14:00).');
      return;
    }
    proposeTimeMutation.mutate(
      {
        id: request.id,
        data: {
          proposed_delivery_time: proposedTime.trim(),
          reason: proposeReason,
          notes: proposeNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          closeForm();
          Alert.alert('Sent', 'Your proposed time has been submitted to the manager.');
        },
      },
    );
  };

  const handleEditSubmit = () => {
    const qty = Number(editQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid', 'Quantity must be a positive number.');
      return;
    }
    updateMutation.mutate(
      {
        id: request.id,
        data: {
          quantity_bags: qty,
          notes: editNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          closeForm();
          Alert.alert('Updated', 'Request has been updated.');
        },
      },
    );
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for cancellation.');
      return;
    }
    Alert.alert('Confirm Cancel', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(
            { id: request.id, data: { reason: cancelReason.trim() } },
            {
              onSuccess: () => {
                closeForm();
                router.back();
              },
            },
          ),
      },
    ]);
  };

  const handleCreateTripSubmit = () => {
    if (!tripVehicleId) {
      Alert.alert('Required', 'Please select a vehicle.');
      return;
    }
    createTripMutation.mutate(
      {
        id: request.id,
        data: {
          vehicle_id: tripVehicleId,
          odometer_start: tripOdometerStart ? Number(tripOdometerStart) : undefined,
          supplier_id: tripSupplierId || undefined,
          from_location_id: tripFromLocationId || undefined,
          auto_start: true,
          estimated_arrival_time: tripEstimatedArrival || undefined,
        },
      },
      {
        onSuccess: () => {
          closeForm();
        },
      },
    );
  };

  const handleAcceptProposal = () => {
    acceptProposalMutation.mutate(request.id, {
      onSuccess: () => {
        Alert.alert('Accepted', 'The proposed delivery time has been accepted.');
      },
    });
  };

  const handleDeclineProposalSubmit = () => {
    declineProposalMutation.mutate(
      { id: request.id, data: { notes: declineNotes || undefined } },
      {
        onSuccess: () => {
          closeForm();
          Alert.alert('Declined', 'The time proposal has been declined. The request is available for other drivers.');
        },
      },
    );
  };

  const handleReRequest = () => {
    Alert.alert(
      'Resend to Drivers',
      'This will reset the request to pending and notify all active drivers. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend',
          onPress: () =>
            reRequestMutation.mutate(request.id, {
              onSuccess: () => {
                Alert.alert('Sent', 'Notification sent to all active drivers.');
              },
            }),
        },
      ],
    );
  };

  // --- Vehicle picker helper ---
  const vehicles = vehiclesQuery.data ?? [];
  const availableVehicles = vehicles.filter((v: any) => v.is_active && v.is_available !== false);

  const locations = locationsQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Request Detail',
          headerStyle: { backgroundColor: BRAND },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Request Info */}
          <Card>
            <View style={styles.headerRow}>
              <StatusBadge status={request.status} type="request" />
              {request.urgency === 'urgent' && (
                <Badge label="Urgent" variant={getUrgencyVariant(request.urgency)} />
              )}
            </View>

            <View style={styles.section}>
              <DetailRow icon="location" label="Delivery To" value={request.location?.name ?? '\u2014'} />
              <DetailRow icon="cube" label="Quantity" value={`${request.quantity_bags} bags`} />
              <DetailRow icon="person" label="Requested By" value={request.requester?.full_name ?? '\u2014'} />
              <DetailRow icon="time" label="Created" value={formatDateTime(request.created_at)} />
              {request.requested_delivery_time && (
                <DetailRow icon="calendar" label="Requested Time" value={formatDateTime(request.requested_delivery_time)} />
              )}
              {request.proposed_delivery_time && (
                <DetailRow icon="swap-horizontal" label="Proposed Time" value={formatDateTime(request.proposed_delivery_time)} />
              )}
              {request.agreed_delivery_time && (
                <DetailRow icon="checkmark-circle" label="Agreed Time" value={formatDateTime(request.agreed_delivery_time)} />
              )}
            </View>

            {request.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{request.notes}</Text>
              </View>
            )}
          </Card>

          {/* Stock Info */}
          {request.current_stock_kg != null && (
            <Card>
              <Text style={styles.sectionTitle}>Stock Info</Text>
              <DetailRow
                icon="trending-down"
                label="Current Stock"
                value={`${(request.current_stock_kg / 10).toFixed(1)} bags (${request.current_stock_kg} kg)`}
              />
              {request.target_stock_kg != null && (
                <DetailRow
                  icon="flag"
                  label="Target Stock"
                  value={`${(request.target_stock_kg / 10).toFixed(1)} bags`}
                />
              )}
            </Card>
          )}

          {/* Accepted By */}
          {request.acceptor && (
            <Card>
              <Text style={styles.sectionTitle}>Accepted By</Text>
              <DetailRow icon="person" label="Name" value={request.acceptor.full_name ?? '\u2014'} />
              {request.accepted_at && (
                <DetailRow icon="time" label="Accepted" value={formatDateTime(request.accepted_at)} />
              )}
            </Card>
          )}

          {/* Time Proposal Review (managers) */}
          {isTimeProposed && canReview && activeForm !== 'declineProposal' && (
            <Card style={styles.proposalCard}>
              <Text style={styles.sectionTitle}>Time Proposal</Text>
              {request.proposed_delivery_time && (
                <DetailRow icon="time" label="Proposed" value={formatDateTime(request.proposed_delivery_time)} />
              )}
              {request.proposal_reason && (
                <DetailRow icon="information-circle" label="Reason" value={request.proposal_reason.replace(/_/g, ' ')} />
              )}
              <View style={styles.proposalActions}>
                <Button
                  title="Accept Proposal"
                  onPress={handleAcceptProposal}
                  loading={acceptProposalMutation.isPending}
                  size="md"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Decline"
                  variant="danger"
                  onPress={() => openForm('declineProposal')}
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Decline Proposal Form */}
          {activeForm === 'declineProposal' && (
            <Card>
              <Text style={styles.sectionTitle}>Decline Proposal</Text>
              <Input
                label="Notes (optional)"
                value={declineNotes}
                onChangeText={setDeclineNotes}
                placeholder="Reason for declining..."
                multiline
                numberOfLines={3}
              />
              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={closeForm} style={{ flex: 1 }} />
                <Button
                  title="Decline Proposal"
                  variant="danger"
                  onPress={handleDeclineProposalSubmit}
                  loading={declineProposalMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Linked Trip */}
          {request.trips && (
            <Card>
              <Text style={styles.sectionTitle}>Linked Trip</Text>
              <DetailRow icon="car" label="Trip" value={request.trips.trip_number} />
              <StatusBadge status={request.trips.status} type="trip" />
              <Button
                title="View Trip"
                variant="outline"
                size="sm"
                onPress={() => router.push(`/trip/${request.trips!.id}`)}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          )}

          {/* Accept Form (driver) */}
          {activeForm === 'accept' && (
            <Card>
              <Text style={styles.sectionTitle}>Accept & Deliver</Text>

              <Text style={styles.fieldLabel}>Vehicle *</Text>
              {vehiclesQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                  {availableVehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.pickerChip,
                        selectedVehicleId === v.id && styles.pickerChipActive,
                      ]}
                      onPress={() => setSelectedVehicleId(v.id)}
                    >
                      <Ionicons
                        name="car"
                        size={14}
                        color={selectedVehicleId === v.id ? colors.white : colors.gray[600]}
                      />
                      <Text
                        style={[
                          styles.pickerChipText,
                          selectedVehicleId === v.id && styles.pickerChipTextActive,
                        ]}
                      >
                        {v.registration_number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {availableVehicles.length === 0 && (
                    <Text style={styles.emptyPickerText}>No available vehicles</Text>
                  )}
                </ScrollView>
              )}

              {/* Source type */}
              <Text style={styles.fieldLabel}>Pickup From *</Text>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.pickerChip, { flex: 1, justifyContent: 'center' }, acceptFromType === 'supplier' && styles.pickerChipActive]}
                  onPress={() => { setAcceptFromType('supplier'); setAcceptFromId(''); }}
                >
                  <Text style={[styles.pickerChipText, acceptFromType === 'supplier' && styles.pickerChipTextActive]}>Supplier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerChip, { flex: 1, justifyContent: 'center' }, acceptFromType === 'warehouse' && styles.pickerChipActive]}
                  onPress={() => { setAcceptFromType('warehouse'); setAcceptFromId(''); }}
                >
                  <Text style={[styles.pickerChipText, acceptFromType === 'warehouse' && styles.pickerChipTextActive]}>Warehouse</Text>
                </TouchableOpacity>
              </View>

              {/* Source selection */}
              <Text style={styles.fieldLabel}>{acceptFromType === 'supplier' ? 'Select Supplier *' : 'Select Location *'}</Text>
              {(acceptFromType === 'supplier' ? suppliersQuery.isLoading : locationsQuery.isLoading) ? (
                <ActivityIndicator size="small" color={brand.accent} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                  {(acceptFromType === 'supplier' ? suppliers : locations).map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pickerChip, acceptFromId === item.id && styles.pickerChipActive]}
                      onPress={() => setAcceptFromId(item.id)}
                    >
                      <Text style={[styles.pickerChipText, acceptFromId === item.id && styles.pickerChipTextActive]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {(acceptFromType === 'supplier' ? suppliers : locations).length === 0 && (
                    <Text style={styles.emptyPickerText}>No {acceptFromType === 'supplier' ? 'suppliers' : 'locations'} found</Text>
                  )}
                </ScrollView>
              )}

              <Input
                label="Odometer Start (km) *"
                value={odometerStart}
                onChangeText={setOdometerStart}
                keyboardType="numeric"
                placeholder="e.g. 45230"
              />
              <Input
                label="Estimated Arrival (optional)"
                value={estimatedArrival}
                onChangeText={setEstimatedArrival}
                placeholder="e.g. 2026-04-13 14:00"
                containerStyle={{ marginTop: spacing.sm }}
              />
              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={closeForm} style={{ flex: 1 }} />
                <Button
                  title="Accept & Create Trip"
                  onPress={handleAcceptSubmit}
                  loading={createTripMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Propose Time Form (driver) */}
          {activeForm === 'proposeTime' && (
            <Card>
              <Text style={styles.sectionTitle}>Propose Alternative Time</Text>
              <Input
                label="Proposed Delivery Time *"
                value={proposedTime}
                onChangeText={setProposedTime}
                placeholder="e.g. 2026-04-13 14:00"
              />
              <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Reason *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                {PROPOSE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.pickerChip,
                      proposeReason === r.value && styles.pickerChipActive,
                    ]}
                    onPress={() => setProposeReason(r.value)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        proposeReason === r.value && styles.pickerChipTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Input
                label="Notes (optional)"
                value={proposeNotes}
                onChangeText={setProposeNotes}
                placeholder="Additional details..."
                multiline
                numberOfLines={3}
                containerStyle={{ marginTop: spacing.sm }}
              />
              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={closeForm} style={{ flex: 1 }} />
                <Button
                  title="Submit Proposal"
                  onPress={handleProposeTimeSubmit}
                  loading={proposeTimeMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Edit Form */}
          {activeForm === 'edit' && (
            <Card>
              <Text style={styles.sectionTitle}>Edit Request</Text>
              <Input
                label="Quantity (bags) *"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
                placeholder="e.g. 5"
              />
              <Input
                label="Notes"
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Optional notes..."
                multiline
                numberOfLines={3}
                containerStyle={{ marginTop: spacing.sm }}
              />
              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={closeForm} style={{ flex: 1 }} />
                <Button
                  title="Save Changes"
                  onPress={handleEditSubmit}
                  loading={updateMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Cancel Form */}
          {activeForm === 'cancel' && (
            <Card>
              <Text style={styles.sectionTitle}>Cancel Request</Text>
              <Input
                label="Reason *"
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Why are you cancelling this request?"
                multiline
                numberOfLines={3}
              />
              <View style={styles.formActions}>
                <Button title="Go Back" variant="ghost" onPress={closeForm} style={{ flex: 1 }} />
                <Button
                  title="Cancel Request"
                  variant="danger"
                  onPress={handleCancelSubmit}
                  loading={cancelMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Create Trip Form */}
          {activeForm === 'createTrip' && (
            <Card>
              <Text style={styles.sectionTitle}>Create Trip</Text>

              <Text style={styles.fieldLabel}>Vehicle *</Text>
              {vehiclesQuery.isLoading ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                  {availableVehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.pickerChip,
                        tripVehicleId === v.id && styles.pickerChipActive,
                      ]}
                      onPress={() => setTripVehicleId(v.id)}
                    >
                      <Ionicons
                        name="car"
                        size={14}
                        color={tripVehicleId === v.id ? colors.white : colors.gray[600]}
                      />
                      <Text
                        style={[
                          styles.pickerChipText,
                          tripVehicleId === v.id && styles.pickerChipTextActive,
                        ]}
                      >
                        {v.registration_number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {availableVehicles.length === 0 && (
                    <Text style={styles.emptyPickerText}>No available vehicles</Text>
                  )}
                </ScrollView>
              )}

              <Input
                label="Odometer Start (km)"
                value={tripOdometerStart}
                onChangeText={setTripOdometerStart}
                keyboardType="numeric"
                placeholder="e.g. 45230"
                containerStyle={{ marginTop: spacing.sm }}
              />

              <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Supplier (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.pickerChip, !tripSupplierId && styles.pickerChipActive]}
                  onPress={() => setTripSupplierId('')}
                >
                  <Text style={[styles.pickerChipText, !tripSupplierId && styles.pickerChipTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {suppliers.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.pickerChip,
                      tripSupplierId === s.id && styles.pickerChipActive,
                    ]}
                    onPress={() => setTripSupplierId(s.id)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        tripSupplierId === s.id && styles.pickerChipTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>From Location (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.pickerChip, !tripFromLocationId && styles.pickerChipActive]}
                  onPress={() => setTripFromLocationId('')}
                >
                  <Text style={[styles.pickerChipText, !tripFromLocationId && styles.pickerChipTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {locations.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[
                      styles.pickerChip,
                      tripFromLocationId === l.id && styles.pickerChipActive,
                    ]}
                    onPress={() => setTripFromLocationId(l.id)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        tripFromLocationId === l.id && styles.pickerChipTextActive,
                      ]}
                    >
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Estimated Arrival (optional)"
                value={tripEstimatedArrival}
                onChangeText={setTripEstimatedArrival}
                placeholder="e.g. 2026-04-13 14:00"
                containerStyle={{ marginTop: spacing.sm }}
              />

              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={closeForm} style={{ flex: 1 }} />
                <Button
                  title="Create Trip"
                  onPress={handleCreateTripSubmit}
                  loading={createTripMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          {activeForm === null && (
            <View style={styles.actions}>
              {canAccept && (
                <Button
                  title="Accept Request"
                  onPress={() => openForm('accept')}
                  size="lg"
                  icon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />}
                />
              )}
              {canProposeTime && (
                <Button
                  title="Propose Time"
                  variant="secondary"
                  onPress={() => openForm('proposeTime')}
                  size="lg"
                  icon={<Ionicons name="time" size={20} color={colors.gray[800]} />}
                />
              )}
              {canCreateTrip && (
                <Button
                  title="Create Trip"
                  variant="secondary"
                  onPress={() => openForm('createTrip')}
                  size="lg"
                  icon={<Ionicons name="car" size={20} color={colors.gray[800]} />}
                />
              )}
              {canReRequest && (
                <Button
                  title="Resend to Drivers"
                  variant="outline"
                  onPress={handleReRequest}
                  loading={reRequestMutation.isPending}
                  size="lg"
                  icon={<Ionicons name="refresh" size={20} color={colors.primary[500]} />}
                />
              )}
              {canEdit && (
                <Button
                  title="Edit Request"
                  variant="outline"
                  onPress={() => openForm('edit')}
                  size="md"
                  icon={<Ionicons name="create" size={18} color={colors.primary[500]} />}
                />
              )}
              {canCancel && (
                <Button
                  title="Cancel Request"
                  variant="danger"
                  onPress={() => openForm('cancel')}
                  size="md"
                  icon={<Ionicons name="close-circle" size={18} color={colors.white} />}
                />
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconBox}>
        <Ionicons name={icon} size={14} color={colors.gray[400]} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WARM_BG },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 14,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
    letterSpacing: -0.1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 34,
  },
  detailIconBox: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#f5f3ff',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  detailLabel: {
    width: 105,
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray[400],
    letterSpacing: 0.1,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[900],
    letterSpacing: -0.1,
  },
  notesSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[100],
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray[700],
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  // Form styles
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  pickerRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  pickerChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  pickerChipText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  pickerChipTextActive: {
    color: colors.white,
  },
  emptyPickerText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    paddingVertical: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  proposalCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
