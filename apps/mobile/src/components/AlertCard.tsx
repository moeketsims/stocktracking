import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { timeAgo } from '../utils/dates';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import type { AlertItem } from '../types';

interface AlertCardProps {
  alert: AlertItem;
  onAcknowledge?: () => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  low_stock: 'trending-down',
  reorder_now: 'cart',
  expiring_soon: 'time',
  expired: 'warning',
};

const SEVERITY_VARIANT: Record<string, 'error' | 'warning' | 'info'> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const icon = TYPE_ICONS[alert.type] ?? 'alert-circle';
  const severityColor =
    alert.severity === 'error' ? colors.error :
    alert.severity === 'warning' ? colors.warning :
    colors.info;

  return (
    <Card>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: severityColor + '20' }]}>
          <Ionicons name={icon} size={20} color={severityColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
          <Text style={styles.time}>{timeAgo(alert.created_at)}</Text>
        </View>
        <Badge
          label={alert.severity}
          variant={SEVERITY_VARIANT[alert.severity] ?? 'neutral'}
        />
      </View>

      <Text style={styles.message}>{alert.message}</Text>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="location" size={14} color={colors.gray[400]} />
          <Text style={styles.metaText}>{alert.location_name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="cube" size={14} color={colors.gray[400]} />
          <Text style={styles.metaText}>{alert.item_name}</Text>
        </View>
      </View>

      {onAcknowledge && (
        <TouchableOpacity style={styles.ackBtn} onPress={onAcknowledge}>
          <Ionicons name="checkmark" size={16} color={colors.primary[500]} />
          <Text style={styles.ackText}>Acknowledge</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    marginTop: spacing.sm,
  },
  ackText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary[500],
  },
});
