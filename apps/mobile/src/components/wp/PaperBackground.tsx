import React, { useMemo } from 'react';
import { Dimensions, View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { wp } from '../../constants/warehousePaper';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

const HAIRLINE_STEP = 24;
const HAIRLINE_OPACITY = 0.04;
const TEXTURE_BUFFER = 200; // extra rows beyond screen so rotation/insets never reveal a seam

/**
 * Screen-root background for warehouse-paper screens.
 *
 * Three layers, bottom → top:
 *   1. Solid paper color.
 *   2. Ruled hairlines every 24px (opacity 0.04).
 *   3. Warm cream radial vignette fading from the top — mimics a sheet of
 *      paper catching light at the top edge.
 *
 * Texture is fixed behind scrolling content so the paper doesn't drift
 * when the user scrolls — matches the behavior of the CSS
 * `repeating-linear-gradient` in the design spec.
 */
export function PaperBackground({ children, style }: Props) {
  const { height } = Dimensions.get('window');
  const hairlines = useMemo(() => {
    const rows: number[] = [];
    const max = height + TEXTURE_BUFFER;
    for (let y = HAIRLINE_STEP; y < max; y += HAIRLINE_STEP) rows.push(y);
    return rows;
  }, [height]);

  return (
    <View style={[styles.root, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {hairlines.map((y) => (
          <View key={y} style={[styles.hairline, { top: y }]} />
        ))}
      </View>
      <LinearGradient
        colors={['rgba(255,248,220,0.35)', 'rgba(255,248,220,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: wp.color.paper,
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `rgba(0,0,0,${HAIRLINE_OPACITY})`,
  },
});
