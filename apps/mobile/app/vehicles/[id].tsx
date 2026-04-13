import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useVehicle, useUpdateVehicle, useDeactivateVehicle } from '../../src/hooks/useVehicles';
import { useAuthStore } from '../../src/stores/authStore';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { brand, colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

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
    return <Loading fullScreen message="Loading vehicle..." />;
  }

  const handleSave = () => {
    const data: Record<string, unknown> = {};
    if (form.registration_number !== (vehicle.registration_number ?? ''))
      data.registration_number = form.registration_number;
    if (form.make !== (vehicle.make ?? ''))
      data.make = form.make || null;
    if (form.model !== (vehicle.model ?? ''))
      data.model = form.model || null;
    if (form.fuel_type !== (vehicle.fuel_type ?? ''))
      data.fuel_type = form.fuel_type || null;
    if (form.notes !== (vehicle.notes ?? ''))
      data.notes = form.notes || null;

    const yearNum = form.year ? parseInt(form.year, 10) : null;
    if (yearNum !== (vehicle.year ?? null)) data.year = yearNum;

    const capNum = form.capacity_kg ? parseFloat(form.capacity_kg) : null;
    if (capNum !== (vehicle.capacity_kg ?? null)) data.capacity_kg = capNum;

    if (form.is_active !== vehicle.is_active) data.is_active = form.is_active;

    if (Object.keys(data).length === 0) {
      setEditing(false);
      return;
    }

    updateVehicle.mutate(
      { id: vehicle.id, data },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Vehicle',
      `Are you sure you want to deactivate ${vehicle.registration_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () =>
            deactivateVehicle.mutate(vehicle.id, {
              onSuccess: () => router.back(),
            }),
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: vehicle.registration_number,
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Status card */}
            <Card>
              <View style={styles.statusRow}>
                <Badge
                  label={vehicle.is_active ? 'Active' : 'Inactive'}
                  variant={vehicle.is_active ? 'success' : 'neutral'}
                />
                {vehicle.is_available === false && (
                  <Badge label="On Trip" variant="info" />
                )}
              </View>
            </Card>

            {/* Details card */}
            <Card>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>

              {editing ? (
                <View style={styles.form}>
                  <Input
                    label="Registration Number"
                    value={form.registration_number}
                    onChangeText={(v) => setForm((f) => ({ ...f, registration_number: v }))}
                    autoCapitalize="characters"
                  />
                  <Input
                    label="Make"
                    value={form.make}
                    onChangeText={(v) => setForm((f) => ({ ...f, make: v }))}
                    placeholder="e.g. Toyota"
                  />
                  <Input
                    label="Model"
                    value={form.model}
                    onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
                    placeholder="e.g. Hilux"
                  />
                  <Input
                    label="Year"
                    value={form.year}
                    onChangeText={(v) => setForm((f) => ({ ...f, year: v }))}
                    keyboardType="number-pad"
                    placeholder="e.g. 2022"
                  />
                  <Input
                    label="Capacity (kg)"
                    value={form.capacity_kg}
                    onChangeText={(v) => setForm((f) => ({ ...f, capacity_kg: v }))}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 2000"
                  />
                  <Input
                    label="Fuel Type"
                    value={form.fuel_type}
                    onChangeText={(v) => setForm((f) => ({ ...f, fuel_type: v }))}
                    placeholder="e.g. Diesel"
                  />
                  <Input
                    label="Notes"
                    value={form.notes}
                    onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active</Text>
                    <Switch
                      value={form.is_active}
                      onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                      trackColor={{ false: colors.gray[300], true: colors.success }}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.detailList}>
                  <DetailRow label="Registration" value={vehicle.registration_number} />
                  <DetailRow label="Make" value={vehicle.make ?? '—'} />
                  <DetailRow label="Model" value={vehicle.model ?? '—'} />
                  <DetailRow label="Year" value={vehicle.year != null ? String(vehicle.year) : '—'} />
                  <DetailRow label="Capacity" value={vehicle.capacity_kg != null ? `${vehicle.capacity_kg} kg` : '—'} />
                  <DetailRow label="Fuel Type" value={vehicle.fuel_type ?? '—'} />
                  <DetailRow label="Notes" value={vehicle.notes ?? '—'} />
                </View>
              )}
            </Card>

            {/* Action buttons */}
            {canManage && (
              <View style={styles.actions}>
                {editing ? (
                  <>
                    <Button
                      title="Save Changes"
                      onPress={handleSave}
                      loading={updateVehicle.isPending}
                    />
                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={() => {
                        setEditing(false);
                        // Reset form
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
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Button title="Edit Vehicle" onPress={() => setEditing(true)} />
                    {vehicle.is_active && (
                      <Button
                        title="Deactivate"
                        variant="danger"
                        onPress={handleDeactivate}
                        loading={deactivateVehicle.isPending}
                      />
                    )}
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  statusRow: { flexDirection: 'row', gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  form: { gap: spacing.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  detailList: { gap: spacing.md },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    maxWidth: '60%',
    textAlign: 'right',
  },
  actions: { gap: spacing.sm },
});
