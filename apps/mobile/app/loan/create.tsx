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
import { useCreateLoan, useLoanLocations } from '../../src/hooks/useLoans';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  DFieldBox,
  PrimaryBar,
  MonoText,
  QuantityField,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

const QUICK_CHIPS = [10, 20, 50, 100];

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatPartsFromDays(days: number): { day: string; mon: string; year: string } {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear());
  return { day, mon, year };
}

export default function CreateLoanScreen() {
  const router = useRouter();
  const mutation = useCreateLoan();
  const { data: locationsData, isLoading: locationsLoading } = useLoanLocations();
  const locations: any[] = locationsData?.locations ?? [];

  const [lenderLocationId, setLenderLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [returnDays, setReturnDays] = useState(7);
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0 && lenderLocationId !== '';
  const selectedLocation = locations.find((l) => l.id === lenderLocationId);
  const available = selectedLocation?.available_bags ?? selectedLocation?.on_hand_bags ?? 0;
  const dateParts = formatPartsFromDays(returnDays);

  const handleChangeDate = (delta: number) => {
    setReturnDays(Math.max(1, Math.min(60, returnDays + delta)));
  };

  const handleSubmit = () => {
    if (!isValid) return;
    mutation.mutate(
      {
        lender_location_id: lenderLocationId,
        quantity_requested: qty,
        estimated_return_date: addDaysIso(returnDays),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => router.back(),
      },
    );
  };

  if (locationsLoading) {
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
            kicker={`NEW LOAN — ${fmtKickerDate()}`}
            title="Borrow stock"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Request bags from another location. They'll approve or decline; once approved, a driver delivers to you.
            </IntentStrip>

            {/* Lender location */}
            <DFieldBox label="Lender location">
              <View style={styles.list}>
                {locations.length === 0 ? (
                  <View style={styles.listEmpty}>
                    <MonoText size={10} tracking={1} upper color={wp.color.ink3}>
                      No lender locations available
                    </MonoText>
                  </View>
                ) : (
                  locations.map((l: any, i: number) => {
                    const selected = l.id === lenderLocationId;
                    const isLast = i === locations.length - 1;
                    const onHand = l.available_bags ?? l.on_hand_bags ?? 0;
                    return (
                      <TouchableOpacity
                        key={l.id}
                        activeOpacity={0.65}
                        onPress={() => setLenderLocationId(l.id)}
                        style={[
                          styles.listRow,
                          !isLast && styles.listRowDivider,
                          selected && styles.listRowSelected,
                        ]}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && (
                            <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.checkMark}>✓</Text>
                          )}
                        </View>
                        <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.locName}>
                          {l.name}
                        </Text>
                        <MonoText size={9} tracking={1} upper color={wp.color.ink3}>
                          {onHand.toLocaleString()} ON HAND
                        </MonoText>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </DFieldBox>

            {/* Quantity */}
            <DFieldBox label="Quantity · bags">
              <QuantityField
                value={quantity}
                onChangeText={setQuantity}
                size={52}
                trailing={
                  <MonoText size={10} color={wp.color.ink3}>
                    / {available.toLocaleString()} available
                  </MonoText>
                }
              />
              <View style={styles.chipRow}>
                {QUICK_CHIPS.map((n) => {
                  const on = qty === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      activeOpacity={0.6}
                      onPress={() => setQuantity(String(n))}
                      style={[styles.chip, on && styles.chipActive]}
                    >
                      <MonoText
                        size={11}
                        weight={600}
                        tracking={1}
                        color={on ? wp.color.paper : wp.color.ink}
                      >
                        {n}
                      </MonoText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <MonoText size={9} tracking={1.5} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
                Tap to type · or pick a stamp
              </MonoText>
            </DFieldBox>

            {/* Return date — 3-column paper scroller */}
            <DFieldBox label="Estimated return">
              <View style={styles.dateScroller}>
                <DateCol label="Day" value={dateParts.day} onInc={() => handleChangeDate(1)} onDec={() => handleChangeDate(-1)} />
                <View style={styles.dateDivider} />
                <DateCol label="Month" value={dateParts.mon} onInc={() => handleChangeDate(30)} onDec={() => handleChangeDate(-30)} />
                <View style={styles.dateDivider} />
                <DateCol label="Year" value={dateParts.year} onInc={() => handleChangeDate(365)} onDec={() => handleChangeDate(-365)} />
              </View>
              <MonoText size={9} tracking={1.5} upper color={wp.color.ink3} style={{ marginTop: 8 }}>
                Tap ↑ or ↓ to adjust
              </MonoText>
            </DFieldBox>

            {/* Notes */}
            <DFieldBox label="Notes · optional" noDivider>
              <View style={styles.notesBox}>
                <TextInput
                  maxFontSizeMultiplier={wp.fontScale.text}
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
          label={qty > 0 ? `Request ${qty} bag${qty > 1 ? 's' : ''} →` : 'Request loan'}
          onPress={handleSubmit}
          disabled={!isValid}
          loading={mutation.isPending}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

function DateCol({
  label,
  value,
  onInc,
  onDec,
}: {
  label: string;
  value: string;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <View style={styles.dateCol}>
      <MonoText size={9} tracking={1.5} upper color={wp.color.ink3}>
        {label}
      </MonoText>
      <TouchableOpacity activeOpacity={0.6} onPress={onInc} style={styles.dateArrow}>
        <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.dateArrowText}>↑</Text>
      </TouchableOpacity>
      <MonoText size={22} weight={700} color={wp.color.ink} style={styles.dateValue}>
        {value}
      </MonoText>
      <TouchableOpacity activeOpacity={0.6} onPress={onDec} style={styles.dateArrow}>
        <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.dateArrowText}>↓</Text>
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

  // List
  list: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
  },
  listEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  listRowSelected: {
    backgroundColor: 'rgba(26,25,22,0.05)',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
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
    flex: 1,
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
    gap: 10,
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

  // Date scroller
  dateScroller: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
  },
  dateCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  dateDivider: {
    width: 1.5,
    backgroundColor: wp.color.lineD,
  },
  dateArrow: {
    padding: 2,
  },
  dateArrowText: {
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 14,
    color: wp.color.ink3,
  },
  dateValue: {
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
