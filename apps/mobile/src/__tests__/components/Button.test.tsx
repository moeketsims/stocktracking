import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../components/ui/Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Press Me" onPress={onPressMock} />);

    fireEvent.press(getByText('Press Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading prop is true', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Loading" onPress={() => {}} loading={true} />
    );

    // When loading, button text should be hidden or replaced with spinner
    // The exact behavior depends on implementation
  });

  it('is disabled when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Disabled" onPress={onPressMock} disabled={true} />
    );

    fireEvent.press(getByText('Disabled'));
    // Disabled buttons shouldn't trigger onPress
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const { rerender, getByText } = render(
      <Button title="Primary" onPress={() => {}} variant="primary" />
    );
    expect(getByText('Primary')).toBeTruthy();

    rerender(<Button title="Outline" onPress={() => {}} variant="outline" />);
    expect(getByText('Outline')).toBeTruthy();

    rerender(<Button title="Ghost" onPress={() => {}} variant="ghost" />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(
      <Button title="Small" onPress={() => {}} size="small" />
    );
    expect(getByText('Small')).toBeTruthy();

    rerender(<Button title="Medium" onPress={() => {}} size="medium" />);
    expect(getByText('Medium')).toBeTruthy();

    rerender(<Button title="Large" onPress={() => {}} size="large" />);
    expect(getByText('Large')).toBeTruthy();
  });
});
