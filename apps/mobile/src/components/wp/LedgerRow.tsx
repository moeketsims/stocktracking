import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props {
  /** 2-digit zero-padded index (01, 02, …). Omit to hide the index column. */
  idx?: number;
  primary: string;
  secondary?: string;
  /** Inline status text on the right, colored to status palette. */
  status?: string;
  statusColor?: string;
  /** Inline React node between the body and status (e.g. a Stamp or WTickerBar). */
  trailing?: React.ReactNode;
  /** Show the `›` chevron. Default true. */
  chev?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Ledger table row — the canonical primitive used in the Back Office menu,
 * management lists, Reports hub, and Settings. Inset dashed divider via
 * marginHorizontal so the rule never touches the screen edges.
 */
export function LedgerRow({
  idx,
  primary,
  secondary,
  status,
  statusColor = wp.color.ink3,
  trailing,
  chev = true,
  onPress,
  style,
}: Props) {
  const body = (
    <View style={[styles.row, style]}>
      {idx != null && (
        <MonoText size={10} color={wp.color.ink3} style={styles.idx}>
          {String(idx).padStart(2, '0')}
        </MonoText>
      )}
      <View style={styles.body}>
        <Text allowFontScaling={false} style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
        {secondary ? (
          <MonoText
            size={10}
            tracking={1}
            upper
            color={wp.color.ink3}
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {secondary}
          </MonoText>
        ) : null}
      </View>
      {trailing}
      {status ? (
        <MonoText size={10} tracking={1} upper color={statusColor}>
          {status}
        </MonoText>
      ) : null}
      {chev ? (
        <Text allowFontScaling={false} style={styles.chev}>›</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: wp.space.screenH,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  idx: {
    width: 22,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  primary: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 17,
    color: wp.color.ink,
  },
  chev: {
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 14,
    color: wp.color.ink3,
    includeFontPadding: false,
  },
});
