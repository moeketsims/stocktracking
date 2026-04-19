import React from 'react';
import { type TextStyle } from 'react-native';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props {
  size?: number;
  tracking?: number;
  color?: string;
  weight?: 500 | 600 | 700;
  children?: React.ReactNode;
  style?: TextStyle | TextStyle[];
}

/**
 * The all-uppercase mono "kicker" used for section labels and metadata.
 * Defaults match the spec's section-header kicker.
 */
export function KickerLabel({
  size = wp.size.kicker,
  tracking = 1.5,
  color = wp.color.ink3,
  weight = 600,
  style,
  children,
}: Props) {
  return (
    <MonoText size={size} tracking={tracking} color={color} weight={weight} upper style={style}>
      {children}
    </MonoText>
  );
}
