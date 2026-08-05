import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useMyRequests, useAvailableRequests } from '../../src/hooks/useRequests';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import { timeAgo } from '../../src/utils/dates';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  VoucherCard,
  FloatingFrameLabel,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { StockRequest } from '../../src/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_STATUSES = new Set([
  'pending',
  'accepted',
  'trip_created',
  'in_delivery',
  'time_proposed',
  'partially_fulfilled',
]);

function shortTicketNumber(uuid: string): string {
  return uuid.slice(-4).toUpperCase();
}

function ageSeverity(createdAt: string): 'normal' | 'stale' | 'overdue' {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  if (days >= 14) return 'overdue';
  if (days >= 3) return 'stale';
  return 'normal';
}

export default function RequestsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = ['location_manager', 'zone_manager', 'admin'].includes(user?.role ?? '');

  const myQuery = useMyRequests();
  const availableQuery = useAvailableRequests();
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const allRequests = myQuery.data?.requests ?? [];

  const { active, history, urgent } = useMemo(() => {
    const a: StockRequest[] = [];
    const h: StockRequest[] = [];
    let u: StockRequest | undefined;
    for (const req of allRequests) {
      if (ACTIVE_STATUSES.has(req.status)) {
        a.push(req);
        if (req.urgency === 'urgent' && !u) u = req;
      } else {
        h.push(req);
      }
    }
    return { active: a, history: h, urgent: u };
  }, [allRequests]);

  const weeklyCount = useMemo(() => {
    const wk = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return allRequests.filter((r) => new Date(r.created_at).getTime() >= wk).length;
  }, [allRequests]);

  const urgentCount = active.filter((r) => r.urgency === 'urgent').length;

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistoryExpanded(!historyExpanded);
  };

  const handleRefresh = () => {
    myQuery.refetch();
    availableQuery.refetch();
  };

  if (myQuery.isLoading) return <Loading fullScreen message="" />;
  if (myQuery.isError) {
    return (
      <PaperBackground>
        <QueryErrorState error={myQuery.error} onRetry={() => myQuery.refetch()} />
      </PaperBackground>
    );
  }

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={myQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            kicker={fmtKickerDate()}
            title="Requests"
          />

          {/* Summary band — 3 columns per spec (§Screen 4 step 2) */}
          <View style={styles.summary}>
            <SummaryStat value={active.length} label="Active" />
            <SummaryStat value={urgentCount} label="Urgent" color={wp.color.red} />
            <SummaryStat value={weeklyCount} label="This wk" />
          </View>

          {/* Urgent ticket callout */}
          {urgent && (
            <View style={styles.urgentWrap}>
              <View style={styles.urgentBox}>
                <FloatingFrameLabel color={wp.color.red}>Urgent ticket</FloatingFrameLabel>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push(`/request/${urgent.id}`)}
                  style={styles.urgentRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text maxFontSizeMultiplier={wp.fontScale.display} style={styles.urgentTitle}>
                      {urgent.location?.name ?? 'Unknown'}
                    </Text>
                    <MonoText size={11} color={wp.color.ink2} style={{ marginTop: 2 }}>
                      R-{shortTicketNumber(urgent.id)}
                      {urgent.requester?.full_name ? ` · ${urgent.requester.full_name}` : ''}
                      {' · '}
                      {timeAgo(urgent.created_at)}
                    </MonoText>
                    {ageSeverity(urgent.created_at) !== 'normal' && (
                      <MonoText
                        size={10}
                        weight={700}
                        tracking={1}
                        upper
                        color={wp.color.red}
                        style={{ marginTop: 6 }}
                      >
                        {ageSeverity(urgent.created_at) === 'overdue' ? 'Overdue' : 'Needs follow-up'}
                      </MonoText>
                    )}
                  </View>
                  <View style={styles.urgentQty}>
                    <SerifNumber size={36} tracking={-1} leading={1} color={wp.color.red}>
                      {String(urgent.quantity_bags)}
                    </SerifNumber>
                    <MonoText size={10} weight={700} tracking={1} upper color={wp.color.red}>
                      Bags
                    </MonoText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Section header + inline NEW REQUEST (replaces floating FAB) */}
          <View style={styles.sectionHead}>
            <KickerLabel size={11} weight={600} tracking={1} color={wp.color.ink}>
              Active tickets
            </KickerLabel>
            {isManager && (
              <InkButton
                label="+ New request"
                onPress={() => router.push('/stock/create-request')}
              />
            )}
          </View>

          <View style={styles.ticketList}>
            {active.length > 0 ? (
              active.map((r, i) => (
                <VoucherCard
                  key={r.id}
                  ticketNumber={shortTicketNumber(r.id)}
                  title={r.location?.name ?? 'Unknown'}
                  // Two facts, not three. The age flag used to be appended here
                  // as well, which overflowed the line and truncated the most
                  // important word to "OVE…" — while the stamp on the same row
                  // already said OVERDUE. Dropping it removes the duplication
                  // and the truncation together.
                  meta={`${r.requester?.full_name ?? 'Unknown'} · ${timeAgo(r.created_at)}`}
                  quantityBags={r.quantity_bags}
                  status={r.status}
                  // Don't collapse both age buckets into "OVERDUE": a 3-day-old
                  // ticket and a 3-week-old one are different situations, and
                  // the urgent callout above already distinguishes them.
                  stampLabel={
                    ageSeverity(r.created_at) === 'overdue'
                      ? 'OVERDUE'
                      : ageSeverity(r.created_at) === 'stale'
                        ? 'FOLLOW UP'
                        : undefined
                  }
                  rowIndex={i}
                  onPress={() => router.push(`/request/${r.id}`)}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  No active tickets
                </MonoText>
              </View>
            )}
          </View>

          {/* Completed-tickets list footer — solid top border per directive */}
          {history.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.completedFooter}
                onPress={toggleHistory}
                activeOpacity={0.7}
              >
                <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.completedLabel}>
                  {history.length} completed {history.length === 1 ? 'ticket' : 'tickets'}
                </Text>
                <View style={styles.completedAction}>
                  <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.completedView}>
                    {historyExpanded ? 'HIDE' : 'VIEW'}
                  </Text>
                  <Ionicons
                    name={historyExpanded ? 'chevron-up' : 'chevron-forward'}
                    size={14}
                    color={wp.color.ink}
                  />
                </View>
              </TouchableOpacity>

              {historyExpanded && (
                <View style={styles.historyList}>
                  {history.map((r) => (
                    <View key={r.id} style={styles.historyRowWrap}>
                      <TouchableOpacity
                        onPress={() => router.push(`/request/${r.id}`)}
                        style={styles.historyRow}
                        activeOpacity={0.7}
                      >
                        <MonoText size={10} color={wp.color.ink3} style={{ width: 64 }}>
                          N° {shortTicketNumber(r.id)}
                        </MonoText>
                        <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.historyName} numberOfLines={1}>
                          {r.location?.name ?? 'Unknown'}
                        </Text>
                        <MonoText size={14} weight={700} color={wp.color.ink} style={styles.historyQty}>
                          {r.quantity_bags}
                        </MonoText>
                        <MonoText size={10} color={wp.color.ink3} style={styles.historyTime}>
                          {timeAgo(r.created_at)}
                        </MonoText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function SummaryStat({
  value,
  label,
  color = wp.color.ink,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <MonoText size={22} weight={700} color={color}>
        {value}
      </MonoText>
      <KickerLabel size={10} tracking={1.1} color={wp.color.ink2} style={{ marginTop: 2 }}>
        {label}
      </KickerLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },

  // 3-column summary band (spec §Screen 4 step 2)
  summary: {
    flexDirection: 'row',
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 14,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'column',
  },

  urgentWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 16,
  },
  urgentBox: {
    borderWidth: wp.border.thick,
    borderColor: wp.color.red,
    backgroundColor: wp.color.criticalCallout,
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingTop: 16,
    position: 'relative',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urgentTitle: {
    fontFamily: wp.font.sansBold.fontFamily,
    fontWeight: wp.font.sansBold.fontWeight,
    fontSize: 15,
    color: wp.color.ink,
  },
  urgentQty: {
    alignItems: 'center',
    minWidth: 54,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    paddingBottom: 10,
    gap: 12,
  },

  ticketList: {
    paddingHorizontal: wp.space.screenH,
  },

  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  // Solid 1.5px top border, mono label left, VIEW + chevron right
  completedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: wp.space.block,
    marginHorizontal: wp.space.screenH,
    paddingVertical: 14,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
  },
  completedLabel: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 11,
    letterSpacing: 0.8,
    color: wp.color.ink2,
    textTransform: 'uppercase',
  },
  completedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedView: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 11,
    letterSpacing: 1,
    color: wp.color.ink,
  },

  historyList: {},
  // Inset dashed divider via marginHorizontal, not paddingHorizontal —
  // keeps the rule off the screen edges per global rule §4.
  historyRowWrap: {
    marginHorizontal: wp.space.screenH,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  historyName: {
    flex: 1,
    fontFamily: wp.font.sansMid.fontFamily,
    fontWeight: wp.font.sansMid.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  historyQty: {
    minWidth: 36,
    textAlign: 'right',
  },
  historyTime: {
    minWidth: 60,
    textAlign: 'right',
  },
});
