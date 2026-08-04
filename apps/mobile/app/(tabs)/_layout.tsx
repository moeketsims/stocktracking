import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { wp } from '../../src/constants/warehousePaper';
import type { UserRole } from '../../src/types';

type TabConfig = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  roles: UserRole[];
};

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'index',
    title: 'HOME',
    icon: 'home',
    iconOutline: 'home-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'vehicle_manager', 'driver', 'staff'],
  },
  {
    name: 'requests',
    title: 'ORDERS',
    icon: 'document-text',
    iconOutline: 'document-text-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'driver'],
  },
  {
    name: 'trips',
    title: 'TRIPS',
    icon: 'car',
    iconOutline: 'car-outline',
    roles: ['admin', 'zone_manager', 'vehicle_manager', 'driver'],
  },
  {
    name: 'stock',
    title: 'STOCK',
    icon: 'cube',
    iconOutline: 'cube-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'staff'],
  },
  {
    name: 'more',
    title: 'MORE',
    icon: 'grid',
    iconOutline: 'grid-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'vehicle_manager', 'driver', 'staff'],
  },
];

function getInitialTab(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'zone_manager':
    case 'location_manager':
      return 'index';
    case 'driver':
      return 'requests';
    case 'vehicle_manager':
      return 'trips';
    case 'staff':
      return 'stock';
    default:
      return 'index';
  }
}

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'staff';
  const initialTab = getInitialTab(role);
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;
  const bottomPadding = Math.max(bottomInset, Platform.OS === 'android' ? 28 : 18);
  const tabBarHeight = 58 + bottomPadding;

  return (
    <Tabs
      initialRouteName={initialTab}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: wp.color.paper,
          borderTopWidth: wp.border.mid,
          borderTopColor: wp.color.lineD,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          // Disable platform shadows — paper aesthetic uses borders only.
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            href: tab.roles.includes(role) ? undefined : null,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={20}
                color={focused ? wp.color.ink : wp.color.ink3}
              />
            ),
            tabBarLabel: ({ focused }) => (
              <Text
                maxFontSizeMultiplier={wp.fontScale.compact}
                numberOfLines={1}
                style={[
                  styles.label,
                  focused ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {tab.title}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 2,
    textAlign: 'center',
    width: 80,
  },
  labelActive: {
    color: wp.color.ink,
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
  },
  labelInactive: {
    color: wp.color.ink3,
    fontFamily: wp.font.monoMid.fontFamily,
    fontWeight: wp.font.monoMid.fontWeight,
  },
});
