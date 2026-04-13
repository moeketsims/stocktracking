import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useAuthStore } from '../../src/stores/authStore';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { Card } from '../../src/components/ui/Card';
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { Vehicle } from '../../src/api/vehicles';

type Filter = 'all' | 'active' | 'inactive';

export default function VehiclesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<Filter>('active');
  const showAll = filter !== 'active';
  const vehicles = useVehicles(!showAll);
  const allVehicles = vehicles.data?.vehicles ?? [];

  const canManage = ['admin', 'vehicle_manager'].includes(user?.role ?? '');

  const filtered = useMemo(() => {
    if (filter === 'inactive') return allVehicles.filter((v) => !v.is_active);
    return allVehicles;
  }, [allVehicles, filter]);

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/vehicles/${item.id}`)}
    >
      <Card>
        <View style={styles.vehicleRow}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car" size={24} color={colors.primary[500]} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.regNumber}>{item.registration_number}</Text>
            {(item.make || item.model) && (
              <Text style={styles.makeModel}>
                {[item.make, item.model].filter(Boolean).join(' ')}
              </Text>
            )}
            {item.capacity_kg != null && (
              <Text style={styles.capacity}>{item.capacity_kg} kg capacity</Text>
            )}
          </View>
          <View style={styles.vehicleRight}>
            <Badge
              label={item.is_active ? 'Active' : 'Inactive'}
              variant={item.is_active ? 'success' : 'neutral'}
            />
            {item.current_trip && (
              <Text style={styles.tripLabel}>On trip</Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Vehicles',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
          headerRight: canManage
            ? () => (
                <TouchableOpacity
                  onPress={() => router.push('/vehicles/create')}
                  style={styles.headerBtn}
                >
                  <Ionicons name="add-circle" size={26} color={colors.white} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Filter row */}
        <View style={styles.filterRow}>
          {(['active', 'all', 'inactive'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {vehicles.isLoading ? (
          <Loading fullScreen message="Loading vehicles..." />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={vehicles.isRefetching}
                onRefresh={() => vehicles.refetch()}
              />
            }
            renderItem={renderVehicle}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="car-outline" size={48} color={colors.gray[300]} />
                <Text style={styles.emptyTitle}>No vehicles</Text>
                <Text style={styles.emptyBody}>
                  {filter === 'inactive'
                    ? 'No inactive vehicles found.'
                    : 'No vehicles registered yet.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  headerBtn: { marginRight: spacing.sm },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  filterBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  filterBtnActive: { backgroundColor: colors.primary[500] },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.md },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  regNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  makeModel: { fontSize: fontSize.sm, color: colors.gray[600], marginTop: 2 },
  capacity: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
  vehicleRight: { alignItems: 'flex-end', gap: spacing.xs },
  tripLabel: { fontSize: fontSize.xs, color: colors.info, fontWeight: fontWeight.medium },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  emptyBody: { fontSize: fontSize.sm, color: colors.gray[500], textAlign: 'center' },
});
