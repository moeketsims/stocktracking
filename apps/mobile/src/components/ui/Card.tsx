import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { wp } from '../../constants/warehousePaper';

type CardVariant = 'default' | 'outlined' | 'tinted' | 'elevated';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  variant?: CardVariant;
  tintColor?: string; // custom tint background color
}

/**
 * Warehouse-paper card.
 *
 * This used to be a rounded white Material card with a blurred drop shadow —
 * a second, competing design language living on the same screens as the
 * squared-off ink-ruled vouchers. On `app/request/[id].tsx` the two appear
 * inches apart, which is the loudest "assembled from two templates" tell in
 * the app. Props are unchanged so the call sites don't move; only the paint
 * differs: square corners, 1px ink rule, cream voucher ground.
 *
 * `variant` is retained for API compatibility but no longer forks the surface —
 * the point of merging the two systems is that there is ONE card. `tinted`
 * still honours a caller's colour, because callers use it to flag state.
 */
export function Card({ children, style, padded = true, variant = 'default', tintColor }: CardProps) {
  const tint =
    variant === 'tinted' && tintColor
      ? { borderColor: tintColor, backgroundColor: `${tintColor}0D` }
      : null;

  return (
    <View style={[styles.card, tint, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: wp.border.thin,
    borderColor: wp.color.lineD,
  },
  padded: {
    padding: wp.space.lg,
  },
});
