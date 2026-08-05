import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useBatchDetail, useBatchHistory, useEditBatch } from '../../../src/hooks/useStock';
import { Loading } from '../../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  MonoText,
  KickerLabel,
  Stamp,
  SerifNumber,
  HardShadowFrame,
  DFieldBox,
  PrimaryBar,
} from '../../../src/components/wp';
import { wp } from '../../../src/constants/warehousePaper';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr)
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

function qualityStamp(score: number): { label: string; color: 'red' | 'amber' | 'green' } {
  if (score >= 3) return { label: 'GOOD', color: 'green' };
  if (score >= 2) return { label: 'FAIR', color: 'amber' };
  return { label: 'POOR', color: 'red' };
}

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useBatchDetail(id ?? '');
  const historyQuery = useBatchHistory(id ?? '');
  const editMutation = useEditBatch();

  const batch = query.data;

  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [qualityNotes, setQualityNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (batch) {
      setQualityScore(batch.quality_score ?? null);
      setExpiryDate(batch.expiry_date ?? '');
      setQualityNotes(batch.quality_notes ?? '');
    }
  }, [batch]);

  const handleSave = () => {
    if (!id || !batch) return;

    const updates: Record<string, unknown> = {};
    if (qualityScore != null && qualityScore !== batch.quality_score) {
      updates.quality_score = qualityScore;
    }
    if (expiryDate && expiryDate !== batch.expiry_date) {
      updates.expiry_date = expiryDate;
    }
    if (qualityNotes !== (batch.quality_notes ?? '')) {
      updates.quality_notes = qualityNotes;
    }

    if (Object.keys(updates).length === 0) {
      Alert.alert('No Changes', 'Nothing has been modified.');
      return;
    }

    editMutation.mutate(
      { id, data: updates as any },
      {
        onSuccess: (data) => {
          Alert.alert('Saved', data.message);
          setIsEditing(false);
          query.refetch();
          historyQuery.refetch();
        },
      },
    );
  };

  if (query.isLoading) {
    return <Loading fullScreen message="" />;
  }

  if (!batch) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="BATCH RECORD" title="Not found" backUseRouter />
          <View style={styles.empty}>
            <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
              Batch not found
            </MonoText>
          </View>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const stamp = qualityStamp(batch.quality_score ?? 1);
  const remainingBags = Math.round(batch.remaining_qty / 10);
  const initialBags = Math.round(batch.initial_qty / 10);
  const usedBags = Math.round(batch.used_qty / 10);
  const pctUsed = batch.initial_qty > 0 ? Math.round((batch.used_qty / batch.initial_qty) * 100) : 0;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`BATCH N° ${batch.batch_id_display.toUpperCase()}`}
            title="Lot record"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            {/* Voucher hero */}
            <HardShadowFrame style={{ marginBottom: 18 }}>
              <View style={styles.voucher}>
                <View style={styles.voucherHead}>
                  <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
                    BATCH N° {batch.batch_id_display}
                  </KickerLabel>
                  <Stamp color={stamp.color} rotate={3}>
                    {stamp.label}
                  </Stamp>
                </View>

                <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.itemTitle} numberOfLines={2}>
                  {batch.item?.name ?? 'Item'}
                </Text>

                <View style={styles.heroRow}>
                  <SerifNumber
                    size={72}
                    tracking={-2}
                    leading={0.95}
                    color={wp.color.ink}
                    autoShrink
                    style={{ flexShrink: 1 }}
                  >
                    {remainingBags.toLocaleString()}
                  </SerifNumber>
                  <View style={{ marginLeft: 10 }}>
                    <MonoText size={11} tracking={1.5} color={wp.color.ink3}>BAGS LEFT</MonoText>
                    <MonoText size={10} tracking={1} color={wp.color.ink3} style={{ marginTop: 2 }}>
                      {pctUsed}% USED · {usedBags}/{initialBags}
                    </MonoText>
                  </View>
                </View>

                <View style={styles.metaLedger}>
                  <MetaRow label="SUPPLIER" value={batch.supplier?.name ?? '—'} />
                  <MetaRow label="RECEIVED" value={formatDate(batch.received_at)} />
                  <MetaRow
                    label="EXPIRES"
                    value={formatDate(batch.expiry_date)}
                    valueColor={batch.expiry_date ? undefined : wp.color.ink3}
                  />
                  {batch.defect_pct != null && (
                    <MetaRow
                      label="DEFECT %"
                      value={`${batch.defect_pct.toFixed(1)}%`}
                      last
                    />
                  )}
                </View>
              </View>
            </HardShadowFrame>

            {/* Quality edit section */}
            <View style={styles.editHead}>
              <KickerLabel size={11} weight={600} tracking={1} color={wp.color.ink}>
                Quality
              </KickerLabel>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsEditing(!isEditing)}
              >
                <MonoText size={11} weight={700} tracking={1} upper color={wp.color.ink2}>
                  {isEditing ? 'CANCEL' : 'EDIT'}
                </MonoText>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <>
                <DFieldBox label="Quality score">
                  <View style={styles.scoreRow}>
                    {[1, 2, 3].map((s) => (
                      <TouchableOpacity
                        key={s}
                        activeOpacity={0.7}
                        onPress={() => setQualityScore(s)}
                        style={[styles.scoreTile, qualityScore === s && styles.scoreTileActive]}
                      >
                        <SerifNumber
                          size={28}
                          tracking={-0.5}
                          leading={1}
                          color={qualityScore === s ? wp.color.paper : wp.color.ink}
                        >
                          {String(s)}
                        </SerifNumber>
                        <MonoText
                          size={9}
                          tracking={1.5}
                          upper
                          color={qualityScore === s ? wp.color.paper : wp.color.ink3}
                        >
                          {qualityStamp(s).label}
                        </MonoText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </DFieldBox>

                <DFieldBox label="Expiry date">
                  <View style={styles.textInputBox}>
                    <TextInput
                      maxFontSizeMultiplier={wp.fontScale.text}
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={wp.color.ink3}
                      style={styles.textInput}
                    />
                  </View>
                </DFieldBox>

                <DFieldBox label="Quality notes" noDivider>
                  <View style={styles.notesBox}>
                    <TextInput
                      maxFontSizeMultiplier={wp.fontScale.text}
                      value={qualityNotes}
                      onChangeText={setQualityNotes}
                      placeholder="Observations…"
                      placeholderTextColor={wp.color.ink3}
                      multiline
                      style={styles.notesInput}
                    />
                  </View>
                </DFieldBox>
              </>
            ) : (
              <View style={styles.infoPanel}>
                <MetaRow label="SCORE" value={`${batch.quality_score}/3`} />
                {batch.quality_notes && (
                  <MetaRow label="NOTES" value={batch.quality_notes} last />
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {isEditing && (
          <PrimaryBar
            label="Save changes"
            onPress={handleSave}
            loading={editMutation.isPending}
          />
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function MetaRow({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowDivider]}>
      <MonoText size={10} tracking={1.3} upper color={wp.color.ink3}>
        {label}
      </MonoText>
      <Text
        maxFontSizeMultiplier={wp.fontScale.text}
        style={[styles.metaValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value}
      </Text>
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.screenH,
  },

  // Voucher
  voucher: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    padding: 14,
  },
  voucherHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 22,
    letterSpacing: -0.5,
    color: wp.color.ink,
    marginTop: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  metaLedger: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: wp.color.line,
    borderStyle: 'dashed',
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  metaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 13,
    color: wp.color.ink,
  },

  editHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },

  infoPanel: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    padding: 12,
  },

  scoreRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreTile: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scoreTileActive: {
    backgroundColor: wp.color.ink,
  },

  textInputBox: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: wp.color.voucherBg,
  },
  textInput: {
    fontFamily: wp.font.mono.fontFamily,
    fontWeight: wp.font.mono.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
    padding: 0,
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
