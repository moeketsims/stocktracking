import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useLoans } from '../src/hooks/useLoans';
import { LoanCard } from '../src/components/LoanCard';
import { Loading } from '../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../src/constants/theme';

type Filter = 'active' | 'incoming' | 'outgoing' | 'history';

export default function LoansScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('active');

  const params = filter === 'incoming'
    ? { direction: 'incoming' }
    : filter === 'outgoing'
    ? { direction: 'outgoing' }
    : filter === 'history'
    ? { include_history: true }
    : {};

  const loans = useLoans(params);
  const loanList = loans.data?.loans ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Loans',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.filterRow}>
          {(['active', 'incoming', 'outgoing', 'history'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loans.isLoading ? (
          <Loading fullScreen message="Loading loans..." />
        ) : (
          <FlatList
            data={loanList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={loans.isRefetching} onRefresh={() => loans.refetch()} />
            }
            renderItem={({ item }) => (
              <LoanCard loan={item} onPress={() => router.push(`/loan/${item.id}`)} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No loans</Text>
                <Text style={styles.emptyBody}>No loan requests found.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  filterBtnActive: { backgroundColor: colors.primary[500] },
  filterText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  emptyBody: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: spacing.xs },
});
