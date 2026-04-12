import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { brand, colors } from '../../src/constants/theme';
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
    title: 'Home',
    icon: 'home',
    iconOutline: 'home-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'vehicle_manager', 'driver', 'staff'],
  },
  {
    name: 'requests',
    title: 'Requests',
    icon: 'document-text',
    iconOutline: 'document-text-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'driver'],
  },
  {
    name: 'trips',
    title: 'Trips',
    icon: 'car',
    iconOutline: 'car-outline',
    roles: ['admin', 'zone_manager', 'vehicle_manager', 'driver'],
  },
  {
    name: 'stock',
    title: 'Stock',
    icon: 'cube',
    iconOutline: 'cube-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'staff'],
  },
  {
    name: 'more',
    title: 'More',
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

  return (
    <Tabs
      initialRouteName={initialTab}
      screenOptions={{
        headerStyle: { backgroundColor: brand.gradientStart },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: brand.accent,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
          ...Platform.select({
            ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
            android: { elevation: 12 },
            default: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: tab.roles.includes(role) ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? st.activeIconWrap : undefined}>
                <Ionicons
                  name={focused ? tab.icon : tab.iconOutline}
                  size={22}
                  color={focused ? brand.accent : color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const st = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: brand.accentLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
});
