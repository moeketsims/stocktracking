import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  useVehicle,
  useUpdateVehicle,
  useDeactivateVehicle,
} from '../../src/hooks/useVehicles';
import { useAuthStore } from '../../src/stores/authStore';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  HardShadowFrame,
  ActionStack,
  MonoInput,
  IntentStrip,
  Toggle,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: vehicle, isLoading } = useVehicle(id);
  const updateVehicle = useUpdateVehicle();
  const deactivateVehicle = useDeactivateVehicle();

  const canManage = ['admin', 'vehicle_manager'].includes(user?.role ?? '');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: '',
    capacity_kg: '',
    fuel_type: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (vehicle) {
      setForm({
        registration_number: vehicle.registration_number ?? '',
        make: vehicle.make ?? '',
        model: vehicle.model ?? '',
        year: vehicle.year != null ? String(vehicle.year) : '',
        capacity_kg: vehicle.capacity_kg != null ? String(vehicle.capacity_kg) : '',
        fuel_type: vehicle.fuel_type ?? '',
        notes: vehicle.notes ?? '',
        is_active: vehicle.is_active,
      });
    }
  }, [vehicle]);

  if (isLoading || !vehicle) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  const handleSave = () => {
    const data: Record<string, unknown> = {};
    if (form.registration_number !== (vehicle.registration_number ?? ''))
      data.registration_number = form.registration_number;
    if (form.make !== (vehicle.make ?? '')) data.make = form.make || null;
    if (form.model !== (vehicle.model ?? '')) data.model = form.model || null;
    if (form.fuel_type !== (vehicle.fuel_type ?? '')) data.fuel_type = form.fuel_type || null;
    if (form.notes !== (vehicle.notes ?? '')) data.notes = form.notes || null;

    const yearNum = form.year ? parseInt(form.year, 10) : null;
    if (yearNum !== (vehicle.year ?? null)) data.year = yearNum;

    const capNum = form.capacity_kg ? parseFloat(form.capacity_kg) : null;
    if (capNum !== (vehicle.capacity_kg ?? null)) data.capacity_kg = capNum;

    if (form.is_active !== vehicle.is_active) data.is_active = form.is_active;

    if (Object.keys(data).length === 0) {
      setEditing(false);
      return;
    }

    updateVehicle.mutate({ id: vehicle.id, data }, { onSuccess: () => setEditing(false) });
  };

  const handleDeactivate = () => {
    Alert.alert('Deactivate vehicle', `Stand down ${vehicle.registration_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () =>
          deactivateVehicle.mutate(vehicle.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const recordNumber = (vehicle.id ?? '').slice(-4).toUpperCase();
  const onTrip = vehicle.is_available === false;
  const stamp = !vehicle.is_active
    ? { label: 'OFF', color: wp.color.ink3 }
    : onTrip
      ? { label: 'ON TRIP', color: '#5B2CA5' }
      : { label: 'FREE', color: wp.color.green };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Masthead
              kicker={`VEHICLE · ${recordNumber}`}
              title={vehicle.registration_number}
              backUseRouter
            />

            <View style={styles.heroWrap}>
              <HardShadowFrame>
                <View style={styles.hero}>
                  <View style={styles.heroTop}>
                    <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                      RECORD N° {recordNumber}
                    </KickerLabel>
                    <Stamp colorHex={stamp.color} rotate={-3}>
                      {stamp.label}
                    </Stamp>
                  </View>
                  <SerifNumber size={26} tracking={-1} leading={1.05} style={styles.heroName}>
                    {vehicle.registration_number}
                  </SerifNumber>
                  <View style={styles.metaList}>
                    <MetaRow label="Make" value={vehicle.make ?? '—'} />
                    <MetaRow label="Model" value={vehicle.model ?? '—'} />
                    <MetaRow
                      label="Year"
                      value={vehicle.year != null ? String(vehicle.year) : '—'}
                    />
                    <MetaRow
                      label="Capacity"
                      value={vehicle.capacity_kg != null ? `${vehicle.capacity_kg} kg` : '—'}
                    />
                    <MetaRow label="Fuel" value={vehicle.fuel_type ?? '—'} />
                    {vehicle.notes ? <MetaRow label="Notes" value={vehicle.notes} /> : null}
                  </View>
                </View>
              </HardShadowFrame>
            </View>

            {editing && canManage && (
              <View style={styles.formWrap}>
                <IntentStrip>Update vehicle registration, capacity, and status.</IntentStrip>
                <MonoInput
                  label="Registration"
                  value={form.registration_number}
                  onChangeText={(v) => setForm((f) => ({ ...f, registration_number: v }))}
                  autoCapitalize="characters"
                />
                <MonoInput
                  label="Make"
                  value={form.make}
                  onChangeText={(v) => setForm((f) => ({ ...f, make: v }))}
                  placeholder="e.g. Toyota"
                />
                <MonoInput
                  label="Model"
                  value={form.model}
                  onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
                  placeholder="e.g. Hilux"
                />
                <MonoInput
                  label="Year"
                  value={form.year}
                  onChangeText={(v) => setForm((f) => ({ ...f, year: v }))}
                  keyboardType="number-pad"
                  placeholder="2022"
                />
                <MonoInput
                  label="Capacity · kg"
                  value={form.capacity_kg}
                  onChangeText={(v) => setForm((f) => ({ ...f, capacity_kg: v }))}
                  keyboardType="decimal-pad"
                  placeholder="2000"
                />
                <MonoInput
                  label="Fuel type"
                  value={form.fuel_type}
                  onChangeText={(v) => setForm((f) => ({ ...f, fuel_type: v }))}
                  placeholder="Diesel"
                />
                <MonoInput
                  label="Notes · optional"
                  value={form.notes}
                  onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                />
                <View style={styles.toggleRow}>
                  <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                    Active
                  </MonoText>
                  <Toggle
                    value={form.is_active}
                    onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                </View>
              </View>
            )}

            {canManage && (
              <View style={styles.actionsWrap}>
                {editing ? (
                  <ActionStack
                    actions={[
                      {
                        label: 'Save changes',
                        onPress: handleSave,
                        filled: true,
                        loading: updateVehicle.isPending,
                      },
                      { label: 'Cancel', onPress: () => setEditing(false), color: wp.color.ink3 },
                    ]}
                  />
                ) : (
                  <ActionStack
                    actions={[
                      { label: 'Edit vehicle', onPress: () => setEditing(true) },
                      ...(vehicle.is_active
                        ? [
                            {
                              label: 'Deactivate',
                              onPress: handleDeactivate,
                              color: wp.color.red,
                              loading: deactivateVehicle.isPending,
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <MonoText
        size={10}
        tracking={1.5}
        upper
        weight={600}
        color={wp.color.ink3}
        style={{ width: 80 }}
      >
        {label}
      </MonoText>
      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 60 },
  heroWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },
  hero: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroName: { marginTop: 10 },
  metaList: { marginTop: 14, gap: 8 },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    alignItems: 'baseline',
  },
  metaValue: {
    flex: 1,
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  formWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    gap: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  actionsWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.section,
  },
});
