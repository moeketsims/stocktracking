import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

export interface TabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
}

/**
 * Horizontal tab strip — equal flex, mono 11pt labels, active gets a
 * 3px solid ink underline (margin-bottom -1.5 so it sits flush with the
 * masthead rule above). Inline counts sit next to labels in ink3.
 */
export function TabStrip<T extends string>({ items, active, onChange }: Props<T>) {
  return (
    <View style={styles.strip}>
      {items.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.7}
            onPress={() => onChange(t.key)}
            style={[styles.tab, on && styles.tabActive]}
          >
            <MonoText
              size={11}
              weight={on ? 700 : 500}
              tracking={1.5}
              upper
              color={on ? wp.color.ink : wp.color.ink3}
            >
              {t.label}
              {t.count != null ? (
                <MonoText size={11} weight={500} color={wp.color.ink3}>
                  {'  '}
                  {t.count}
                </MonoText>
              ) : null}
            </MonoText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: wp.color.ink,
    marginBottom: -1.5,
  },
});
