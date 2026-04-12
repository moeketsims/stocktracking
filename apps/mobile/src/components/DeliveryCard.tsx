import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '../utils/dates';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import type { PendingDelivery } from '../types';

interface DeliveryCardProps {
  delivery: PendingDelivery;
  onPress: () => void;
}

export function DeliveryCard({ delivery, onPress }: DeliveryCardProps) {
  const claimedBags = delivery.driver_claimed_bags ?? Math.round(delivery.driver_claimed_qty_kg / 10);
  const scannedBags = delivery.driver_scanned_bags;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card>
        <View style={styles.header}>
          <StatusBadge status={delivery.status} type="delivery" />
          <Text style={styles.time}>{timeAgo(delivery.created_at)}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <Ionicons name="location" size={16} color={colors.gray[400]} />
            <Text style={styles.locationName}>
              {delivery.location?.name ?? 'Unknown'}
            </Text>
          </View>

          {delivery.trip && (
            <View style={styles.row}>
              <Ionicons name="car" size={16} color={colors.gray[400]} />
              <Text style={styles.detail}>
                {delivery.trip.trip_number}
                {delivery.trip.driver_name ? ` — ${delivery.trip.driver_name}` : ''}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Ionicons name="cube" size={16} color={colors.gray[400]} />
            <Text style={styles.detail}>
              Claimed: {claimedBags} bags
              {scannedBags != null ? ` | Scanned: ${scannedBags}` : ''}
            </Text>
          </View>

          {delivery.confirmed_bags != null && (
            <View style={styles.row}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.detail}>Confirmed: {delivery.confirmed_bags} bags</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  time: { fontSize: fontSize.xs, color: colors.gray[400] },
  body: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  detail: { fontSize: fontSize.sm, color: colors.gray[600] },
});
