import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../../src/hooks/useTrips';
import { useAuthStore } from '../../src/stores/authStore';
import { TripCard } from '../../src/components/TripCard';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import type { Trip, TripStatus } from '../../src/types';

/* ── Design tokens (match dashboard) ── */
const BRAND    = '#1e1b4b';
const WARM_BG  = '#faf9f7';
const CARD_R   = 16;

type Filter = 'all' | 'active' | 'completed';

const FILTER_MAP: Record<Filter, TripStatus[] | null> = {
  all: null,
  active: ['planned', 'in_progress'],
  completed: ['completed'],
};

export default function TripsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = ['admin', 'zone_manager', 'location_manager', 'vehicle_manager'].includes(user?.role ?? '');
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
    <SafeAreaView style={st.safe} edges={['bottom']}>
      {/* ── Filter chips ── */}
      <View style={st.chipRow}>
        <Text style={st.chipLabel}>FILTER</Text>
        <View style={st.chipGroup}>
          {(['active', 'all', 'completed'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[st.chip, filter === f && st.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[st.chipText, filter === f && st.chipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {trips.isLoading ? (
        <Loading fullScreen message="Loading trips..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.list}
          refreshControl={
            <RefreshControl refreshing={trips.isRefetching} onRefresh={() => trips.refetch()} />
          }
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={
            <View style={st.empty}>
              <View style={st.emptyIconBox}>
                <Ionicons name="navigate-outline" size={28} color={colors.gray[300]} />
              </View>
              <Text style={st.emptyTitle}>
                {filter === 'active' ? 'No active trips' : 'No trips found'}
              </Text>
              <Text style={st.emptyBody}>
                {filter === 'active'
                  ? 'Accept a request to start a trip.'
                  : 'Try a different filter.'}
              </Text>
            </View>
          }
        />
      )}

      {isManager && (
        <TouchableOpacity
          style={st.fab}
          activeOpacity={0.8}
          onPress={() => router.push('/trip/create')}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WARM_BG },

  /* ── Filter chips ── */
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: WARM_BG,
    gap: 10,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray[400],
    letterSpacing: 0.8,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f0eeeb',
  },
  chipActive: {
    backgroundColor: BRAND,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[500],
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: '#fff',
  },

  /* ── List ── */
  list: { padding: 16, gap: 12, paddingBottom: 88 },

  /* ── Empty state ── */
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f0eeeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray[400],
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ── FAB ── */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
      default: { shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    }),
  },
});
