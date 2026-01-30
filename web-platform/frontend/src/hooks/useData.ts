import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  stockApi,
  transactionsApi,
  alertsApi,
  batchesApi,
  analyticsApi,
  reportsApi,
  zoneApi,
  notificationsApi,
  settingsApi,
  referenceApi,
  vehiclesApi,
  driversApi,
  tripsApi,
  ownerDashboardApi,
  usersApi,
  invitationsApi,
  pendingDeliveriesApi,
  locationsApi,
} from '../lib/api';
import type {
  DashboardData,
  StockScreenData,
  LocationStockData,
  TransactionsData,
  AlertsData,
  BatchesData,
  AnalyticsData,
  DailySummaryData,
  SupplierQualityData,
  ZoneOverviewData,
  NotificationsData,
  UserSettings,
  ReceiveStockForm,
  IssueStockForm,
  TransferStockForm,
  WasteStockForm,
  Vehicle,
  Driver,
  TripsData,
  TripSummary,
  TripStopsData,
  UsersData,
  InvitationsData,
  InviteUserForm,
  UpdateUserForm,
} from '../types';

// Dashboard
export function useDashboard(viewLocationId?: string) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', viewLocationId],
    queryFn: async () => {
      const response = await dashboardApi.getDashboard(viewLocationId);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Stock
export function useStockOverview() {
  return useQuery<StockScreenData>({
    queryKey: ['stock-overview'],
    queryFn: async () => {
      const response = await stockApi.getOverview();
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useStockByLocation() {
  return useQuery<LocationStockData>({
    queryKey: ['stock-by-location'],
    queryFn: async () => {
      const response = await stockApi.getByLocation();
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds - balances freshness with performance
    // Keep previous data visible while refetching (prevents "flash of empty content")
    placeholderData: (previousData) => previousData,
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReceiveStockForm) => {
      const response = await stockApi.receive(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useIssueStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: IssueStockForm) => {
      const response = await stockApi.issue(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransferStockForm) => {
      const response = await stockApi.transfer(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['zone-overview'] });
    },
  });
}

export function useWasteStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WasteStockForm) => {
      const response = await stockApi.waste(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Transactions
export function useTransactions(typeFilter: string = 'all', limit: number = 50) {
  return useQuery<TransactionsData>({
    queryKey: ['transactions', typeFilter, limit],
    queryFn: async () => {
      const response = await transactionsApi.getAll({
        type_filter: typeFilter,
        limit,
      });
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// Alerts
export function useAlerts() {
  return useQuery<AlertsData>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await alertsApi.getAll();
      return response.data;
    },
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      alert_type: string;
      location_id: string;
      item_id: string;
      notes?: string;
    }) => {
      const response = await alertsApi.acknowledge(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Batches
export function useBatches(filterType: string = 'all', itemId?: string) {
  return useQuery<BatchesData>({
    queryKey: ['batches', filterType, itemId],
    queryFn: async () => {
      const response = await batchesApi.getAll({
        filter_type: filterType,
        item_id: itemId,
      });
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useOldestBatch(itemId: string) {
  return useQuery({
    queryKey: ['oldest-batch', itemId],
    queryFn: async () => {
      const response = await batchesApi.getOldest(itemId);
      return response.data;
    },
    enabled: !!itemId,
  });
}

// Analytics
export function useAnalytics(periodDays: number = 30, viewLocationId?: string) {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics', periodDays, viewLocationId],
    queryFn: async () => {
      const response = await analyticsApi.get(periodDays, viewLocationId);
      return response.data;
    },
    staleTime: 60 * 1000, // Analytics can be cached longer
    placeholderData: (previousData) => previousData,
  });
}

export function useHourlyComparison(locationId?: string) {
  return useQuery({
    queryKey: ['hourly-comparison', locationId],
    queryFn: async () => {
      const response = await analyticsApi.getHourlyComparison(locationId);
      return response.data;
    },
  });
}

export function useWeeklyComparison(locationId?: string) {
  return useQuery({
    queryKey: ['weekly-comparison', locationId],
    queryFn: async () => {
      const response = await analyticsApi.getWeeklyComparison(locationId);
      return response.data;
    },
  });
}

export function useMonthlyComparison(locationId?: string) {
  return useQuery({
    queryKey: ['monthly-comparison', locationId],
    queryFn: async () => {
      const response = await analyticsApi.getMonthlyComparison(locationId);
      return response.data;
    },
  });
}

export function useShopEfficiency(periodDays: number = 30) {
  return useQuery({
    queryKey: ['shop-efficiency', periodDays],
    queryFn: async () => {
      const response = await analyticsApi.getShopEfficiency(periodDays);
      return response.data;
    },
  });
}

export function useStockLevels() {
  return useQuery({
    queryKey: ['stock-levels'],
    queryFn: async () => {
      const response = await analyticsApi.getStockLevels();
      return response.data;
    },
  });
}

// Owner Dashboard
export function useOwnerDashboard() {
  return useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const response = await ownerDashboardApi.get();
      return response.data;
    },
  });
}

// Reports
export function useDailySummary(periodDays: number = 7) {
  return useQuery<DailySummaryData>({
    queryKey: ['daily-summary', periodDays],
    queryFn: async () => {
      const response = await reportsApi.getDailySummary(periodDays);
      return response.data;
    },
  });
}

export function useSupplierQuality() {
  return useQuery<SupplierQualityData>({
    queryKey: ['supplier-quality'],
    queryFn: async () => {
      const response = await reportsApi.getSupplierQuality();
      return response.data;
    },
  });
}

// Zone Overview
export function useZoneOverview() {
  return useQuery<ZoneOverviewData>({
    queryKey: ['zone-overview'],
    queryFn: async () => {
      const response = await zoneApi.getOverview();
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// Notifications
export function useNotifications() {
  return useQuery<NotificationsData>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsApi.getAll();
      return response.data;
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await notificationsApi.markRead(notificationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await notificationsApi.markAllRead();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Settings
export function useSettings() {
  return useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsApi.get();
      return response.data;
    },
  });
}

// Reference Data
export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await referenceApi.getItems();
      return response.data.items;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await referenceApi.getSuppliers();
      return response.data.suppliers;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await referenceApi.getLocations();
      return response.data.locations;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useWasteReasons() {
  return useQuery({
    queryKey: ['waste-reasons'],
    queryFn: async () => {
      const response = await referenceApi.getWasteReasons();
      return response.data.reasons;
    },
    staleTime: Infinity, // Never refetch
  });
}

export function useQualityScores() {
  return useQuery({
    queryKey: ['quality-scores'],
    queryFn: async () => {
      const response = await referenceApi.getQualityScores();
      return response.data.scores;
    },
    staleTime: Infinity,
  });
}

// Vehicles
export function useVehicles(activeOnly: boolean = true, includeTripStatus: boolean = false) {
  return useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ['vehicles', activeOnly, includeTripStatus],
    queryFn: async () => {
      const response = await vehiclesApi.list(activeOnly, includeTripStatus);
      return response.data;
    },
    staleTime: includeTripStatus ? 30 * 1000 : 5 * 60 * 1000, // Shorter cache when checking trip status
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const response = await vehiclesApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      const response = await vehiclesApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await vehiclesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Drivers
export function useDrivers(activeOnly: boolean = true) {
  return useQuery<{ drivers: Driver[] }>({
    queryKey: ['drivers', activeOnly],
    queryFn: async () => {
      const response = await driversApi.list(activeOnly);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Driver>) => {
      const response = await driversApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Driver> }) => {
      const response = await driversApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await driversApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useResendDriverInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driverId: string) => {
      const response = await driversApi.resendInvitation(driverId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Trips
export function useTrips(params?: { status?: string; vehicle_id?: string; from_date?: string; to_date?: string; limit?: number }) {
  return useQuery<TripsData>({
    queryKey: ['trips', params],
    queryFn: async () => {
      const response = await tripsApi.list(params);
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const response = await tripsApi.get(tripId);
      return response.data;
    },
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await tripsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-summary'] });
    },
  });
}

export function useStartTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await tripsApi.start(tripId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useCompleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: any }) => {
      const response = await tripsApi.complete(tripId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useCancelTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await tripsApi.cancel(tripId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-summary'] });
    },
  });
}

export function useTripSummary(params?: { from_date?: string; to_date?: string; vehicle_id?: string }) {
  return useQuery<TripSummary>({
    queryKey: ['trip-summary', params],
    queryFn: async () => {
      const response = await tripsApi.getSummary(params);
      return response.data;
    },
  });
}

// Multi-Stop Trips
export function useCreateMultiStopTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await tripsApi.createMultiStop(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-summary'] });
    },
  });
}

export function useTripStops(tripId: string) {
  return useQuery<TripStopsData>({
    queryKey: ['trip-stops', tripId],
    queryFn: async () => {
      const response = await tripsApi.getStops(tripId);
      return response.data;
    },
    enabled: !!tripId,
  });
}

export function useArriveAtStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stopId: string) => {
      const response = await tripsApi.arriveAtStop(stopId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-stops'] });
    },
  });
}

export function useCompleteStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stopId, data }: { stopId: string; data?: any }) => {
      const response = await tripsApi.completeStop(stopId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-stops'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useAddStopToTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, stop }: { tripId: string; stop: any }) => {
      const response = await tripsApi.addStop(tripId, stop);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-stops'] });
    },
  });
}

// User Management Hooks
export function useUsers(params?: { role?: string; zone_id?: string; is_active?: boolean; search?: string }) {
  return useQuery<UsersData>({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await usersApi.list(params);
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserForm }) => {
      const response = await usersApi.update(userId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.deactivate(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.activate(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.resetPassword(userId);
      return response.data;
    },
  });
}

// Invitations Hooks
export function useInvitations(status?: string) {
  return useQuery<InvitationsData>({
    queryKey: ['invitations', status],
    queryFn: async () => {
      const response = await invitationsApi.list(status);
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteUserForm) => {
      const response = await invitationsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await invitationsApi.cancel(invitationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await invitationsApi.resend(invitationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

// Zones (for dropdowns)
export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const response = await referenceApi.getZones();
      return response.data.zones;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Location Management (Admin only)
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; zone_id: string; type: 'shop' | 'warehouse'; address?: string }) => {
      const response = await referenceApi.createLocation(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; address?: string } }) => {
      const response = await referenceApi.updateLocation(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await referenceApi.deleteLocation(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

// Location Thresholds
export function useLocationThresholds(locationId: string) {
  return useQuery({
    queryKey: ['location-thresholds', locationId],
    queryFn: async () => {
      const response = await locationsApi.getThresholds(locationId);
      return response.data;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateLocationThresholds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      data,
    }: {
      locationId: string;
      data: { critical_stock_threshold: number; low_stock_threshold: number };
    }) => {
      const response = await locationsApi.updateThresholds(locationId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['location-thresholds', variables.locationId] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Pending Deliveries Count (for sidebar badge)
// Includes both en-route trips and pending deliveries awaiting confirmation
export function usePendingDeliveriesCount() {
  return useQuery({
    queryKey: ['deliveries', 'tracking-count'],
    queryFn: async () => {
      // Fetch both in parallel
      const [pendingRes, tripsRes] = await Promise.all([
        pendingDeliveriesApi.getPending(undefined, 100),
        tripsApi.list({ status: 'in_progress', limit: 100 }),
      ]);
      const pendingCount = pendingRes.data?.deliveries?.length || 0;
      const inProgressCount = tripsRes.data?.trips?.length || 0;
      return pendingCount + inProgressCount;
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 15 * 1000, // Consider stale after 15 seconds
  });
}

// Driver Loan Trips (for drivers to see their assigned loan pickups/returns)
export function useDriverLoanTrips() {
  return useQuery({
    queryKey: ['driver-loan-trips'],
    queryFn: async () => {
      const response = await tripsApi.getDriverLoanTrips();
      return response.data;
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}

// Driver Loan Trips Count (for sidebar badge on Requests tab)
export function useDriverLoanTripsCount() {
  return useQuery({
    queryKey: ['driver-loan-trips-count'],
    queryFn: async () => {
      const response = await tripsApi.getDriverLoanTripsCount();
      return response.data?.count || 0;
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}
