import React, { useState, useMemo } from 'react';
import {
  View, Text, SectionList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../../src/hooks/useTrips';
import { useAuthStore } from '../../src/stores/authStore';
import { TripCard } from '../../src/components/TripCard';
import { Loading } from '../../src/components/ui/Loading';
import { colors } from '../../src/constants/theme';
import type { Trip, TripStatus } from '../../src/types';

/*
 * Trips screen — retrieval tool, not a feed.
 *
 * Design priorities:
 * 1. Search by trip number, location, or vehicle
 * 2. Filter by status
 * 3. Group completed trips by recency
 * 4. Compact rows — 8-10 visible without scrolling
 */

const C = {
  bg:     '#f5f5f0',
  surface:'#ffffff',
  border: '#e8e6e1',
  t1:     '#111111',
  t2:     '#555555',
  t3:     '#999999',
  accent: '#b44d1e',
};

type Filter = 'active' | 'completed' | 'all';

function groupByRecency(trips: Trip[]): { title: string; data: Trip[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Trip[]> = { Today: [], 'This Week': [], Earlier: [] };

  for (const t of trips) {
    const d = new Date(t.completed_at ?? t.created_at);
    if (d >= today) groups.Today.push(t);
    else if (d >= weekAgo) groups['This Week'].push(t);
    else groups.Earlier.push(t);
  }

  return ['Today', 'This Week', 'Earlier']
    .filter(k => groups[k].length > 0)
    .map(k => ({ title: k, data: groups[k] }));
}

export default function TripsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = ['admin', 'zone_manager', 'location_manager', 'vehicle_manager'].includes(user?.role ?? '');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const trips = useTrips();
  const allTrips = trips.data?.trips ?? [];

  const sections = useMemo(() => {
    // Filter by status
    let list = allTrips;
    if (filter === 'active') list = list.filter(t => t.status === 'planned' || t.status === 'in_progress');
    else if (filter === 'completed') list = list.filter(t => t.status === 'completed');

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.trip_number.toLowerCase().includes(q) ||
        (t.origin_description ?? t.from_location?.name ?? '').toLowerCase().includes(q) ||
        (t.destination_description ?? t.to_location?.name ?? '').toLowerCase().includes(q) ||
        (t.vehicles?.registration_number ?? '').toLowerCase().includes(q) ||
        (t.driver_name ?? '').toLowerCase().includes(q)
      );
    }

    // Group completed by recency, active as one section
    if (filter === 'completed') return groupByRecency(list);
    if (list.length === 0) return [];
    return [{ title: filter === 'active' ? 'Active' : 'All Trips', data: list }];
  }, [allTrips, filter, search]);

  const counts = useMemo(() => ({
    active: allTrips.filter(t => t.status === 'planned' || t.status === 'in_progress').length,
    completed: allTrips.filter(t => t.status === 'completed').length,
    all: allTrips.length,
  }), [allTrips]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* ── Controls ── */}
      <View style={s.controls}>
        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search" size={15} color={C.t3} />
          <TextInput
            style={s.searchInput}
            placeholder="Trip number, location, or vehicle"
            placeholderTextColor={C.t3}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={15} color={C.t3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {(['active', 'completed', 'all'] as Filter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, filter === f && s.filterTabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.6}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'active' ? 'Active' : f === 'completed' ? 'Completed' : 'All'}
              </Text>
              <Text style={[s.filterCount, filter === f && s.filterCountActive]}>
                {counts[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ── */}
      {trips.isLoading ? (
        <Loading fullScreen message="" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={trips.isRefetching} onRefresh={() => trips.refetch()} tintColor={C.t3} />
          }
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>{section.title.toUpperCase()}</Text>
              <Text style={s.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <TripCard
              trip={item}
              onPress={() => router.push(`/trip/${item.id}`)}
              isLast={index === section.data.length - 1}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {search ? 'No trips match your search' : filter === 'active' ? 'No active trips' : 'No trips'}
              </Text>
            </View>
          }
          renderSectionFooter={() => <View style={s.sectionGap} />}
        />
      )}

      {/* ── FAB ── */}
      {isManager && (
        <TouchableOpacity
          style={s.fab}
          activeOpacity={0.7}
          onPress={() => router.push('/trip/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  /* Controls */
  controls: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: C.bg },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 12, height: 38,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '400', color: C.t1, padding: 0 },
  filterRow: { flexDirection: 'row', gap: 0, borderBottomWidth: 1, borderBottomColor: C.border },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  filterTabActive: { borderBottomColor: C.t1 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.t3 },
  filterTextActive: { color: C.t1, fontWeight: '600' },
  filterCount: {
    fontSize: 10, fontWeight: '700', color: C.t3,
    backgroundColor: '#f0eee9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    overflow: 'hidden',
  },
  filterCountActive: { backgroundColor: C.t1, color: '#fff' },

  /* Section headers */
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
    backgroundColor: C.bg,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.t3, letterSpacing: 1 },
  sectionCount: { fontSize: 10, fontWeight: '600', color: C.t3 },
  sectionGap: { height: 4 },

  /* Empty */
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '400', color: C.t3 },

  /* FAB */
  fab: {
    position: 'absolute', right: 16, bottom: 20,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.t1,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 4 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
    }),
  },
});
