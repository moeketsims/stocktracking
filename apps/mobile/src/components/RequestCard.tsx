import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { Badge } from './ui/Badge';
import { timeAgo } from '../utils/dates';
import { getUrgencyVariant } from '../utils/status';
import type { StockRequest } from '../types';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const STATUS_ACCENT: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  trip_created: '#3b82f6',
  in_delivery: '#8b5cf6',
  fulfilled: '#22c55e',
  delivered: '#22c55e',
  cancelled: '#94a3b8',
  expired: '#ef4444',
};

interface RequestCardProps {
  request: StockRequest;
  onPress: () => void;
  showActions?: boolean;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const accent = STATUS_ACCENT[request.status] ?? '#94a3b8';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      <View style={st.card}>
        <View style={[st.accent, { backgroundColor: accent }]} />
        <View style={st.inner}>
          <View style={st.top}>
            <View style={st.badges}>
              <StatusBadge status={request.status} type="request" />
              {request.urgency === 'urgent' && (
                <Badge label="Urgent" variant={getUrgencyVariant(request.urgency)} />
              )}
            </View>
            <Text style={st.time}>{timeAgo(request.created_at)}</Text>
          </View>

          <View style={st.main}>
            <View style={st.leftCol}>
              <Text style={st.location} numberOfLines={1}>{request.location?.name ?? 'Unknown'}</Text>
              {request.requester?.full_name && (
                <Text style={st.requester}>by {request.requester.full_name}</Text>
              )}
            </View>
            <View style={st.rightCol}>
              <Text style={st.qty}>{request.quantity_bags}</Text>
              <Text style={st.qtyUnit}>bags</Text>
            </View>
          </View>

          {(request.requested_delivery_time || (request.notes && request.notes.trim())) && (
            <View style={st.footer}>
              {request.requested_delivery_time && (
                <View style={st.metaRow}>
                  <Ionicons name="time-outline" size={12} color="#94a3b8" />
                  <Text style={st.metaText}>
                    {new Date(request.requested_delivery_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
              {request.notes && request.notes.trim().length > 0 && (
                <View style={st.metaRow}>
                  <Ionicons name="chatbubble-outline" size={11} color="#94a3b8" />
                  <Text style={st.noteText} numberOfLines={1}>{request.notes}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const elev = (n: number) => Platform.select({
  ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.03, shadowRadius: n * 4 },
  android: { elevation: n * 2 },
  default: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.03, shadowRadius: n * 4 },
}) as any;

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...elev(2),
  },
  accent: { width: 4 },
  inner: { flex: 1, padding: 16, gap: 10 },

  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: 6 },
  time: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  main: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  leftCol: { flex: 1 },
  location: { fontSize: 16, fontWeight: '700', color: '#0f172a', letterSpacing: -0.2 },
  requester: { fontSize: 12, color: '#64748b', marginTop: 2 },

  rightCol: { alignItems: 'flex-end' },
  qty: { fontSize: 28, fontWeight: '800', color: '#0f172a', fontFamily: mono, letterSpacing: -1.5 },
  qtyUnit: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#64748b' },
  noteText: { fontSize: 12, color: '#94a3b8', flex: 1 },
});
