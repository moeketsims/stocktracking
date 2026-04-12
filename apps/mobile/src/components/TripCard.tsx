import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../utils/dates';
import type { Trip } from '../types';

/*
 * Compact trip row — designed for scan efficiency in long lists.
 *
 * Line 1: route (origin → destination) + status dot
 * Line 2: trip number · vehicle · time
 *
 * Total height ~56px. Fits 8-10 items per screen.
 */

const C = {
  t1: '#111111',
  t2: '#555555',
  t3: '#999999',
  border: '#e8e6e1',
  surface: '#ffffff',
  planned: '#946b0a',
  in_progress: '#1a7a3a',
  completed: '#555555',
  cancelled: '#b91c1c',
};

const STATUS_DOT: Record<string, string> = {
  planned: C.planned,
  in_progress: C.in_progress,
  completed: C.completed,
  cancelled: C.cancelled,
};

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Done',
  cancelled: 'Cancelled',
};

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  isLast?: boolean;
}

export function TripCard({ trip, onPress, isLast }: TripCardProps) {
  const origin = trip.origin_description ?? trip.from_location?.name ?? '—';
  const dest = trip.destination_description ?? trip.to_location?.name ?? '—';
  const vehicle = trip.vehicles?.registration_number ?? '—';
  const dotColor = STATUS_DOT[trip.status] ?? C.t3;
  const statusLabel = STATUS_LABEL[trip.status] ?? trip.status;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.5} style={[s.row, !isLast && s.rowBorder]}>
      {/* Status dot */}
      <View style={[s.dot, { backgroundColor: dotColor }]} />

      {/* Content */}
      <View style={s.content}>
        {/* Line 1: route */}
        <Text style={s.route} numberOfLines={1}>
          {origin} → {dest}
        </Text>
        {/* Line 2: meta */}
        <Text style={s.meta} numberOfLines={1}>
          {trip.trip_number}  ·  {vehicle}  ·  {timeAgo(trip.created_at)}
        </Text>
      </View>

      {/* Status label */}
      <Text style={[s.status, { color: dotColor }]}>{statusLabel}</Text>
    </TouchableOpacity>
  );
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: C.surface,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0eee9' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  content: { flex: 1 },
  route: { fontSize: 14, fontWeight: '600', color: C.t1, letterSpacing: -0.1 },
  meta: { fontSize: 11, fontWeight: '400', color: C.t3, marginTop: 2, fontFamily: mono },
  status: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
});
