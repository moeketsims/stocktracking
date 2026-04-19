import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props<T extends string> {
  items: readonly T[];
  active: T;
  onChange: (value: T) => void;
}

/**
 * Period / filter chip row. Each chip is flex-1, outlined by default,
 * inverts to ink fill when active. Used on Reports for week/month/qtr/year,
 * and on Stock sub-screens for quick-amount presets.
 */
export function ChipStrip<T extends string>({ items, active, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const on = item === active;
        return (
          <TouchableOpacity
            key={item}
            activeOpacity={0.7}
            onPress={() => onChange(item)}
            style={[styles.chip, on && styles.chipActive]}
          >
            <MonoText
              size={10}
              weight={600}
              tracking={1.5}
              upper
              color={on ? wp.color.paper : wp.color.ink}
            >
              {item}
            </MonoText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 10,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: wp.color.ink,
  },
});
