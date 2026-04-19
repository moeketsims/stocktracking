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
import { useLogWaste } from '../../src/hooks/useStock';
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
import type { WasteReason } from '../../src/types';

const REASONS: Array<{ value: WasteReason; label: string }> = [
  { value: 'spoiled', label: 'Spoiled' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'trim_prep_loss', label: 'Trim / Prep' },
  { value: 'contaminated', label: 'Contaminated' },
  { value: 'other', label: 'Other' },
];

const QUICK_AMOUNTS = [1, 5, 10, 25];

export default function LogWasteScreen() {
  const router = useRouter();
  const mutation = useLogWaste();

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<WasteReason | null>(null);
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0 && reason !== null;

  const handleSubmit = () => {
    if (!isValid || !reason) return;
    Alert.alert(
      'Confirm Waste',
      `Log ${qty} bag${qty > 1 ? 's' : ''} as waste (${reason.replace(/_/g, ' ')})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Waste',
          style: 'destructive',
          onPress: () => {
            mutation.mutate(
              {
                quantity: qty,
                unit: 'bag',
                reason,
                notes: notes.trim() || undefined,
              },
              {
                onSuccess: (data) => {
                  Alert.alert('Waste Logged', data.message ?? 'Recorded.', [
                    { text: 'OK', onPress: () => router.back() },
                  ]);
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`LOSS REPORT — ${fmtKickerDate()}`}
            title="Log waste"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Record stock lost to spoilage, damage, or prep trim. Deducted from the oldest batch.
            </IntentStrip>

            <DFieldBox label="Quantity · bags">
              <QuantityField
                value={quantity}
                onChangeText={setQuantity}
                trailing={
                  <View style={styles.chipRow}>
                    {QUICK_AMOUNTS.map((n) => (
                      <TouchableOpacity
                        key={n}
                        activeOpacity={0.6}
                        onPress={() => setQuantity(String(n))}
                        style={[styles.chip, qty === n && styles.chipActive]}
                      >
                        <MonoText
                          size={11}
                          weight={600}
                          tracking={1}
                          color={qty === n ? wp.color.paper : wp.color.ink}
                        >
                          {n}
                        </MonoText>
                      </TouchableOpacity>
                    ))}
                  </View>
                }
              />
              <View style={styles.qtyUnderline} />
              <MonoText size={9} tracking={1.5} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
                Tap to type · or pick a stamp
              </MonoText>
            </DFieldBox>

            <DFieldBox label="Reason">
              <View style={styles.reasonGrid}>
                {REASONS.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      activeOpacity={0.65}
                      onPress={() => setReason(r.value)}
                      style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </DFieldBox>

            <DFieldBox label="Notes · optional" noDivider>
              <View style={styles.notesBox}>
                <TextInput
                  placeholder="Details about the loss…"
                  placeholderTextColor={wp.color.ink3}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  style={styles.notesInput}
                />
              </View>
            </DFieldBox>
          </ScrollView>
        </KeyboardAvoidingView>

        <PrimaryBar
          label={qty > 0 ? `Log ${qty} bag${qty > 1 ? 's' : ''} as waste` : 'Log waste'}
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
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyUnderline: {
    height: 1.5,
    backgroundColor: wp.color.lineD,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    minWidth: 36,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: wp.color.ink,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },

  // Reason chips — stamp-style outlined
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  reasonChipSelected: {
    backgroundColor: wp.color.ink,
  },
  reasonLabel: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 11,
    letterSpacing: 1,
    color: wp.color.ink,
    textTransform: 'uppercase',
  },
  reasonLabelSelected: {
    color: wp.color.paper,
  },

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
