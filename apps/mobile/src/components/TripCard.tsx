import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '../utils/dates';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import type { Trip } from '../types';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const vehicle = trip.vehicles;
  const vehicleLabel = vehicle
    ? `${vehicle.registration_number}${vehicle.make ? ` (${vehicle.make})` : ''}`
    : 'No vehicle';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.tripNumber}>{trip.trip_number}</Text>
          <StatusBadge status={trip.status} type="trip" />
        </View>

        <View style={styles.route}>
          <View style={styles.routePoint}>
            <Ionicons name="ellipse" size={10} color={colors.primary[500]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {trip.origin_description ?? trip.from_location?.name ?? '—'}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <Ionicons name="location" size={12} color={colors.error} />
            <Text style={styles.routeText} numberOfLines={1}>
              {trip.destination_description ?? trip.to_location?.name ?? '—'}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="car" size={14} color={colors.gray[400]} />
            <Text style={styles.metaText}>{vehicleLabel}</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo(trip.created_at)}</Text>
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
  tripNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  route: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeLine: {
    width: 1,
    height: 12,
    backgroundColor: colors.gray[300],
    marginLeft: 5,
  },
  routeText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
});
