import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { wp } from '../constants/warehousePaper';
import { PIN_LENGTH } from '../utils/pin';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Triggers a horizontal shake of the dot row when toggled true→false. */
  shake?: boolean;
  /** Disable input while a verification is in flight. */
  disabled?: boolean;
}

const KEYS: (string | null)[] = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  null, '0', '⌫',
];

export function PinKeypad({ value, onChange, shake, disabled }: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shake, shakeAnim]);

  const press = (k: string) => {
    if (disabled) return;
    Haptics.selectionAsync();
    if (k === '⌫') {
      if (value.length > 0) onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= PIN_LENGTH) return;
    onChange(value + k);
  };

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.dotRow,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < value.length && styles.dotFilled]}
          />
        ))}
      </Animated.View>

      <View style={styles.pad}>
        {KEYS.map((k, i) => {
          if (k === null) {
            return <View key={`spacer-${i}`} style={styles.keyEmpty} />;
          }
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={0.6}
              onPress={() => press(k)}
              disabled={disabled}
              style={[styles.key, disabled && styles.keyDisabled]}
            >
              <Text allowFontScaling={false} style={styles.keyLabel}>
                {k}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const KEY_W = 72;
const KEY_H = 64;
const KEY_GAP = 12;

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 32,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 18,
    paddingVertical: 6,
  },
  dot: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: wp.color.ink,
  },

  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: KEY_W * 3 + KEY_GAP * 2,
    gap: KEY_GAP,
  },
  key: {
    width: KEY_W,
    height: KEY_H,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wp.color.voucherBg,
  },
  keyEmpty: {
    width: KEY_W,
    height: KEY_H,
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 24,
    color: wp.color.ink,
    includeFontPadding: false,
  },
});
