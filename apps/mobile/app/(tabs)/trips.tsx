import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/hooks/useTrips';
import { TripCard } from '../../src/components/TripCard';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import type { Trip, TripStatus } from '../../src/types';

type Filter = 'all' | 'active' | 'completed';

const FILTER_MAP: Record<Filter, TripStatus[] | null> = {
  all: null,
  active: ['planned', 'in_progress'],
  completed: ['completed'],
};

export default function TripsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('active');
  const trips = useTrips();
  const allTrips = trips.data?.trips ?? [];

  const filtered = useMemo(() => {
    const allowed = FILTER_MAP[filter];
    if (!allowed) return allTrips;
    return allTrips.filter((t) => allowed.includes(t.status));
  }, [allTrips, filter]);

  const handlePress = (trip: Trip) => {
    router.push(`/trip/${trip.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.filterRow}>
        {(['active', 'all', 'completed'] as Filter[]).map((f) => (
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

      {trips.isLoading ? (
        <Loading fullScreen message="Loading trips..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={trips.isRefetching} onRefresh={() => trips.refetch()} />
          }
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No trips</Text>
              <Text style={styles.emptyBody}>
                {filter === 'active'
                  ? 'No active trips. Accept a request to create one.'
                  : 'No trips found.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
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
  filterBtnActive: {
    backgroundColor: colors.primary[500],
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  filterTextActive: {
    color: colors.white,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
