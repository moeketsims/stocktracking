import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
 * Horizontal filter tabs — equal flex, active gets a 3px solid ink underline
 * (margin-bottom -1.5 so it sits flush with the rule above).
 *
 * This is the ONE filter affordance in the app. Filters must not look like
 * buttons: a bordered uppercase rectangle is the costume the action buttons
 * wear, and a viewer cannot tell "narrows this list" from "mutates stock" when
 * both are drawn identically. An underline says "you are viewing this subset"
 * and carries no press-me weight.
 *
 * Labels are sentence-case 13pt sans, not 11pt tracked uppercase mono:
 * uppercase destroys word-shape cues and letter-tracking pulls words apart,
 * which is the worst case for glancing at a phone on a warehouse floor.
 * Counts stay mono so digits stay tabular and columns of numbers line up.
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
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.count != null ? `${t.label}, ${t.count}` : t.label}
            style={[styles.tab, on && styles.tabActive]}
          >
            <Text style={[styles.label, on && styles.labelActive]} numberOfLines={1}>
              {t.label}
              {t.count != null ? <Text style={styles.count}>{'  '}{t.count}</Text> : null}
            </Text>
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
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: wp.color.ink,
    marginBottom: -1.5,
  },
  label: {
    fontFamily: wp.font.sansMid.fontFamily,
    fontWeight: wp.font.sansMid.fontWeight,
    fontSize: wp.size.body,
    letterSpacing: 0.2,
    color: wp.color.ink3,
  },
  labelActive: {
    fontFamily: wp.font.sansBold.fontFamily,
    fontWeight: wp.font.sansBold.fontWeight,
    color: wp.color.ink,
  },
  count: {
    fontFamily: wp.font.mono.fontFamily,
    fontWeight: wp.font.mono.fontWeight,
  },
});
