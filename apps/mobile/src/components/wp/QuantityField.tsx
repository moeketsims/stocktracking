import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableWithoutFeedback,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { SerifNumber } from './SerifNumber';
import { wp } from '../../constants/warehousePaper';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  /** Max digit length (default 6). */
  maxLength?: number;
  /** Display size for the SerifNumber. Default 56. */
  size?: number;
  /** Placeholder character when empty. Default `—`. */
  placeholder?: string;
  /** Optional prefix prepended to the displayed number (e.g. `+`, `−`). */
  prefix?: string;
  /** Override SerifNumber color (when value > 0). Defaults to ink. */
  color?: string;
  /** Right-aligned ancillary content (e.g. chips, "of 100 available" text). */
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Big italic Fraunces number that doubles as a typeable input.
 *
 * Tapping anywhere on the row focuses an invisible TextInput so the user
 * can type any number on the keypad — chips above/beside this remain
 * shortcuts for common values, but the keyboard is always one tap away.
 *
 * Replaces the prior pattern (display-only SerifNumber + truly hidden
 * TextInput) which left users unable to enter values outside the chip
 * presets.
 */
export function QuantityField({
  value,
  onChangeText,
  maxLength = 6,
  size = 56,
  placeholder = '—',
  prefix,
  color,
  trailing,
  style,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const focus = () => inputRef.current?.focus();
  const numeric = Number(value);
  const display = numeric > 0 ? `${prefix ?? ''}${numeric}` : placeholder;

  return (
    <TouchableWithoutFeedback onPress={focus} accessibilityRole="button">
      <View style={[styles.row, style]}>
        <View style={styles.numWrap}>
          <SerifNumber
            size={size}
            tracking={-2}
            leading={1}
            color={numeric > 0 ? color ?? wp.color.ink : wp.color.ink3}
            autoShrink
            style={{ flexShrink: 1 }}
          >
            {display}
          </SerifNumber>
          {/* Caret — only visible when focused; for simplicity we keep
              the input invisible and let the SerifNumber represent state. */}
          <TextInput
            maxFontSizeMultiplier={wp.fontScale.text}
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            keyboardType="number-pad"
            maxLength={maxLength}
            style={styles.hiddenInput}
            caretHidden
          />
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  numWrap: {
    flexShrink: 1,
    flexGrow: 1,
  },
  trailing: {
    marginLeft: 12,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
