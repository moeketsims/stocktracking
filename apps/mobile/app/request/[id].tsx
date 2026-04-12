import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useRequest, useAcceptRequest, useCreateTripFromRequest } from '../../src/hooks/useRequests';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { useAuthStore } from '../../src/stores/authStore';
import { formatDateTime, timeAgo } from '../../src/utils/dates';
import { getUrgencyVariant } from '../../src/utils/status';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: request, isLoading } = useRequest(id);
  const acceptMutation = useAcceptRequest();
  const createTripMutation = useCreateTripFromRequest();

  if (isLoading || !request) {
    return <Loading fullScreen message="Loading request..." />;
  }

  const isDriver = user?.role === 'driver';
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isMyRequest = request.accepted_by === user?.id;
  const canAccept = isPending && isDriver;
  const canCreateTrip = (isAccepted && isMyRequest) || (isPending && isDriver);

  const handleAccept = () => {
    Alert.alert(
      'Accept Request',
      `Accept delivery of ${request.quantity_bags} bags to ${request.location?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () =>
            acceptMutation.mutate(request.id, {
              onSuccess: () => router.back(),
            }),
        },
      ],
    );
  };

  const handleCreateTrip = () => {
    // Navigate to trip creation — for now, quick-create with alert
    Alert.alert(
      'Create Trip',
      'This will create a trip for this delivery. In a future update, you\'ll be able to select a vehicle and supplier.',
      [{ text: 'OK' }],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Request Detail',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <View style={styles.headerRow}>
              <StatusBadge status={request.status} type="request" />
              {request.urgency === 'urgent' && (
                <Badge label="Urgent" variant={getUrgencyVariant(request.urgency)} />
              )}
            </View>

            <View style={styles.section}>
              <DetailRow icon="location" label="Delivery To" value={request.location?.name ?? '—'} />
              <DetailRow icon="cube" label="Quantity" value={`${request.quantity_bags} bags`} />
              <DetailRow icon="person" label="Requested By" value={request.requester?.full_name ?? '—'} />
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

          {request.acceptor && (
            <Card>
              <Text style={styles.sectionTitle}>Accepted By</Text>
              <DetailRow icon="person" label="Name" value={request.acceptor.full_name ?? '—'} />
              {request.accepted_at && (
                <DetailRow icon="time" label="Accepted" value={formatDateTime(request.accepted_at)} />
              )}
            </Card>
          )}

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

          <View style={styles.actions}>
            {canAccept && (
              <Button
                title="Accept Request"
                onPress={handleAccept}
                loading={acceptMutation.isPending}
                size="lg"
              />
            )}
            {isAccepted && isMyRequest && !request.trip_id && (
              <Button
                title="Create Trip"
                onPress={handleCreateTrip}
                variant="secondary"
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
      <Ionicons name={icon} size={16} color={colors.gray[400]} style={styles.detailIcon} />
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailIcon: { width: 24 },
  detailLabel: {
    width: 110,
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  notesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
  },
  notesLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  actions: {
    gap: spacing.md,
  },
});
