import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  useTrip,
  useTripStops,
  useStartTrip,
  useCancelTrip,
  useCompleteStop,
  useCompleteTrip,
  useSubmitKm,
} from '../../src/hooks/useTrips';
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
  TickerProgressBar,
  ActionStack,
  DFieldBox,
  PrimaryBar,
  type StackAction,
} from '../../src/components/wp';
import { wp, pipelineColor } from '../../src/constants/warehousePaper';
import { formatDateTime } from '../../src/utils/dates';
import type { TripStop, TripStatus } from '../../src/types';

const STATUS_STAMP: Record<TripStatus, { label: string; color: string; rotate: number }> = {
  planned: { label: 'PLANNED', color: wp.color.amber, rotate: 3 },
  in_progress: { label: 'IN TRANSIT', color: wp.color.pipeline.in_delivery ?? '#5B2CA5', rotate: 3 },
  completed: { label: 'DONE', color: wp.color.green, rotate: -3 },
  cancelled: { label: 'CANCEL', color: wp.color.ink3, rotate: -3 },
};

function shortTripNumber(n: string): string {
  const m = n.match(/\d+/);
  return m ? m[0].slice(-4) : n.slice(-4).toUpperCase();
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: trip, isLoading: tripLoading, isError, error, refetch } = useTrip(id);
  const { data: stopsData } = useTripStops(id);
  const isManager = ['admin', 'zone_manager', 'location_manager', 'vehicle_manager'].includes(user?.role ?? '');
  const startTrip = useStartTrip();
  const cancelTrip = useCancelTrip();
  const completeStop = useCompleteStop();
  const completeTrip = useCompleteTrip();
  const submitKm = useSubmitKm();

  const [closingKm, setClosingKm] = useState('');

  if (tripLoading || !trip) {
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

  const stops = stopsData?.stops ?? [];
  const isPlanned = trip.status === 'planned';
  const isInProgress = trip.status === 'in_progress';
  const isCompleted = trip.status === 'completed';
  const allStopsComplete = stops.length > 0 && stops.every((s) => s.is_completed);
  const anyStopsComplete = stops.some((s) => s.is_completed);
  const needsKm = isCompleted && (trip as any).odometer_start != null && (trip as any).odometer_end == null;
  const canCancel = isManager && isPlanned && !anyStopsComplete;
  const nextStop = stops.find((s) => !s.is_completed);
  const completedStops = stops.filter((s) => s.is_completed).length;
  const totalPlannedBags = stops.reduce((sum, s) => sum + Math.round((s.planned_qty_kg ?? 0) / 10), 0);

  const handleStart = () => {
    Alert.alert('Start trip', 'Begin this trip now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => startTrip.mutate({ id: trip.id }) },
    ]);
  };

  const handleDeliverNext = () => {
    if (!nextStop) return;
    if (nextStop.stop_type === 'dropoff') {
      router.push(
        `/delivery/${nextStop.id}?tripId=${trip.id}&planned=${nextStop.planned_qty_kg ?? 0}&locationName=${encodeURIComponent(nextStop.location_name ?? 'Location')}`,
      );
    } else {
      Alert.alert('Complete pickup', `Mark pickup at ${nextStop.location_name ?? 'this location'} complete?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => completeStop.mutate({ stopId: nextStop.id, data: {} }) },
      ]);
    }
  };

  const handleCompleteTrip = () => {
    Alert.alert('Complete trip', 'Mark this trip as complete?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => completeTrip.mutate({ id: trip.id, data: {} }) },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel trip', `Cancel trip ${trip.trip_number}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel trip',
        style: 'destructive',
        onPress: () => cancelTrip.mutate(trip.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const handleSubmitKm = () => {
    const km = parseInt(closingKm, 10);
    if (isNaN(km) || km <= 0) return;
    submitKm.mutate({ id: trip.id, closingKm: km });
  };

  const statusStamp = STATUS_STAMP[trip.status] ?? STATUS_STAMP.planned;

  const actions: StackAction[] = [];
  if (isInProgress && nextStop) {
    const label = nextStop.stop_type === 'dropoff' ? 'Deliver next stop →' : 'Complete next pickup →';
    actions.push({ label, onPress: handleDeliverNext, filled: true });
  }
  if (isInProgress && allStopsComplete) {
    actions.push({ label: 'Complete trip →', onPress: handleCompleteTrip, filled: true });
  }
  if (isPlanned) {
    actions.push({ label: 'Start trip →', onPress: handleStart, filled: true });
  }
  if (canCancel) {
    actions.push({ label: 'Cancel trip', onPress: handleCancel, color: wp.color.red });
  }

  const metaRows: { key: string; value: string }[] = [
    {
      key: 'ROUTE',
      value: [
        trip.origin_description ?? trip.from_location?.name,
        ...stops.filter((s) => s.stop_type === 'dropoff').map((s) => s.location_name),
      ]
        .filter(Boolean)
        .join(' → ') || '—',
    },
    { key: 'VEHICLE', value: trip.vehicles?.registration_number ?? '—' },
    { key: 'DRIVER', value: trip.driver_name ?? 'Unassigned' },
    { key: 'DEPARTED', value: trip.departure_time ? formatDateTime(trip.departure_time) : '—' },
    { key: 'ARRIVED', value: trip.completed_at ? formatDateTime(trip.completed_at) : '—' },
  ];

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`TRIP · N°${shortTripNumber(trip.trip_number)} · ${new Date(trip.created_at)
              .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
              .toUpperCase()}`}
            title="Dispatch record"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            {/* Hero voucher */}
            <HardShadowFrame style={{ marginBottom: 18 }}>
              <View style={styles.voucher}>
                <View style={styles.voucherHead}>
                  <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
                    VOUCHER N° {shortTripNumber(trip.trip_number)}
                  </KickerLabel>
                  <Stamp colorHex={statusStamp.color} rotate={statusStamp.rotate}>
                    {statusStamp.label}
                  </Stamp>
                </View>

                <View style={styles.heroRow}>
                  <SerifNumber size={72} tracking={-3} leading={0.9} color={wp.color.ink} autoShrink>
                    {String(totalPlannedBags)}
                  </SerifNumber>
                  <MonoText size={11} tracking={1.5} color={wp.color.ink3} style={{ marginLeft: 10 }}>
                    BAGS PLANNED
                  </MonoText>
                </View>

                <View style={styles.metaLedger}>
                  {metaRows.map((row, i) => (
                    <View
                      key={row.key}
                      style={[styles.metaRow, i < metaRows.length - 1 && styles.metaRowDivider]}
                    >
                      <MonoText size={10} tracking={1.5} upper color={wp.color.ink3}>
                        {row.key}
                      </MonoText>
                      <Text allowFontScaling={false} style={styles.metaValue} numberOfLines={2}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </HardShadowFrame>

            {/* Stops */}
            {stops.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Stops — {completedStops}/{stops.length} complete
                  </KickerLabel>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    Ticker
                  </KickerLabel>
                </View>
                <View style={{ marginBottom: 8 }}>
                  <TickerProgressBar progress={stops.length > 0 ? completedStops / stops.length : 0} />
                </View>

                {stops.map((s) => (
                  <StopRow key={s.id} stop={s} />
                ))}
              </>
            )}

            {/* KM submission */}
            {needsKm && (
              <View style={{ marginTop: 18 }}>
                <DFieldBox label="Closing KM">
                  <View style={styles.kmRow}>
                    <SerifNumber
                      size={48}
                      tracking={-1.5}
                      leading={1}
                      color={closingKm ? wp.color.ink : wp.color.ink3}
                      autoShrink
                    >
                      {closingKm || '—'}
                    </SerifNumber>
                    <TextInput
                      value={closingKm}
                      onChangeText={setClosingKm}
                      keyboardType="number-pad"
                      style={styles.hiddenInput}
                    />
                  </View>
                  <View style={styles.kmUnderline} />
                </DFieldBox>
              </View>
            )}

            {actions.length > 0 && (
              <View style={{ marginTop: 18 }}>
                <ActionStack actions={actions} />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {needsKm && (
          <PrimaryBar
            label="Submit closing KM"
            onPress={handleSubmitKm}
            disabled={!closingKm || parseInt(closingKm, 10) <= 0}
            loading={submitKm.isPending}
          />
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function StopRow({ stop }: { stop: TripStop }) {
  const typeColor = stop.stop_type === 'pickup' ? wp.color.ink : wp.color.pipeline.in_delivery ?? '#5B2CA5';
  const stateStamp = stop.is_completed
    ? { label: 'DONE', color: wp.color.green, rotate: 3 }
    : { label: 'WAITING', color: wp.color.ink3, rotate: -3 };
  const plannedBags = Math.round((stop.planned_qty_kg ?? 0) / 10);
  const actualBags = stop.actual_qty_kg != null ? Math.round(stop.actual_qty_kg / 10) : null;

  return (
    <View style={styles.stopRow}>
      <MonoText size={10} color={wp.color.ink3} style={styles.stopIdx}>
        {String(stop.stop_order).padStart(2, '0')}
      </MonoText>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.stopHead}>
          <Stamp colorHex={typeColor} rotate={0}>
            {stop.stop_type.toUpperCase()}
          </Stamp>
          <Text allowFontScaling={false} style={styles.stopName} numberOfLines={1}>
            {stop.location_name ?? 'Location'}
          </Text>
        </View>
        <MonoText size={10} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 4 }}>
          PLANNED {plannedBags}
          {actualBags != null ? ` · ACTUAL ${actualBags}` : ''}
        </MonoText>
      </View>
      <Stamp colorHex={stateStamp.color} rotate={stateStamp.rotate}>
        {stateStamp.label}
      </Stamp>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
    paddingBottom: 160,
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
    paddingVertical: 8,
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

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
  },

  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  stopIdx: {
    width: 22,
    paddingTop: 2,
  },
  stopHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopName: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 16,
    color: wp.color.ink,
    flexShrink: 1,
  },

  kmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  kmUnderline: {
    height: 1.5,
    backgroundColor: wp.color.lineD,
    marginTop: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
});
