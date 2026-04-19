import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props {
  children: React.ReactNode;
  /** Label text color. Default ink. */
  color?: string;
  /** Background color of the cutout. Should match the parent screen color. Default paper. */
  bg?: string;
  /** Horizontal offset from the framed element's left edge. Default 14. */
  left?: number;
}

/**
 * The floating "FORECAST" / "URGENT TICKET" label that cuts through the top
 * border of a framed card. Position the parent with `position: relative` and
 * place this as its first child.
 */
export function FloatingFrameLabel({
  children,
  color = wp.color.ink3,
  bg = wp.color.paper,
  left = 14,
}: Props) {
  return (
    <View style={[styles.box, { left, backgroundColor: bg }]}>
      <MonoText size={10} weight={700} tracking={1.5} upper color={color}>
        {children}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: -7,
    paddingHorizontal: 8,
    zIndex: 1,
  },
});
