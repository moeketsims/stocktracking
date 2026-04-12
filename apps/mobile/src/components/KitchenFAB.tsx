import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadow } from '../constants/theme';

interface KitchenFABProps {
  onWithdraw: (bags: number) => void;
  disabled?: boolean;
}

const QUICK_AMOUNTS = [1, 2, 5, 10];

export function KitchenFAB({ onWithdraw, disabled }: KitchenFABProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onWithdraw(1);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMenu(true);
  };

  const handleSelectAmount = (bags: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(false);
    onWithdraw(bags);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, disabled && styles.fabDisabled]}
        onPress={handleTap}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Ionicons name="remove" size={28} color={colors.white} />
        <Text style={styles.fabLabel}>-1 bag</Text>
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Withdraw bags</Text>
            <View style={styles.menuGrid}>
              {QUICK_AMOUNTS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.menuItem}
                  onPress={() => handleSelectAmount(amount)}
                >
                  <Text style={styles.menuItemText}>-{amount}</Text>
                  <Text style={styles.menuItemLabel}>
                    {amount === 1 ? 'bag' : 'bags'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
  fabDisabled: {
    backgroundColor: colors.gray[400],
  },
  fabLabel: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    marginTop: -2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    width: 280,
    ...shadow.lg,
  },
  menuTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  menuItem: {
    width: 110,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  menuItemText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary[600],
  },
  menuItemLabel: {
    fontSize: fontSize.xs,
    color: colors.primary[500],
    marginTop: 2,
  },
});
