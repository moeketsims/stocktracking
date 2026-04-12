import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrip, useTripStops, useStartTrip, useCompleteStop, useCompleteTrip } from '../../src/hooks/useTrips';
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
import type { TripStop } from '../../src/types';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: trip, isLoading: tripLoading } = useTrip(id);
  const { data: stopsData, isLoading: stopsLoading } = useTripStops(id);
  const startTrip = useStartTrip();
  const completeStop = useCompleteStop();
  const completeTrip = useCompleteTrip();
  const submitKm = useSubmitKm();

  if (tripLoading || !trip) {
    return <Loading fullScreen message="Loading trip..." />;
  }

  const stops = stopsData?.stops ?? [];
  const isPlanned = trip.status === 'planned';
  const isInProgress = trip.status === 'in_progress';
  const isCompleted = trip.status === 'completed';
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
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
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
      <Ionicons name={icon} size={16} color={colors.gray[400]} style={{ width: 24 }} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tripNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  route: { marginBottom: spacing.md, gap: spacing.xs },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeLine: { width: 1, height: 16, backgroundColor: colors.gray[300], marginLeft: 5 },
  routeText: { fontSize: fontSize.sm, color: colors.gray[700], flex: 1 },
  details: { gap: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  detailLabel: { width: 90, fontSize: fontSize.sm, color: colors.gray[500] },
  detailValue: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  stopRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  stopBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  stopIcon: { paddingTop: 2 },
  stopInfo: { flex: 1 },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  stopQty: { fontSize: fontSize.sm, color: colors.gray[600], marginTop: 2 },
  stopActual: { fontSize: fontSize.sm, color: colors.success, marginTop: 2 },
  actions: { gap: spacing.md },
});
