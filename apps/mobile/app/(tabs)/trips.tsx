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
import type { Trip } from '../../src/types';

/*
 * Trips — retrieval screen with search, filtering, and date grouping.
 *
 * Active trips: one section, status shown per-row via accent + chip.
 * Completed trips: grouped by Today / This week / This month / Older.
 * All: mixed, status shown inline in metadata.
 */

const C = {
  bg:      '#f5f5f0',
  surface: '#ffffff',
  border:  '#e8e6e1',
  borderL: '#f0eee9',
  t1:      '#111111',
  t2:      '#555555',
  t3:      '#999999',
};

type Filter = 'active' | 'completed' | 'all';

function groupCompleted(trips: Trip[]): { title: string; data: Trip[] }[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(startOfDay.getTime() - 7 * 86400000);
  const monthAgo = new Date(startOfDay.getTime() - 30 * 86400000);

  const buckets: { key: string; items: Trip[] }[] = [
    { key: 'Today', items: [] },
    { key: 'This week', items: [] },
    { key: 'This month', items: [] },
    { key: 'Older', items: [] },
  ];

  for (const t of trips) {
    const d = new Date(t.completed_at ?? t.created_at);
    if (d >= startOfDay) buckets[0].items.push(t);
    else if (d >= weekAgo) buckets[1].items.push(t);
    else if (d >= monthAgo) buckets[2].items.push(t);
    else buckets[3].items.push(t);
  }

  return buckets.filter(b => b.items.length > 0).map(b => ({ title: b.key, data: b.items }));
}

export default function TripsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = ['admin', 'zone_manager', 'location_manager', 'vehicle_manager'].includes(user?.role ?? '');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const trips = useTrips();
  const allTrips = trips.data?.trips ?? [];

  const counts = useMemo(() => ({
    active: allTrips.filter(t => t.status === 'planned' || t.status === 'in_progress').length,
    completed: allTrips.filter(t => t.status === 'completed').length,
    all: allTrips.length,
  }), [allTrips]);

  const sections = useMemo(() => {
    let list = allTrips;
    if (filter === 'active') list = list.filter(t => t.status === 'planned' || t.status === 'in_progress');
    else if (filter === 'completed') list = list.filter(t => t.status === 'completed');

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

    if (filter === 'completed') return groupCompleted(list);
    if (list.length === 0) return [];

    const label = filter === 'active'
      ? `${counts.active} active trip${counts.active !== 1 ? 's' : ''}`
      : `${list.length} trip${list.length !== 1 ? 's' : ''}`;
    return [{ title: label, data: list }];
  }, [allTrips, filter, search, counts]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* ── Controls ── */}
      <View style={s.controls}>
        {/* Search */}
        <View style={s.search}>
          <Ionicons name="search-outline" size={15} color={C.t3} />
          <TextInput
            style={s.searchInput}
            placeholder="Search trips"
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={14} color={C.t3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter */}
        <View style={s.filterBar}>
          {(['active', 'completed', 'all'] as Filter[]).map(f => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.filterItem, active && s.filterItemActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.5}
              >
                <Text style={[s.filterLabel, active && s.filterLabelActive]}>
                  {f === 'active' ? 'Active' : f === 'completed' ? 'Completed' : 'All'}
                </Text>
                <View style={[s.filterBadge, active && s.filterBadgeActive]}>
                  <Text style={[s.filterBadgeText, active && s.filterBadgeTextActive]}>
                    {counts[f]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── List ── */}
      {trips.isLoading ? (
        <Loading fullScreen message="" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={trips.isRefetching} onRefresh={() => trips.refetch()} tintColor={C.t3} />
          }
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHead}>
              <Text style={s.sectionText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <TripCard
              trip={item}
              onPress={() => router.push(`/trip/${item.id}`)}
              isLast={index === section.data.length - 1}
              showStatus={filter === 'all'}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {search ? 'No trips match' : filter === 'active' ? 'No active trips' : 'No trips'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Create ── */}
      {isManager && (
        <TouchableOpacity style={s.fab} activeOpacity={0.6} onPress={() => router.push('/trip/create')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  /* Controls */
  controls: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10, marginBottom: 10,
    backgroundColor: '#f5f5f0', borderRadius: 8,
    paddingHorizontal: 10, height: 36,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '400', color: C.t1, padding: 0 },

  filterBar: {
    flexDirection: 'row',
  },
  filterItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  filterItemActive: { borderBottomColor: C.t1 },
  filterLabel: { fontSize: 13, fontWeight: '500', color: C.t3 },
  filterLabelActive: { fontWeight: '600', color: C.t1 },
  filterBadge: {
    backgroundColor: '#eeece8', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
    minWidth: 20, alignItems: 'center',
  },
  filterBadgeActive: { backgroundColor: C.t1 },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: C.t3 },
  filterBadgeTextActive: { color: '#fff' },

  /* Section */
  sectionHead: {
    backgroundColor: C.bg,
    paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.borderL,
  },
  sectionText: { fontSize: 11, fontWeight: '600', color: C.t3, letterSpacing: 0.2 },

  /* Empty */
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 13, color: C.t3 },

  /* FAB */
  fab: {
    position: 'absolute', right: 16, bottom: 20,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.t1,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
    }),
  },
});
