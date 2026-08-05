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
import { useCreateStockRequest } from '../../src/hooks/useStock';
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

type Urgency = 'normal' | 'urgent';

const QUICK_AMOUNTS = [5, 10, 20, 50];

export default function PlaceOrderScreen() {
  const router = useRouter();
  const mutation = useCreateStockRequest();

  const [quantityBags, setQuantityBags] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [notes, setNotes] = useState('');

  const qty = Number(quantityBags);
  const isValid = qty > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    const confirmMsg = `Request ${qty} bag${qty > 1 ? 's' : ''} (${urgency})?\n\nThis will notify available drivers.`;
    Alert.alert('Confirm Request', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create Request',
        onPress: () => {
          mutation.mutate(
            { quantity_bags: qty, urgency, notes: notes.trim() || undefined },
            {
              onSuccess: (data) => {
                Alert.alert(
                  'Request Created',
                  data.message ?? 'Your stock request has been submitted.',
                  [{ text: 'OK', onPress: () => router.back() }],
                );
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
            kicker={`NEW ORDER — ${fmtKickerDate()}`}
            title="Place an order"
            backUseRouter
          />
          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Create a replenishment request. Drivers are notified and can accept the delivery.
            </IntentStrip>

            {/* Quantity */}
            <DFieldBox label="Quantity · bags">
              <QuantityField
                value={quantityBags}
                onChangeText={setQuantityBags}
                trailing={
                  <View style={styles.chipRow}>
                    {QUICK_AMOUNTS.map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => setQuantityBags(String(n))}
                        activeOpacity={0.6}
                        style={[
                          styles.chip,
                          qty === n && styles.chipSelected,
                        ]}
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

            {/* Urgency */}
            <DFieldBox label="Urgency">
              <View style={styles.urgencyRow}>
                <UrgencyTile
                  title="Normal"
                  subtitle="Standard queue"
                  selected={urgency === 'normal'}
                  onPress={() => setUrgency('normal')}
                />
                <UrgencyTile
                  title="Urgent"
                  titleColor={wp.color.red}
                  subtitle="Push to front"
                  selected={urgency === 'urgent'}
                  onPress={() => setUrgency('urgent')}
                />
              </View>
            </DFieldBox>

            {/* Notes */}
            <DFieldBox label="Notes · optional" noDivider>
              <View style={styles.notesBox}>
                <TextInput
                  maxFontSizeMultiplier={wp.fontScale.text}
                  placeholder="Any additional details…"
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
          label="Create request"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={mutation.isPending}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

function UrgencyTile({
  title,
  subtitle,
  titleColor = wp.color.ink,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  titleColor?: string;
  selected: boolean;
  onPress: () => void;
}) {
  // Selected: ink fill + paper text + 2×2 shadow. Unselected: outlined.
  return (
    <View style={styles.tileWrap}>
      {selected && (
        <View pointerEvents="none" style={styles.tileShadow} />
      )}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.tile, selected && styles.tileSelected]}
      >
        <Text
          maxFontSizeMultiplier={wp.fontScale.compact}
          style={[
            styles.tileTitle,
            { color: selected ? wp.color.paper : titleColor },
          ]}
        >
          {title}
        </Text>
        <MonoText
          size={9}
          tracking={1.5}
          upper
          color={selected ? wp.color.paper : wp.color.ink3}
          weight={500}
          style={{ marginTop: 2 }}
        >
          {subtitle}
        </MonoText>
      </TouchableOpacity>
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

  // Quantity field
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyValue: {
    flexShrink: 1,
  },
  qtyUnderline: {
    height: 1.5,
    backgroundColor: wp.color.lineD,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
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
  chipSelected: {
    backgroundColor: wp.color.ink,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },

  // Urgency tiles
  urgencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tileWrap: {
    flex: 1,
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
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tileSelected: {
    borderWidth: 2,
    backgroundColor: wp.color.ink,
  },
  tileTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 22,
    letterSpacing: -0.5,
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
