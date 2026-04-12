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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBatchDetail, useBatchHistory, useEditBatch } from '../../../src/hooks/useStock';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Badge } from '../../../src/components/ui/Badge';
import { Loading } from '../../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../../src/constants/theme';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: colors.success },
  { value: 'quarantine', label: 'Quarantine', color: '#f59e0b' },
  { value: 'hold', label: 'On Hold', color: colors.gray[500] },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useBatchDetail(id ?? '');
  const historyQuery = useBatchHistory(id ?? '');
  const editMutation = useEditBatch();

  const batch = query.data;
  const history = historyQuery.data?.history ?? [];

  // Editable fields
  const [qualityScore, setQualityScore] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qualityNotes, setQualityNotes] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (batch) {
      setQualityScore(batch.quality_score?.toString() ?? '');
      setExpiryDate(batch.expiry_date ?? '');
      setQualityNotes(batch.quality_notes ?? '');
    }
  }, [batch]);

  const handleSave = () => {
    if (!id) return;

    const updates: Record<string, unknown> = {};
    if (qualityScore && Number(qualityScore) !== batch?.quality_score) {
      updates.quality_score = Number(qualityScore);
    }
    if (expiryDate && expiryDate !== batch?.expiry_date) {
      updates.expiry_date = expiryDate;
    }
    if (qualityNotes !== (batch?.quality_notes ?? '')) {
      updates.quality_notes = qualityNotes;
    }
    if (status && status !== '') {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      Alert.alert('No Changes', 'No fields have been modified.');
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
    return <Loading fullScreen message="Loading batch..." />;
  }

  if (!batch) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Batch Not Found' }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Batch not found</Text>
          <Button title="Go Back" onPress={() => router.back()} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const qualityVariant = batch.quality_score >= 3 ? 'success' : batch.quality_score >= 2 ? 'warning' : 'error';
  const qualityLabel = batch.quality_score >= 3 ? 'Good' : batch.quality_score >= 2 ? 'Fair' : 'Poor';

  return (
    <>
      <Stack.Screen
        options={{
          title: `Batch #${batch.batch_id_display}`,
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Overview */}
            <Card>
              <View style={styles.overviewHeader}>
                <Text style={styles.batchTitle}>#{batch.batch_id_display}</Text>
                <Badge label={qualityLabel} variant={qualityVariant} />
              </View>
              {batch.item && (
                <Text style={styles.itemName}>{batch.item.name} ({batch.item.sku})</Text>
              )}
              {batch.supplier && (
                <Text style={styles.supplierName}>Supplier: {batch.supplier.name}</Text>
              )}
            </Card>

            {/* Stock info */}
            <Card>
              <Text style={styles.sectionTitle}>Stock Info</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{batch.initial_qty.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Initial (kg)</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {batch.remaining_qty.toFixed(0)}
                  </Text>
                  <Text style={styles.statLabel}>Remaining (kg)</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.gray[500] }]}>
                    {batch.used_qty.toFixed(0)}
                  </Text>
                  <Text style={styles.statLabel}>Used (kg)</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.detailLabel}>Received</Text>
                  <Text style={styles.detailValue}>{formatDate(batch.received_at)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Text style={styles.detailLabel}>Expires</Text>
                  <Text style={[
                    styles.detailValue,
                    batch.expiry_date && new Date(batch.expiry_date) < new Date() && { color: colors.error },
                  ]}>
                    {formatDate(batch.expiry_date)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Edit section */}
            <Card>
              <View style={styles.editHeader}>
                <Text style={styles.sectionTitle}>Edit Batch</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                  <Ionicons
                    name={isEditing ? 'close-circle' : 'create-outline'}
                    size={22}
                    color={isEditing ? colors.error : colors.primary[500]}
                  />
                </TouchableOpacity>
              </View>

              {isEditing ? (
                <View style={styles.editFields}>
                  <Input
                    label="Quality Score (1-3)"
                    placeholder="1, 2, or 3"
                    keyboardType="number-pad"
                    value={qualityScore}
                    onChangeText={setQualityScore}
                    error={
                      qualityScore !== '' && (Number(qualityScore) < 1 || Number(qualityScore) > 3)
                        ? 'Must be 1, 2, or 3'
                        : undefined
                    }
                  />
                  <Input
                    label="Expiry Date (YYYY-MM-DD)"
                    placeholder="2026-05-01"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                  />
                  <Input
                    label="Quality Notes"
                    placeholder="Notes about quality..."
                    value={qualityNotes}
                    onChangeText={setQualityNotes}
                    multiline
                    numberOfLines={2}
                    style={styles.textArea}
                  />

                  {/* Status */}
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.statusRow}>
                    {STATUS_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.statusChip,
                          status === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                        ]}
                        onPress={() => setStatus(opt.value)}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            status === opt.value && { color: colors.white },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Button
                    title={editMutation.isPending ? 'Saving...' : 'Save Changes'}
                    onPress={handleSave}
                    loading={editMutation.isPending}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              ) : (
                <Text style={styles.editHint}>Tap the edit icon to modify batch details.</Text>
              )}
            </Card>

            {/* Edit history */}
            {history.length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>Edit History</Text>
                {history.slice(0, 5).map((h) => (
                  <View key={h.id} style={styles.historyItem}>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyField}>{h.field_changed}</Text>
                      <Text style={styles.historyTime}>
                        {formatDate(h.edited_at)}
                      </Text>
                    </View>
                    <Text style={styles.historyChange}>
                      {h.old_value ?? 'null'} → {h.new_value ?? 'null'}
                    </Text>
                    <Text style={styles.historyEditor}>by {h.editor_name}</Text>
                  </View>
                ))}
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { fontSize: fontSize.lg, color: colors.gray[500] },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  batchTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  itemName: { fontSize: fontSize.sm, color: colors.gray[700], marginBottom: 2 },
  supplierName: { fontSize: fontSize.sm, color: colors.gray[500] },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.sm,
  },
  dateItem: { gap: 2 },
  detailLabel: { fontSize: fontSize.xs, color: colors.gray[500] },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[800] },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  editFields: { gap: spacing.md },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  statusRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  editHint: { fontSize: fontSize.sm, color: colors.gray[400], fontStyle: 'italic' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  historyItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  historyField: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    textTransform: 'capitalize',
  },
  historyTime: { fontSize: fontSize.xs, color: colors.gray[400] },
  historyChange: { fontSize: fontSize.sm, color: colors.gray[600] },
  historyEditor: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
});
