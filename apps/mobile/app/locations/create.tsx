import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useZones, useCreateLocation } from '../../src/hooks/useLocations';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  MonoInput,
  MonoText,
  PrimaryBar,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { LocationType } from '../../src/types';

export default function CreateLocationScreen() {
  const router = useRouter();
  const zones = useZones();
  const createLocation = useCreateLocation();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<LocationType>('shop');
  const [zoneId, setZoneId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'NAME REQUIRED';
    if (!zoneId) e.zoneId = 'PICK A ZONE';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createLocation.mutate(
      {
        name: name.trim(),
        zone_id: zoneId,
        type,
        address: address.trim() || undefined,
      },
      { onSuccess: () => router.back() },
    );
  };

  if (zones.isLoading) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  const zoneList = zones.data?.zones ?? [];
  const canSubmit = name.trim().length > 0 && !!zoneId;

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
              kicker={`NEW LOCATION — ${fmtKickerDate()}`}
              title="Add location"
              backUseRouter
            />
            <View style={styles.body}>
              <IntentStrip>
                Add a shop or warehouse to a zone. Stock thresholds can be set after creation.
              </IntentStrip>

              <MonoInput
                label="Name · required"
                value={name}
                onChangeText={setName}
                placeholder="Sandton Shop"
              />
              {errors.name && (
                <MonoText size={9} tracking={1} upper color={wp.color.red}>
                  {errors.name}
                </MonoText>
              )}
              <MonoInput
                label="Address · optional"
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main Rd"
              />

              <View style={styles.subSection}>
                <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                  Type · required
                </MonoText>
                <View style={styles.typeRow}>
                  <TypeOption
                    label="Shop"
                    active={type === 'shop'}
                    onPress={() => setType('shop')}
                  />
                  <TypeOption
                    label="Warehouse"
                    active={type === 'warehouse'}
                    onPress={() => setType('warehouse')}
                  />
                </View>
              </View>

              <View style={styles.subSection}>
                <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                  Zone · required
                </MonoText>
                {errors.zoneId && (
                  <MonoText size={9} tracking={1} upper color={wp.color.red}>
                    {errors.zoneId}
                  </MonoText>
                )}
                <View style={styles.zoneList}>
                  {zoneList.length === 0 ? (
                    <MonoText
                      size={11}
                      tracking={1}
                      upper
                      color={wp.color.ink3}
                      style={{ padding: 14 }}
                    >
                      No zones — create one first
                    </MonoText>
                  ) : (
                    zoneList.map((z) => (
                      <ZoneOption
                        key={z.id}
                        label={z.name}
                        active={zoneId === z.id}
                        onPress={() => setZoneId(z.id)}
                      />
                    ))
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <PrimaryBar
          label="Create location"
          onPress={handleSubmit}
          loading={createLocation.isPending}
          disabled={!canSubmit}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

function TypeOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.typeOption, active && styles.typeOptionActive]}
    >
      <MonoText
        size={12}
        tracking={1.5}
        upper
        weight={active ? 700 : 500}
        color={active ? wp.color.paper : wp.color.ink}
      >
        {active ? '■ ' : '□ '}
        {label}
      </MonoText>
    </TouchableOpacity>
  );
}

function ZoneOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.zoneItem, active && styles.zoneItemActive]}
    >
      <MonoText
        size={11}
        tracking={1}
        upper
        weight={active ? 700 : 500}
        color={active ? wp.color.paper : wp.color.ink}
      >
        {active ? '■ ' : '□ '}
        {label}
      </MonoText>
    </TouchableOpacity>
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
  subSection: {
    paddingTop: 16,
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: wp.color.ink,
  },
  zoneList: {
    borderWidth: 1,
    borderColor: wp.color.lineD,
  },
  zoneItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  zoneItemActive: {
    backgroundColor: wp.color.ink,
  },
});
