import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { HardShadowFrame } from './HardShadowFrame';
import { wp } from '../../constants/warehousePaper';

interface Props {
  children: React.ReactNode;
}

/**
 * Quote-block explainer used at the top of form screens (Place Order,
 * Transfer, etc.). Per spec §"Shared Micro-Components":
 *
 *   Full-width card, 1px solid lineD, bg #F6F1E2, hard shadow 1×1 lineD,
 *   12px padding. A 3px wide solid ink vertical rule at left, then
 *   Fraunces italic 13pt 400 copy to its right.
 *
 * Body italic uses a system serif so we don't have to bundle another
 * Fraunces weight — visually close enough at 13pt and keeps the bundle
 * lean for Expo Go delivery.
 */
export function IntentStrip({ children }: Props) {
  return (
    <HardShadowFrame style={{ marginBottom: 16 }}>
      <View style={styles.box}>
        <View style={styles.rule} />
        <Text style={styles.copy}>{children}</Text>
      </View>
    </HardShadowFrame>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  rule: {
    width: 3,
    backgroundColor: wp.color.ink,
    alignSelf: 'stretch',
  },
  copy: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    color: wp.color.ink,
  },
});
