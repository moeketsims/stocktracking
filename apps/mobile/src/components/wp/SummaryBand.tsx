import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MonoText } from './MonoText';
import { KickerLabel } from './KickerLabel';
import { wp } from '../../constants/warehousePaper';

export interface SummaryItem {
  label: string;
  /** Number or short string (typically a count). Displayed mono 22pt 700. */
  value: number | string;
  /** Optional color override for the number (e.g. red for critical). */
  color?: string;
}

interface Props {
  items: SummaryItem[];
}

/**
 * N-cell horizontal stats band used on Trips, Loans, Reports, and Stock
 * Count. Hairline vertical dividers between cells, 1.5px ink rule below.
 */
export function SummaryBand({ items }: Props) {
  return (
    <View style={styles.band}>
      {items.map((it, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            i < items.length - 1 && styles.cellDivider,
          ]}
        >
          <MonoText
            size={22}
            weight={700}
            tracking={-0.5}
            color={it.color ?? wp.color.ink}
          >
            {String(it.value)}
          </MonoText>
          <KickerLabel size={10} tracking={1.1} color={wp.color.ink2} style={{ marginTop: 2 }}>
            {it.label}
          </KickerLabel>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  cell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cellDivider: {
    borderRightWidth: 1,
    borderRightColor: wp.color.line,
  },
});
