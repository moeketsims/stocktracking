import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './ui/Badge';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '../utils/dates';
import { getUrgencyVariant } from '../utils/status';
import { colors } from '../constants/theme';
import type { StockRequest } from '../types';

/* ── Design tokens (match dashboard) ── */
const BRAND  = '#1e1b4b';
const CARD_R = 16;

interface RequestCardProps {
  request: StockRequest;
  onPress: () => void;
  showActions?: boolean;
}

export function RequestCard({ request, onPress, showActions }: RequestCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={st.card}>
        {/* ── Header: badges + time ── */}
        <View style={st.header}>
          <View style={st.badges}>
            <StatusBadge status={request.status} type="request" />
            {request.urgency === 'urgent' && (
              <Badge label="Urgent" variant={getUrgencyVariant(request.urgency)} />
            )}
          </View>
          <Text style={st.time}>{timeAgo(request.created_at)}</Text>
        </View>

        {/* ── Body ── */}
        <View style={st.body}>
          {/* Location — primary info */}
          <View style={st.locationRow}>
            <View style={st.locationIcon}>
              <Ionicons name="location" size={14} color={BRAND} />
            </View>
            <Text style={st.locationName} numberOfLines={1}>
              {request.location?.name ?? 'Unknown location'}
            </Text>
          </View>

          {/* Quantity — prominent */}
          <View style={st.qtyRow}>
            <Text style={st.qtyValue}>{request.quantity_bags}</Text>
            <Text style={st.qtyUnit}>bags</Text>
          </View>

          {/* Metadata */}
          <View style={st.metaGroup}>
            {request.requester?.full_name && (
              <View style={st.metaRow}>
                <Ionicons name="person-outline" size={13} color={colors.gray[400]} />
                <Text style={st.metaText}>{request.requester.full_name}</Text>
              </View>
            )}
            {request.requested_delivery_time && (
              <View style={st.metaRow}>
                <Ionicons name="time-outline" size={13} color={colors.gray[400]} />
                <Text style={st.metaText}>
                  {new Date(request.requested_delivery_time).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Notes ── */}
        {request.notes && (
          <View style={st.notesWrap}>
            <Text style={st.notes} numberOfLines={2}>{request.notes}</Text>
          </View>
        )}
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
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  time: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.gray[400],
    letterSpacing: 0.1,
  },

  /* Body */
  body: {
    gap: 10,
  },

  /* Location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[900],
    letterSpacing: -0.1,
    flex: 1,
  },

  /* Quantity */
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginLeft: 34, // align with text after icon
  },
  qtyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: -0.8,
  },
  qtyUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[400],
    letterSpacing: 0.2,
  },

  /* Metadata */
  metaGroup: {
    gap: 4,
    marginLeft: 34,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray[500],
    letterSpacing: 0.1,
  },

  /* Notes */
  notesWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  notes: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray[400],
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
