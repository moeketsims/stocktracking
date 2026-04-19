import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props {
  /** Label burned into the tape. Default "RESTOCKED". */
  label?: string;
  /** Rotation in degrees. Default 14. */
  rotate?: number;
  style?: ViewStyle;
}

/**
 * A masking-tape rectangle accent — used on the staff stock hero to mark
 * recent restocks. Conditionally rendered by the caller (e.g. only show
 * when restocked in last 72h).
 */
export function TapeAccent({ label = 'RESTOCKED', rotate = 14, style }: Props) {
  return (
    <View style={[styles.tape, { transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <MonoText size={9} weight={700} tracking={1} color={wp.color.ink}>
        {label}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  tape: {
    width: 96,
    height: 26,
    backgroundColor: wp.color.tape,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft shadow is OK here — it's the masking-tape sticker affordance.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
});
