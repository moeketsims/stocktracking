import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface BagUsageStats {
  location_id: string;
  item_id: string;
  item_name: string;
  conversion_factor: number;
  kg_remaining: number;
  bags_remaining: number;
  bags_used_today: number;
  kg_used_today: number;
  last_logged_at: string | null;
  bags_used_yesterday: number;
  usage_vs_yesterday_pct: number | null;
}

export interface LogBagResult {
  bag_log_id: string;
  transaction_id: string;
  batch_used_id: string | null;
  kg_deducted: number;
  bags_remaining: number;
}

export interface RecentLog {
  id: string;
  bag_count: number;
  logged_at: string;
  can_undo: boolean;
}

/**
 * Hook for quick bag usage tracking
 * Provides mutations for logging/undoing and queries for stats
 */
export function useBagUsage(itemId?: string) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const locationId = profile?.location_id;

  // Track the most recent log for undo functionality
  const [recentLog, setRecentLog] = useState<RecentLog | null>(null);

  // Query for bag usage stats
  const statsQuery = useQuery<BagUsageStats | null>({
    queryKey: ['bag-usage-stats', locationId, itemId],
    queryFn: async () => {
      if (!locationId) return null;

      let query = supabase
        .from('bag_usage_stats')
        .select('*')
        .eq('location_id', locationId);

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as BagUsageStats | null;
    },
    enabled: !!locationId && !!itemId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query for all items' bag usage (for dashboard)
  const allStatsQuery = useQuery<BagUsageStats[]>({
    queryKey: ['bag-usage-stats-all', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('bag_usage_stats')
        .select('*')
        .eq('location_id', locationId);

      if (error) throw error;
      return (data as BagUsageStats[]) || [];
    },
    enabled: !!locationId,
    refetchInterval: 30000,
  });

  // Mutation to log bag usage
  const logBagMutation = useMutation({
    mutationFn: async ({
      itemId: targetItemId,
      bagCount = 1,
    }: {
      itemId: string;
      bagCount?: number;
    }) => {
      if (!locationId || !user?.id) {
        throw new Error('User or location not available');
      }

      const { data, error } = await supabase.rpc('log_bag_usage', {
        p_location_id: locationId,
        p_item_id: targetItemId,
        p_logged_by: user.id,
        p_bag_count: bagCount,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data?.[0] : data;
      if (!result) throw new Error('No result returned from log_bag_usage');

      return result;
    },
    onSuccess: (result, variables) => {
      // Track for undo
      setRecentLog({
        id: result.bag_log_id,
        bag_count: variables.bagCount || 1,
        logged_at: new Date().toISOString(),
        can_undo: true,
      });

      // Start undo timeout (5 minutes)
      setTimeout(() => {
        setRecentLog((prev) =>
          prev?.id === result.bag_log_id ? { ...prev, can_undo: false } : prev
        );
      }, 5 * 60 * 1000);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['bag-usage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });

  // Mutation to undo bag usage
  const undoMutation = useMutation({
    mutationFn: async (bagLogId: string) => {
      if (!user?.id) {
        throw new Error('User not available');
      }

      const { data, error } = await supabase.rpc('undo_bag_usage', {
        p_bag_log_id: bagLogId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (success, bagLogId) => {
      if (success) {
        // Clear recent log if it was undone
        setRecentLog((prev) => (prev?.id === bagLogId ? null : prev));

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['bag-usage-stats'] });
        queryClient.invalidateQueries({ queryKey: ['stock-balance'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['batches'] });
      }
    },
  });

  // Quick log function with default item
  const logBag = useCallback(
    async (targetItemId?: string, count = 1) => {
      const id = targetItemId || itemId;
      if (!id) throw new Error('No item ID provided');
      return logBagMutation.mutateAsync({ itemId: id, bagCount: count });
    },
    [itemId, logBagMutation]
  );

  // Undo the most recent log
  const undoRecentLog = useCallback(async () => {
    if (!recentLog?.can_undo) {
      throw new Error('No recent log to undo or undo window expired');
    }
    return undoMutation.mutateAsync(recentLog.id);
  }, [recentLog, undoMutation]);

  // Set up realtime subscription for bag usage updates
  useEffect(() => {
    if (!locationId) return;

    const channel = supabase
      .channel(`bag-usage-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bag_usage_logs',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // Refresh stats when new log is added (by anyone)
          queryClient.invalidateQueries({ queryKey: ['bag-usage-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, queryClient]);

  return {
    // Stats
    stats: statsQuery.data,
    allStats: allStatsQuery.data || [],
    isLoading: statsQuery.isLoading,
    isLoadingAll: allStatsQuery.isLoading,

    // Actions
    logBag,
    undoRecentLog,

    // State
    isLogging: logBagMutation.isPending,
    isUndoing: undoMutation.isPending,
    recentLog,
    canUndo: recentLog?.can_undo || false,

    // Errors
    logError: logBagMutation.error,
    undoError: undoMutation.error,

    // Refetch
    refetch: () => {
      statsQuery.refetch();
      allStatsQuery.refetch();
    },
  };
}

/**
 * Hook for fetching user's notifications
 */
export function useUsageNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['usage-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('usage_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const unreadCount = notificationsQuery.data?.filter((n) => !n.is_read).length || 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('usage_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('usage_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-notifications'] });
    },
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'usage_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['usage-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    notifications: notificationsQuery.data || [],
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    refetch: notificationsQuery.refetch,
  };
}
