import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, spacing, fontSize, fontWeight } from '../src/constants/theme';

export default function NotificationsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Push notifications coming in Phase 5</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  subtitle: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: spacing.xs },
});
