import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/constants/theme';
import type { UserRole } from '../../src/types';

/* ── Design tokens (matching dashboard) ── */
const BRAND    = '#1e1b4b';
const WARM_BG  = '#faf9f7';
const ACTIVE   = '#f97316'; // brand orange for active tab

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
    title: 'Dashboard',
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
    title: 'Stocks',
    icon: 'cube',
    iconOutline: 'cube-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'staff'],
  },
  {
    name: 'more',
    title: 'More',
    icon: 'ellipsis-horizontal',
    iconOutline: 'ellipsis-horizontal-outline',
    roles: ['admin', 'zone_manager', 'location_manager', 'vehicle_manager', 'driver', 'staff'],
  },
];

// Default tab per role (matches web app behavior)
function getInitialTab(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'zone_manager':
    case 'location_manager':
      return 'stock'; // Web lands on Stocks page
    case 'driver':
      return 'requests'; // Web lands on Requests page
    case 'vehicle_manager':
      return 'trips'; // Web lands on Vehicles, closest is Trips
    case 'staff':
      return 'stock'; // Web lands on Kitchen, closest is Stock
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
        headerStyle: { backgroundColor: BRAND },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: '#c4c8d0',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.gray[100],
          paddingTop: 4,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.04, shadowRadius: 4 },
            android: { elevation: 4 },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.1,
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
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
