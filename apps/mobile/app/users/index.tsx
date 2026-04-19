import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useUsers } from '../../src/hooks/useUsers';
import { useAuthStore } from '../../src/stores/authStore';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  TabStrip,
  LedgerRow,
  Stamp,
  MonoText,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { UserRole } from '../../src/types';

type Filter = 'all' | 'admin' | 'zone_manager' | 'location_manager' | 'vehicle_manager' | 'driver' | 'staff';

const ROLE_LABEL: Record<string, string> = {
  admin: 'ADMIN',
  zone_manager: 'ZONE MGR',
  location_manager: 'LOC MGR',
  vehicle_manager: 'VEH MGR',
  driver: 'DRIVER',
  staff: 'STAFF',
};

const ROLE_COLOR: Record<string, string> = {
  admin: wp.color.red,
  zone_manager: wp.color.amber,
  location_manager: '#1F3A8A',
  vehicle_manager: '#5B2CA5',
  driver: wp.color.green,
  staff: wp.color.ink3,
};

export default function UsersListScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isRefetching, refetch } = useUsers({
    role: filter === 'all' ? undefined : filter,
    search: search.trim() || undefined,
  });

  if (!hasRole('admin' as UserRole)) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="ACCESS" title="Denied" backUseRouter />
          <View style={styles.denied}>
            <MonoText size={11} tracking={1.5} upper color={wp.color.ink3}>
              Admin access required
            </MonoText>
          </View>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const users = data?.users ?? [];

  const counts = useMemo(() => {
    return {
      all: data?.total ?? users.length,
    };
  }, [data, users.length]);

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {isLoading && !data ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`PERSONNEL ROSTER — ${fmtKickerDate()}`}
              title="Users"
              backUseRouter
            />

            <TabStrip<Filter>
              items={[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'admin', label: 'Admin' },
                { key: 'driver', label: 'Driver' },
                { key: 'staff', label: 'Staff' },
              ]}
              active={filter}
              onChange={setFilter}
            />

            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Text allowFontScaling={false} style={styles.searchGlyph}>⌕</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="name · email"
                  placeholderTextColor={wp.color.ink3}
                  style={styles.searchInput}
                />
              </View>
              <InkButton label="+ Invite" onPress={() => router.push('/users/create')} />
            </View>

            {users.length === 0 ? (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  {search ? 'No matches' : 'No users on file'}
                </MonoText>
              </View>
            ) : (
              users.map((u, i) => {
                const isInactive = !u.is_active;
                const roleColor = isInactive ? wp.color.ink3 : ROLE_COLOR[u.role] ?? wp.color.ink;
                const context = [
                  u.email ?? '',
                  u.location_name ?? null,
                  isInactive ? 'INACTIVE' : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <LedgerRow
                    key={u.id}
                    idx={i + 1}
                    primary={u.full_name ?? '(No name)'}
                    secondary={context.toUpperCase()}
                    trailing={
                      <Stamp colorHex={roleColor} rowIndex={i}>
                        {ROLE_LABEL[u.role] ?? u.role.toUpperCase()}
                      </Stamp>
                    }
                    onPress={() => router.push(`/users/${u.id}`)}
                  />
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
    paddingBottom: 6,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    paddingVertical: 6,
    gap: 8,
  },
  searchGlyph: {
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 12,
    color: wp.color.ink3,
  },
  searchInput: {
    flex: 1,
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 14,
    color: wp.color.ink,
    padding: 0,
  },
  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.section,
  },
});
