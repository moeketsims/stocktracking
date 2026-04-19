import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { wp } from '../../constants/warehousePaper';

type StampColor = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'ink';

interface Props {
  /** Predefined color key — falls back to `colorHex` if provided. */
  color?: StampColor;
  /** Override colour with any hex (used by request pipeline statuses). */
  colorHex?: string;
  /** Override rotation in degrees (-4..+4 typical). Otherwise derived from rowIndex. */
  rotate?: number;
  rowIndex?: number;
  size?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

const PALETTE: Record<StampColor, string> = {
  red: wp.color.red,
  amber: wp.color.amber,
  green: wp.color.green,
  blue: '#1F3A8A',
  purple: '#5B2CA5',
  ink: wp.color.ink,
};

/**
 * Hand-stamped status pill. 1.5px outlined border, transparent fill,
 * uppercase mono text, slight per-row rotation for the printed-by-hand
 * feel. Used everywhere status is shown.
 */
export function Stamp({
  color = 'ink',
  colorHex,
  rotate,
  rowIndex,
  size = wp.size.stamp,
  children,
  style,
}: Props) {
  const c = colorHex ?? PALETTE[color];
  const deg = rotate != null ? rotate : rowIndex != null ? wp.rotation(rowIndex) : -2;

  return (
    <View
      style={[
        styles.box,
        {
          borderColor: c,
          transform: [{ rotate: `${deg}deg` }],
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          wp.font.monoBold,
          {
            fontSize: size,
            letterSpacing: 1.2,
            color: c,
            textTransform: 'uppercase',
            includeFontPadding: false,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    borderWidth: wp.border.stamp,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
});
