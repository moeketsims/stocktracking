import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/stores/authStore';
import { useAlerts, useAcknowledgeAlert } from '../src/hooks/useAlerts';
import { usePendingDeliveries, useConfirmDelivery, useResendKmEmail, useCorrectKm } from '../src/hooks/useDeliveries';
import { AlertCard } from '../src/components/AlertCard';
import { DeliveryCard } from '../src/components/DeliveryCard';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Loading } from '../src/components/ui/Loading';
import { QueryErrorState } from '../src/components/ui/QueryErrorState';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../src/constants/theme';
import type { PendingDelivery } from '../src/types';

const WARM_BG  = '#f9fafb';
const CARD_R   = 12;

type Tab = 'alerts' | 'deliveries' | 'confirmed';

export default function AlertsScreen() {
  const user = useAuthStore((s) => s.user);
  const isManager = ['admin', 'zone_manager', 'location_manager'].includes(user?.role ?? '');
  const isVehicleManager = ['admin', 'vehicle_manager'].includes(user?.role ?? '');
  const [tab, setTab] = useState<Tab>('alerts');
  const [correctKmModalVisible, setCorrectKmModalVisible] = useState(false);
  const [selectedTripForKm, setSelectedTripForKm] = useState<{ tripId: string; currentKm: number; startingKm: number } | null>(null);
  const [newKmValue, setNewKmValue] = useState('');
  const [kmReason, setKmReason] = useState('');

  const alerts = useAlerts(user?.location_id ?? undefined);
  const deliveries = usePendingDeliveries();
  const confirmedDeliveries = usePendingDeliveries({ status: 'confirmed' });
  const ackMutation = useAcknowledgeAlert();
  const confirmMutation = useConfirmDelivery();
  const resendKmEmail = useResendKmEmail();
  const correctKm = useCorrectKm();

  const activeAlerts = alerts.data?.active_alerts ?? [];
  const pendingDeliveries = deliveries.data?.deliveries ?? [];
  const confirmedList = confirmedDeliveries.data?.deliveries ?? [];

  const handleAcknowledge = (alert: { type: string; location_id: string; item_id: string }) => {
    ackMutation.mutate({
      alert_type: alert.type,
      location_id: alert.location_id,
      item_id: alert.item_id,
    });
  };

  const handleResendKmEmail = (deliveryId: string) => {
    Alert.alert('Resend KM Email', 'Send the KM submission link to the driver again?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resend', onPress: () => resendKmEmail.mutate(deliveryId) },
    ]);
  };

  const handleOpenCorrectKm = (delivery: PendingDelivery) => {
    const tripId = delivery.trip_id ?? delivery.trip?.id;
    if (!tripId) {
      Alert.alert('Error', 'No trip linked to this delivery.');
      return;
    }
    setSelectedTripForKm({
      tripId,
      currentKm: (delivery as any).trip?.odometer_end ?? 0,
      startingKm: (delivery as any).trip?.odometer_start ?? 0,
    });
    setNewKmValue('');
    setKmReason('');
    setCorrectKmModalVisible(true);
  };

  const handleSubmitCorrectKm = () => {
    if (!selectedTripForKm) return;
    const km = parseInt(newKmValue, 10);
    if (isNaN(km) || km <= 0) {
      Alert.alert('Invalid', 'Please enter a valid KM reading.');
      return;
    }
    if (!kmReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for the correction.');
      return;
    }
    correctKm.mutate(
      { tripId: selectedTripForKm.tripId, data: { new_closing_km: km, reason: kmReason.trim() } },
      {
        onSuccess: () => {
          setCorrectKmModalVisible(false);
          setSelectedTripForKm(null);
        },
      },
    );
  };

  const handleConfirmDelivery = (deliveryId: string, claimedBags: number) => {
    if (confirmMutation.isPending) return;
    Alert.alert('Confirm Delivery', `Confirm ${claimedBags} bags received?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => confirmMutation.mutate({ id: deliveryId, data: { confirmed_bags: claimedBags } }) },
    ]);
  };

  /* ── Tab data ── */
  const tabs: { key: Tab; label: string; count: number; show: boolean }[] = [
    { key: 'alerts', label: 'Alerts', count: activeAlerts.length, show: true },
    { key: 'deliveries', label: 'Pending', count: pendingDeliveries.length, show: isManager },
    { key: 'confirmed', label: 'Confirmed', count: confirmedList.length, show: isVehicleManager },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Alerts & Deliveries',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#111827' },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={st.safe} edges={['bottom']}>
        {/* ── Tab switcher ── */}
        {visibleTabs.length > 1 && (
          <View style={st.tabBar}>
            {visibleTabs.map((t) => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[st.tab, active && st.tabActive]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[st.tabText, active && st.tabTextActive]}>
                    {t.label}
                  </Text>
                  {t.count > 0 && (
                    <View style={[st.tabCount, active && st.tabCountActive]}>
                      <Text style={[st.tabCountText, active && st.tabCountTextActive]}>{t.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tab === 'alerts' ? (
          alerts.isLoading ? (
            <Loading fullScreen message="Loading alerts..." />
          ) : alerts.isError ? (
            <QueryErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
          ) : (
            <FlatList
              data={activeAlerts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={st.list}
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
                <View style={st.empty}>
                  <View style={st.emptyIcon}>
                    <Ionicons name="checkmark-circle-outline" size={36} color={colors.gray[300]} />
                  </View>
                  <Text style={st.emptyTitle}>No active alerts</Text>
                  <Text style={st.emptyBody}>All clear -- no stock alerts right now.</Text>
                </View>
              }
            />
          )
        ) : tab === 'deliveries' ? (
          deliveries.isLoading ? (
            <Loading fullScreen message="Loading deliveries..." />
          ) : deliveries.isError ? (
            <QueryErrorState error={deliveries.error} onRetry={() => deliveries.refetch()} />
          ) : (
            <FlatList
              data={pendingDeliveries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={st.list}
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
                <View style={st.empty}>
                  <View style={st.emptyIcon}>
                    <Ionicons name="cube-outline" size={36} color={colors.gray[300]} />
                  </View>
                  <Text style={st.emptyTitle}>No pending deliveries</Text>
                  <Text style={st.emptyBody}>No deliveries waiting for confirmation.</Text>
                </View>
              }
            />
          )
        ) : (
          confirmedDeliveries.isLoading ? (
            <Loading fullScreen message="Loading confirmed deliveries..." />
          ) : (
            <FlatList
              data={confirmedList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={st.list}
              refreshControl={
                <RefreshControl
                  refreshing={confirmedDeliveries.isRefetching}
                  onRefresh={() => confirmedDeliveries.refetch()}
                />
              }
              renderItem={({ item }) => (
                <View style={st.confirmedCard}>
                  <View style={st.confirmedHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.confirmedLocation}>
                        {item.location?.name ?? 'Unknown'}
                      </Text>
                      {item.trip && (
                        <Text style={st.confirmedTrip}>
                          {item.trip.trip_number}
                          {item.trip.driver_name ? ` \u2014 ${item.trip.driver_name}` : ''}
                        </Text>
                      )}
                    </View>
                    <View style={st.confirmedBagsPill}>
                      <Text style={st.confirmedBagsText}>
                        {item.confirmed_bags ?? '?'} bags
                      </Text>
                    </View>
                  </View>
                  <View style={st.kmActions}>
                    <Button
                      title="Resend KM Email"
                      variant="outline"
                      size="sm"
                      onPress={() => handleResendKmEmail(item.id)}
                      loading={resendKmEmail.isPending}
                      icon={<Ionicons name="mail" size={14} color="#111827" />}
                    />
                    <Button
                      title="Correct KM"
                      variant="secondary"
                      size="sm"
                      onPress={() => handleOpenCorrectKm(item)}
                      icon={<Ionicons name="speedometer" size={14} color={colors.gray[800]} />}
                    />
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={st.empty}>
                  <View style={st.emptyIcon}>
                    <Ionicons name="checkmark-done-outline" size={36} color={colors.gray[300]} />
                  </View>
                  <Text style={st.emptyTitle}>No confirmed deliveries</Text>
                  <Text style={st.emptyBody}>Confirmed deliveries will appear here.</Text>
                </View>
              }
            />
          )
        )}

        {/* ── Correct KM Modal ── */}
        <Modal
          visible={correctKmModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCorrectKmModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={st.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={st.modalContent}>
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>Correct Closing KM</Text>
                <TouchableOpacity onPress={() => setCorrectKmModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={colors.gray[400]} />
                </TouchableOpacity>
              </View>
              {selectedTripForKm && selectedTripForKm.startingKm > 0 && (
                <View style={st.modalHintRow}>
                  <Text style={st.modalHint}>
                    Starting KM: {selectedTripForKm.startingKm.toLocaleString()}
                    {selectedTripForKm.currentKm > 0
                      ? ` | Current: ${selectedTripForKm.currentKm.toLocaleString()}`
                      : ''}
                  </Text>
                </View>
              )}
              <Input
                label="New Closing KM"
                value={newKmValue}
                onChangeText={setNewKmValue}
                keyboardType="numeric"
                placeholder="e.g. 145230"
              />
              <Input
                label="Reason for correction"
                value={kmReason}
                onChangeText={setKmReason}
                placeholder="Why is this being corrected?"
                multiline
                numberOfLines={2}
                style={{ minHeight: 60, textAlignVertical: 'top' }}
                containerStyle={{ marginTop: spacing.md }}
              />
              <View style={st.modalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setCorrectKmModalVisible(false)}
                />
                <Button
                  title="Save Correction"
                  onPress={handleSubmitCorrectKm}
                  loading={correctKm.isPending}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WARM_BG },

  /* ── Tab bar ── */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#111827' },
  tabText: {
    fontSize: 14, fontWeight: '500', color: '#9ca3af',
    letterSpacing: 0.1,
  },
  tabTextActive: { color: '#111827', fontWeight: '700' },
  tabCount: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
    minWidth: 20, alignItems: 'center',
  },
  tabCountActive: { backgroundColor: '#111827' },
  tabCountText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  tabCountTextActive: { color: '#fff' },

  /* ── List ── */
  list: { padding: 16, gap: 14 },

  /* ── Empty ── */
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.2 },
  emptyBody: { fontSize: 14, fontWeight: '400', color: '#9ca3af', marginTop: 6 },

  /* ── Confirmed deliveries ── */
  confirmedCard: {
    backgroundColor: '#fff', borderRadius: CARD_R, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
    }),
  },
  confirmedHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12,
  },
  confirmedLocation: {
    fontSize: 15, fontWeight: '700', color: '#111827', letterSpacing: -0.2,
  },
  confirmedTrip: {
    fontSize: 13, fontWeight: '400', color: '#9ca3af', marginTop: 2,
  },
  confirmedBagsPill: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  confirmedBagsText: {
    fontSize: 13, fontWeight: '600', color: '#059669',
  },
  kmActions: {
    flexDirection: 'row', gap: 10,
    paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f3f4f6',
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.2,
  },
  modalHintRow: { marginBottom: 4 },
  modalHint: {
    fontSize: 13, fontWeight: '400', color: '#9ca3af',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 8, marginTop: 12,
  },
});
