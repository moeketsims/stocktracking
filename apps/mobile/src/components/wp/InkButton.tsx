import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

type Variant = 'outline' | 'solid';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Optional leading icon node — keep small (12–14px). */
  leading?: React.ReactNode;
}

/**
 * Square ink-bordered button used for the Stock action strip and any
 * primary actions on warehouse-paper screens. Outline variant inverts
 * to solid ink on press.
 */
export function InkButton({
  label,
  onPress,
  variant = 'outline',
  loading,
  disabled,
  style,
  leading,
}: Props) {
  const isDisabled = disabled || loading;
  const isSolid = variant === 'solid';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.btn,
        {
          backgroundColor: isSolid ? wp.color.ink : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? wp.color.paper : wp.color.ink} size="small" />
      ) : (
        <View style={styles.row}>
          {leading}
          <MonoText
            size={11}
            tracking={1}
            weight={600}
            upper
            color={isSolid ? wp.color.paper : wp.color.ink}
          >
            {label}
          </MonoText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
