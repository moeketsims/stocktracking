import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOnline ? -100 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xs },
        { transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.white} />
        <Text style={styles.text}>You&apos;re offline</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#d97706',
    zIndex: 9999,
    paddingBottom: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
