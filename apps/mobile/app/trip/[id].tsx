import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrip, useTripStops, useStartTrip, useCancelTrip, useCompleteStop, useCompleteTrip } from '../../src/hooks/useTrips';
import { useAuthStore } from '../../src/stores/authStore';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { KmInput } from '../../src/components/KmInput';
import { formatDateTime } from '../../src/utils/dates';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import { useSubmitKm } from '../../src/hooks/useTrips';

/* ── Design tokens (matching dashboard) ── */
const BRAND    = '#1e1b4b';
const WARM_BG  = '#faf9f7';
const CARD_R   = 16;
import type { TripStop } from '../../src/types';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: trip, isLoading: tripLoading } = useTrip(id);
  const { data: stopsData, isLoading: stopsLoading } = useTripStops(id);
  const isManager = ['admin', 'zone_manager', 'location_manager', 'vehicle_manager'].includes(user?.role ?? '');
  const startTrip = useStartTrip();
  const cancelTrip = useCancelTrip();
  const completeStop = useCompleteStop();
  const completeTrip = useCompleteTrip();
  const submitKm = useSubmitKm();

  if (tripLoading || !trip) {
    return <Loading fullScreen message="Loading trip..." />;
  }

  const stops = stopsData?.stops ?? [];
  const isCancelled = trip.status === 'cancelled';
  const isPlanned = trip.status === 'planned';
  const isInProgress = trip.status === 'in_progress';
  const isCompleted = trip.status === 'completed';
  const canCancel = isManager && (isPlanned || isInProgress);
  const nextStop = stops.find((s) => !s.is_completed);
  const allStopsComplete = stops.length > 0 && stops.every((s) => s.is_completed);
  const needsKm = isCompleted && (trip as any).odometer_start != null && (trip as any).odometer_end == null;

  const handleStartTrip = () => {
    Alert.alert('Start Trip', 'Begin this trip now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => startTrip.mutate({ id: trip.id }) },
    ]);
  };

  const handleCompleteStop = (stop: TripStop) => {
    if (stop.stop_type === 'dropoff') {
      // Navigate to scanner for dropoff stops
      router.push(`/delivery/${stop.id}?tripId=${trip.id}&planned=${stop.planned_qty_kg ?? 0}&locationName=${encodeURIComponent(stop.location_name ?? 'Unknown')}`);
    } else {
      // Pickup — just mark complete
      Alert.alert('Complete Stop', `Mark pickup at ${stop.location_name ?? 'this location'} as complete?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => completeStop.mutate({ stopId: stop.id, data: {} }),
        },
      ]);
    }
  };

  const handleCancelTrip = () => {
    Alert.alert('Cancel Trip', `Are you sure you want to cancel trip ${trip.trip_number}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Trip',
        style: 'destructive',
        onPress: () =>
          cancelTrip.mutate(trip.id, {
            onSuccess: () => router.back(),
          }),
      },
    ]);
  };

  const handleCompleteTrip = () => {
    Alert.alert('Complete Trip', 'Mark this trip as complete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => completeTrip.mutate({ id: trip.id, data: {} }),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: trip.trip_number,
          headerStyle: { backgroundColor: BRAND },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Trip Info Card */}
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.tripNumber}>{trip.trip_number}</Text>
              <StatusBadge status={trip.status} type="trip" />
            </View>

            <View style={styles.route}>
              <View style={styles.routePoint}>
                <Ionicons name="ellipse" size={10} color={colors.primary[500]} />
                <Text style={styles.routeText}>
                  {trip.origin_description ?? trip.from_location?.name ?? '—'}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <Ionicons name="location" size={12} color={colors.error} />
                <Text style={styles.routeText}>
                  {trip.destination_description ?? trip.to_location?.name ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.details}>
              {trip.vehicles && (
                <DetailRow icon="car" label="Vehicle" value={`${trip.vehicles.registration_number}${trip.vehicles.make ? ` (${trip.vehicles.make})` : ''}`} />
              )}
              {trip.driver_name && (
                <DetailRow icon="person" label="Driver" value={trip.driver_name} />
              )}
              <DetailRow icon="time" label="Created" value={formatDateTime(trip.created_at)} />
              {trip.departure_time && (
                <DetailRow icon="play" label="Departed" value={formatDateTime(trip.departure_time)} />
              )}
              {trip.estimated_arrival_time && (
                <DetailRow icon="flag" label="ETA" value={formatDateTime(trip.estimated_arrival_time)} />
              )}
              {trip.completed_at && (
                <DetailRow icon="checkmark-circle" label="Completed" value={formatDateTime(trip.completed_at)} />
              )}
              {trip.distance_km != null && (
                <DetailRow icon="speedometer" label="Distance" value={`${trip.distance_km} km`} />
              )}
            </View>
          </Card>

          {/* Stops */}
          {stops.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>
                Stops ({stopsData?.completed_stops ?? 0}/{stopsData?.total_stops ?? 0})
              </Text>
              {stops.map((stop, idx) => (
                <View
                  key={stop.id}
                  style={[styles.stopRow, idx < stops.length - 1 && styles.stopBorder]}
                >
                  <View style={styles.stopIcon}>
                    {stop.is_completed ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    ) : stop === nextStop ? (
                      <Ionicons name="radio-button-on" size={24} color={colors.primary[500]} />
                    ) : (
                      <Ionicons name="radio-button-off" size={24} color={colors.gray[300]} />
                    )}
                  </View>
                  <View style={styles.stopInfo}>
                    <View style={styles.stopHeader}>
                      <Text style={styles.stopName}>
                        {stop.stop_order}. {stop.location_name ?? 'Unknown'}
                      </Text>
                      <Badge
                        label={stop.stop_type === 'pickup' ? 'Pickup' : 'Dropoff'}
                        variant={stop.stop_type === 'pickup' ? 'info' : 'primary'}
                      />
                    </View>
                    {stop.planned_qty_kg != null && (
                      <Text style={styles.stopQty}>
                        {(stop.planned_qty_kg / 10).toFixed(0)} bags ({stop.planned_qty_kg} kg)
                      </Text>
                    )}
                    {stop.actual_qty_kg != null && (
                      <Text style={styles.stopActual}>
                        Actual: {(stop.actual_qty_kg / 10).toFixed(0)} bags
                      </Text>
                    )}
                    {!stop.is_completed && isInProgress && stop === nextStop && (
                      <Button
                        title={stop.stop_type === 'dropoff' ? 'Scan & Complete' : 'Complete Stop'}
                        size="sm"
                        onPress={() => handleCompleteStop(stop)}
                        loading={completeStop.isPending}
                        style={{ marginTop: spacing.sm }}
                      />
                    )}
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Costs (if completed) */}
          {isCompleted && (trip.fuel_cost > 0 || trip.toll_cost > 0 || trip.other_cost > 0) && (
            <Card>
              <Text style={styles.sectionTitle}>Trip Costs</Text>
              {trip.fuel_cost > 0 && <DetailRow icon="flame" label="Fuel" value={`R${trip.fuel_cost.toFixed(2)}`} />}
              {trip.toll_cost > 0 && <DetailRow icon="card" label="Tolls" value={`R${trip.toll_cost.toFixed(2)}`} />}
              {trip.other_cost > 0 && <DetailRow icon="cash" label="Other" value={`R${trip.other_cost.toFixed(2)}`} />}
              <DetailRow icon="wallet" label="Total" value={`R${trip.total_cost.toFixed(2)}`} />
            </Card>
          )}

          {/* KM Submission */}
          {needsKm && (
            <KmInput
              label="Submit Closing KM"
              odometerStart={(trip as any).odometer_start}
              onSubmit={(km) => submitKm.mutate({ id: trip.id, closingKm: km })}
              loading={submitKm.isPending}
            />
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {isPlanned && (
              <Button
                title="Start Trip"
                onPress={handleStartTrip}
                loading={startTrip.isPending}
                size="lg"
              />
            )}
            {isInProgress && allStopsComplete && (
              <Button
                title="Complete Trip"
                onPress={handleCompleteTrip}
                loading={completeTrip.isPending}
                size="lg"
              />
            )}
            {canCancel && (
              <Button
                title="Cancel Trip"
                variant="danger"
                onPress={handleCancelTrip}
                loading={cancelTrip.isPending}
                size="lg"
              />
            )}
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND,
    letterSpacing: -0.3,
  },
  route: {
    marginBottom: 14, gap: 4,
    backgroundColor: '#f5f3ff',
    borderRadius: 10, padding: 12,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeLine: { width: 1, height: 14, backgroundColor: '#ddd6fe', marginLeft: 5 },
  routeText: { fontSize: 14, fontWeight: '500', color: colors.gray[700], flex: 1 },
  details: { gap: 8 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, minHeight: 34,
  },
  detailIconBox: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#f5f3ff',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  detailLabel: {
    width: 90, fontSize: 13, fontWeight: '400',
    color: colors.gray[400], letterSpacing: 0.1,
  },
  detailValue: {
    flex: 1, fontSize: 14, fontWeight: '500',
    color: colors.gray[900], letterSpacing: -0.1,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '600', color: colors.gray[800],
    letterSpacing: -0.1, marginBottom: 12,
  },
  stopRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  stopBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  stopIcon: { paddingTop: 2 },
  stopInfo: { flex: 1 },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopName: { fontSize: 15, fontWeight: '600', color: colors.gray[900], letterSpacing: -0.1 },
  stopQty: { fontSize: 13, fontWeight: '400', color: colors.gray[500], marginTop: 3 },
  stopActual: { fontSize: 13, fontWeight: '500', color: '#059669', marginTop: 3 },
  actions: { gap: 10 },
});
