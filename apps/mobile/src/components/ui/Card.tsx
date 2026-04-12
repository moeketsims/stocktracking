import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadow } from '../../constants/theme';

type CardVariant = 'default' | 'outlined' | 'tinted' | 'elevated';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  variant?: CardVariant;
  tintColor?: string; // custom tint background color
}

export function Card({ children, style, padded = true, variant = 'default', tintColor }: CardProps) {
  const variantStyle = getVariantStyle(variant, tintColor);

  return (
    <View style={[styles.card, variantStyle, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

function getVariantStyle(variant: CardVariant, tintColor?: string): ViewStyle {
  switch (variant) {
    case 'outlined':
      return {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[200],
        // Override shadow by resetting it
        shadowOpacity: 0,
        elevation: 0,
      };
    case 'tinted':
      return {
        backgroundColor: tintColor ?? colors.surface.brand,
        borderWidth: 1,
        borderColor: tintColor ? `${tintColor}80` : colors.primary[100],
        shadowOpacity: 0,
        elevation: 0,
      };
    case 'elevated':
      return {
        backgroundColor: colors.white,
        ...shadow.lg,
      };
    case 'default':
    default:
      return {};
  }
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
