import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../components/ui/Input';

describe('Input Component', () => {
  it('renders correctly with label', () => {
    const { getByText } = render(
      <Input label="Email" value="" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders placeholder text', () => {
    const { getByPlaceholderText } = render(
      <Input label="Name" placeholder="Enter your name" value="" onChangeText={() => {}} />
    );
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeTextMock = jest.fn();
    const { getByPlaceholderText } = render(
      <Input
        label="Username"
        placeholder="Enter username"
        value=""
        onChangeText={onChangeTextMock}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'testuser');
    expect(onChangeTextMock).toHaveBeenCalledWith('testuser');
  });

  it('displays error message when error prop is provided', () => {
    const { getByText } = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Invalid email address"
      />
    );
    expect(getByText('Invalid email address')).toBeTruthy();
  });

  it('renders as password input when secureTextEntry is true', () => {
    const { getByPlaceholderText } = render(
      <Input
        label="Password"
        placeholder="Enter password"
        value=""
        onChangeText={() => {}}
        secureTextEntry
      />
    );
    const input = getByPlaceholderText('Enter password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('renders as multiline when multiline prop is true', () => {
    const { getByPlaceholderText } = render(
      <Input
        label="Notes"
        placeholder="Enter notes"
        value=""
        onChangeText={() => {}}
        multiline
      />
    );
    const input = getByPlaceholderText('Enter notes');
    expect(input.props.multiline).toBe(true);
  });

  it('is editable by default', () => {
    const { getByPlaceholderText } = render(
      <Input
        label="Text"
        placeholder="Enter text"
        value=""
        onChangeText={() => {}}
      />
    );
    const input = getByPlaceholderText('Enter text');
    expect(input.props.editable).not.toBe(false);
  });
});
