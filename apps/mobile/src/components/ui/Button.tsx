import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary[500], text: colors.white },
  secondary: { bg: colors.gray[100], text: colors.gray[800] },
  outline: { bg: 'transparent', text: colors.primary[500], border: colors.primary[500] },
  ghost: { bg: 'transparent', text: colors.gray[600] },
  danger: { bg: colors.error, text: colors.white },
};

const sizeStyles: Record<ButtonSize, { paddingH: number; paddingV: number; text: number }> = {
  sm: { paddingH: spacing.md, paddingV: spacing.sm, text: fontSize.sm },
  md: { paddingH: spacing.lg, paddingV: spacing.md, text: fontSize.md },
  lg: { paddingH: spacing.xl, paddingV: spacing.lg, text: fontSize.lg },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: v.text, fontSize: s.text }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    minHeight: 44,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
});
