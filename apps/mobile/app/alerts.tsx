import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useAlerts, useAcknowledgeAlert } from '../src/hooks/useAlerts';
import { usePendingDeliveries, useConfirmDelivery, useResendKmEmail, useCorrectKm } from '../src/hooks/useDeliveries';
import { Loading } from '../src/components/ui/Loading';
import { QueryErrorState } from '../src/components/ui/QueryErrorState';
import { timeAgo } from '../src/utils/dates';
import {
  PaperBackground,
  Masthead,
  MonoText,
  KickerLabel,
  Stamp,
  SerifNumber,
  HardShadowFrame,
  InkButton,
  DFieldBox,
} from '../src/components/wp';
import { wp, fmtKickerDate } from '../src/constants/warehousePaper';
import type { PendingDelivery, AlertItem } from '../src/types';

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

  const handleAcknowledge = (alert: AlertItem) => {
    ackMutation.mutate({
      alert_type: alert.type,
      location_id: alert.location_id,
      item_id: alert.item_id,
    });
  };

  const handleConfirmDelivery = (deliveryId: string, claimedBags: number) => {
    if (confirmMutation.isPending) return;
    Alert.alert('Confirm Delivery', `Confirm ${claimedBags} bags received?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => confirmMutation.mutate({ id: deliveryId, data: { confirmed_bags: claimedBags } }) },
    ]);
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

  const tabs: { key: Tab; label: string; count: number; show: boolean }[] = [
    { key: 'alerts', label: 'Alerts', count: activeAlerts.length, show: true },
    { key: 'deliveries', label: 'Pending', count: pendingDeliveries.length, show: isManager },
    { key: 'confirmed', label: 'Confirmed', count: confirmedList.length, show: isVehicleManager },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Masthead
          kicker={`OPS DESK — ${fmtKickerDate()}`}
          title="Alerts & ledger"
          backUseRouter
        />

        {/* Tab strip */}
        {visibleTabs.length > 1 && (
          <View style={styles.tabStrip}>
            {visibleTabs.map((t) => {
              const on = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  activeOpacity={0.7}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, on && styles.tabActive]}
                >
                  <MonoText
                    size={11}
                    weight={on ? 700 : 500}
                    tracking={1.5}
                    upper
                    color={on ? wp.color.ink : wp.color.ink3}
                  >
                    {t.label}
                    {'  '}
                    {t.count}
                  </MonoText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tab === 'alerts' ? (
          alerts.isLoading ? (
            <Loading fullScreen message="" />
          ) : alerts.isError ? (
            <QueryErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
          ) : (
            <FlatList
              data={activeAlerts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={alerts.isRefetching} onRefresh={() => alerts.refetch()} tintColor={wp.color.ink2} />}
              renderItem={({ item, index }) => (
                <AlertVoucher
                  alert={item}
                  rowIndex={index}
                  onAcknowledge={() => handleAcknowledge(item)}
                />
              )}
              ListEmptyComponent={<EmptyState title="All clear" subtitle="No active stock alerts right now" />}
            />
          )
        ) : tab === 'deliveries' ? (
          deliveries.isLoading ? (
            <Loading fullScreen message="" />
          ) : deliveries.isError ? (
            <QueryErrorState error={deliveries.error} onRetry={() => deliveries.refetch()} />
          ) : (
            <FlatList
              data={pendingDeliveries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={deliveries.isRefetching} onRefresh={() => deliveries.refetch()} tintColor={wp.color.ink2} />}
              renderItem={({ item, index }) => (
                <DeliveryVoucher
                  delivery={item}
                  rowIndex={index}
                  onConfirm={() =>
                    handleConfirmDelivery(
                      item.id,
                      item.driver_claimed_bags ?? Math.round(item.driver_claimed_qty_kg / 10),
                    )
                  }
                />
              )}
              ListEmptyComponent={<EmptyState title="Nothing pending" subtitle="All deliveries are confirmed" />}
            />
          )
        ) : (
          confirmedDeliveries.isLoading ? (
            <Loading fullScreen message="" />
          ) : (
            <FlatList
              data={confirmedList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={confirmedDeliveries.isRefetching} onRefresh={() => confirmedDeliveries.refetch()} tintColor={wp.color.ink2} />}
              renderItem={({ item, index }) => (
                <ConfirmedDeliveryVoucher
                  delivery={item}
                  rowIndex={index}
                  onResendEmail={() => handleResendKmEmail(item.id)}
                  onCorrectKm={() => handleOpenCorrectKm(item)}
                  resendLoading={resendKmEmail.isPending}
                />
              )}
              ListEmptyComponent={<EmptyState title="Nothing here yet" subtitle="Confirmed deliveries will appear here" />}
            />
          )
        )}

        {/* Correct-KM modal */}
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
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text allowFontScaling={false} style={styles.modalTitle}>
                  Correct closing KM
                </Text>
                <TouchableOpacity
                  onPress={() => setCorrectKmModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MonoText size={14} weight={700} color={wp.color.ink}>×</MonoText>
                </TouchableOpacity>
              </View>
              {selectedTripForKm && selectedTripForKm.startingKm > 0 && (
                <MonoText size={10} tracking={1} upper color={wp.color.ink3} style={{ marginBottom: 10 }}>
                  Starting KM: {selectedTripForKm.startingKm.toLocaleString()}
                  {selectedTripForKm.currentKm > 0
                    ? ` · Current: ${selectedTripForKm.currentKm.toLocaleString()}`
                    : ''}
                </MonoText>
              )}
              <DFieldBox label="New closing KM">
                <View style={styles.textInputBox}>
                  <TextInput
                    value={newKmValue}
                    onChangeText={setNewKmValue}
                    keyboardType="number-pad"
                    placeholder="e.g. 145230"
                    placeholderTextColor={wp.color.ink3}
                    style={styles.textInput}
                  />
                </View>
              </DFieldBox>
              <DFieldBox label="Reason" noDivider>
                <View style={styles.notesBox}>
                  <TextInput
                    value={kmReason}
                    onChangeText={setKmReason}
                    placeholder="Why is this being corrected?"
                    placeholderTextColor={wp.color.ink3}
                    multiline
                    style={styles.notesInput}
                  />
                </View>
              </DFieldBox>
              <View style={styles.modalActions}>
                <InkButton label="Save correction" onPress={handleSubmitCorrectKm} variant="solid" loading={correctKm.isPending} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </PaperBackground>
  );
}

function AlertVoucher({
  alert,
  rowIndex,
  onAcknowledge,
}: {
  alert: AlertItem;
  rowIndex: number;
  onAcknowledge: () => void;
}) {
  const stampColor = alert.severity === 'error' ? 'red' : alert.severity === 'warning' ? 'amber' : 'ink';
  const stampLabel =
    alert.type === 'low_stock' ? 'LOW' :
    alert.type === 'reorder_now' ? 'REORDER' :
    alert.type === 'expiring_soon' ? 'EXPIRING' :
    alert.type === 'expired' ? 'EXPIRED' : 'ALERT';

  return (
    <HardShadowFrame style={{ marginBottom: 10 }}>
      <View style={styles.voucher}>
        <View style={styles.voucherHead}>
          <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
            {alert.location_name.toUpperCase()}
          </KickerLabel>
          <Stamp color={stampColor} rowIndex={rowIndex}>
            {stampLabel}
          </Stamp>
        </View>
        <Text allowFontScaling={false} style={styles.voucherTitle}>
          {alert.title}
        </Text>
        <MonoText size={11} color={wp.color.ink2} style={{ marginTop: 6 }}>
          {alert.message}
        </MonoText>
        <MonoText size={10} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
          {timeAgo(alert.created_at).toUpperCase()} · {alert.item_name.toUpperCase()}
        </MonoText>
        <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
          <InkButton label="Acknowledge" onPress={onAcknowledge} />
        </View>
      </View>
    </HardShadowFrame>
  );
}

function DeliveryVoucher({
  delivery,
  rowIndex,
  onConfirm,
}: {
  delivery: PendingDelivery;
  rowIndex: number;
  onConfirm: () => void;
}) {
  const claimedBags = delivery.driver_claimed_bags ?? Math.round(delivery.driver_claimed_qty_kg / 10);
  const scannedBags = delivery.driver_scanned_bags;

  return (
    <HardShadowFrame style={{ marginBottom: 10 }}>
      <View style={styles.voucher}>
        <View style={styles.voucherHead}>
          <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
            {(delivery.location?.name ?? 'Unknown').toUpperCase()}
          </KickerLabel>
          <Stamp color="amber" rowIndex={rowIndex}>
            PENDING
          </Stamp>
        </View>

        <View style={styles.deliveryHero}>
          <SerifNumber size={48} tracking={-1.5} leading={1} color={wp.color.ink} autoShrink>
            {claimedBags}
          </SerifNumber>
          <View style={{ marginLeft: 10 }}>
            <MonoText size={10} tracking={1.5} color={wp.color.ink3}>BAGS CLAIMED</MonoText>
            {scannedBags != null && (
              <MonoText size={10} tracking={1} color={wp.color.ink3} style={{ marginTop: 2 }}>
                {scannedBags} SCANNED
              </MonoText>
            )}
          </View>
        </View>

        {delivery.trip && (
          <MonoText size={10} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 10 }}>
            TRIP {delivery.trip.trip_number}
            {delivery.trip.driver_name ? ` · ${delivery.trip.driver_name.toUpperCase()}` : ''}
          </MonoText>
        )}

        <MonoText size={10} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 4 }}>
          {timeAgo(delivery.created_at).toUpperCase()}
        </MonoText>

        <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
          <InkButton label={`Confirm ${claimedBags} bags`} onPress={onConfirm} variant="solid" />
        </View>
      </View>
    </HardShadowFrame>
  );
}

function ConfirmedDeliveryVoucher({
  delivery,
  rowIndex,
  onResendEmail,
  onCorrectKm,
  resendLoading,
}: {
  delivery: PendingDelivery;
  rowIndex: number;
  onResendEmail: () => void;
  onCorrectKm: () => void;
  resendLoading: boolean;
}) {
  return (
    <HardShadowFrame style={{ marginBottom: 10 }}>
      <View style={styles.voucher}>
        <View style={styles.voucherHead}>
          <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
            {(delivery.location?.name ?? 'Unknown').toUpperCase()}
          </KickerLabel>
          <Stamp color="green" rowIndex={rowIndex}>
            CONFIRMED
          </Stamp>
        </View>

        {delivery.trip && (
          <MonoText size={11} color={wp.color.ink2} style={{ marginTop: 6 }}>
            {delivery.trip.trip_number}
            {delivery.trip.driver_name ? ` · ${delivery.trip.driver_name}` : ''}
          </MonoText>
        )}

        <MonoText size={14} weight={700} color={wp.color.ink} style={{ marginTop: 6 }}>
          {delivery.confirmed_bags ?? '?'} BAGS
        </MonoText>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <InkButton label="Resend KM email" onPress={onResendEmail} loading={resendLoading} />
          <InkButton label="Correct KM" onPress={onCorrectKm} />
        </View>
      </View>
    </HardShadowFrame>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={styles.emptyTitle}>
        {title}
      </Text>
      <MonoText size={11} tracking={1} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
        {subtitle}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Tab strip
  tabStrip: {
    flexDirection: 'row',
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: wp.color.ink,
    marginBottom: -1.5,
  },

  list: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Voucher
  voucher: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    padding: 14,
  },
  voucherHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 18,
    color: wp.color.ink,
    marginTop: 6,
  },

  deliveryHero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },

  // Empty
  empty: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 28,
    letterSpacing: -1,
    color: wp.color.ink,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26,25,22,0.4)',
  },
  modalSheet: {
    backgroundColor: wp.color.paper,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 24,
    letterSpacing: -0.5,
    color: wp.color.ink,
  },
  modalActions: {
    marginTop: 14,
    alignItems: 'flex-start',
  },

  textInputBox: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: wp.color.voucherBg,
  },
  textInput: {
    fontFamily: wp.font.mono.fontFamily,
    fontWeight: wp.font.mono.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
    padding: 0,
  },

  notesBox: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 12,
    minHeight: 60,
  },
  notesInput: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontStyle: 'italic',
    fontSize: 13,
    color: wp.color.ink,
    minHeight: 44,
    textAlignVertical: 'top',
    padding: 0,
  },
});
