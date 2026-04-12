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
import { Card } from '../src/components/ui/Card';
import { Loading } from '../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../src/constants/theme';
import type { PendingDelivery } from '../src/types';

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
                Pending ({pendingDeliveries.length})
              </Text>
            </TouchableOpacity>
            {isVehicleManager && (
              <TouchableOpacity
                style={[styles.tab, tab === 'confirmed' && styles.activeTab]}
                onPress={() => setTab('confirmed')}
              >
                <Text style={[styles.tabText, tab === 'confirmed' && styles.activeTabText]}>
                  Confirmed ({confirmedList.length})
                </Text>
              </TouchableOpacity>
            )}
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
        ) : tab === 'deliveries' ? (
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
        ) : (
          confirmedDeliveries.isLoading ? (
            <Loading fullScreen message="Loading confirmed deliveries..." />
          ) : (
            <FlatList
              data={confirmedList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={confirmedDeliveries.isRefetching}
                  onRefresh={() => confirmedDeliveries.refetch()}
                />
              }
              renderItem={({ item }) => (
                <Card>
                  <View style={styles.confirmedHeader}>
                    <Text style={styles.confirmedLocation}>
                      {item.location?.name ?? 'Unknown'}
                    </Text>
                    <Text style={styles.confirmedBags}>
                      {item.confirmed_bags ?? '?'} bags
                    </Text>
                  </View>
                  {item.trip && (
                    <Text style={styles.confirmedTrip}>
                      {item.trip.trip_number}
                      {item.trip.driver_name ? ` — ${item.trip.driver_name}` : ''}
                    </Text>
                  )}
                  <View style={styles.kmActions}>
                    <Button
                      title="Resend KM Email"
                      variant="outline"
                      size="sm"
                      onPress={() => handleResendKmEmail(item.id)}
                      loading={resendKmEmail.isPending}
                      icon={<Ionicons name="mail" size={14} color={colors.primary[500]} />}
                    />
                    <Button
                      title="Correct KM"
                      variant="secondary"
                      size="sm"
                      onPress={() => handleOpenCorrectKm(item)}
                      icon={<Ionicons name="speedometer" size={14} color={colors.gray[800]} />}
                    />
                  </View>
                </Card>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No confirmed deliveries</Text>
                  <Text style={styles.emptyBody}>Confirmed deliveries will appear here.</Text>
                </View>
              }
            />
          )
        )}

        {/* Correct KM Modal */}
        <Modal
          visible={correctKmModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCorrectKmModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Correct Closing KM</Text>
                <TouchableOpacity onPress={() => setCorrectKmModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.gray[500]} />
                </TouchableOpacity>
              </View>
              {selectedTripForKm && selectedTripForKm.startingKm > 0 && (
                <Text style={styles.modalHint}>
                  Starting KM: {selectedTripForKm.startingKm.toLocaleString()}
                  {selectedTripForKm.currentKm > 0
                    ? ` | Current: ${selectedTripForKm.currentKm.toLocaleString()}`
                    : ''}
                </Text>
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
              <View style={styles.modalActions}>
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
  // Confirmed deliveries
  confirmedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confirmedLocation: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  confirmedBags: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  confirmedTrip: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  kmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Correct KM modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  modalHint: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
