import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props {
  label: string;
  children: React.ReactNode;
  /** Suppress the dashed bottom rule (for the last field in a form). */
  noDivider?: boolean;
  style?: ViewStyle;
}

/**
 * Shared form field container — 14px vertical rhythm with a mono 11pt
 * letter-spaced uppercase label on top and a 1px dashed bottom rule.
 * All new warehouse-paper form screens compose from this.
 */
export function DFieldBox({ label, children, noDivider, style }: Props) {
  return (
    <View
      style={[
        styles.box,
        !noDivider && styles.divider,
        style,
      ]}
    >
      <MonoText size={11} weight={600} tracking={1} upper color={wp.color.ink}>
        {label}
      </MonoText>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  body: {
    marginTop: 8,
  },
});
