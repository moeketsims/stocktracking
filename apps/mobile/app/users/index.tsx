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
import { useUsers } from '../../src/hooks/useUsers';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { UserRole } from '../../src/types';

const ROLE_OPTIONS: { label: string; value: string | undefined }[] = [
  { label: 'All Roles', value: undefined },
  { label: 'Admin', value: 'admin' },
  { label: 'Zone Manager', value: 'zone_manager' },
  { label: 'Location Manager', value: 'location_manager' },
  { label: 'Vehicle Manager', value: 'vehicle_manager' },
  { label: 'Driver', value: 'driver' },
  { label: 'Staff', value: 'staff' },
];

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'> = {
  admin: 'error',
  zone_manager: 'warning',
  location_manager: 'info',
  vehicle_manager: 'primary',
  driver: 'success',
  staff: 'neutral',
};

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UsersListScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, isRefetching, refetch } = useUsers({
    role: roleFilter,
    search: search.trim() || undefined,
  });

  // Admin-only guard
  if (!hasRole('admin' as UserRole)) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'User Management' }} />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptySubtitle}>Admin access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  const users = data?.users ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'User Management',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/users/create')}
              style={{ marginRight: spacing.md }}
            >
              <Ionicons name="person-add" size={22} color={colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.searchBar}>
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Role filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {ROLE_OPTIONS.map((opt) => {
          const active = roleFilter === opt.value;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setRoleFilter(opt.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <Loading message="Loading users..." fullScreen />
      ) : users.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? 'Try a different search term' : 'No users match the selected filter'}
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
            {data?.total ?? 0} user{(data?.total ?? 0) !== 1 ? 's' : ''}
          </Text>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/users/${user.id}`)}
            >
              <Card style={styles.userCard}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, !user.is_active && styles.avatarInactive]}>
                    <Text style={styles.avatarText}>
                      {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.full_name ?? '(No name)'}
                      </Text>
                      {!user.is_active && (
                        <Badge label="Inactive" variant="neutral" />
                      )}
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user.email ?? '—'}
                    </Text>
                    <View style={styles.metaRow}>
                      <Badge
                        label={formatRole(user.role)}
                        variant={ROLE_BADGE_VARIANT[user.role] ?? 'neutral'}
                      />
                      {user.location_name && (
                        <Text style={styles.location} numberOfLines={1}>
                          {user.location_name}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
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
  userCard: {
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
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  location: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    flexShrink: 1,
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
