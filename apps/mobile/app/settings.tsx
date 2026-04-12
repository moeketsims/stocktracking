import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useLogout } from '../src/hooks/useAuth';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { colors, spacing, fontSize, fontWeight } from '../src/constants/theme';
import { APP_VERSION } from '../src/constants/config';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Row label="Name" value={user?.full_name ?? '—'} />
            <Row label="Email" value={user?.email ?? '—'} />
            <Row label="Role" value={user?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '—'} />
            <Row label="Location" value={user?.location_name ?? 'All locations'} />
            <Row label="Zone" value={user?.zone_name ?? '—'} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>App</Text>
            <Row label="Version" value={APP_VERSION} />
          </Card>

          <Button
            title="Sign Out"
            onPress={() => logout.mutate()}
            variant="danger"
            loading={logout.isPending}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  rowValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
});
