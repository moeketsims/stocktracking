import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useAlerts, useAcknowledgeAlert } from '../src/hooks/useAlerts';
import { usePendingDeliveries, useConfirmDelivery } from '../src/hooks/useDeliveries';
import { AlertCard } from '../src/components/AlertCard';
import { DeliveryCard } from '../src/components/DeliveryCard';
import { Loading } from '../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../src/constants/theme';
import { Alert } from 'react-native';
import { Input } from '../src/components/ui/Input';

type Tab = 'alerts' | 'deliveries';

export default function AlertsScreen() {
  const user = useAuthStore((s) => s.user);
  const isManager = ['admin', 'zone_manager', 'location_manager'].includes(user?.role ?? '');
  const [tab, setTab] = useState<Tab>('alerts');

  const alerts = useAlerts(user?.location_id ?? undefined);
  const deliveries = usePendingDeliveries();
  const ackMutation = useAcknowledgeAlert();
  const confirmMutation = useConfirmDelivery();

  const activeAlerts = alerts.data?.active_alerts ?? [];
  const pendingDeliveries = deliveries.data?.deliveries ?? [];

  const handleAcknowledge = (alert: { type: string; location_id: string; item_id: string }) => {
    ackMutation.mutate({
      alert_type: alert.type,
      location_id: alert.location_id,
      item_id: alert.item_id,
    });
  };

  const handleConfirmDelivery = (deliveryId: string, claimedBags: number) => {
    Alert.prompt?.(
      'Confirm Delivery',
      `Enter actual bags received (claimed: ${claimedBags})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: (value: string | undefined) => {
            const bags = parseInt(value ?? '', 10);
            if (!isNaN(bags) && bags >= 0) {
              confirmMutation.mutate({ id: deliveryId, data: { confirmed_bags: bags } });
            }
          },
        },
      ],
      'plain-text',
      String(claimedBags),
    ) ?? Alert.alert('Confirm', `Confirm ${claimedBags} bags?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => confirmMutation.mutate({ id: deliveryId, data: { confirmed_bags: claimedBags } }) },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Alerts & Deliveries',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Tab switcher */}
        {isManager && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'alerts' && styles.activeTab]}
              onPress={() => setTab('alerts')}
            >
              <Text style={[styles.tabText, tab === 'alerts' && styles.activeTabText]}>
                Alerts ({activeAlerts.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'deliveries' && styles.activeTab]}
              onPress={() => setTab('deliveries')}
            >
              <Text style={[styles.tabText, tab === 'deliveries' && styles.activeTabText]}>
                Deliveries ({pendingDeliveries.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'alerts' ? (
          alerts.isLoading ? (
            <Loading fullScreen message="Loading alerts..." />
          ) : (
            <FlatList
              data={activeAlerts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={alerts.isRefetching} onRefresh={() => alerts.refetch()} />
              }
              renderItem={({ item }) => (
                <AlertCard
                  alert={item}
                  onAcknowledge={() => handleAcknowledge(item)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No active alerts</Text>
                  <Text style={styles.emptyBody}>All clear — no stock alerts right now.</Text>
                </View>
              }
            />
          )
        ) : (
          deliveries.isLoading ? (
            <Loading fullScreen message="Loading deliveries..." />
          ) : (
            <FlatList
              data={pendingDeliveries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={deliveries.isRefetching} onRefresh={() => deliveries.refetch()} />
              }
              renderItem={({ item }) => (
                <DeliveryCard
                  delivery={item}
                  onPress={() =>
                    handleConfirmDelivery(
                      item.id,
                      item.driver_claimed_bags ?? Math.round(item.driver_claimed_qty_kg / 10),
                    )
                  }
                />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No pending deliveries</Text>
                  <Text style={styles.emptyBody}>No deliveries waiting for confirmation.</Text>
                </View>
              }
            />
          )
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: colors.primary[500] },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[500] },
  activeTabText: { color: colors.primary[500], fontWeight: fontWeight.semibold },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  emptyBody: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: spacing.xs },
});
