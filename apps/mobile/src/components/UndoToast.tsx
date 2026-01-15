import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

// Safe haptics wrapper
const triggerHaptic = async () => {
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available
  }
};

const { width } = Dimensions.get('window');

interface UndoToastProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
  isUndoing?: boolean;
}

export function UndoToast({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  isUndoing = false,
}: UndoToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress countdown
      progressWidth.setValue(100);
      Animated.timing(progressWidth, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset position when not visible
      translateY.setValue(100);
      opacity.setValue(0);
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleUndo = async () => {
    await triggerHaptic();
    onUndo();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success.main} />
        </View>

        {/* Message */}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {/* Undo button */}
        <TouchableOpacity
          style={styles.undoButton}
          onPress={handleUndo}
          disabled={isUndoing}
        >
          {isUndoing ? (
            <Text style={styles.undoText}>...</Text>
          ) : (
            <Text style={styles.undoText}>UNDO</Text>
          )}
        </TouchableOpacity>

        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <Ionicons name="close" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: progressWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above tab bar and FAB
    left: spacing.md,
    right: spacing.md,
    maxWidth: width - spacing.md * 2,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  undoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  undoText: {
    ...typography.label,
    color: colors.primary[500],
    fontWeight: '700',
  },
  dismissButton: {
    padding: spacing.xs,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.primary[500],
  },
});
