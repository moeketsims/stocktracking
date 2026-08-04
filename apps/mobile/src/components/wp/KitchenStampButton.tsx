import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MonoText } from './MonoText';
import { wp } from '../../constants/warehousePaper';

interface Props {
  onWithdraw: (bags: number) => void;
  disabled?: boolean;
}

const QUICK_AMOUNTS = [1, 2, 5, 10];

/**
 * The kitchen stamp button — replaces the old `KitchenFAB`. Square, ink-
 * bordered, hand-rotated, with a hard 4×4 ink shadow that snaps to (0,0)
 * on press for a "thunk" stamping motion.
 *
 * API matches the previous KitchenFAB so callers swap one for the other.
 */
export function KitchenStampButton({ onWithdraw, disabled }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const rot = useRef(new Animated.Value(-3)).current;
  const shadowX = useRef(new Animated.Value(wp.shadow.stamp.offsetX)).current;
  const shadowY = useRef(new Animated.Value(wp.shadow.stamp.offsetY)).current;

  const press = () => {
    Animated.parallel([
      Animated.timing(rot, { toValue: 0, duration: 80, useNativeDriver: false }),
      Animated.timing(shadowX, { toValue: 0, duration: 80, useNativeDriver: false }),
      Animated.timing(shadowY, { toValue: 0, duration: 80, useNativeDriver: false }),
    ]).start();
  };

  const release = () => {
    Animated.parallel([
      Animated.spring(rot, { toValue: -3, friction: 5, useNativeDriver: false }),
      Animated.spring(shadowX, { toValue: wp.shadow.stamp.offsetX, friction: 5, useNativeDriver: false }),
      Animated.spring(shadowY, { toValue: wp.shadow.stamp.offsetY, friction: 5, useNativeDriver: false }),
    ]).start();
  };

  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onWithdraw(1);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowMenu(true);
  };

  const handleSelectAmount = (bags: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(false);
    onWithdraw(bags);
  };

  const rotateInterpolated = rot.interpolate({
    inputRange: [-3, 0],
    outputRange: ['-3deg', '0deg'],
  });

  return (
    <>
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View style={{ transform: [{ rotate: rotateInterpolated }] }}>
          {/* Hard offset shadow — animated independently */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shadow,
              {
                transform: [
                  { translateX: shadowX },
                  { translateY: shadowY },
                ],
              },
            ]}
          />
          <TouchableWithoutFeedback
            onPress={handleTap}
            onLongPress={handleLongPress}
            onPressIn={press}
            onPressOut={release}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Withdraw one bag"
          >
            <View style={[styles.stamp, disabled && styles.stampDisabled]}>
              <Text
                maxFontSizeMultiplier={wp.fontScale.compact}
                style={styles.minus}
              >
                −1
              </Text>
              <MonoText size={10} tracking={2} weight={700} color="#FFFFFF" upper style={styles.label}>
                Bag out
              </MonoText>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            <MonoText size={11} weight={700} tracking={1.5} color={wp.color.ink} upper>
              Withdraw bags
            </MonoText>
            <View style={styles.menuGrid}>
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => handleSelectAmount(amount)}
                >
                  <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.menuMinus}>−{amount}</Text>
                  <MonoText size={9} weight={700} tracking={1.2} color={wp.color.ink2} upper>
                    {amount === 1 ? 'Bag' : 'Bags'}
                  </MonoText>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const SIZE = 104;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    width: SIZE + wp.shadow.stamp.offsetX + 4,
    height: SIZE + wp.shadow.stamp.offsetY + 4,
  },
  shadow: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    backgroundColor: wp.shadow.stamp.color,
  },
  stamp: {
    width: SIZE,
    height: SIZE,
    backgroundColor: wp.color.red,
    borderWidth: wp.border.stampButton,
    borderColor: wp.color.lineD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampDisabled: {
    backgroundColor: wp.color.ink3,
  },
  minus: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontSize: 44,
    letterSpacing: -2,
    lineHeight: 46,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  label: {
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,25,22,0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 130,
  },
  menu: {
    backgroundColor: wp.color.paper,
    borderWidth: wp.border.thick,
    borderColor: wp.color.lineD,
    padding: 18,
    width: 300,
    alignItems: 'center',
    gap: 14,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  menuItem: {
    width: '46%',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    alignItems: 'center',
  },
  menuItemPressed: {
    backgroundColor: wp.color.ink,
  },
  menuMinus: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontSize: 28,
    letterSpacing: -1,
    color: wp.color.ink,
    includeFontPadding: false,
  },
});
