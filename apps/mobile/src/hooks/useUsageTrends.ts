import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface DailyTrend {
  date: string;
  bags_used: number;
  kg_used: number;
}

export interface HourlyPattern {
  hour: number;
  bags_used: number;
  avg_bags: number;
}

export interface UsageSummary {
  total_bags_7d: number;
  avg_bags_per_day: number;
  peak_day: string | null;
  peak_day_bags: number;
  trend_direction: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export function useUsageTrends(itemId?: string, days = 7) {
  const { profile } = useAuth();
  const locationId = profile?.location_id;

  // Fetch daily trends for the last N days
  const dailyTrendsQuery = useQuery<DailyTrend[]>({
    queryKey: ['usage-trends-daily', locationId, itemId, days],
    queryFn: async () => {
      if (!locationId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('bag_usage_logs')
        .select('logged_at, bag_count, kg_equivalent')
        .eq('location_id', locationId)
        .eq('is_undone', false)
        .gte('logged_at', startDate.toISOString())
        .order('logged_at', { ascending: true });

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by day
      const dailyMap = new Map<string, { bags: number; kg: number }>();

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { bags: 0, kg: 0 });
      }

      // Fill in actual data
      (data as Array<{ logged_at: string; bag_count: number; kg_equivalent: number }> | null)?.forEach((log) => {
        const dateStr = new Date(log.logged_at).toISOString().split('T')[0];
        const existing = dailyMap.get(dateStr) || { bags: 0, kg: 0 };
        dailyMap.set(dateStr, {
          bags: existing.bags + log.bag_count,
          kg: existing.kg + Number(log.kg_equivalent),
        });
      });

      return Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        bags_used: data.bags,
        kg_used: data.kg,
      }));
    },
    enabled: !!locationId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch hourly pattern for today
  const hourlyPatternQuery = useQuery<HourlyPattern[]>({
    queryKey: ['usage-trends-hourly', locationId, itemId],
    queryFn: async () => {
      if (!locationId) return [];

      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('bag_usage_logs')
        .select('logged_at, bag_count')
        .eq('location_id', locationId)
        .eq('is_undone', false)
        .gte('logged_at', today);

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by hour
      const hourlyMap = new Map<number, number>();

      // Initialize all hours
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, 0);
      }

      (data as Array<{ logged_at: string; bag_count: number }> | null)?.forEach((log) => {
        const hour = new Date(log.logged_at).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + log.bag_count);
      });

      return Array.from(hourlyMap.entries()).map(([hour, bags]) => ({
        hour,
        bags_used: bags,
        avg_bags: bags, // In a real scenario, this would be historical average
      }));
    },
    enabled: !!locationId,
    refetchInterval: 30000,
  });

  // Calculate summary statistics
  const summary: UsageSummary | null = dailyTrendsQuery.data
    ? calculateSummary(dailyTrendsQuery.data)
    : null;

  return {
    dailyTrends: dailyTrendsQuery.data || [],
    hourlyPattern: hourlyPatternQuery.data || [],
    summary,
    isLoading: dailyTrendsQuery.isLoading || hourlyPatternQuery.isLoading,
    refetch: () => {
      dailyTrendsQuery.refetch();
      hourlyPatternQuery.refetch();
    },
  };
}

function calculateSummary(dailyTrends: DailyTrend[]): UsageSummary {
  const total = dailyTrends.reduce((sum, d) => sum + d.bags_used, 0);
  const avg = total / dailyTrends.length;

  // Find peak day
  let peakDay: string | null = null;
  let peakBags = 0;
  dailyTrends.forEach((d) => {
    if (d.bags_used > peakBags) {
      peakBags = d.bags_used;
      peakDay = d.date;
    }
  });

  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(dailyTrends.length / 2);
  const firstHalf = dailyTrends.slice(0, midpoint);
  const secondHalf = dailyTrends.slice(midpoint);

  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.bags_used, 0) / (firstHalf.length || 1);
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.bags_used, 0) / (secondHalf.length || 1);

  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  let trendPercentage = 0;

  if (firstHalfAvg > 0) {
    trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    if (trendPercentage > 5) trendDirection = 'up';
    else if (trendPercentage < -5) trendDirection = 'down';
  }

  return {
    total_bags_7d: total,
    avg_bags_per_day: avg,
    peak_day: peakDay,
    peak_day_bags: peakBags,
    trend_direction: trendDirection,
    trend_percentage: Math.abs(trendPercentage),
  };
}
