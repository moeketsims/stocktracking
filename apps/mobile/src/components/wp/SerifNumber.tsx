import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { wp } from '../../constants/warehousePaper';

// Fraunces 900 Italic reports a 2,466-unit vertical extent on a 2,000-unit
// em square. A line box below this ratio clips the curved bottoms of its
// figures on iOS, especially when adjustsFontSizeToFit is enabled.
const MIN_SAFE_LEADING = 1.24;
const LEFT_GLYPH_INSET = 0.02;
// Fraunces 900 Italic's widest figure overhang is 248/2,000 em units.
const RIGHT_GLYPH_INSET = 0.14;

export function serifLineHeight(size: number, leading?: number): number {
  return Math.ceil(size * Math.max(leading ?? MIN_SAFE_LEADING, MIN_SAFE_LEADING));
}

export function serifGlyphInsets(size: number) {
  return {
    paddingLeft: Math.ceil(size * LEFT_GLYPH_INSET),
    paddingRight: Math.ceil(size * RIGHT_GLYPH_INSET),
  };
}

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
      maxFontSizeMultiplier={wp.fontScale.display}
      numberOfLines={autoShrink ? 1 : undefined}
      adjustsFontSizeToFit={autoShrink}
      minimumFontScale={minimumFontScale}
      style={[
        weight === 900 ? wp.font.serifBold : wp.font.serifMid,
        {
          fontSize: size,
          color,
          letterSpacing: tracking,
          fontStyle: 'italic',
        },
        style,
        // Keep this last so a compressed caller style cannot reintroduce
        // platform-specific glyph clipping. Insets live on Text itself;
        // padding on a parent does not protect an italic glyph overhang.
        {
          lineHeight: serifLineHeight(size, leading),
          ...serifGlyphInsets(size),
        },
      ]}
    >
      {children}
    </Text>
  );
}
