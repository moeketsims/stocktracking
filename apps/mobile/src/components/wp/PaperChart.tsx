import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

export interface ChartSeriesItem {
  /** Short label shown under the bar (e.g. `MON`, `W1`). */
  label: string;
  /** Bar value. */
  value: number;
  /** Optional color override (e.g. amber for peak). Defaults to ink. */
  color?: string;
}

interface Props {
  series: ChartSeriesItem[];
  /** Max value for scaling. If omitted, uses the largest series value. */
  max?: number;
  /** Chart area height. Default 140. */
  height?: number;
}

/**
 * Paper-native bar chart. Each bar is a 1px ink-bordered rectangle inside
 * a 1.5px ink-bordered card. Value labels sit above each bar in mono;
 * category labels sit below. Used across all Reports screens.
 *
 * Per spec: do NOT introduce a charting library. If a use case can't be
 * expressed here, extend this primitive.
 */
export function PaperChart({ series, max, height = 140 }: Props) {
  const computedMax = max ?? Math.max(...series.map((s) => s.value), 1);
  const barAreaHeight = height - 40; // reserve ~20 for value, ~20 for label

  return (
    <View style={styles.card}>
      <View style={[styles.plot, { height }]}>
        {series.map((item, i) => {
          const h = Math.max(2, (item.value / computedMax) * barAreaHeight);
          const color = item.color ?? wp.color.ink;
          return (
            <View key={`${item.label}-${i}`} style={styles.col}>
              <MonoText
                size={10}
                weight={700}
                color={color}
                style={{ marginBottom: 4, minHeight: 14 }}
              >
                {item.value >= 1000
                  ? `${(item.value / 1000).toFixed(1)}k`
                  : String(item.value)}
              </MonoText>
              <View style={{ height: barAreaHeight, justifyContent: 'flex-end' }}>
                <View
                  style={{
                    height: h,
                    borderWidth: 1,
                    borderColor: wp.color.lineD,
                    backgroundColor: color,
                  }}
                />
              </View>
              <MonoText
                size={9}
                tracking={1}
                upper
                color={wp.color.ink3}
                style={{ marginTop: 6 }}
              >
                {item.label}
              </MonoText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    padding: 12,
    backgroundColor: 'transparent',
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
});
