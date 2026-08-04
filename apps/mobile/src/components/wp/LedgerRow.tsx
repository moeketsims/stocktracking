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
        <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
        {/* The secondary line carries DATA — a driver's location, a vehicle's
            make, a user's role. It was 10pt uppercase tracked mono, which
            stacks three legibility penalties on the same string: below the
            12pt floor, no word-shape cues, and letters pushed apart. Sentence
            case at the `meta` size reads at a glance; hierarchy against
            `primary` still comes from size and colour. */}
        {secondary ? (
          <MonoText
            size={wp.size.meta}
            tracking={0.2}
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
        <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.chev}>›</Text>
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
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
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
