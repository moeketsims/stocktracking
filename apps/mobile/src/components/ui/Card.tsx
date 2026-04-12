import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadow } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadow.md,
  },
  padded: {
    padding: spacing.lg,
  },
});
