import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useLogout } from '../../src/hooks/useAuth';
import { useAlerts } from '../../src/hooks/useAlerts';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import { APP_VERSION } from '../../src/constants/config';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  color?: string;
}

function MenuItem({ icon, label, onPress, badge, color }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={color ?? colors.gray[600]} />
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name ?? '—'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>
                {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                {user?.location_name ? ` — ${user.location_name}` : ''}
              </Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <Card padded={false}>
          <MenuItem
            icon="alert-circle"
            label="Alerts"
            badge={alertCount}
            color={alertCount > 0 ? colors.error : undefined}
            onPress={() => router.push('/alerts')}
          />
          {isManager && (
            <MenuItem
              icon="cube"
              label="Pending Deliveries"
              badge={deliveryCount}
              color={deliveryCount > 0 ? colors.warning : undefined}
              onPress={() => router.push('/alerts')}
            />
          )}
          {isManager && (
            <MenuItem
              icon="swap-horizontal"
              label="Loans"
              onPress={() => router.push('/loans')}
            />
          )}
          {isManager && (
            <MenuItem
              icon="people"
              label="Drivers"
              onPress={() => router.push('/drivers')}
            />
          )}
          {isManager && (
            <MenuItem
              icon="clipboard"
              label="Batches"
              onPress={() => router.push('/stock/batches')}
            />
          )}
          {isManager && (
            <MenuItem
              icon="people"
              label="User Management"
              onPress={() => router.push('/users')}
            />
          )}
          {isManager && (
            <MenuItem
              icon="checkbox"
              label="Stock Take"
              onPress={() => router.push('/stock-take')}
            />
          )}
          {(canManageVehicles || isManager) && (
            <MenuItem
              icon="car"
              label="Vehicles"
              onPress={() => router.push('/vehicles')}
            />
          )}
          {isAdminOrZone && (
            <MenuItem
              icon="location"
              label="Locations"
              onPress={() => router.push('/locations')}
            />
          )}
          {isAdminOrZone && (
            <MenuItem
              icon="map"
              label="Zones"
              onPress={() => router.push('/zones')}
            />
          )}
          {isAdmin && (
            <MenuItem
              icon="business"
              label="Suppliers"
              onPress={() => router.push('/suppliers')}
            />
          )}
          {isManager && (
            <MenuItem
              icon="bar-chart"
              label="Reports & Analytics"
              onPress={() => router.push('/reports')}
            />
          )}
          <MenuItem
            icon="notifications"
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <MenuItem
            icon="settings"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        </Card>

        {/* App Info */}
        <Card>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
        </Card>

        <Button
          title="Sign Out"
          onPress={() => logout.mutate()}
          variant="danger"
          loading={logout.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary[500],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  profileEmail: { fontSize: fontSize.sm, color: colors.gray[500] },
  profileRole: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
    gap: spacing.md,
  },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.gray[900] },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    backgroundColor: colors.error,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: fontWeight.bold },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  infoValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[700] },
});
