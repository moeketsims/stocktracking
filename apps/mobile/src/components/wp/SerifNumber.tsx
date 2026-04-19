import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { wp } from '../../constants/warehousePaper';

interface Props extends TextProps {
  size: number;
  color?: string;
  tracking?: number;
  /** lineHeight as a *multiplier* of size (e.g. 0.88). */
  leading?: number;
  weight?: 700 | 900;
  style?: TextStyle | TextStyle[];
  children?: React.ReactNode;
  /**
   * Enable single-line auto-shrink. Use for numeric values that must not
   * wrap (e.g. dashboard hero, staff hero). Titles should leave this off
   * so they wrap naturally like the mock.
   */
  autoShrink?: boolean;
  /** Minimum scale when autoShrink is on. Default 0.55. */
  minimumFontScale?: number;
}

export function SerifNumber({
  size,
  color = wp.color.ink,
  tracking,
  leading,
  weight = 900,
  style,
  children,
  autoShrink = false,
  minimumFontScale = 0.55,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      allowFontScaling={false}
      numberOfLines={autoShrink ? 1 : undefined}
      adjustsFontSizeToFit={autoShrink}
      minimumFontScale={minimumFontScale}
      style={[
        weight === 900 ? wp.font.serifBold : wp.font.serifMid,
        {
          fontSize: size,
          color,
          letterSpacing: tracking,
          lineHeight: leading != null ? size * leading : undefined,
          fontStyle: 'italic',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
