import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { wp } from '../../constants/warehousePaper';

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

/**
 * Warehouse-paper button, keeping the legacy `Button` API.
 *
 * The old palette was Material: rounded corners and `colors.primary[500]`
 * orange — a hue that exists nowhere else in the warehouse-paper system, and
 * which on the request screen put an orange pill directly beside a squared ink
 * voucher. Now every variant is drawn from the same ink/red/cream tokens as
 * `InkButton`, so the two read as one family:
 *
 *   primary   solid ink   — the one action being urged
 *   secondary outlined    — an alternative
 *   outline   outlined    — same; kept distinct only for API compatibility
 *   ghost     borderless  — Cancel / dismiss, deliberately quiet
 *   danger    solid red   — destructive, and the only coloured fill
 */
const variantStyles: Record<
  ButtonVariant,
  { bg: string; text: string; border?: string }
> = {
  primary: { bg: wp.color.ink, text: wp.color.paper },
  secondary: { bg: 'transparent', text: wp.color.ink, border: wp.color.lineD },
  outline: { bg: 'transparent', text: wp.color.ink, border: wp.color.lineD },
  ghost: { bg: 'transparent', text: wp.color.ink2 },
  danger: { bg: wp.color.red, text: wp.color.paper },
};

const sizeStyles: Record<ButtonSize, { paddingH: number; paddingV: number; text: number }> = {
  sm: { paddingH: wp.space.md, paddingV: wp.space.sm, text: wp.size.body },
  md: { paddingH: wp.space.lg, paddingV: wp.space.md, text: wp.size.bodyLg },
  lg: { paddingH: wp.space.xl, paddingV: wp.space.lg, text: wp.size.rowTitle },
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
      accessibilityRole="button"
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? wp.border.mid : 0,
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
          <Text
            maxFontSizeMultiplier={wp.fontScale.compact}
            style={[styles.text, { color: v.text, fontSize: s.text }, textStyle]}
            numberOfLines={1}
          >
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
    gap: wp.space.sm,
    minHeight: 44,
  },
  text: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    letterSpacing: 0.3,
  },
});
