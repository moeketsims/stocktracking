import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useAvailableRequests, useMyRequests } from '../../src/hooks/useRequests';
import { RequestCard } from '../../src/components/RequestCard';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import type { StockRequest } from '../../src/types';

/* ── Design tokens (match dashboard) ── */
const BRAND    = '#1e1b4b';
const WARM_BG  = '#faf9f7';
const CARD_R   = 16;

type Tab = 'available' | 'mine';

export default function RequestsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDriver = user?.role === 'driver';
  const isManager = user?.role === 'location_manager' || user?.role === 'zone_manager' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<Tab>(isDriver ? 'available' : 'mine');

  const available = useAvailableRequests();
  const mine = useMyRequests();

  const data = activeTab === 'available' ? available : mine;
  const requests = data.data?.requests ?? [];

  const handlePress = (request: StockRequest) => {
    router.push(`/request/${request.id}`);
  };

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      {/* ── Pill toggle ── */}
      <View style={st.toggleWrap}>
        <View style={st.toggleTrack}>
          <TouchableOpacity
            style={[st.toggleBtn, activeTab === 'available' && st.toggleBtnActive]}
            onPress={() => setActiveTab('available')}
            activeOpacity={0.7}
          >
            <Text style={[st.toggleText, activeTab === 'available' && st.toggleTextActive]}>
              Available
            </Text>
            {available.data && available.data.total > 0 && (
              <View style={[st.toggleCount, activeTab === 'available' ? st.toggleCountActive : st.toggleCountIdle]}>
                <Text style={[st.toggleCountText, activeTab === 'available' && st.toggleCountTextActive]}>
                  {available.data.total}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.toggleBtn, activeTab === 'mine' && st.toggleBtnActive]}
            onPress={() => setActiveTab('mine')}
            activeOpacity={0.7}
          >
            <Text style={[st.toggleText, activeTab === 'mine' && st.toggleTextActive]}>
              My Requests
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {data.isLoading ? (
        <Loading fullScreen message="Loading requests..." />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.list}
          refreshControl={
            <RefreshControl
              refreshing={data.isRefetching}
              onRefresh={() => data.refetch()}
            />
          }
          renderItem={({ item }) => (
            <RequestCard request={item} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={
            <View style={st.empty}>
              <View style={st.emptyIconBox}>
                <Ionicons
                  name={activeTab === 'available' ? 'document-text-outline' : 'folder-open-outline'}
                  size={28}
                  color={colors.gray[300]}
                />
              </View>
              <Text style={st.emptyTitle}>
                {activeTab === 'available' ? 'No pending requests' : 'No requests yet'}
              </Text>
              <Text style={st.emptyBody}>
                {activeTab === 'available'
                  ? 'All caught up. Pull down to refresh.'
                  : 'Requests you accept will appear here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Request FAB for managers */}
      {isManager && (
        <TouchableOpacity
          style={st.fab}
          activeOpacity={0.8}
          onPress={() => router.push('/stock/create-request')}
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

  /* ── Pill toggle ── */
  toggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: WARM_BG,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: '#f0eeeb',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    }),
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[400],
    letterSpacing: 0.1,
  },
  toggleTextActive: {
    color: BRAND,
  },
  toggleCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  toggleCountIdle: {
    backgroundColor: colors.gray[200],
  },
  toggleCountActive: {
    backgroundColor: '#ede9fe',
  },
  toggleCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[500],
  },
  toggleCountTextActive: {
    color: BRAND,
  },

  /* ── List ── */
  list: { padding: 16, gap: 12, paddingBottom: 88 },

  /* ── FAB ── */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
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
});
