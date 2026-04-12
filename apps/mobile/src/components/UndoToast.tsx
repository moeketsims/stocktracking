import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, duration = 5000, onUndo, onDismiss }: UndoToastProps) {
  const [remaining, setRemaining] = useState(Math.ceil(duration / 1000));
  const [opacity] = useState(new Animated.Value(1));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onDismiss, opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        <Text style={styles.countdown}>{remaining}s</Text>
      </View>
      <TouchableOpacity onPress={onUndo} style={styles.undoBtn} hitSlop={8}>
        <Text style={styles.undoText}>UNDO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  message: {
    color: colors.white,
    fontSize: fontSize.sm,
    flex: 1,
  },
  countdown: {
    color: colors.gray[400],
    fontSize: fontSize.xs,
  },
  undoBtn: {
    paddingLeft: spacing.lg,
  },
  undoText: {
    color: colors.primary[400],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
