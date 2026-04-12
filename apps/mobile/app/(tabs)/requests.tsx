import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  StyleSheet, Platform, LayoutAnimation, UIManager, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyRequests, useAvailableRequests } from '../../src/hooks/useRequests';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import { brand } from '../../src/constants/theme';
import { timeAgo } from '../../src/utils/dates';
import type { StockRequest } from '../../src/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const ACTIVE_STATUSES = new Set([
  'pending', 'accepted', 'trip_created', 'in_delivery', 'time_proposed', 'partially_fulfilled',
]);

const PIPELINE_STAGES = [
  { key: 'all', label: 'All', labelCompact: 'All' },
  { key: 'pending', label: 'Pending', labelCompact: 'Pending' },
  { key: 'accepted', label: 'Accepted', labelCompact: 'Accepted' },
  { key: 'in_delivery', label: 'In Delivery', labelCompact: 'Delivery' },
  { key: 'trip_created', label: 'Trip Created', labelCompact: 'Trip' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  trip_created: '#8b5cf6',
  in_delivery: '#6366f1',
  time_proposed: '#0ea5e9',
  partially_fulfilled: '#f59e0b',
  delivered: '#22c55e',
  fulfilled: '#22c55e',
  cancelled: '#94a3b8',
  expired: '#ef4444',
};

export default function RequestsScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const compactPipeline = windowWidth < 400;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = ['location_manager', 'zone_manager', 'admin'].includes(user?.role ?? '');

  const myQuery = useMyRequests();
  const availableQuery = useAvailableRequests();
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const allRequests = myQuery.data?.requests ?? [];
  const availCount = availableQuery.data?.total ?? 0;

  const { active, history, needsAttention, stageCounts } = useMemo(() => {
    const a: StockRequest[] = [];
    const h: StockRequest[] = [];
    const counts: Record<string, number> = {};
    let attention = 0;

    const now = Date.now();
    const HOURS_48 = 48 * 60 * 60 * 1000;

    for (const req of allRequests) {
      if (ACTIVE_STATUSES.has(req.status)) {
        a.push(req);
        counts[req.status] = (counts[req.status] ?? 0) + 1;

        const age = now - new Date(req.created_at).getTime();
        if (req.urgency === 'urgent' || (req.status === 'pending' && age < HOURS_48)) {
          attention++;
        }
      } else {
        h.push(req);
      }
    }
    return { active: a, history: h, needsAttention: attention, stageCounts: counts };
  }, [allRequests]);

  const filteredActive = useMemo(() => {
    if (selectedStage === 'all') return active;
    return active.filter((r) => r.status === selectedStage);
  }, [active, selectedStage]);

  const handlePress = (request: StockRequest) => {
    router.push(`/request/${request.id}`);
  };

  const handleRefresh = () => {
    myQuery.refetch();
    availableQuery.refetch();
  };

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistoryExpanded(!historyExpanded);
  };

  if (myQuery.isLoading) return <Loading fullScreen message="" />;
  if (myQuery.isError) return <QueryErrorState error={myQuery.error} onRetry={() => myQuery.refetch()} />;

  return (
    <SafeAreaView style={$.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={$.scroll}
        refreshControl={
          <RefreshControl refreshing={myQuery.isRefetching} tintColor="#fff" onRefresh={handleRefresh} />
        }
      >
        {/* ── Gradient Header KPIs ── */}
        <LinearGradient
          colors={[brand.gradientStart, brand.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={$.header}
        >
          <View style={$.kpiRow}>
            <KPI value={active.length} label="Active" />
            <View style={$.kpiDiv} />
            <KPI value={availCount} label="Available" />
            <View style={$.kpiDiv} />
            <KPI value={allRequests.length} label="Total" />
          </View>
        </LinearGradient>

        <View style={$.body}>
          {/* ── Intent 1: Priority Banner ── */}
          {needsAttention > 0 ? (
            <TouchableOpacity style={$.banner} activeOpacity={0.7} onPress={() => { setSelectedStage('pending'); }}>
              <View style={$.bannerIcon}>
                <Ionicons name="alert-circle" size={20} color="#fff" />
              </View>
              <View style={$.bannerBody}>
                <Text style={$.bannerTitle}>{needsAttention} request{needsAttention !== 1 ? 's' : ''} need your attention</Text>
                <Text style={$.bannerSub}>
                  {[
                    active.filter((r) => r.urgency === 'urgent').length > 0 &&
                      `${active.filter((r) => r.urgency === 'urgent').length} urgent`,
                    active.filter((r) => r.status === 'pending').length > 0 &&
                      `${active.filter((r) => r.status === 'pending').length} pending`,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : (
            <View style={$.bannerClear}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={$.bannerClearText}>All clear — nothing needs your attention</Text>
            </View>
          )}

          {/* ── Intent 2: Status Pipeline ── */}
          <Text style={$.sectionTitle}>Active Requests</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={$.pipelineScroll}
            contentContainerStyle={$.pipeline}
            nestedScrollEnabled
            removeClippedSubviews={false}
            directionalLockEnabled
          >
            {PIPELINE_STAGES.map((stage) => {
              const count = stage.key === 'all' ? active.length : (stageCounts[stage.key] ?? 0);
              if (stage.key !== 'all' && count === 0) return null;
              const isSelected = selectedStage === stage.key;
              const stageLabel = compactPipeline ? stage.labelCompact : stage.label;
              return (
                <TouchableOpacity
                  key={stage.key}
                  style={[$.chip, isSelected && $.chipActive]}
                  onPress={() => setSelectedStage(stage.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[$.chipText, isSelected && $.chipTextActive]} numberOfLines={1}>
                    {stageLabel}
                  </Text>
                  <View style={[$.chipBadge, isSelected && $.chipBadgeActive]}>
                    <Text style={[$.chipBadgeText, isSelected && $.chipBadgeTextActive]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Compact Active Rows ── */}
          {filteredActive.length > 0 ? (
            <View style={$.listCard}>
              {filteredActive.map((req, i) => (
                <TouchableOpacity
                  key={req.id}
                  style={[$.row, i < filteredActive.length - 1 && $.rowBorder]}
                  onPress={() => handlePress(req)}
                  activeOpacity={0.6}
                >
                  <View style={$.rowLeft}>
                    <Text style={$.rowLocation} numberOfLines={1}>{req.location?.name ?? 'Unknown'}</Text>
                    {req.requester?.full_name && (
                      <Text style={$.rowRequester} numberOfLines={1}>{req.requester.full_name}</Text>
                    )}
                  </View>
                  <Text style={$.rowQty}>{req.quantity_bags}</Text>
                  <View style={[$.statusPill, { backgroundColor: (STATUS_COLORS[req.status] ?? '#94a3b8') + '18' }]}>
                    <Text style={[$.statusPillText, { color: STATUS_COLORS[req.status] ?? '#94a3b8' }]}>
                      {req.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                  <Text style={$.rowTime}>{timeAgo(req.created_at)}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={$.emptyRow}>
              <Text style={$.emptyRowText}>
                {selectedStage === 'all' ? 'No active requests' : `No ${selectedStage.replace(/_/g, ' ')} requests`}
              </Text>
            </View>
          )}

          {/* ── Intent 3: Collapsible History ── */}
          <TouchableOpacity style={$.historyToggle} onPress={toggleHistory} activeOpacity={0.7}>
            <View style={$.historyToggleLeft}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={$.historyToggleText}>{history.length} completed request{history.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={$.historyToggleRight}>
              <Text style={$.historyToggleAction}>{historyExpanded ? 'Hide' : 'View'}</Text>
              <Ionicons name={historyExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={brand.accent} />
            </View>
          </TouchableOpacity>

          {historyExpanded && history.length > 0 && (
            <View style={$.historyCard}>
              {history.map((req, i) => (
                <TouchableOpacity
                  key={req.id}
                  style={[$.hRow, i < history.length - 1 && $.hRowBorder]}
                  onPress={() => handlePress(req)}
                  activeOpacity={0.6}
                >
                  <View style={[$.hDot, { backgroundColor: STATUS_COLORS[req.status] ?? '#94a3b8' }]} />
                  <Text style={$.hLocation} numberOfLines={1}>{req.location?.name ?? 'Unknown'}</Text>
                  <Text style={$.hQty}>{req.quantity_bags}</Text>
                  <Text style={$.hTime}>{timeAgo(req.created_at)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {isManager && (
        <TouchableOpacity style={$.fab} activeOpacity={0.8} onPress={() => router.push('/stock/create-request')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function KPI({ value, label }: { value: number; label: string }) {
  return (
    <View style={$.kpiItem}>
      <Text style={$.kpiValue}>{value}</Text>
      <Text style={$.kpiLabel}>{label}</Text>
    </View>
  );
}

const elev = (n: number) => Platform.select({
  ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.02, shadowRadius: n * 4 },
  android: { elevation: n * 2 },
  default: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: n * 2 }, shadowOpacity: 0.04 + n * 0.02, shadowRadius: n * 4 },
}) as any;

const $ = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 96 },

  // Header
  header: { paddingVertical: 22, paddingHorizontal: 24 },
  kpiRow: { flexDirection: 'row', alignItems: 'center' },
  kpiItem: { flex: 1, alignItems: 'center' },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#fff', fontFamily: mono },
  kpiLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  body: { paddingHorizontal: 16, paddingTop: 18 },

  // Priority banner
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12,
    marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: '#f59e0b',
    ...elev(2),
  },
  bannerIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  bannerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  bannerClear: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: '#22c55e',
  },
  bannerClearText: { fontSize: 14, fontWeight: '600', color: '#166534' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2, marginBottom: 10 },

  // Pipeline chips — full width inside body padding; extra end padding so last chip clears edge when scrolled
  pipelineScroll: { marginBottom: 14, alignSelf: 'stretch' },
  pipeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 20,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    flexShrink: 0,
    backgroundColor: '#fff', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0f172a', borderColor: '#0f172a',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  chipBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  chipBadgeTextActive: { color: '#fff' },

  // Active list card
  listCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    ...elev(2),
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 8,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLeft: { flex: 1, minWidth: 0 },
  rowLocation: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowRequester: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  rowQty: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: mono, minWidth: 36, textAlign: 'right' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  rowTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500', minWidth: 40, textAlign: 'right' },

  emptyRow: {
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 24, alignItems: 'center',
    ...elev(1),
  },
  emptyRowText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  // History toggle
  historyToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 28, marginBottom: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 16,
    ...elev(1),
  },
  historyToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyToggleText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  historyToggleRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyToggleAction: { fontSize: 13, fontWeight: '700', color: brand.accent },

  // History card
  historyCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    ...elev(1),
  },
  hRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    gap: 10,
  },
  hRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hDot: { width: 7, height: 7, borderRadius: 4 },
  hLocation: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },
  hQty: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: mono },
  hTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500', minWidth: 52, textAlign: 'right' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: brand.accent,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: brand.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 8 },
      default: { shadowColor: brand.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
    }),
  },
});
