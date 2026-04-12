import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '../utils/dates';
import { colors } from '../constants/theme';
import type { Trip } from '../types';

/* ── Design tokens (match dashboard) ── */
const BRAND  = '#1e1b4b';
const CARD_R = 16;

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
      <View style={st.card}>
        {/* ── Header: trip number + status ── */}
        <View style={st.header}>
          <Text style={st.tripNumber}>{trip.trip_number}</Text>
          <StatusBadge status={trip.status} type="trip" />
        </View>

        {/* ── Route ── */}
        <View style={st.route}>
          <View style={st.routePoint}>
            <View style={st.originDot} />
            <Text style={st.routeText} numberOfLines={1}>
              {trip.origin_description ?? trip.from_location?.name ?? '\u2014'}
            </Text>
          </View>
          <View style={st.routeConnector}>
            <View style={st.routeLine} />
          </View>
          <View style={st.routePoint}>
            <View style={st.destDot}>
              <Ionicons name="location" size={11} color="#dc2626" />
            </View>
            <Text style={st.routeText} numberOfLines={1}>
              {trip.destination_description ?? trip.to_location?.name ?? '\u2014'}
            </Text>
          </View>
        </View>

        {/* ── Meta footer ── */}
        <View style={st.meta}>
          <View style={st.metaItem}>
            <View style={st.vehicleIcon}>
              <Ionicons name="car-outline" size={12} color={BRAND} />
            </View>
            <Text style={st.metaText}>{vehicleLabel}</Text>
          </View>
          <Text style={st.timeText}>{timeAgo(trip.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const st = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_R,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
    }),
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND,
    letterSpacing: 0.4,
  },

  /* Route */
  route: {
    marginBottom: 14,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ede9fe',
    borderWidth: 2.5,
    borderColor: BRAND,
  },
  routeConnector: {
    marginLeft: 4,
    paddingVertical: 2,
  },
  routeLine: {
    width: 1.5,
    height: 14,
    backgroundColor: colors.gray[200],
    borderRadius: 1,
  },
  destDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -3,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray[700],
    flex: 1,
    letterSpacing: -0.1,
  },

  /* Meta */
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[600],
    letterSpacing: 0.1,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.gray[400],
    letterSpacing: 0.1,
  },
});
