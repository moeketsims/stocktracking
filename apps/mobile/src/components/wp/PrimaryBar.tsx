import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { wp } from '../../constants/warehousePaper';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Sticky bottom action bar used on form screens (Place Order, Transfer).
 * Per spec §"Screen 5 step 6":
 *
 *   Fixed above tab bar, 10×20 padding, top border 1.5px lineD, bg paper.
 *   Full-width 54px ink-filled button, 2px solid lineD, hard shadow
 *   3×3 lineD, mono 13pt 700 letter-spaced 2px.
 */
export function PrimaryBar({ label, onPress, disabled, loading }: Props) {
  const isDisabled = disabled || loading;
  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.wrap}>
        {/* Offset shadow — 3×3 per spec */}
        <View
          pointerEvents="none"
          style={styles.shadow}
        />
        <TouchableOpacity
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={0.85}
          style={[styles.button, isDisabled && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={wp.color.paper} size="small" />
          ) : (
            <Text allowFontScaling={false} style={styles.label}>
              {label}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Rests above the 80px bottom tab bar (see _layout.tsx tabBarStyle).
    bottom: Platform.OS === 'ios' ? 80 : 64,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
    backgroundColor: wp.color.paper,
  },
  wrap: {
    position: 'relative',
    marginRight: 3,
    marginBottom: 3,
  },
  shadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: wp.color.lineD,
  },
  button: {
    height: 54,
    backgroundColor: wp.color.ink,
    borderWidth: 2,
    borderColor: wp.color.lineD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#C9C0A8',
  },
  label: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 13,
    letterSpacing: 2,
    color: wp.color.paper,
    textTransform: 'uppercase',
  },
});
