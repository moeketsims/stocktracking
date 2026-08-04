import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { wp } from '../../constants/warehousePaper';

type Weight = 400 | 500 | 600 | 700;

interface Props extends TextProps {
  weight?: Weight;
  size?: number;
  color?: string;
  tracking?: number;
  upper?: boolean;
  style?: TextStyle | TextStyle[];
  children?: React.ReactNode;
}

const weightToStyle = (w: Weight): TextStyle['fontWeight'] => {
  switch (w) {
    case 400: return '400';
    case 500: return '500';
    case 600: return '600';
    case 700: return '700';
  }
};

export function MonoText({
  weight = 400,
  size = wp.size.body,
  color = wp.color.ink,
  tracking,
  upper,
  style,
  children,
  ...rest
}: Props) {
  return (
    <Text
      maxFontSizeMultiplier={wp.fontScale.text}
      {...rest}
      style={[
        {
          fontFamily: wp.font.mono.fontFamily,
          fontWeight: weightToStyle(weight),
          fontSize: size,
          color,
          letterSpacing: tracking,
          textTransform: upper ? 'uppercase' : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
