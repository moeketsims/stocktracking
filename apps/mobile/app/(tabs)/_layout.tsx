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
    title: 'Stock',
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

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'staff';

  return (
    <Tabs
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
