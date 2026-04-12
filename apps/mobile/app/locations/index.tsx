import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useLocations, useZones } from '../../src/hooks/useLocations';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { LocationDetail } from '../../src/api/locations';

type FilterType = 'all' | 'shop' | 'warehouse';

export default function LocationsListScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const locations = useLocations();
  const zones = useZones();
  const [filter, setFilter] = useState<FilterType>('all');

  // Group locations by zone
  const grouped = useMemo(() => {
    const list = locations.data?.locations ?? [];
    const filtered = filter === 'all' ? list : list.filter((l) => l.type === filter);
    const zoneMap = new Map<string, { zoneName: string; locations: LocationDetail[] }>();

    for (const loc of filtered) {
      const zoneId = loc.zone_id;
      const zoneName = loc.zone_name ?? 'Unassigned';
      if (!zoneMap.has(zoneId)) {
        zoneMap.set(zoneId, { zoneName, locations: [] });
      }
      zoneMap.get(zoneId)!.locations.push(loc);
    }

    return Array.from(zoneMap.entries()).sort((a, b) =>
      a[1].zoneName.localeCompare(b[1].zoneName),
    );
  }, [locations.data, filter]);

  if (locations.isLoading) return <Loading fullScreen message="Loading locations..." />;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Locations',
          headerRight: () =>
            isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push('/locations/create')}
                hitSlop={8}
              >
                <Ionicons name="add-circle" size={26} color={colors.primary[500]} />
              </TouchableOpacity>
            ) : null,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={locations.isRefetching}
              onRefresh={() => {
                locations.refetch();
                zones.refetch();
              }}
            />
          }
        >
          {/* Filter pills */}
          <View style={styles.filterRow}>
            {(['all', 'shop', 'warehouse'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filter === f && styles.filterActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f === 'all' ? 'All' : f === 'shop' ? 'Shops' : 'Warehouses'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Count */}
          <Text style={styles.countText}>
            {locations.data?.locations?.length ?? 0} location(s)
          </Text>

          {/* Grouped by zone */}
          {grouped.length === 0 && (
            <Card>
              <Text style={styles.emptyText}>No locations found.</Text>
            </Card>
          )}

          {grouped.map(([zoneId, group]) => (
            <View key={zoneId}>
              <Text style={styles.zoneHeader}>{group.zoneName}</Text>
              <Card padded={false}>
                {group.locations.map((loc, idx) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.locationRow,
                      idx === group.locations.length - 1 && styles.lastRow,
                    ]}
                    onPress={() => router.push(`/locations/${loc.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={loc.type === 'warehouse' ? 'business' : 'storefront'}
                      size={20}
                      color={loc.type === 'warehouse' ? '#d97706' : colors.info}
                    />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{loc.name}</Text>
                      {loc.address ? (
                        <Text style={styles.locationAddress} numberOfLines={1}>
                          {loc.address}
                        </Text>
                      ) : null}
                    </View>
                    <Badge
                      label={loc.type === 'shop' ? 'Shop' : 'Warehouse'}
                      variant={loc.type === 'shop' ? 'info' : 'warning'}
                    />
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  filterActive: { backgroundColor: colors.primary[500] },
  filterText: { fontSize: fontSize.sm, color: colors.gray[600] },
  filterTextActive: { color: colors.white, fontWeight: fontWeight.semibold },
  countText: { fontSize: fontSize.sm, color: colors.gray[500] },
  zoneHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
    gap: spacing.md,
  },
  lastRow: { borderBottomWidth: 0 },
  locationInfo: { flex: 1 },
  locationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  locationAddress: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
