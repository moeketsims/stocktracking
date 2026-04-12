import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '../utils/dates';
import { getUrgencyVariant } from '../utils/status';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import type { StockRequest } from '../types';

interface RequestCardProps {
  request: StockRequest;
  onPress: () => void;
  showActions?: boolean;
}

export function RequestCard({ request, onPress, showActions }: RequestCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card>
        <View style={styles.header}>
          <View style={styles.badges}>
            <StatusBadge status={request.status} type="request" />
            {request.urgency === 'urgent' && (
              <Badge label="Urgent" variant={getUrgencyVariant(request.urgency)} />
            )}
          </View>
          <Text style={styles.time}>{timeAgo(request.created_at)}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <Ionicons name="location" size={16} color={colors.gray[400]} />
            <Text style={styles.locationName}>
              {request.location?.name ?? 'Unknown location'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="cube" size={16} color={colors.gray[400]} />
            <Text style={styles.qty}>{request.quantity_bags} bags</Text>
          </View>

          {request.requester?.full_name && (
            <View style={styles.row}>
              <Ionicons name="person" size={16} color={colors.gray[400]} />
              <Text style={styles.detail}>{request.requester.full_name}</Text>
            </View>
          )}

          {request.requested_delivery_time && (
            <View style={styles.row}>
              <Ionicons name="time" size={16} color={colors.gray[400]} />
              <Text style={styles.detail}>
                Requested: {new Date(request.requested_delivery_time).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {request.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {request.notes}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  body: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  qty: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  notes: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
});
