import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { wp } from '../../constants/warehousePaper';

interface Props {
  children: React.ReactNode;
  /** Shadow offset in pixels. Default 1 (per spec for vouchers). */
  offset?: number;
  /** Shadow color. Default ink. */
  color?: string;
  style?: ViewStyle;
  /** Apply margin so the offset doesn't get clipped by parent. */
  reserveSpace?: boolean;
}

/**
 * Wraps a child in a hard 1px-offset shadow that renders identically on
 * iOS and Android. We do this with an absolutely-positioned dark sibling
 * rather than `shadowOpacity`/`elevation` because Android always blurs
 * elevation shadows and the spec calls for a sharp printed-on-paper edge.
 *
 * Children should set their own background and border so they sit above
 * the shadow rectangle.
 */
export function HardShadowFrame({
  children,
  offset = wp.shadow.paper.offsetX,
  color = wp.shadow.paper.color,
  style,
  reserveSpace = true,
}: Props) {
  return (
    <View
      style={[
        { position: 'relative' },
        reserveSpace && { marginRight: offset, marginBottom: offset },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          right: -offset,
          bottom: -offset,
          backgroundColor: color,
        }}
      />
      <View>{children}</View>
    </View>
  );
}
