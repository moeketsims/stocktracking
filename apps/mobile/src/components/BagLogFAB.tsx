import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBagUsage } from '../hooks/useBagUsage';
import { useItems } from '../hooks/useItems';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

// Safe haptics wrapper - fails silently if not available
const Haptics = {
  impactAsync: async (style?: string) => {
    try {
      const haptics = await import('expo-haptics');
      await haptics.impactAsync(style as any);
    } catch {
      // Haptics not available
    }
  },
  notificationAsync: async (type?: string) => {
    try {
      const haptics = await import('expo-haptics');
      await haptics.notificationAsync(type as any);
    } catch {
      // Haptics not available
    }
  },
  selectionAsync: async () => {
    try {
      const haptics = await import('expo-haptics');
      await haptics.selectionAsync();
    } catch {
      // Haptics not available
    }
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
};

interface BagLogFABProps {
  onLogSuccess?: (bagCount: number) => void;
  onLogError?: (error: Error) => void;
}

export function BagLogFAB({ onLogSuccess, onLogError }: BagLogFABProps) {
  const { profile } = useAuth();
  const { data: items } = useItems();
  const { logBag, isLogging, stats, allStats } = useBagUsage();

  const [showItemPicker, setShowItemPicker] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Animation for press feedback
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get default item (first potato item or first item)
  const defaultItem = items?.find((i) => i.name.toLowerCase().includes('potato')) || items?.[0];

  useEffect(() => {
    if (defaultItem && !selectedItemId) {
      setSelectedItemId(defaultItem.id);
    }
  }, [defaultItem, selectedItemId]);

  // Get current item stats
  const currentStats = selectedItemId
    ? allStats.find((s) => s.item_id === selectedItemId)
    : stats;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const triggerSuccessPulse = () => {
    pulseAnim.setValue(1);
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleQuickLog = async () => {
    if (!selectedItemId || isLogging) return;

    try {
      // Haptic feedback immediately
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Log the bag
      await logBag(selectedItemId, 1);

      // Success feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerSuccessPulse();

      onLogSuccess?.(1);
    } catch (error) {
      // Error feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onLogError?.(error instanceof Error ? error : new Error('Failed to log bag'));
    }
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowItemPicker(true);
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowItemPicker(false);
    Haptics.selectionAsync();
  };

  // Don't show FAB if no items or not at a location
  if (!items?.length || !profile?.location_id) {
    return null;
  }

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <>
      {/* FAB Container */}
      <View style={styles.container}>
        {/* Stats Badge */}
        {currentStats && (
          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>
              {currentStats.bags_used_today} used
            </Text>
          </View>
        )}

        {/* Main FAB */}
        <Animated.View
          style={[
            styles.fabWrapper,
            {
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={handleQuickLog}
            onLongPress={handleLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLogging}
            activeOpacity={1}
            delayLongPress={500}
          >
            {isLogging ? (
              <ActivityIndicator color={colors.text.inverse} size="large" />
            ) : (
              <>
                <Ionicons name="add" size={32} color={colors.text.inverse} />
                <Text style={styles.fabText}>Bag</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Item indicator */}
        <Text style={styles.itemIndicator} numberOfLines={1}>
          {selectedItem?.name || 'Select item'}
        </Text>
      </View>

      {/* Item Picker Modal */}
      <Modal
        visible={showItemPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowItemPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Item</Text>
            <Text style={styles.modalSubtitle}>
              Choose which item to log bags for
            </Text>

            {items.map((item) => {
              const itemStats = allStats.find((s) => s.item_id === item.id);
              const isSelected = item.id === selectedItemId;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemOption,
                    isSelected && styles.itemOptionSelected,
                  ]}
                  onPress={() => handleSelectItem(item.id)}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      1 bag = {item.conversion_factor} {item.unit}
                    </Text>
                  </View>
                  {itemStats && (
                    <View style={styles.itemStats}>
                      <Text style={styles.itemStatsNumber}>
                        {itemStats.bags_remaining}
                      </Text>
                      <Text style={styles.itemStatsLabel}>left</Text>
                    </View>
                  )}
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary[500]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const FAB_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    right: spacing.md,
    alignItems: 'center',
  },
  statsBadge: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  statsText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  fabWrapper: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '700',
    marginTop: -4,
  },
  itemIndicator: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    maxWidth: 80,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    marginBottom: spacing.sm,
  },
  itemOptionSelected: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  itemDetails: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  itemStats: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemStatsNumber: {
    ...typography.h3,
    color: colors.text.primary,
  },
  itemStatsLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
