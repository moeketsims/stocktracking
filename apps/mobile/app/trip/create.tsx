import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useCreateTrip } from '../../src/hooks/useTrips';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useLocations } from '../../src/hooks/useLocations';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  DFieldBox,
  PrimaryBar,
  MonoText,
  KickerLabel,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { TripType } from '../../src/types';

const TRIP_TYPES: { value: TripType; code: string; label: string }[] = [
  { value: 'warehouse_to_shop', code: 'W→S', label: 'Warehouse to shop' },
  { value: 'shop_to_shop', code: 'S→S', label: 'Shop to shop' },
  { value: 'supplier_to_warehouse', code: 'SUP→W', label: 'Supplier to warehouse' },
  { value: 'shop_to_warehouse', code: 'S→W', label: 'Shop to warehouse' },
];

export default function CreateTripScreen() {
  const router = useRouter();
  const createMutation = useCreateTrip();
  const { data: vehiclesData, isLoading: vehLoading } = useVehicles(true);
  const { data: locationsData, isLoading: locLoading } = useLocations();

  const vehicles: any[] = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData as any)?.vehicles ?? [];
  const locations = locationsData?.locations ?? [];

  const [tripType, setTripType] = useState<TripType>('warehouse_to_shop');
  const [vehicleId, setVehicleId] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [notes, setNotes] = useState('');

  const selectedVehicle = useMemo(
    () => vehicles.find((v: any) => v.id === vehicleId),
    [vehicles, vehicleId],
  );
  const selectedFrom = useMemo(() => locations.find((l) => l.id === fromId), [locations, fromId]);
  const selectedTo = useMemo(() => locations.find((l) => l.id === toId), [locations, toId]);

  const isValid = !!vehicleId && !!fromId && !!toId && fromId !== toId;

  const handleSubmit = () => {
    if (!isValid) return;
    createMutation.mutate(
      {
        vehicle_id: vehicleId,
        trip_type: tripType,
        from_location_id: fromId,
        to_location_id: toId,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
      },
    );
  };

  if (vehLoading || locLoading) {
    return <Loading fullScreen message="" />;
  }

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`NEW TRIP — ${fmtKickerDate()}`}
            title="Plan a trip"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Create a trip to move stock between locations. Pick a vehicle, set the route, add notes.
            </IntentStrip>

            {/* Trip type — 2×2 tile grid */}
            <DFieldBox label="Trip type">
              <View style={styles.tileGrid}>
                {TRIP_TYPES.map((t) => {
                  const selected = tripType === t.value;
                  return (
                    <TypeTile
                      key={t.value}
                      code={t.code}
                      label={t.label}
                      selected={selected}
                      onPress={() => setTripType(t.value)}
                    />
                  );
                })}
              </View>
            </DFieldBox>

            {/* Vehicle */}
            <DFieldBox label="Vehicle">
              <View style={styles.list}>
                {vehicles.length === 0 ? (
                  <View style={styles.listEmpty}>
                    <MonoText size={10} tracking={1} upper color={wp.color.ink3}>
                      No vehicles available
                    </MonoText>
                  </View>
                ) : (
                  vehicles.map((v: any, i: number) => {
                    const selected = v.id === vehicleId;
                    const isLast = i === vehicles.length - 1;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        activeOpacity={0.65}
                        onPress={() => setVehicleId(v.id)}
                        style={[
                          styles.listRow,
                          !isLast && styles.listRowDivider,
                          selected && styles.listRowSelected,
                        ]}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && (
                            <Text allowFontScaling={false} style={styles.checkMark}>
                              ✓
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <MonoText
                            size={13}
                            weight={700}
                            tracking={1}
                            color={wp.color.ink}
                          >
                            {v.registration_number}
                          </MonoText>
                          <MonoText
                            size={9}
                            tracking={1.2}
                            upper
                            color={wp.color.ink3}
                            style={{ marginTop: 2 }}
                          >
                            {[v.make, v.model, v.capacity_kg ? `${v.capacity_kg} KG` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </MonoText>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </DFieldBox>

            {/* From */}
            <DFieldBox label="From">
              <LocationPicker
                locations={locations}
                selectedId={fromId}
                onSelect={setFromId}
              />
            </DFieldBox>

            {/* To */}
            <DFieldBox label="To">
              <LocationPicker
                locations={locations.filter((l) => l.id !== fromId)}
                selectedId={toId}
                onSelect={setToId}
              />
            </DFieldBox>

            {/* Notes */}
            <DFieldBox label="Notes · optional" noDivider>
              <View style={styles.notesBox}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional details…"
                  placeholderTextColor={wp.color.ink3}
                  multiline
                  style={styles.notesInput}
                />
              </View>
            </DFieldBox>
          </ScrollView>
        </KeyboardAvoidingView>

        <PrimaryBar
          label="Create trip →"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={createMutation.isPending}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

function TypeTile({
  code,
  label,
  selected,
  onPress,
}: {
  code: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.tileWrap}>
      {selected && <View pointerEvents="none" style={styles.tileShadow} />}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.tile, selected && styles.tileSelected]}
      >
        <MonoText
          size={9}
          tracking={1.5}
          upper
          color={selected ? 'rgba(236,230,214,0.7)' : wp.color.ink3}
        >
          {code}
        </MonoText>
        <Text
          allowFontScaling={false}
          style={[styles.tileLabel, { color: selected ? wp.color.paper : wp.color.ink }]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LocationPicker({
  locations,
  selectedId,
  onSelect,
}: {
  locations: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (locations.length === 0) {
    return (
      <View style={styles.listEmpty}>
        <MonoText size={10} tracking={1} upper color={wp.color.ink3}>
          No locations available
        </MonoText>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {locations.map((l, i) => {
        const selected = l.id === selectedId;
        const isLast = i === locations.length - 1;
        return (
          <TouchableOpacity
            key={l.id}
            activeOpacity={0.65}
            onPress={() => onSelect(l.id)}
            style={[
              styles.listRow,
              !isLast && styles.listRowDivider,
              selected && styles.listRowSelected,
            ]}
          >
            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
              {selected && (
                <Text allowFontScaling={false} style={styles.checkMark}>
                  ✓
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={styles.locName}>
                {l.name}
              </Text>
              <MonoText
                size={9}
                tracking={1.5}
                upper
                color={wp.color.ink3}
                style={{ marginTop: 2 }}
              >
                {(l.type ?? 'LOCATION').toUpperCase()}
              </MonoText>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
    paddingBottom: 200,
  },

  // Tile grid
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tileWrap: {
    width: '48.5%',
    position: 'relative',
  },
  tileShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: wp.color.lineD,
  },
  tile: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    minHeight: 64,
    justifyContent: 'space-between',
  },
  tileSelected: {
    backgroundColor: wp.color.ink,
    borderWidth: 2,
  },
  tileLabel: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: 4,
  },

  // List
  list: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  listRowSelected: {
    backgroundColor: 'rgba(26,25,22,0.05)',
  },
  listEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: wp.color.ink,
  },
  checkMark: {
    color: wp.color.paper,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  locName: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 16,
    color: wp.color.ink,
  },

  // Notes
  notesBox: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 12,
    minHeight: 72,
  },
  notesInput: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontStyle: 'italic',
    fontSize: 14,
    color: wp.color.ink,
    minHeight: 48,
    textAlignVertical: 'top',
    padding: 0,
  },
});
