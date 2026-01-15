import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBagUsage } from '../hooks/useBagUsage';
import { Card } from './ui';
import { colors, spacing, typography, borderRadius } from '../constants/theme';

interface UsageComparisonBadgeProps {
  percentage: number | null;
}

function UsageComparisonBadge({ percentage }: UsageComparisonBadgeProps) {
  if (percentage === null) {
    return (
      <View style={[styles.comparisonBadge, styles.comparisonNeutral]}>
        <Text style={styles.comparisonText}>--</Text>
        <Text style={styles.comparisonLabel}>vs Yesterday</Text>
      </View>
    );
  }

  const isUp = percentage > 0;
  const isDown = percentage < 0;
  const badgeStyle = isUp
    ? styles.comparisonUp
    : isDown
      ? styles.comparisonDown
      : styles.comparisonNeutral;

  return (
    <View style={[styles.comparisonBadge, badgeStyle]}>
      <View style={styles.comparisonHeader}>
        {isUp && <Ionicons name="trending-up" size={16} color={colors.success.main} />}
        {isDown && <Ionicons name="trending-down" size={16} color={colors.error.main} />}
        {!isUp && !isDown && <Ionicons name="remove" size={16} color={colors.text.tertiary} />}
        <Text
          style={[
            styles.comparisonText,
            isUp && styles.textUp,
            isDown && styles.textDown,
          ]}
        >
          {isUp ? '+' : ''}{percentage.toFixed(0)}%
        </Text>
      </View>
      <Text style={styles.comparisonLabel}>vs Yesterday</Text>
    </View>
  );
}

interface BagUsageCardProps {
  itemId?: string;
}

export function BagUsageCard({ itemId }: BagUsageCardProps) {
  const { stats, allStats, isLoading, isLoadingAll } = useBagUsage(itemId);

  // Use single item stats if itemId provided, otherwise use first item's stats
  const displayStats = itemId
    ? stats
    : allStats.length > 0
      ? allStats[0]
      : null;

  if (isLoading || isLoadingAll) {
    return (
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bag-handle" size={24} color={colors.primary[500]} />
          <Text style={styles.title}>Today's Bag Usage</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Card>
    );
  }

  if (!displayStats) {
    return (
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bag-handle" size={24} color={colors.primary[500]} />
          <Text style={styles.title}>Today's Bag Usage</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No usage data yet</Text>
          <Text style={styles.emptySubtext}>Tap the green button to log a bag</Text>
        </View>
      </Card>
    );
  }

  const lastLoggedTime = displayStats.last_logged_at
    ? new Date(displayStats.last_logged_at).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bag-handle" size={24} color={colors.primary[500]} />
        <Text style={styles.title}>Today's Bag Usage</Text>
        {displayStats.item_name && (
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>{displayStats.item_name}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        {/* Bags Used Today */}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{displayStats.bags_used_today}</Text>
          <Text style={styles.statLabel}>Used</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Bags Remaining */}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, displayStats.bags_remaining < 10 && styles.lowStock]}>
            {displayStats.bags_remaining}
          </Text>
          <Text style={styles.statLabel}>Left</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Usage vs Yesterday */}
        <UsageComparisonBadge percentage={displayStats.usage_vs_yesterday_pct} />
      </View>

      {/* Footer with additional info */}
      <View style={styles.footer}>
        {lastLoggedTime && (
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.footerText}>Last: {lastLoggedTime}</Text>
          </View>
        )}
        <View style={styles.footerItem}>
          <Ionicons name="cube-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.footerText}>
            {displayStats.kg_remaining.toFixed(0)} {displayStats.conversion_factor > 0 ? 'kg' : 'units'} total
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  itemBadge: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  itemBadgeText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  lowStock: {
    color: colors.warning.main,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.background.tertiary,
  },
  comparisonBadge: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  comparisonUp: {
    backgroundColor: colors.success.dark + '30',
  },
  comparisonDown: {
    backgroundColor: colors.error.dark + '30',
  },
  comparisonNeutral: {
    backgroundColor: colors.background.tertiary,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  comparisonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  textUp: {
    color: colors.success.main,
  },
  textDown: {
    color: colors.error.main,
  },
  comparisonLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
