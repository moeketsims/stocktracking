import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useLogout } from '../../src/hooks/useAuth';
import { useAlerts } from '../../src/hooks/useAlerts';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { brand, colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import { APP_VERSION } from '../../src/constants/config';

/* ── Design tokens (matching dashboard) ── */
const WARM_BG  = '#f8fafc';
const CARD_R   = 16;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  color?: string;
  iconBg?: string;
  isLast?: boolean;
}

function MenuItem({ icon, label, onPress, badge, color, iconBg, isLast }: MenuItemProps) {
  return (
    <TouchableOpacity style={[st.menuItem, !isLast && st.menuItemBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[st.iconCircle, iconBg ? { backgroundColor: iconBg } : undefined]}>
        <Ionicons name={icon} size={17} color={color ?? colors.gray[600]} />
      </View>
      <Text style={st.menuLabel}>{label}</Text>
      <View style={st.menuRight}>
        {badge != null && badge > 0 && (
          <View style={st.badge}>
            <Text style={st.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.gray[300]} />
      </View>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const alerts = useAlerts(user?.location_id ?? undefined);
  const deliveries = usePendingDeliveries();

  const isAdmin = user?.role === 'admin';
  const isAdminOrZone = ['admin', 'zone_manager'].includes(user?.role ?? '');
  const isManager = ['admin', 'zone_manager', 'location_manager'].includes(user?.role ?? '');
  const canManageVehicles = ['admin', 'vehicle_manager'].includes(user?.role ?? '');
  const alertCount = alerts.data?.active_alerts?.length ?? 0;
  const deliveryCount = deliveries.data?.total ?? 0;

  // Build menu items dynamically so we can mark the last one
  const menuItems: (MenuItemProps & { key: string })[] = [];

  menuItems.push({
    key: 'alerts', icon: 'alert-circle', label: 'Alerts', badge: alertCount,
    color: alertCount > 0 ? colors.error : '#dc2626', iconBg: '#fef2f2',
    onPress: () => router.push('/alerts'),
  });
  if (isManager) {
    menuItems.push({
      key: 'deliveries', icon: 'cube', label: 'Pending Deliveries', badge: deliveryCount,
      color: deliveryCount > 0 ? colors.warning : '#d97706', iconBg: '#fffbeb',
      onPress: () => router.push('/alerts'),
    });
  }
  if (isManager) menuItems.push({ key: 'loans', icon: 'swap-horizontal', label: 'Loans', color: '#7c3aed', iconBg: '#f5f3ff', onPress: () => router.push('/loans') });
  if (isManager) menuItems.push({ key: 'drivers', icon: 'people', label: 'Drivers', color: '#16a34a', iconBg: '#f0fdf4', onPress: () => router.push('/drivers') });
  if (isManager) menuItems.push({ key: 'batches', icon: 'clipboard', label: 'Batches', color: '#7c3aed', iconBg: '#f5f3ff', onPress: () => router.push('/stock/batches') });
  if (isManager) menuItems.push({ key: 'users', icon: 'people', label: 'User Management', color: '#4f46e5', iconBg: '#ede9fe', onPress: () => router.push('/users') });
  if (isManager) menuItems.push({ key: 'stock-take', icon: 'checkbox', label: 'Stock Take', color: '#0d9488', iconBg: '#f0fdfa', onPress: () => router.push('/stock-take') });
  if (canManageVehicles || isManager) menuItems.push({ key: 'vehicles', icon: 'car', label: 'Vehicles', color: '#475569', iconBg: '#f1f5f9', onPress: () => router.push('/vehicles') });
  if (isAdminOrZone) menuItems.push({ key: 'locations', icon: 'location', label: 'Locations', color: '#ea580c', iconBg: '#fff7ed', onPress: () => router.push('/locations') });
  if (isAdminOrZone) menuItems.push({ key: 'zones', icon: 'map', label: 'Zones', color: '#6d28d9', iconBg: '#ede9fe', onPress: () => router.push('/zones') });
  if (isAdmin) menuItems.push({ key: 'suppliers', icon: 'business', label: 'Suppliers', color: '#92400e', iconBg: '#fef3c7', onPress: () => router.push('/suppliers') });
  if (isManager) menuItems.push({ key: 'reports', icon: 'bar-chart', label: 'Reports & Analytics', color: '#7c3aed', iconBg: '#f5f3ff', onPress: () => router.push('/reports') });
  menuItems.push({ key: 'notifications', icon: 'notifications', label: 'Notifications', color: '#6d28d9', iconBg: '#ede9fe', onPress: () => router.push('/notifications') });
  menuItems.push({ key: 'settings', icon: 'settings', label: 'Settings', color: '#6b7280', iconBg: '#f3f4f6', onPress: () => router.push('/settings') });

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Profile card ── */}
        <View style={st.profileCard}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>
              {(user?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={st.profileInfo}>
            <Text style={st.profileName}>{user?.full_name ?? '\u2014'}</Text>
            <Text style={st.profileEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={st.profileMeta}>
              <View style={st.rolePill}>
                <Text style={st.roleText}>
                  {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </View>
              {user?.location_name && (
                <View style={st.locRow}>
                  <Ionicons name="location-outline" size={11} color={colors.gray[400]} />
                  <Text style={st.locText}>{user.location_name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Menu list ── */}
        <View style={st.menuCard}>
          {menuItems.map((item, idx) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              onPress={item.onPress}
              badge={item.badge}
              color={item.color}
              iconBg={item.iconBg}
              isLast={idx === menuItems.length - 1}
            />
          ))}
        </View>

        {/* ── Sign out (understated) ── */}
        <TouchableOpacity
          style={st.signOutBtn}
          onPress={() => logout.mutate()}
          activeOpacity={0.7}
          disabled={logout.isPending}
        >
          <Ionicons name="log-out-outline" size={17} color="#dc2626" />
          <Text style={st.signOutText}>
            {logout.isPending ? 'Signing out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        {/* ── Version ── */}
        <Text style={st.version}>v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WARM_BG },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  /* ── Profile ── */
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: CARD_R, padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
    }),
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: brand.gradientStart,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: colors.gray[900], letterSpacing: -0.2, marginBottom: 2 },
  profileEmail: { fontSize: 13, fontWeight: '400', color: colors.gray[400], marginBottom: 6 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 9, paddingVertical: 2, borderRadius: 7,
  },
  roleText: { fontSize: 11, fontWeight: '600', color: brand.gradientStart },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locText: { fontSize: 11, fontWeight: '400', color: colors.gray[400] },

  /* ── Menu card ── */
  menuCard: {
    backgroundColor: '#fff', borderRadius: CARD_R, overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
    }),
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 16,
    minHeight: 50,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  iconCircle: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  menuLabel: {
    flex: 1, fontSize: 15, fontWeight: '500', color: colors.gray[800],
  },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: brand.gradientStart,
    paddingHorizontal: 7, paddingVertical: 1,
    borderRadius: 10, minWidth: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* ── Sign out ── */
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 14, fontWeight: '500', color: '#dc2626',
  },

  /* ── Version ── */
  version: {
    fontSize: 11, fontWeight: '400', color: colors.gray[300],
    textAlign: 'center',
  },
});
