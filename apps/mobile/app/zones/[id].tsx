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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZones, useLocationsByZone } from '../../src/hooks/useLocations';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

export default function ZoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const zones = useZones();
  const locationsByZone = useLocationsByZone(id);

  const zone = zones.data?.zones?.find((z) => z.id === id);
  const locationsList = locationsByZone.data?.locations ?? [];
  const shops = locationsList.filter((l) => l.type === 'shop');
  const warehouses = locationsList.filter((l) => l.type === 'warehouse');

  if (zones.isLoading || locationsByZone.isLoading) {
    return <Loading fullScreen message="Loading zone..." />;
  }

  if (!zone) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Zone not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: zone.name }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={locationsByZone.isRefetching}
              onRefresh={() => {
                zones.refetch();
                locationsByZone.refetch();
              }}
            />
          }
        >
          {/* Zone summary */}
          <Card>
            <View style={styles.summaryRow}>
              <View style={styles.zoneIcon}>
                <Ionicons name="map" size={28} color={colors.primary[500]} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.zoneSubtitle}>
                  {locationsList.length} location{locationsList.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{shops.length}</Text>
                <Text style={styles.statLabel}>Shops</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{warehouses.length}</Text>
                <Text style={styles.statLabel}>Warehouses</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{locationsList.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </Card>

          {/* Warehouses */}
          {warehouses.length > 0 && (
            <View>
              <Text style={styles.sectionHeader}>Warehouses</Text>
              <Card padded={false}>
                {warehouses.map((loc, idx) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.locationRow,
                      idx === warehouses.length - 1 && styles.lastRow,
                    ]}
                    onPress={() => router.push(`/locations/${loc.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="business" size={20} color="#d97706" />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{loc.name}</Text>
                      {loc.address ? (
                        <Text style={styles.locationAddress} numberOfLines={1}>
                          {loc.address}
                        </Text>
                      ) : null}
                    </View>
                    <Badge label="Warehouse" variant="warning" />
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          )}

          {/* Shops */}
          {shops.length > 0 && (
            <View>
              <Text style={styles.sectionHeader}>Shops</Text>
              <Card padded={false}>
                {shops.map((loc, idx) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.locationRow,
                      idx === shops.length - 1 && styles.lastRow,
                    ]}
                    onPress={() => router.push(`/locations/${loc.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="storefront" size={20} color={colors.info} />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{loc.name}</Text>
                      {loc.address ? (
                        <Text style={styles.locationAddress} numberOfLines={1}>
                          {loc.address}
                        </Text>
                      ) : null}
                    </View>
                    <Badge label="Shop" variant="info" />
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          )}

          {locationsList.length === 0 && (
            <Card>
              <Text style={styles.emptyText}>
                No locations assigned to this zone yet.
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  zoneIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { flex: 1 },
  zoneName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  zoneSubtitle: { fontSize: fontSize.sm, color: colors.gray[500] },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    paddingVertical: spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.gray[200],
  },
  sectionHeader: {
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
