import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  type TextInputProps,
} from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Optional right-side mono annotation (e.g. `AUTO-ASSIGN`). */
  right?: string;
  /** Use mono font for the value (default) or serif-italic. */
  mono?: boolean;
}

/**
 * Dashed-rule text input used on all warehouse-paper forms. Mono uppercase
 * label on top, empty shows Fraunces italic 16pt ink3 placeholder, filled
 * shows mono 15pt 600 ink. The bottom rule is 1.5px solid ink (the
 * underline), and the whole row has a 1px dashed bottom separating from
 * the next field.
 */
export function MonoInput({
  label,
  right,
  value,
  placeholder,
  mono = true,
  ...rest
}: Props) {
  const empty = !value;
  return (
    <View style={styles.box}>
      <View style={styles.labelRow}>
        <MonoText size={11} weight={600} tracking={1} upper color={wp.color.ink}>
          {label}
        </MonoText>
        {right ? (
          <MonoText size={10} weight={700} tracking={1.2} upper color={wp.color.ink3}>
            {right}
          </MonoText>
        ) : null}
      </View>
      <View style={styles.underline}>
        <TextInput
          {...rest}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="transparent" // we draw placeholder ourselves in italic serif
          style={[
            styles.input,
            mono ? styles.inputMono : styles.inputSans,
          ]}
        />
        {empty && placeholder ? (
          <Text allowFontScaling={false} style={styles.placeholder} pointerEvents="none">
            {placeholder}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  underline: {
    marginTop: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    paddingBottom: 6,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    padding: 0,
    minHeight: 22,
  },
  inputMono: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 15,
    letterSpacing: 0.5,
    color: wp.color.ink,
  },
  inputSans: {
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 15,
    color: wp.color.ink,
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontStyle: 'italic',
    fontSize: 16,
    color: wp.color.ink3,
  },
});
