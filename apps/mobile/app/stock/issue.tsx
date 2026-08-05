import React, { useState } from 'react';
import {
  View,
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
import { useIssueStock } from '../../src/hooks/useStock';
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

const QUICK_AMOUNTS = [1, 5, 10, 25];

export default function IssueStockScreen() {
  const router = useRouter();
  const mutation = useIssueStock();

  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    Alert.alert('Issue Stock', `Issue ${qty} bag${qty > 1 ? 's' : ''} from your location?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Issue',
        onPress: () => {
          mutation.mutate(
            { quantity: qty, unit: 'bag', notes: notes.trim() || undefined },
            {
              onSuccess: (data) => {
                Alert.alert('Success', data.message ?? 'Stock issued.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              },
            },
          );
        },
      },
    ]);
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
            kicker={`STOCK MOVEMENT — ${fmtKickerDate()}`}
            title="Issue stock"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Issue stock from your location. FIFO — the oldest batch is deducted first.
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
              <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={{ marginTop: 6 }}>
                Tap to type · or pick a stamp
              </KickerLabel>
            </DFieldBox>

            <DFieldBox label="Notes · optional" noDivider>
              <View style={styles.notesBox}>
                <TextInput
                  maxFontSizeMultiplier={wp.fontScale.text}
                  placeholder="Reason for issuing…"
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
          label={qty > 0 ? `Issue ${qty} bag${qty > 1 ? 's' : ''}` : 'Issue stock'}
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
