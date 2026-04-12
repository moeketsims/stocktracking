import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { timeAgo } from '../utils/dates';
import type { Trip } from '../types';

/*
 * Trip row — compact, scannable, with deliberate hierarchy.
 *
 * Visual structure:
 *   Left accent line (status colour)
 *   Route: bold, primary scan target
 *   Trip# · Vehicle · Time: monospace metadata, lighter
 *
 * Status is expressed through the left accent, not repeated text.
 * Active trips get a stronger accent and slightly warmer row bg.
 */

const C = {
  t1:      '#111111',
  t2:      '#555555',
  t3:      '#999999',
  t4:      '#c4c4c4',
  surface: '#ffffff',
  warmRow: '#fefdfb',
  border:  '#f0eee9',
  planned:    '#946b0a',
  in_progress:'#1a7a3a',
  completed:  '#d4d4d4',
  cancelled:  '#e5a8a8',
};

const ACCENT: Record<string, string> = {
  planned: C.planned,
  in_progress: C.in_progress,
  completed: C.completed,
  cancelled: C.cancelled,
};

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  isLast?: boolean;
  showStatus?: boolean; // show text status label (useful in "All" view)
}

export function TripCard({ trip, onPress, isLast, showStatus }: TripCardProps) {
  const origin = trip.origin_description ?? trip.from_location?.name ?? '—';
  const dest = trip.destination_description ?? trip.to_location?.name ?? '—';
  const vehicle = trip.vehicles?.registration_number ?? '—';
  const accent = ACCENT[trip.status] ?? C.t4;
  const isActive = trip.status === 'planned' || trip.status === 'in_progress';
  const statusText = trip.status === 'in_progress' ? 'In transit' : trip.status === 'planned' ? 'Planned' : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.45}>
      <View style={[s.row, isActive && s.rowActive, !isLast && s.rowBorder]}>
        {/* Accent bar */}
        <View style={[s.accent, { backgroundColor: accent }]} />

        <View style={s.body}>
          {/* Route */}
          <View style={s.routeRow}>
            <Text style={[s.route, isActive && s.routeActive]} numberOfLines={1}>
              {origin}
            </Text>
            <Text style={s.arrow}>→</Text>
            <Text style={[s.route, isActive && s.routeActive]} numberOfLines={1}>
              {dest}
            </Text>
          </View>

          {/* Meta */}
          <Text style={s.meta} numberOfLines={1}>
            {trip.trip_number}  ·  {vehicle}  ·  {timeAgo(trip.created_at)}
            {showStatus && statusText ? `  ·  ${statusText}` : ''}
          </Text>
        </View>

        {/* Active indicator */}
        {isActive && statusText && !showStatus && (
          <View style={[s.statusChip, { borderColor: accent }]}>
            <Text style={[s.statusChipText, { color: accent }]}>{statusText}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    paddingRight: 14,
  },
  rowActive: { backgroundColor: C.warmRow },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },

  accent: { width: 3, alignSelf: 'stretch', borderTopRightRadius: 2, borderBottomRightRadius: 2 },

  body: { flex: 1, paddingVertical: 11, paddingLeft: 12, paddingRight: 8 },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  route: {
    fontSize: 13, fontWeight: '600', color: C.t1, letterSpacing: -0.1,
    flexShrink: 1,
  },
  routeActive: { color: '#0f0f0f' },
  arrow: { fontSize: 11, color: C.t4, fontWeight: '400' },

  meta: {
    fontSize: 11, fontWeight: '400', color: C.t3, marginTop: 3,
    fontFamily: mono, letterSpacing: -0.2,
  },

  statusChip: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  statusChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
});
