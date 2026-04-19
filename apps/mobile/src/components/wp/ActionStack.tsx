import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { wp } from '../../constants/warehousePaper';

export interface StackAction {
  label: string;
  onPress: () => void;
  /** Fill the button with `color` instead of outline. */
  filled?: boolean;
  /** Color for border (and fill if filled). Default `ink`. Use `wp.color.red` for destructive. */
  color?: string;
  /** Hide the hard 1×1 ink shadow. Default false (shadow visible). */
  noShadow?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

interface Props {
  actions: StackAction[];
}

/**
 * Vertical button stack — used on every entity detail page (request,
 * loan, driver, trip) for RESEND / EDIT / DEACTIVATE / DELETE patterns.
 * Each button: 1.5px solid border in its color, transparent fill by
 * default (or `filled` for primary), mono 12pt 700 1.8-tracked label,
 * hard 1×1 ink shadow unless `noShadow`.
 */
export function ActionStack({ actions }: Props) {
  return (
    <View style={styles.stack}>
      {actions.map((a, i) => (
        <StackButton key={`${a.label}-${i}`} {...a} />
      ))}
    </View>
  );
}

function StackButton({
  label,
  onPress,
  filled,
  color = wp.color.ink,
  noShadow,
  loading,
  disabled,
}: StackAction) {
  const isDisabled = disabled || loading;
  const content = loading ? (
    <ActivityIndicator color={filled ? wp.color.paper : color} size="small" />
  ) : (
    <Text
      allowFontScaling={false}
      style={[
        styles.label,
        { color: filled ? wp.color.paper : color },
      ]}
    >
      {label}
    </Text>
  );

  return (
    <View style={[!noShadow && styles.wrap]}>
      {!noShadow && (
        <View pointerEvents="none" style={styles.shadow} />
      )}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        disabled={isDisabled}
        style={[
          styles.btn,
          {
            borderColor: color,
            backgroundColor: filled ? color : 'transparent',
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
      >
        {content}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  wrap: {
    position: 'relative',
    marginRight: 1,
    marginBottom: 1,
  },
  shadow: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: -1,
    bottom: -1,
    backgroundColor: wp.color.lineD,
  },
  btn: {
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
});
