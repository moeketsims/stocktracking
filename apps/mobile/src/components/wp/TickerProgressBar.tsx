import React from 'react';
import { View, StyleSheet } from 'react-native';
import { wp } from '../../constants/warehousePaper';

interface Props {
  progress: number; // 0..1
}

const CELLS = 20;

/**
 * 20-cell ticker-style progress bar used on the Stock Take progress
 * voucher. Replaces smooth gradient progress with a "ticks counted" feel
 * — each filled cell represents 5% of the count complete.
 *
 * Per spec §"Screen 7 step 3":
 *   Progress bar: 8px tall, 1px solid lineD outer. Inside, 20 equal
 *   cells with 1px paper gaps. Filled cells are ink.
 */
export function TickerProgressBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * CELLS);

  return (
    <View style={styles.outer}>
      {Array.from({ length: CELLS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            i < filled ? styles.cellFilled : styles.cellEmpty,
            i < CELLS - 1 && styles.cellDivider,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    height: 8,
    borderWidth: 1,
    borderColor: wp.color.lineD,
  },
  cell: {
    flex: 1,
    height: '100%',
  },
  cellFilled: {
    backgroundColor: wp.color.ink,
  },
  cellEmpty: {
    backgroundColor: 'transparent',
  },
  cellDivider: {
    borderRightWidth: 1,
    borderRightColor: wp.color.paper,
  },
});
