import React from 'react';
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
import { useZones, useLocations } from '../../src/hooks/useLocations';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

export default function ZonesListScreen() {
  const router = useRouter();
  const zones = useZones();
  const locations = useLocations();

  const zoneList = zones.data?.zones ?? [];
  const allLocations = locations.data?.locations ?? [];

  // Compute location count per zone
  function locationCountForZone(zoneId: string): number {
    return allLocations.filter((l) => l.zone_id === zoneId).length;
  }

  function shopCountForZone(zoneId: string): number {
    return allLocations.filter((l) => l.zone_id === zoneId && l.type === 'shop').length;
  }

  function warehouseCountForZone(zoneId: string): number {
    return allLocations.filter((l) => l.zone_id === zoneId && l.type === 'warehouse').length;
  }

  if (zones.isLoading || locations.isLoading) {
    return <Loading fullScreen message="Loading zones..." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Zones' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={zones.isRefetching}
              onRefresh={() => {
                zones.refetch();
                locations.refetch();
              }}
            />
          }
        >
          <Text style={styles.countText}>
            {zoneList.length} zone(s)
          </Text>

          {zoneList.length === 0 && (
            <Card>
              <Text style={styles.emptyText}>No zones found.</Text>
            </Card>
          )}

          {zoneList.map((zone) => {
            const total = locationCountForZone(zone.id);
            const shops = shopCountForZone(zone.id);
            const warehouses = warehouseCountForZone(zone.id);

            return (
              <TouchableOpacity
                key={zone.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/zones/${zone.id}`)}
              >
                <Card>
                  <View style={styles.zoneHeader}>
                    <View style={styles.zoneIcon}>
                      <Ionicons name="map" size={22} color={colors.primary[500]} />
                    </View>
                    <View style={styles.zoneInfo}>
                      <Text style={styles.zoneName}>{zone.name}</Text>
                      <Text style={styles.zoneCount}>
                        {total} location{total !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.gray[400]}
                    />
                  </View>

                  <View style={styles.badgeRow}>
                    {shops > 0 && (
                      <Badge
                        label={`${shops} Shop${shops !== 1 ? 's' : ''}`}
                        variant="info"
                      />
                    )}
                    {warehouses > 0 && (
                      <Badge
                        label={`${warehouses} Warehouse${warehouses !== 1 ? 's' : ''}`}
                        variant="warning"
                      />
                    )}
                    {total === 0 && (
                      <Badge label="No locations" variant="neutral" />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  countText: { fontSize: fontSize.sm, color: colors.gray[500] },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneInfo: { flex: 1 },
  zoneName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  zoneCount: { fontSize: fontSize.sm, color: colors.gray[500] },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },
});
