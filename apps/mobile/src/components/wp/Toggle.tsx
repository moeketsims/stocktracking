import React from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { wp } from '../../constants/warehousePaper';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/**
 * Paper-native switch. 44×22 outlined container, a 14×14 inverted block
 * slides from left:2 (off) to left:24 (on). No iOS green, no blur — all
 * ink. Spec: outer 1.5px lineD, inner ink fill when on, paper block slides
 * across; off state shows an ink block on paper.
 */
export function Toggle({ value, onChange, disabled }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.outer,
        value && styles.outerOn,
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.block,
          value ? styles.blockOn : styles.blockOff,
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 44,
    height: 22,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  outerOn: {
    backgroundColor: wp.color.ink,
  },
  disabled: {
    opacity: 0.4,
  },
  block: {
    position: 'absolute',
    top: 2,
    width: 14,
    height: 14,
  },
  blockOn: {
    left: 24,
    backgroundColor: wp.color.paper,
  },
  blockOff: {
    left: 2,
    backgroundColor: wp.color.ink,
  },
});
