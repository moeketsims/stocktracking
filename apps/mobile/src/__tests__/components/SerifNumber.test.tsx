import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { SerifNumber } from '../../components/wp/SerifNumber';

describe('SerifNumber', () => {
  it('uses a line box tall enough for Fraunces figures', () => {
    const screen = render(
      <SerifNumber size={80} leading={1}>
        1060
      </SerifNumber>,
    );

    const style = StyleSheet.flatten(screen.getByText('1060').props.style);
    expect(style.lineHeight).toBe(100);
    expect(style.paddingLeft).toBe(2);
    expect(style.paddingRight).toBe(12);
  });

  it('does not allow a caller style to restore a clipping line height', () => {
    const screen = render(
      <SerifNumber size={48} leading={0.9} style={{ lineHeight: 40 }}>
        30
      </SerifNumber>,
    );

    const style = StyleSheet.flatten(screen.getByText('30').props.style);
    expect(style.lineHeight).toBe(60);
    expect(style.paddingRight).toBe(7);
  });
});
