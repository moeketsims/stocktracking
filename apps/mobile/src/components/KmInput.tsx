import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

interface KmInputProps {
  label: string;
  odometerStart?: number | null;
  onSubmit: (km: number) => void;
  loading?: boolean;
}

export function KmInput({ label, odometerStart, onSubmit, loading }: KmInputProps) {
  const [value, setValue] = useState('');
  const km = parseInt(value, 10);
  const isValid = !isNaN(km) && km >= 0 && km <= 999999;
  const tooLow = odometerStart != null && isValid && km < odometerStart;
  const tooFar = odometerStart != null && isValid && km > odometerStart + 2000;

  let error: string | undefined;
  if (value && !isValid) error = 'Enter a valid number (0–999,999)';
  else if (tooLow) error = `Must be >= starting KM (${odometerStart})`;
  else if (tooFar) error = `Exceeds max distance of 2,000 km from start`;

  return (
    <Card>
      <Text style={styles.title}>{label}</Text>
      {odometerStart != null && (
        <Text style={styles.start}>Starting KM: {odometerStart.toLocaleString()}</Text>
      )}
      <Input
        placeholder="Enter odometer reading"
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
        error={error}
      />
      {isValid && !error && odometerStart != null && (
        <Text style={styles.distance}>
          Distance: {(km - odometerStart).toLocaleString()} km
        </Text>
      )}
      <View style={styles.buttonRow}>
        <Button
          title="Submit"
          onPress={() => onSubmit(km)}
          disabled={!isValid || !!error}
          loading={loading}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  start: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  distance: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
    marginTop: spacing.sm,
  },
  buttonRow: {
    marginTop: spacing.lg,
  },
});
