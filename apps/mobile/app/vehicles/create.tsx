import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCreateVehicle } from '../../src/hooks/useVehicles';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { brand, colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

export default function CreateVehicleScreen() {
  const router = useRouter();
  const createVehicle = useCreateVehicle();

  const [form, setForm] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: '',
    capacity_kg: '',
    fuel_type: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.registration_number.trim()) {
      newErrors.registration_number = 'Registration number is required';
    }
    if (form.year && (isNaN(Number(form.year)) || Number(form.year) < 1900)) {
      newErrors.year = 'Enter a valid year';
    }
    if (form.capacity_kg && (isNaN(Number(form.capacity_kg)) || Number(form.capacity_kg) <= 0)) {
      newErrors.capacity_kg = 'Enter a valid capacity';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;

    createVehicle.mutate(
      {
        registration_number: form.registration_number.trim(),
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? parseInt(form.year, 10) : null,
        capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : null,
        fuel_type: form.fuel_type.trim() || null,
        notes: form.notes.trim() || null,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Vehicle',
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
            <Card>
              <Text style={styles.sectionTitle}>New Vehicle</Text>
              <View style={styles.form}>
                <Input
                  label="Registration Number *"
                  value={form.registration_number}
                  onChangeText={(v) => {
                    setForm((f) => ({ ...f, registration_number: v }));
                    if (errors.registration_number) setErrors((e) => ({ ...e, registration_number: '' }));
                  }}
                  autoCapitalize="characters"
                  placeholder="e.g. ABC 123 GP"
                  error={errors.registration_number}
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
                  onChangeText={(v) => {
                    setForm((f) => ({ ...f, year: v }));
                    if (errors.year) setErrors((e) => ({ ...e, year: '' }));
                  }}
                  keyboardType="number-pad"
                  placeholder="e.g. 2022"
                  error={errors.year}
                />
                <Input
                  label="Capacity (kg)"
                  value={form.capacity_kg}
                  onChangeText={(v) => {
                    setForm((f) => ({ ...f, capacity_kg: v }));
                    if (errors.capacity_kg) setErrors((e) => ({ ...e, capacity_kg: '' }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2000"
                  error={errors.capacity_kg}
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
                  placeholder="Optional notes about this vehicle"
                />
              </View>
            </Card>

            <Button
              title="Create Vehicle"
              onPress={handleCreate}
              loading={createVehicle.isPending}
              disabled={!form.registration_number.trim()}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  form: { gap: spacing.md },
});
