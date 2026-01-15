import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../../components/ui/Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders with default variant', () => {
    const { getByText } = render(
      <Card>
        <Text>Default Card</Text>
      </Card>
    );
    expect(getByText('Default Card')).toBeTruthy();
  });

  it('renders with elevated variant', () => {
    const { getByText } = render(
      <Card variant="elevated">
        <Text>Elevated Card</Text>
      </Card>
    );
    expect(getByText('Elevated Card')).toBeTruthy();
  });

  it('renders with outlined variant', () => {
    const { getByText } = render(
      <Card variant="outlined">
        <Text>Outlined Card</Text>
      </Card>
    );
    expect(getByText('Outlined Card')).toBeTruthy();
  });

  it('applies custom style', () => {
    const { getByText } = render(
      <Card style={{ marginTop: 20 }}>
        <Text>Styled Card</Text>
      </Card>
    );
    expect(getByText('Styled Card')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <Card>
        <Text>First Child</Text>
        <Text>Second Child</Text>
      </Card>
    );
    expect(getByText('First Child')).toBeTruthy();
    expect(getByText('Second Child')).toBeTruthy();
  });
});
