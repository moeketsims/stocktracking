import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, fontSize, fontWeight } from '../../src/constants/theme';
import type { UserRole } from '../../src/types';

type TabConfig = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  roles: UserRole[];
};

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'index',
    title: 'Dashboard',
    icon: 'home',
    roles: ['admin', 'zone_manager', 'location_manager', 'vehicle_manager', 'driver', 'staff'],
  },
  {
    name: 'requests',
    title: 'Requests',
    icon: 'document-text',
    roles: ['admin', 'zone_manager', 'location_manager', 'driver'],
  },
  {
    name: 'trips',
    title: 'Trips',
    icon: 'car',
    roles: ['admin', 'zone_manager', 'vehicle_manager', 'driver'],
  },
  {
    name: 'stock',
    title: 'Stocks',
    icon: 'cube',
    roles: ['admin', 'zone_manager', 'location_manager', 'staff'],
  },
  {
    name: 'more',
    title: 'More',
    icon: 'ellipsis-horizontal',
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
        headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: fontWeight.semibold },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray[200],
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
