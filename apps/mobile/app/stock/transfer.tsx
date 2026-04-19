import React, { useState } from 'react';
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
import { useRouter, Stack } from 'expo-router';
import { useTransferStock } from '../../src/hooks/useStock';
import { useLocations } from '../../src/hooks/useLocations';
import { useAuthStore } from '../../src/stores/authStore';
import { useStockBalance } from '../../src/hooks/useStock';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  DFieldBox,
  PrimaryBar,
  MonoText,
  KickerLabel,
  QuantityField,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

const QUICK_CHIPS: Array<number | 'MAX'> = [25, 50, 100, 250, 'MAX'];

export default function TransferStockScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mutation = useTransferStock();
  const { data: locationsData, isLoading: locationsLoading } = useLocations();
  const { data: balance } = useStockBalance(user?.location_id ?? undefined);

  const locations = locationsData?.locations ?? [];
  const otherLocations = locations.filter((l: any) => l.id !== user?.location_id);

  const fromLocation = locations.find((l: any) => l.id === user?.location_id);
  const fromOnHandKg = balance?.balance?.reduce((s, b) => s + b.on_hand_qty, 0) ?? 0;
  const fromOnHandBags = Math.round(fromOnHandKg / 10);

  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0 && toLocationId !== '' && !!user?.location_id;
  const selectedLocation = otherLocations.find((l: any) => l.id === toLocationId);

  const handleChip = (value: number | 'MAX') => {
    setQuantity(String(value === 'MAX' ? fromOnHandBags : value));
  };

  const handleSubmit = () => {
    if (!isValid || !user?.location_id) return;
    const dest = selectedLocation?.name ?? 'selected location';
    Alert.alert('Transfer Stock', `Transfer ${qty} bag${qty > 1 ? 's' : ''} to ${dest}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Transfer',
        onPress: () => {
          mutation.mutate(
            {
              from_location_id: user.location_id!,
              to_location_id: toLocationId,
              quantity: qty,
              unit: 'bag',
              notes: notes.trim() || undefined,
            },
            {
              onSuccess: (data) => {
                Alert.alert('Success', data.message ?? 'Stock transferred.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              },
            },
          );
        },
      },
    ]);
  };

  if (locationsLoading) return <Loading fullScreen message="" />;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`STOCK MOVEMENT — ${fmtKickerDate()}`}
            title="Transfer stock"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Transfer stock from your location to another. Stock is deducted here and added at the destination.
            </IntentStrip>

            {/* From — user's own location, ink-filled tile */}
            <DFieldBox label="From">
              <View style={styles.fromTile}>
                <MonoText size={10} tracking={1.5} color={wp.color.paper}>◉</MonoText>
                <Text allowFontScaling={false} style={styles.fromTitle}>
                  {fromLocation?.name ?? user?.location_name ?? 'Your location'}
                </Text>
                <View style={styles.fromMeta}>
                  <MonoText size={9} tracking={1.5} upper color={wp.color.paper}>
                    {fromOnHandBags.toLocaleString()} ON HAND
                  </MonoText>
                </View>
              </View>
            </DFieldBox>

            {/* Destination — bordered list with checkboxes */}
            <DFieldBox label="Destination">
              <View style={styles.destList}>
                {otherLocations.length === 0 ? (
                  <View style={styles.destEmpty}>
                    <MonoText size={10} tracking={1} upper color={wp.color.ink3}>
                      No other locations available
                    </MonoText>
                  </View>
                ) : (
                  otherLocations.map((loc: any, i: number) => {
                    const selected = loc.id === toLocationId;
                    const isLast = i === otherLocations.length - 1;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        activeOpacity={0.65}
                        onPress={() => setToLocationId(loc.id)}
                        style={[
                          styles.destRow,
                          !isLast && styles.destRowDivider,
                          selected && styles.destRowSelected,
                        ]}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && (
                            <Text
                              allowFontScaling={false}
                              style={styles.checkMark}
                            >
                              ✓
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text allowFontScaling={false} style={styles.destName}>
                            {loc.name}
                          </Text>
                          <MonoText
                            size={9}
                            tracking={1.5}
                            upper
                            color={wp.color.ink3}
                            style={{ marginTop: 2 }}
                          >
                            {loc.type ?? 'LOCATION'}
                          </MonoText>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </DFieldBox>

            {/* Quantity — giant numeric + quick chips */}
            <DFieldBox label="Quantity · bags" noDivider>
              <QuantityField
                value={quantity}
                onChangeText={setQuantity}
                trailing={
                  <MonoText size={11} color={wp.color.ink3}>
                    / {fromOnHandBags.toLocaleString()} available
                  </MonoText>
                }
              />

              <View style={styles.chipRow}>
                {QUICK_CHIPS.map((n) => {
                  const numericValue =
                    n === 'MAX' ? fromOnHandBags : n;
                  const isActive = qty === numericValue && qty > 0;
                  return (
                    <TouchableOpacity
                      key={String(n)}
                      activeOpacity={0.6}
                      onPress={() => handleChip(n)}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <MonoText
                        size={11}
                        weight={600}
                        tracking={1}
                        color={isActive ? wp.color.paper : wp.color.ink}
                      >
                        {n}
                      </MonoText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </DFieldBox>
          </ScrollView>
        </KeyboardAvoidingView>

        <PrimaryBar
          label={qty > 0 ? `Transfer ${qty} bags →` : 'Transfer'}
          onPress={handleSubmit}
          disabled={!isValid}
          loading={mutation.isPending}
        />
      </SafeAreaView>
    </PaperBackground>
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

  // From tile — ink-filled
  fromTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.ink,
  },
  fromTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 20,
    color: wp.color.paper,
  },
  fromMeta: {
    marginLeft: 'auto',
    opacity: 0.6,
  },

  // Destination list
  destList: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  destRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  destRowSelected: {
    backgroundColor: 'rgba(26,25,22,0.05)',
  },
  destEmpty: {
    padding: 18,
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
    backgroundColor: 'transparent',
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
  destName: {
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 16,
    color: wp.color.ink,
  },

  // Quantity
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  qtyValue: {
    flexShrink: 1,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 6,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: wp.color.ink,
  },
});
