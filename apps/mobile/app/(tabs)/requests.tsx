import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useAvailableRequests, useMyRequests } from '../../src/hooks/useRequests';
import { RequestCard } from '../../src/components/RequestCard';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { StockRequest } from '../../src/types';

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available
          </Text>
          {available.data && (
            <View style={styles.tabCount}>
              <Text style={styles.tabCountText}>{available.data.total}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.activeTab]}
          onPress={() => setActiveTab('mine')}
        >
          <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>
            My Requests
          </Text>
        </TouchableOpacity>
      </View>

      {data.isLoading ? (
        <Loading fullScreen message="Loading requests..." />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No requests</Text>
              <Text style={styles.emptyBody}>
                {activeTab === 'available'
                  ? 'No pending stock requests right now. Pull down to refresh.'
                  : 'You haven\'t accepted any requests yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Request FAB for managers */}
      {isManager && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => router.push('/stock/create-request')}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9f7' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#faf9f7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary[500],
    backgroundColor: '#fff8f3',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  activeTabText: {
    color: colors.primary[500],
    fontWeight: fontWeight.semibold,
  },
  tabCount: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.primary[700],
  },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
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
