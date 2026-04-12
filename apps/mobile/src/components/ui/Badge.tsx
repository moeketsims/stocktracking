import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../../constants/theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef9c3', text: '#854d0e' },
  error: { bg: '#fee2e2', text: '#991b1b' },
  info: { bg: '#dbeafe', text: '#1e40af' },
  neutral: { bg: colors.gray[100], text: colors.gray[700] },
  primary: { bg: colors.primary[100], text: colors.primary[800] },
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const v = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
