import { useQuery } from '@tanstack/react-query';
import {
  reportsApi,
  type PeriodDays,
  type TransactionTypeFilter,
} from '../api/reports';
import { STALE_TIME } from '../constants/config';

// --- Reports ---

export function useDailySummary(periodDays: PeriodDays = 7, locationId?: string) {
  return useQuery({
    queryKey: ['reports', 'daily-summary', periodDays, locationId],
    queryFn: () => reportsApi.getDailySummary(periodDays, locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useSupplierQuality(locationId?: string) {
  return useQuery({
    queryKey: ['reports', 'supplier-quality', locationId],
    queryFn: () => reportsApi.getSupplierQuality(locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

// --- Analytics ---

export function useAnalytics(periodDays = 30, locationId?: string) {
  return useQuery({
    queryKey: ['analytics', periodDays, locationId],
    queryFn: () => reportsApi.getAnalytics(periodDays, locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useStockLevels(locationId?: string) {
  return useQuery({
    queryKey: ['analytics', 'stock-levels', locationId],
    queryFn: () => reportsApi.getStockLevels(locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useShopEfficiency(periodDays = 30) {
  return useQuery({
    queryKey: ['analytics', 'shop-efficiency', periodDays],
    queryFn: () => reportsApi.getShopEfficiency(periodDays).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

// --- Transactions ---

export function useTransactions(params: {
  type_filter?: TransactionTypeFilter;
  view_location_id?: string;
  limit?: number;
  offset?: number;
  days?: number;
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => reportsApi.getTransactions(params).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}

export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => reportsApi.getTransaction(id).then((r) => r.data),
    enabled: !!id,
  });
}

// --- Owner Dashboard ---

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => reportsApi.getOwnerDashboard().then((r) => r.data),
    staleTime: STALE_TIME,
  });
}
