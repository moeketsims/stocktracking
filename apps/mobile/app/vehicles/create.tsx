import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCreateVehicle } from '../../src/hooks/useVehicles';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  MonoInput,
  MonoText,
  PrimaryBar,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.registration_number.trim()) e.registration_number = 'REG REQUIRED';
    if (form.year && (isNaN(Number(form.year)) || Number(form.year) < 1900))
      e.year = 'INVALID YEAR';
    if (form.capacity_kg && (isNaN(Number(form.capacity_kg)) || Number(form.capacity_kg) <= 0))
      e.capacity_kg = 'INVALID CAPACITY';
    setErrors(e);
    return Object.keys(e).length === 0;
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

  const canSubmit = form.registration_number.trim().length > 0;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Masthead
              kicker={`NEW VEHICLE — ${fmtKickerDate()}`}
              title="Add vehicle"
              backUseRouter
            />
            <View style={styles.body}>
              <IntentStrip>
                Register a vehicle to the fleet. Drivers can be assigned trips with this vehicle
                once added.
              </IntentStrip>

              <MonoInput
                label="Registration · required"
                value={form.registration_number}
                onChangeText={(v) =>
                  setForm((f) => ({ ...f, registration_number: v }))
                }
                placeholder="ABC 123 GP"
                autoCapitalize="characters"
              />
              {errors.registration_number && (
                <MonoText size={9} tracking={1} upper color={wp.color.red}>
                  {errors.registration_number}
                </MonoText>
              )}
              <MonoInput
                label="Make"
                value={form.make}
                onChangeText={(v) => setForm((f) => ({ ...f, make: v }))}
                placeholder="Toyota"
              />
              <MonoInput
                label="Model"
                value={form.model}
                onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
                placeholder="Hilux"
              />
              <MonoInput
                label="Year"
                value={form.year}
                onChangeText={(v) => setForm((f) => ({ ...f, year: v }))}
                placeholder="2022"
                keyboardType="number-pad"
              />
              {errors.year && (
                <MonoText size={9} tracking={1} upper color={wp.color.red}>
                  {errors.year}
                </MonoText>
              )}
              <MonoInput
                label="Capacity · kg"
                value={form.capacity_kg}
                onChangeText={(v) => setForm((f) => ({ ...f, capacity_kg: v }))}
                placeholder="2000"
                keyboardType="decimal-pad"
              />
              {errors.capacity_kg && (
                <MonoText size={9} tracking={1} upper color={wp.color.red}>
                  {errors.capacity_kg}
                </MonoText>
              )}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <PrimaryBar
          label="Create vehicle"
          onPress={handleCreate}
          loading={createVehicle.isPending}
          disabled={!canSubmit}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 160 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },
});
