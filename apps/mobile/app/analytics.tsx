import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useUsageTrends } from '../src/hooks/useUsageTrends';
import { useBagUsage } from '../src/hooks/useBagUsage';
import { Card } from '../src/components/ui';
import { colors, spacing, typography, borderRadius } from '../src/constants/theme';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - spacing.md * 4;

const chartConfig = {
  backgroundGradientFrom: colors.background.secondary,
  backgroundGradientTo: colors.background.secondary,
  color: (opacity = 1) => `rgba(245, 180, 46, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.6,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  labelColor: () => colors.text.secondary,
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: colors.background.tertiary,
  },
};

export default function AnalyticsScreen() {
  const { dailyTrends, hourlyPattern, summary, isLoading, refetch } = useUsageTrends();
  const { allStats } = useBagUsage();

  // Prepare daily chart data
  const dailyChartData = {
    labels: dailyTrends.slice(-7).map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-ZA', { weekday: 'short' }).slice(0, 3);
    }),
    datasets: [
      {
        data: dailyTrends.slice(-7).map((d) => d.bags_used || 0),
      },
    ],
  };

  // Prepare hourly chart data (filter to working hours)
  const workingHours = hourlyPattern.filter((h) => h.hour >= 6 && h.hour <= 22);
  const hourlyChartData = {
    labels: workingHours.map((h) => (h.hour % 3 === 0 ? `${h.hour}:00` : '')),
    datasets: [
      {
        data: workingHours.map((h) => h.bags_used || 0),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Usage Analytics',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.text.primary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary?.total_bags_7d || 0}</Text>
            <Text style={styles.summaryLabel}>Bags (7 days)</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {summary?.avg_bags_per_day.toFixed(1) || '0'}
            </Text>
            <Text style={styles.summaryLabel}>Daily Avg</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <View style={styles.trendContainer}>
              {summary?.trend_direction === 'up' && (
                <Ionicons name="trending-up" size={20} color={colors.success.main} />
              )}
              {summary?.trend_direction === 'down' && (
                <Ionicons name="trending-down" size={20} color={colors.error.main} />
              )}
              {summary?.trend_direction === 'stable' && (
                <Ionicons name="remove" size={20} color={colors.text.tertiary} />
              )}
              <Text
                style={[
                  styles.trendValue,
                  summary?.trend_direction === 'up' && styles.trendUp,
                  summary?.trend_direction === 'down' && styles.trendDown,
                ]}
              >
                {summary?.trend_percentage.toFixed(0) || 0}%
              </Text>
            </View>
            <Text style={styles.summaryLabel}>Trend</Text>
          </Card>
        </View>

        {/* Daily Usage Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="bar-chart" size={20} color={colors.primary[500]} />
            <Text style={styles.chartTitle}>Daily Usage (Last 7 Days)</Text>
          </View>
          {dailyTrends.length > 0 ? (
            <BarChart
              data={dailyChartData}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              yAxisSuffix=""
              yAxisLabel=""
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No data yet</Text>
            </View>
          )}
        </Card>

        {/* Hourly Pattern Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="time" size={20} color={colors.success.main} />
            <Text style={styles.chartTitle}>Today's Hourly Pattern</Text>
          </View>
          {workingHours.some((h) => h.bags_used > 0) ? (
            <LineChart
              data={hourlyChartData}
              width={chartWidth}
              height={180}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              }}
              style={styles.chart}
              bezier
              fromZero
              yAxisSuffix=""
              yAxisLabel=""
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No usage logged today</Text>
            </View>
          )}
        </Card>

        {/* Peak Usage Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Peak Usage</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Best Day</Text>
              <Text style={styles.infoValue}>{formatDate(summary?.peak_day || null)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Bags Used</Text>
              <Text style={styles.infoValue}>{summary?.peak_day_bags || 0}</Text>
            </View>
          </View>
        </Card>

        {/* Current Stock by Item */}
        <Card style={styles.stockCard}>
          <Text style={styles.stockTitle}>Current Stock Levels</Text>
          {allStats.map((stat) => (
            <View key={stat.item_id} style={styles.stockRow}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{stat.item_name}</Text>
                <Text style={styles.stockDetails}>
                  {stat.kg_remaining.toFixed(0)} kg remaining
                </Text>
              </View>
              <View style={styles.stockBags}>
                <Text style={styles.stockBagsValue}>{stat.bags_remaining}</Text>
                <Text style={styles.stockBagsLabel}>bags</Text>
              </View>
            </View>
          ))}
          {allStats.length === 0 && (
            <Text style={styles.emptyText}>No stock data available</Text>
          )}
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  trendUp: {
    color: colors.success.main,
  },
  trendDown: {
    color: colors.error.main,
  },
  chartCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chartTitle: {
    ...typography.label,
    color: colors.text.primary,
  },
  chart: {
    borderRadius: borderRadius.md,
    marginLeft: -spacing.md,
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  infoCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  infoTitle: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  infoValue: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  stockCard: {
    padding: spacing.md,
  },
  stockTitle: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  stockDetails: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  stockBags: {
    alignItems: 'center',
  },
  stockBagsValue: {
    ...typography.h3,
    color: colors.primary[500],
  },
  stockBagsLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
