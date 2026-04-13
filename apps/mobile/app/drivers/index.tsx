import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDrivers } from '../../src/hooks/useDrivers';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { UserRole, InvitationStatus } from '../../src/types';

const STATUS_BADGE: Record<InvitationStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  expired: { label: 'Expired', variant: 'error' },
  no_invitation: { label: 'No Invite', variant: 'neutral' },
};

export default function DriversListScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useDrivers(!showInactive);

  const canManage = hasRole('admin' as UserRole, 'zone_manager' as UserRole, 'location_manager' as UserRole);

  const filtered = useMemo(() => {
    const drivers = data?.drivers ?? [];
    if (!search.trim()) return drivers;
    const q = search.toLowerCase();
    return drivers.filter(
      (d) =>
        d.full_name?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Drivers' }} />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptySubtitle}>Manager access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Drivers',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/drivers/create')}
              style={{ marginRight: spacing.md }}
            >
              <Ionicons name="person-add" size={22} color={colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.searchBar}>
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <TouchableOpacity
          style={[styles.chip, !showInactive && styles.chipActive]}
          onPress={() => setShowInactive(false)}
        >
          <Text style={[styles.chipText, !showInactive && styles.chipTextActive]}>
            Active Only
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, showInactive && styles.chipActive]}
          onPress={() => setShowInactive(true)}
        >
          <Text style={[styles.chipText, showInactive && styles.chipTextActive]}>
            All Drivers
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {isLoading ? (
        <Loading message="Loading drivers..." fullScreen />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>No drivers found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? 'Try a different search term' : 'No drivers match the selected filter'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <Text style={styles.resultCount}>
            {filtered.length} driver{filtered.length !== 1 ? 's' : ''}
          </Text>
          {filtered.map((driver) => {
            const statusBadge = STATUS_BADGE[driver.invitation_status] ?? STATUS_BADGE.no_invitation;
            return (
              <TouchableOpacity
                key={driver.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/drivers/${driver.id}`)}
              >
                <Card style={styles.driverCard}>
                  <View style={styles.cardRow}>
                    <View style={[styles.avatar, !driver.is_active && styles.avatarInactive]}>
                      <Text style={styles.avatarText}>
                        {(driver.full_name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.driverName} numberOfLines={1}>
                          {driver.full_name}
                        </Text>
                        {!driver.is_active && <Badge label="Inactive" variant="neutral" />}
                      </View>
                      {driver.phone ? (
                        <Text style={styles.driverDetail} numberOfLines={1}>
                          {driver.phone}
                        </Text>
                      ) : null}
                      {driver.email ? (
                        <Text style={styles.driverDetail} numberOfLines={1}>
                          {driver.email}
                        </Text>
                      ) : null}
                      <View style={styles.metaRow}>
                        <Badge label={statusBadge.label} variant={statusBadge.variant} />
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  searchBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInput: { flex: 1 },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing['5xl'],
  },
  resultCount: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  driverCard: {
    marginBottom: 0,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: {
    backgroundColor: colors.gray[300],
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  cardInfo: { flex: 1, gap: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  driverName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  driverDetail: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
