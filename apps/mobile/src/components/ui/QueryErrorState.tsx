import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../../constants/theme';
import { Button } from './Button';

interface QueryErrorStateProps {
  error: Error | null;
  onRetry: () => void;
  message?: string;
}

export function QueryErrorState({ error, onRetry, message }: QueryErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
      <Text style={styles.message}>{message ?? 'Failed to load data'}</Text>
      {__DEV__ && error?.message ? (
        <Text style={styles.detail}>{error.message}</Text>
      ) : null}
      <View style={styles.buttonWrap}>
        <Button title="Try Again" variant="outline" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginTop: 8,
  },
  detail: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonWrap: {
    marginTop: 12,
    minWidth: 140,
  },
});
