import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '../utils/dates';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import type { Loan } from '../types';

interface LoanCardProps {
  loan: Loan;
  onPress: () => void;
}

export function LoanCard({ loan, onPress }: LoanCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card>
        <View style={styles.header}>
          <StatusBadge status={loan.status} type="loan" />
          <Text style={styles.time}>{timeAgo(loan.created_at)}</Text>
        </View>

        <View style={styles.route}>
          <View style={styles.routePoint}>
            <Ionicons name="arrow-forward" size={14} color={colors.info} />
            <Text style={styles.routeLabel}>From:</Text>
            <Text style={styles.routeText}>{loan.lender_location?.name ?? '—'}</Text>
          </View>
          <View style={styles.routePoint}>
            <Ionicons name="arrow-back" size={14} color={colors.primary[500]} />
            <Text style={styles.routeLabel}>To:</Text>
            <Text style={styles.routeText}>{loan.borrower_location?.name ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="cube" size={14} color={colors.gray[400]} />
            <Text style={styles.metaText}>
              {loan.quantity_approved ?? loan.quantity_requested} bags
            </Text>
          </View>
          {loan.estimated_return_date && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={14} color={colors.gray[400]} />
              <Text style={styles.metaText}>
                Return: {new Date(loan.estimated_return_date).toLocaleDateString()}
              </Text>
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
  route: { gap: spacing.xs, marginBottom: spacing.md },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  routeLabel: { fontSize: fontSize.xs, color: colors.gray[500], width: 36 },
  routeText: { fontSize: fontSize.sm, color: colors.gray[700], flex: 1 },
  meta: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: fontSize.xs, color: colors.gray[500] },
});
