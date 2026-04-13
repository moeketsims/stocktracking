import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateTrip } from '../../src/hooks/useTrips';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useLocations } from '../../src/hooks/useLocations';
import { referenceApi } from '../../src/api/reference';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Card } from '../../src/components/ui/Card';
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { TripType } from '../../src/types';

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'supplier_to_warehouse', label: 'Supplier to Warehouse' },
  { value: 'supplier_to_shop', label: 'Supplier to Shop' },
  { value: 'warehouse_to_shop', label: 'Warehouse to Shop' },
  { value: 'shop_to_shop', label: 'Shop to Shop' },
  { value: 'shop_to_warehouse', label: 'Shop to Warehouse' },
  { value: 'other', label: 'Other' },
];

interface PickerOption {
  value: string;
  label: string;
}

function DropdownPicker({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  options: PickerOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={pickerStyles.container}>
      <Text style={pickerStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[pickerStyles.trigger, error ? pickerStyles.errorBorder : null]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={selected ? pickerStyles.selectedText : pickerStyles.placeholder}>
          {selected?.label ?? placeholder ?? 'Select...'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.gray[400]}
        />
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.dropdown}>
          <ScrollView style={pickerStyles.dropdownScroll} nestedScrollEnabled>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  pickerStyles.option,
                  opt.value === value && pickerStyles.optionActive,
                ]}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    pickerStyles.optionText,
                    opt.value === value && pickerStyles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {error && <Text style={pickerStyles.errorText}>{error}</Text>}
    </View>
  );
}

export default function CreateTripScreen() {
  const router = useRouter();
  const createTrip = useCreateTrip();

  // Reference data
  const vehicles = useVehicles(true);
  const locations = useLocations();
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then((r) => r.data),
  });

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [tripType, setTripType] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsSupplier = tripType === 'supplier_to_warehouse' || tripType === 'supplier_to_shop';
  const needsFromLocation =
    tripType === 'warehouse_to_shop' ||
    tripType === 'shop_to_shop' ||
    tripType === 'shop_to_warehouse';

  const vehicleOptions: PickerOption[] = (vehicles.data ?? [])
    .filter((v) => v.is_active)
    .map((v) => ({
      value: v.id,
      label: `${v.registration_number}${v.make ? ` (${v.make})` : ''}`,
    }));

  const locationOptions: PickerOption[] = (locations.data ?? []).map((l) => ({
    value: l.id,
    label: `${l.name} (${l.type})`,
  }));

  const supplierOptions: PickerOption[] = (suppliers.data ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const tripTypeOptions: PickerOption[] = TRIP_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
  }));

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!vehicleId) newErrors.vehicleId = 'Vehicle is required';
    if (!tripType) newErrors.tripType = 'Trip type is required';
    if (needsSupplier && !supplierId) newErrors.supplierId = 'Supplier is required';
    if (needsFromLocation && !fromLocationId) newErrors.fromLocationId = 'From location is required';
    if (!toLocationId) newErrors.toLocationId = 'Destination is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createTrip.mutate(
      {
        vehicle_id: vehicleId,
        driver_name: driverName || undefined,
        trip_type: tripType || undefined,
        supplier_id: needsSupplier ? supplierId : undefined,
        from_location_id: needsFromLocation ? fromLocationId : undefined,
        to_location_id: toLocationId,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
      },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Trip',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.sectionTitle}>Trip Details</Text>

            <DropdownPicker
              label="Vehicle *"
              options={vehicleOptions}
              value={vehicleId}
              onChange={setVehicleId}
              placeholder="Select a vehicle"
              error={errors.vehicleId}
            />

            <Input
              label="Driver Name (optional)"
              value={driverName}
              onChangeText={setDriverName}
              placeholder="Enter driver name"
              containerStyle={{ marginTop: spacing.md }}
            />

            <View style={{ marginTop: spacing.md }}>
              <DropdownPicker
                label="Trip Type *"
                options={tripTypeOptions}
                value={tripType}
                onChange={(val) => {
                  setTripType(val);
                  setSupplierId('');
                  setFromLocationId('');
                }}
                placeholder="Select trip type"
                error={errors.tripType}
              />
            </View>

            {needsSupplier && (
              <View style={{ marginTop: spacing.md }}>
                <DropdownPicker
                  label="Supplier *"
                  options={supplierOptions}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Select supplier"
                  error={errors.supplierId}
                />
              </View>
            )}

            {needsFromLocation && (
              <View style={{ marginTop: spacing.md }}>
                <DropdownPicker
                  label="From Location *"
                  options={locationOptions}
                  value={fromLocationId}
                  onChange={setFromLocationId}
                  placeholder="Select origin"
                  error={errors.fromLocationId}
                />
              </View>
            )}

            <View style={{ marginTop: spacing.md }}>
              <DropdownPicker
                label="Destination *"
                options={locationOptions}
                value={toLocationId}
                onChange={setToLocationId}
                placeholder="Select destination"
                error={errors.toLocationId}
              />
            </View>

            <Input
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes"
              multiline
              numberOfLines={3}
              containerStyle={{ marginTop: spacing.md }}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>

          <Button
            title="Create Trip"
            onPress={handleSubmit}
            loading={createTrip.isPending}
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
});

const pickerStyles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  placeholder: {
    fontSize: fontSize.md,
    color: colors.gray[400],
  },
  selectedText: {
    fontSize: fontSize.md,
    color: colors.gray[900],
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  dropdownScroll: { maxHeight: 200 },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  optionActive: {
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.gray[700],
  },
  optionTextActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
  },
});
