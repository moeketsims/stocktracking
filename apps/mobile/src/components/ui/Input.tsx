import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { wp } from '../../constants/warehousePaper';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

/**
 * Warehouse-paper text field.
 *
 * Was a rounded grey Material input with a blue focus ring — the only blue in
 * the app, on a screen otherwise built from ink rules on cream. Now: square
 * 1.5px ink border, cream ground, border thickening on focus, and red reserved
 * for genuine errors. The label is sentence-case sans, not tracked uppercase,
 * because a field label is something you read rather than a stamp.
 */
export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label} maxFontSizeMultiplier={wp.fontScale.text}>
          {label}
        </Text>
      )}
      <TextInput
        maxFontSizeMultiplier={wp.fontScale.text}
        style={[
          styles.input,
          focused && styles.focused,
          error && styles.errorBorder,
          style,
        ]}
        placeholderTextColor={wp.color.ink3}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Text style={styles.errorText} maxFontSizeMultiplier={wp.fontScale.text}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: wp.space.xs,
  },
  label: {
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: wp.size.body,
    letterSpacing: 0.2,
    color: wp.color.ink2,
  },
  input: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    paddingHorizontal: wp.space.md,
    paddingVertical: wp.space.md,
    fontFamily: wp.font.mono.fontFamily,
    fontWeight: wp.font.mono.fontWeight,
    fontSize: wp.size.bodyLg,
    color: wp.color.ink,
    backgroundColor: wp.color.voucherBg,
    minHeight: 44,
  },
  focused: {
    borderWidth: wp.border.thick,
  },
  errorBorder: {
    borderColor: wp.color.red,
  },
  errorText: {
    fontFamily: wp.font.sansMid.fontFamily,
    fontWeight: wp.font.sansMid.fontWeight,
    fontSize: wp.size.meta,
    color: wp.color.red,
  },
});
