import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Truck,
  Clock,
  Check,
  AlertCircle,
  Package,
  RefreshCw,
  ChevronRight,
  User,
  Store,
  CheckCircle,
  XCircle,
  Filter,
  MapPin,
  Navigation,
  Timer,
  PackageCheck,
  Mail,
  Edit3,
  MoreVertical,
  Gauge,
  Eye,
  Calendar,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '../components/ui';
import { pendingDeliveriesApi, tripsApi, loansApi } from '../lib/api';
import ConfirmDeliveryModal from '../components/modals/ConfirmDeliveryModal';
import { useAuthStore } from '../stores/authStore';
import type { PendingDelivery, Trip } from '../types';

const KG_PER_BAG = 10;

// Helper to get relative time
const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format ETA
const formatETA = (etaStr: string | null): string => {
  if (!etaStr) return 'No ETA';
  const eta = new Date(etaStr);
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();

  if (diffMs < 0) return 'Overdue';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) return `~${diffMins}m`;
  if (diffHours < 24) return `~${diffHours}h ${diffMins % 60}m`;
  return eta.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

type TabFilter = 'tracking' | 'history';

export default function DeliveriesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabFilter>('tracking');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days');
  const [completingTripId, setCompletingTripId] = useState<string | null>(null);
  const [showCorrectKmModal, setShowCorrectKmModal] = useState(false);
  const [selectedTripForCorrection, setSelectedTripForCorrection] = useState<{ tripId: string; currentKm: number; startingKm: number } | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check user role for admin actions
  const user = useAuthStore((state) => state.user);
  const isVehicleManager = user?.role && ['admin', 'vehicle_manager'].includes(user.role);

  // Mutation to complete a trip by completing its dropoff stop
  const completeTripMutation = useMutation({
    mutationFn: async ({ tripId }: { tripId: string }) => {
      // First, get the trip stops to find the dropoff stop
      const stopsResponse = await tripsApi.getStops(tripId);
      const stops = stopsResponse.data?.stops || [];

      // Find the dropoff stop that hasn't been completed yet
      const dropoffStop = stops.find(
        (s: any) => s.stop_type === 'dropoff' && !s.is_completed
      );

      if (!dropoffStop) {
        // If no dropoff stop, try to complete the trip directly
        // This handles simple trips
        const response = await tripsApi.complete(tripId, {
          fuel_cost: 0,
          toll_cost: 0,
          other_cost: 0,
          notes: 'Marked as arrived from Deliveries page',
        });
        return response.data;
      }

      // Complete the dropoff stop - this creates the pending delivery
      const response = await tripsApi.completeStop(dropoffStop.id, {
        actual_qty_kg: dropoffStop.planned_qty_kg || 500,
        notes: 'Marked as arrived from Deliveries page',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setCompletingTripId(null);
      setSuccessMessage('Delivery marked as arrived. Awaiting confirmation.');
      setTimeout(() => setSuccessMessage(null), 2000);
    },
    onError: (error: any) => {
      console.error('Failed to complete trip:', error);
      alert(error.response?.data?.detail || 'Failed to mark trip as arrived');
      setCompletingTripId(null);
    },
  });

  // Feature 2: Resend KM email mutation
  const resendKmEmailMutation = useMutation({
    mutationFn: (deliveryId: string) => pendingDeliveriesApi.resendKmEmail(deliveryId),
    onSuccess: (response) => {
      alert(`KM submission email sent to ${response.data.driver_email}`);
      setResendingEmailId(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to resend email');
      setResendingEmailId(null);
    },
  });

  // Feature 4: Correct KM mutation
  const correctKmMutation = useMutation({
    mutationFn: (data: { tripId: string; new_closing_km: number; reason: string }) =>
      pendingDeliveriesApi.correctKm(data.tripId, {
        new_closing_km: data.new_closing_km,
        reason: data.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowCorrectKmModal(false);
      setSelectedTripForCorrection(null);
      alert('Closing km corrected successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to correct km');
    },
  });

  // Loan Collection mutation (Lender confirms driver collected stock)
  const confirmLoanCollectionMutation = useMutation({
    mutationFn: (loanId: string) => loansApi.confirmCollection(loanId),
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['trips', 'in_progress'] });

      // Snapshot the previous value
      const previousTrips = queryClient.getQueryData(['trips', 'in_progress']);

      // Optimistically remove the trip from the list (it will move to history)
      if (completingTripId) {
        queryClient.setQueryData(['trips', 'in_progress'], (old: any) => {
          if (!old?.trips) return old;
          return {
            ...old,
            trips: old.trips.filter((t: any) => t.id !== completingTripId),
          };
        });
      }

      return { previousTrips };
    },
    onSuccess: (response) => {
      // Invalidate all relevant queries to update the UI with server data
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] }); // Required for history count update
      setCompletingTripId(null);
      const qty = response.data?.quantity_bags || 0;
      setSuccessMessage(`Collection confirmed! ${qty} bags released to driver.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any, _, context) => {
      const errorDetail = error.response?.data?.detail || '';
      const isAlreadyConfirmed = errorDetail.toLowerCase().includes('already confirmed');

      if (isAlreadyConfirmed) {
        // Already confirmed - just refresh the data (trip should disappear with our filter)
        console.log('Collection was already confirmed, refreshing data');
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
        setSuccessMessage('Collection already confirmed. Refreshing...');
        setTimeout(() => setSuccessMessage(null), 2000);
      } else {
        // Rollback to previous value on actual error
        if (context?.previousTrips) {
          queryClient.setQueryData(['trips', 'in_progress'], context.previousTrips);
        }
        console.error('Failed to confirm collection:', error);
        alert(errorDetail || 'Failed to confirm collection');
      }
      setCompletingTripId(null);
    },
  });

  // Loan Receipt mutation (Borrower confirms stock arrived)
  const confirmLoanReceiptMutation = useMutation({
    mutationFn: (loanId: string) => loansApi.confirmReceipt(loanId),
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['trips', 'in_progress'] });

      // Snapshot the previous value
      const previousTrips = queryClient.getQueryData(['trips', 'in_progress']);

      // Optimistically remove the trip from the list (it will move to history)
      if (completingTripId) {
        queryClient.setQueryData(['trips', 'in_progress'], (old: any) => {
          if (!old?.trips) return old;
          return {
            ...old,
            trips: old.trips.filter((t: any) => t.id !== completingTripId),
          };
        });
      }

      return { previousTrips };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      setCompletingTripId(null);
      const qty = response.data?.quantity_bags || 0;
      setSuccessMessage(`Receipt confirmed! ${qty} bags added to your stock.`);
      setTimeout(() => setSuccessMessage(null), 2000);
    },
    onError: (error: any, _, context) => {
      const errorDetail = error.response?.data?.detail || '';
      const isAlreadyConfirmed = errorDetail.toLowerCase().includes('already confirmed');

      if (isAlreadyConfirmed) {
        // Already confirmed - just refresh the data
        console.log('Receipt was already confirmed, refreshing data');
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
        setSuccessMessage('Receipt already confirmed. Refreshing...');
        setTimeout(() => setSuccessMessage(null), 2000);
      } else {
        // Rollback to previous value on actual error
        if (context?.previousTrips) {
          queryClient.setQueryData(['trips', 'in_progress'], context.previousTrips);
        }
        console.error('Failed to confirm receipt:', error);
        alert(errorDetail || 'Failed to confirm receipt');
      }
      setCompletingTripId(null);
    },
  });

  // Fetch in-progress trips (en route)
  const { data: inProgressTripsData, isLoading: loadingTrips, refetch: refetchTrips } = useQuery({
    queryKey: ['trips', 'in_progress'],
    queryFn: () => tripsApi.list({ status: 'in_progress', limit: 50 }).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 30 * 1000,
    placeholderData: (previousData: typeof inProgressTripsData) => previousData,
  });

  // Fetch pending deliveries (awaiting confirmation)
  const { data: pendingData, isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['pending-deliveries', 'pending'],
    queryFn: () => pendingDeliveriesApi.getPending(undefined, 50).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 30 * 1000,
    placeholderData: (previousData: typeof pendingData) => previousData,
  });

  // Fetch confirmed/rejected deliveries (for history)
  const { data: allData, isLoading: loadingAll, refetch: refetchAll } = useQuery({
    queryKey: ['pending-deliveries', 'all', dateRange],
    queryFn: () => pendingDeliveriesApi.list({ limit: 100 }).then(r => r.data),
    refetchInterval: 60000,
    staleTime: 30 * 1000,
    placeholderData: (previousData: typeof allData) => previousData,
  });

  const isLoading = loadingTrips || loadingPending || loadingAll;

  const rawInProgressTrips = inProgressTripsData?.trips || [];
  const pendingDeliveries = pendingData?.deliveries || [];
  const allDeliveries = allData?.deliveries || [];

  // Filter out loan trips where the current user has already confirmed their part
  // This prevents the trip from showing again after lender confirms (trip stays in_progress for borrower)
  const inProgressTrips = useMemo(() => {
    // Get trip IDs where current user already has a confirmed pending_delivery
    const confirmedTripIds = new Set(
      allDeliveries
        .filter(d => d.status === 'confirmed' && d.location_id === user?.location_id)
        .map(d => d.trip_id)
        .filter(Boolean)
    );

    return rawInProgressTrips.filter(trip => {
      const tripAny = trip as any;
      const isLoanTrip = tripAny.trip_type === 'loan_pickup' || tripAny.trip_type === 'loan_return';

      // For loan trips, check if user already confirmed this trip
      if (isLoanTrip && confirmedTripIds.has(trip.id)) {
        return false; // Hide trip - user already confirmed their part
      }

      return true;
    });
  }, [rawInProgressTrips, allDeliveries, user?.location_id]);

  // Filter deliveries for history
  const historyDeliveries = useMemo(() => {
    let deliveries = allDeliveries.filter(d => d.status === 'confirmed' || d.status === 'rejected');

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === '7days') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        cutoff.setDate(now.getDate() - 30);
      }
      deliveries = deliveries.filter(d => new Date(d.created_at) >= cutoff);
    }

    return deliveries.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allDeliveries, dateRange]);

  const enRouteCount = inProgressTrips.length;
  const pendingCount = pendingDeliveries.length;
  const historyCount = historyDeliveries.length;
  const trackingCount = enRouteCount + pendingCount;

  const handleRefresh = () => {
    refetchTrips();
    refetchPending();
    refetchAll();
  };

  const handleConfirmSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
    queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    setShowConfirmModal(false);
    setSelectedDelivery(null);
    // Show success toast
    setSuccessMessage('Delivery confirmed successfully!');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const openConfirmModal = (delivery: PendingDelivery) => {
    setSelectedDelivery(delivery);
    setShowConfirmModal(true);
  };

  const handleMarkArrived = async (trip: Trip, isLenderAction?: boolean) => {
    setCompletingTripId(trip.id);

    const tripAny = trip as any;
    const isLoanPickup = tripAny.trip_type === 'loan_pickup';
    const isLoanReturn = tripAny.trip_type === 'loan_return';

    if (isLoanPickup || isLoanReturn) {
      // For loan trips, we need to find the loan and call the appropriate mutation
      try {
        // Fetch loans to find the one with this trip (include 'active' for idempotent retry)
        const loansResponse = await loansApi.list({ status: 'in_transit,collected,active,return_in_transit' });
        const loans = loansResponse.data?.loans || [];

        let loan = null;
        if (isLoanPickup) {
          loan = loans.find((l: any) => l.pickup_trip_id === trip.id);
        } else {
          loan = loans.find((l: any) => l.return_trip_id === trip.id);
        }

        if (!loan) {
          alert('Could not find the associated loan for this trip');
          setCompletingTripId(null);
          return;
        }

        // Determine which action to take based on user's location
        if (isLenderAction) {
          // Lender confirming collection (stock leaves their location)
          confirmLoanCollectionMutation.mutate(loan.id);
        } else {
          // Borrower confirming receipt (stock arrives at their location)
          confirmLoanReceiptMutation.mutate(loan.id);
        }
      } catch (error) {
        console.error('Error handling loan trip:', error);
        alert('Failed to process loan action');
        setCompletingTripId(null);
      }
    } else {
      // Regular trip - use existing mutation
      completeTripMutation.mutate({ tripId: trip.id });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track incoming deliveries and confirm receipt
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'history' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5 h-9"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 h-9"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Panel (History only) */}
      {showFilters && activeTab === 'history' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Date Range</h3>
          </div>
          <div className="mt-3 flex gap-2">
            {[
              { value: '7days' as const, label: 'Last 7 days' },
              { value: '30days' as const, label: 'Last 30 days' },
              { value: 'all' as const, label: 'All time' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${dateRange === option.value
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'tracking'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Navigation className="w-4 h-4" />
          Tracking
          {trackingCount > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'tracking'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-orange-200 text-orange-800'
              }`}>
              {trackingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <CheckCircle className="w-4 h-4" />
          History
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'history'
              ? 'bg-gray-200 text-gray-700'
              : 'bg-gray-200 text-gray-600'
            }`}>
            {historyCount}
          </span>
        </button>
      </div>

      {/* Tracking Tab Content */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* En Route Section */}
          {enRouteCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Navigation className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">En Route</h2>
                <span className="ml-auto px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
                  {enRouteCount} on the way
                </span>
              </div>
              <div className="space-y-3">
                {inProgressTrips.map((trip) => {
                  const tripAny = trip as any;
                  const isLoanTrip = tripAny.trip_type === 'loan_pickup' || tripAny.trip_type === 'loan_return';
                  const isOriginLocation = user?.location_id && tripAny.from_location_id === user.location_id;

                  return (
                    <EnRouteCard
                      key={trip.id}
                      trip={trip}
                      onMarkArrived={() => handleMarkArrived(trip, isLoanTrip && isOriginLocation)}
                      isCompleting={completingTripId === trip.id}
                      userLocationId={user?.location_id || null}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Awaiting Confirmation Section */}
          {pendingCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900">Awaiting Confirmation</h2>
                <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
                  {pendingCount} arrived
                </span>
              </div>
              <div className="space-y-3">
                {pendingDeliveries.map((delivery) => (
                  <PendingDeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    onConfirm={() => openConfirmModal(delivery)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {enRouteCount === 0 && pendingCount === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-600">No active deliveries</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                When drivers start deliveries from accepted stock requests, they'll appear here for tracking.
              </p>
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {historyDeliveries.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-600">No delivery history</h3>
              <p className="text-sm text-gray-400 mt-1">
                Confirmed deliveries will appear here.
              </p>
            </div>
          ) : (
            historyDeliveries.map((delivery) => (
              <DeliveryHistoryCard
                key={delivery.id}
                delivery={delivery}
                isVehicleManager={isVehicleManager}
                onResendKmEmail={(id) => {
                  setResendingEmailId(id);
                  resendKmEmailMutation.mutate(id);
                }}
                onCorrectKm={(tripId, currentKm, startingKm) => {
                  setSelectedTripForCorrection({ tripId, currentKm, startingKm });
                  setShowCorrectKmModal(true);
                }}
                isResending={resendingEmailId === delivery.id}
              />
            ))
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmDeliveryModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedDelivery(null);
        }}
        onSuccess={handleConfirmSuccess}
        delivery={selectedDelivery}
      />

      {/* Feature 4: Correct KM Modal */}
      {showCorrectKmModal && selectedTripForCorrection && (
        <CorrectKmModal
          isOpen={showCorrectKmModal}
          onClose={() => {
            setShowCorrectKmModal(false);
            setSelectedTripForCorrection(null);
          }}
          onSubmit={(newKm, reason) => {
            correctKmMutation.mutate({
              tripId: selectedTripForCorrection.tripId,
              new_closing_km: newKm,
              reason,
            });
          }}
          currentKm={selectedTripForCorrection.currentKm}
          startingKm={selectedTripForCorrection.startingKm}
          isSubmitting={correctKmMutation.isPending}
        />
      )}
    </div>
  );
}

// En Route Trip Card - Shows trips in progress
function EnRouteCard({
  trip,
  onMarkArrived,
  isCompleting,
  userLocationId,
}: {
  trip: Trip;
  onMarkArrived: () => void;
  isCompleting: boolean;
  userLocationId: string | null;
}) {
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loadingLoanDetails, setLoadingLoanDetails] = useState(false);

  const hasETA = trip.estimated_arrival_time;
  const etaDisplay = formatETA(trip.estimated_arrival_time);
  const isOverdue = hasETA && new Date(trip.estimated_arrival_time!) < new Date();

  // Check if this is a loan pickup trip
  const isLoanPickup = trip.trip_type === 'loan_pickup';
  const isLoanReturn = trip.trip_type === 'loan_return';
  const isLoanTrip = isLoanPickup || isLoanReturn;

  // For loan pickups: lender (from_location) confirms pickup, borrower (to_location) confirms receipt
  // For loan returns: borrower (from_location) confirms pickup, lender (to_location) confirms receipt
  // Check both direct ID and nested location object ID for compatibility
  const fromLocationId = trip.from_location_id || trip.from_location?.id;
  const toLocationId = trip.to_location_id || trip.to_location?.id;
  const isOriginLocation = userLocationId && fromLocationId === userLocationId;
  const isDestinationLocation = userLocationId && toLocationId === userLocationId;

  // Debug logging
  console.log('Loan Trip Debug:', {
    tripId: trip.id,
    tripType: trip.trip_type,
    isLoanTrip,
    userLocationId,
    fromLocationId,
    toLocationId,
    isOriginLocation,
    isDestinationLocation,
  });

  // Determine button text based on trip type and user's location
  let buttonText = 'Mark Arrived';
  let buttonColor = 'bg-blue-600 hover:bg-blue-700';

  if (isLoanTrip && isOriginLocation) {
    // User is at the origin (lender for pickup, borrower for return) - they confirm driver picked up
    buttonText = 'Confirm Pickup';
    buttonColor = 'bg-amber-600 hover:bg-amber-700';
  } else if (isLoanTrip && isDestinationLocation) {
    // User is at the destination - stock is arriving to them
    buttonText = 'Confirm Receipt';
    buttonColor = 'bg-emerald-600 hover:bg-emerald-700';
  } else if (isLoanTrip) {
    // Fallback for loan trips - show Confirm Pickup for loan_pickup type
    buttonText = isLoanPickup ? 'Confirm Pickup' : 'Confirm Receipt';
    buttonColor = isLoanPickup ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700';
  }

  // Fetch loan details when eye icon is clicked
  const handleViewLoanDetails = async () => {
    if (loanDetails) {
      setShowLoanDetails(true);
      return;
    }

    setLoadingLoanDetails(true);
    try {
      const loansResponse = await loansApi.list({ status: 'in_transit,collected,return_in_transit' });
      const loans = loansResponse.data?.loans || [];

      let loan = null;
      if (isLoanPickup) {
        loan = loans.find((l: any) => l.pickup_trip_id === trip.id);
      } else {
        loan = loans.find((l: any) => l.return_trip_id === trip.id);
      }

      if (loan) {
        setLoanDetails(loan);
        setShowLoanDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch loan details:', error);
    } finally {
      setLoadingLoanDetails(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-blue-100 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Trip Info */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-700">
                {trip.trip_number}
              </span>
              {isLoanTrip && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  isLoanPickup ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {isLoanPickup ? 'Loan Pickup' : 'Loan Return'}
                </span>
              )}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Started {getRelativeTime(trip.departure_time || trip.created_at)}
              </span>
            </div>

            {/* Driver and Vehicle */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>{trip.driver_name || 'Unknown driver'}</span>
              </div>
              {trip.vehicles && (
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  <span>{trip.vehicles.registration_number}</span>
                </div>
              )}
            </div>

            {/* Route */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`flex items-center gap-1.5 ${isOriginLocation ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                <Store className={`w-3.5 h-3.5 ${isOriginLocation ? 'text-amber-500' : 'text-gray-400'}`} />
                <span>{trip.from_location?.name || trip.suppliers?.name || trip.origin_description || 'Origin'}</span>
                {isOriginLocation && isLoanTrip && (
                  <span className="text-xs text-amber-600">(Your location)</span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <div className={`flex items-center gap-1.5 ${isDestinationLocation ? 'text-emerald-700' : 'text-gray-900'} font-medium`}>
                <MapPin className={`w-3.5 h-3.5 ${isDestinationLocation ? 'text-emerald-500' : 'text-blue-500'}`} />
                <span>{trip.to_location?.name || trip.destination_description || 'Destination'}</span>
                {isDestinationLocation && isLoanTrip && (
                  <span className="text-xs text-emerald-600">(Your location)</span>
                )}
              </div>
            </div>
          </div>

          {/* Action + ETA */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* Eye icon to view loan details */}
              {isLoanTrip && (
                <button
                  onClick={handleViewLoanDetails}
                  disabled={loadingLoanDetails}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors"
                  title="View loan details"
                >
                  <Eye className={`w-4 h-4 ${loadingLoanDetails ? 'animate-pulse' : ''}`} />
                </button>
              )}
              <Button
                onClick={onMarkArrived}
                disabled={isCompleting}
                size="sm"
                className={`${buttonColor} gap-1.5`}
              >
                <PackageCheck className="w-4 h-4" />
                {isCompleting ? 'Processing...' : buttonText}
              </Button>
            </div>
            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
              <Timer className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{etaDisplay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Details Modal */}
      {showLoanDetails && loanDetails && (
        <LoanDetailsModal
          isOpen={showLoanDetails}
          onClose={() => setShowLoanDetails(false)}
          loan={loanDetails}
          isPickup={isLoanPickup}
        />
      )}
    </>
  );
}

// Pending Delivery Card - Prominent, actionable
function PendingDeliveryCard({
  delivery,
  onConfirm,
}: {
  delivery: PendingDelivery;
  onConfirm: () => void;
}) {
  const driverClaimedBags = delivery.driver_claimed_qty_kg / KG_PER_BAG;

  // Determine if this is a loan-related delivery
  const trip = delivery.trip as any;
  const isLoanPickup = trip?.trip_type === 'loan_pickup';
  const isLoanReturn = trip?.trip_type === 'loan_return';
  const isLoanTrip = isLoanPickup || isLoanReturn;

  return (
    <div className={`bg-white rounded-xl border p-4 hover:border-orange-300 transition-colors ${
      isLoanTrip ? 'border-purple-100' : 'border-orange-100'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Trip Info */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-sm font-mono px-2 py-0.5 rounded ${
              isLoanTrip ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {delivery.trip?.trip_number || 'Unknown Trip'}
            </span>
            {isLoanTrip && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                isLoanPickup ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {isLoanPickup ? 'Loan Pickup' : 'Loan Return'}
              </span>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Arrived {getRelativeTime(delivery.created_at)}
            </span>
          </div>

          {/* Driver and Supplier/Source */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span>{delivery.trip?.driver_name || 'Unknown driver'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {isLoanTrip
                  ? (trip?.from_location?.name || 'Loan Transfer')
                  : (delivery.supplier?.name || 'Unknown supplier')}
              </span>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-2">
            <Package className={`w-4 h-4 ${isLoanTrip ? 'text-purple-500' : 'text-orange-500'}`} />
            <span className="text-lg font-bold text-gray-900">{driverClaimedBags} bags</span>
            <span className="text-sm text-gray-400">({delivery.driver_claimed_qty_kg} kg)</span>
          </div>

          {/* Location */}
          {delivery.location && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {delivery.location.name}
            </p>
          )}
        </div>

        {/* Action */}
        <Button
          onClick={onConfirm}
          className={`gap-2 shrink-0 ${isLoanTrip ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          <Check className="w-4 h-4" />
          {isLoanTrip ? 'Confirm Receipt' : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}

// History Card - Shows confirmed/rejected deliveries
function DeliveryHistoryCard({
  delivery,
  isVehicleManager,
  onResendKmEmail,
  onCorrectKm,
  isResending,
}: {
  delivery: PendingDelivery;
  isVehicleManager?: boolean;
  onResendKmEmail?: (id: string) => void;
  onCorrectKm?: (tripId: string, currentKm: number, startingKm: number) => void;
  isResending?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isConfirmed = delivery.status === 'confirmed';
  const isRejected = delivery.status === 'rejected';

  const confirmedBags = (delivery.confirmed_qty_kg || 0) / KG_PER_BAG;
  const driverClaimedBags = delivery.driver_claimed_qty_kg / KG_PER_BAG;

  // Check if km has been submitted (Feature 6)
  const trip = delivery.trip as any;
  const kmSubmitted = trip?.km_submitted || trip?.odometer_end;
  const canResendEmail = isConfirmed && !kmSubmitted && isVehicleManager;
  const canCorrectKm = isConfirmed && kmSubmitted && isVehicleManager;

  // Determine if this is a loan-related delivery
  const isLoanPickup = trip?.trip_type === 'loan_pickup';
  const isLoanReturn = trip?.trip_type === 'loan_return';
  const isLoanTrip = isLoanPickup || isLoanReturn;

  // Determine if this is a loan collection (released) or receipt (received) from notes
  const discrepancyNotes = delivery.discrepancy_notes || '';
  const isLoanCollection = discrepancyNotes.includes('Loan collection');
  const isLoanReceipt = discrepancyNotes.includes('Loan receipt');
  const isLoanHistory = isLoanCollection || isLoanReceipt;

  return (
    <div className={`bg-white rounded-xl border p-4 ${
      isLoanHistory
        ? (isLoanCollection ? 'border-amber-100' : 'border-purple-100')
        : (isConfirmed ? 'border-emerald-100' : 'border-red-100')
      }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Status and Trip */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isConfirmed && !isLoanHistory && (
              <span className="flex items-center gap-1 text-emerald-700 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Confirmed
              </span>
            )}
            {isLoanCollection && (
              <span className="flex items-center gap-1 text-amber-700 text-sm font-medium">
                <PackageCheck className="w-4 h-4" />
                Stock Released
              </span>
            )}
            {isLoanReceipt && (
              <span className="flex items-center gap-1 text-purple-700 text-sm font-medium">
                <Package className="w-4 h-4" />
                Stock Received
              </span>
            )}
            {isRejected && (
              <span className="flex items-center gap-1 text-red-700 text-sm font-medium">
                <XCircle className="w-4 h-4" />
                Rejected
              </span>
            )}
            <span className="text-xs text-gray-400">|</span>
            <span className="text-sm font-mono text-gray-600">
              {delivery.trip?.trip_number || 'Unknown'}
            </span>
            {/* Show loan trip type badge */}
            {(isLoanTrip || isLoanHistory) && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                isLoanPickup || isLoanHistory ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {isLoanReturn ? 'Loan Return' : 'Loan Pickup'}
              </span>
            )}
            {/* Feature 6: Show km submission status - only for non-loan deliveries */}
            {isConfirmed && !isLoanHistory && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${kmSubmitted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                <Gauge className="w-3 h-3 inline mr-0.5" />
                {kmSubmitted ? 'Km Logged' : 'Awaiting Km'}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {delivery.trip?.driver_name || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-gray-400" />
              {isLoanTrip
                ? (trip?.from_location?.name || 'Loan Transfer')
                : (delivery.supplier?.name || 'Unknown')}
            </span>
          </div>

          {/* Quantity Info */}
          {isConfirmed && (
            <div className="text-sm">
              <span className="font-semibold text-gray-900">{confirmedBags} bags</span>
              {confirmedBags !== driverClaimedBags && (
                <span className="text-gray-400 ml-1">
                  (driver claimed {driverClaimedBags})
                </span>
              )}
            </div>
          )}
          {isRejected && (
            <div className="text-sm text-red-600">
              {delivery.discrepancy_notes?.replace('REJECTED: ', '') || 'No reason provided'}
            </div>
          )}
        </div>

        {/* Actions and Timestamp */}
        <div className="flex items-start gap-2">
          {/* Timestamp */}
          <div className="text-right">
            <p className="text-xs text-gray-400">
              {delivery.confirmed_at
                ? formatDate(delivery.confirmed_at)
                : formatDate(delivery.created_at)}
            </p>
            {delivery.confirmer && (
              <p className="text-xs text-gray-400">
                by {delivery.confirmer.full_name}
              </p>
            )}
          </div>

          {/* Action Menu for Vehicle Managers */}
          {isVehicleManager && isConfirmed && (canResendEmail || canCorrectKm) && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {canResendEmail && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onResendKmEmail?.(delivery.id);
                      }}
                      disabled={isResending}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Mail className="w-4 h-4" />
                      {isResending ? 'Sending...' : 'Resend Km Email'}
                    </button>
                  )}
                  {canCorrectKm && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onCorrectKm?.(
                          trip?.id,
                          trip?.odometer_end || 0,
                          trip?.odometer_start || 0
                        );
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Correct Km
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Feature 4: Correct KM Modal
function CorrectKmModal({
  isOpen,
  onClose,
  onSubmit,
  currentKm,
  startingKm,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newKm: number, reason: string) => void;
  currentKm: number;
  startingKm: number;
  isSubmitting: boolean;
}) {
  const [newKm, setNewKm] = useState(currentKm.toString());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const MAX_TRIP_DISTANCE = 2000;
  const newKmNum = parseInt(newKm, 10) || 0;
  const isValid = newKmNum >= startingKm && newKmNum <= startingKm + MAX_TRIP_DISTANCE && newKmNum !== currentKm;
  const tripDistance = newKmNum - startingKm;

  const handleSubmit = () => {
    if (!reason.trim() || reason.length < 5) {
      setError('Please provide a reason (at least 5 characters)');
      return;
    }
    if (!isValid) {
      setError('Invalid closing km value');
      return;
    }
    setError(null);
    onSubmit(newKmNum, reason);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Correct Closing Km</h2>
                <p className="text-sm text-gray-500">Update the odometer reading</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Current Values */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Starting Km</span>
                <span className="font-medium">{startingKm.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Closing Km</span>
                <span className="font-medium">{currentKm.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-500">Current Trip Distance</span>
                <span className="font-medium">{(currentKm - startingKm).toLocaleString()} km</span>
              </div>
            </div>

            {/* New Km Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Closing Km
              </label>
              <input
                type="number"
                value={newKm}
                onChange={(e) => setNewKm(e.target.value)}
                min={startingKm}
                max={startingKm + MAX_TRIP_DISTANCE}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-semibold"
              />
              {newKmNum >= startingKm && (
                <p className={`text-sm mt-1 ${tripDistance === (currentKm - startingKm) ? 'text-gray-400' : 'text-amber-600'}`}>
                  New trip distance: {tripDistance.toLocaleString()} km
                  {tripDistance !== (currentKm - startingKm) && (
                    <span className="ml-1">
                      ({tripDistance > (currentKm - startingKm) ? '+' : ''}{(tripDistance - (currentKm - startingKm)).toLocaleString()} km)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Correction *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Explain why the km reading needs to be corrected..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !isValid || reason.length < 5}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? 'Correcting...' : 'Correct Km'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Loan Details Modal - Shows loan information (quantity, requester, return date)
function LoanDetailsModal({
  isOpen,
  onClose,
  loan,
  isPickup,
}: {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
  isPickup: boolean;
}) {
  if (!isOpen || !loan) return null;

  const formatReturnDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not specified';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCreatedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Determine requester and lender info
  const borrowerName = loan.borrower_location?.name || 'Unknown';
  const lenderName = loan.lender_location?.name || 'Unknown';
  const requesterName = loan.requester?.full_name || 'Unknown';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isPickup ? 'bg-purple-100' : 'bg-indigo-100'
              }`}>
                <ArrowLeftRight className={`w-5 h-5 ${isPickup ? 'text-purple-600' : 'text-indigo-600'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Loan Details</h2>
                <p className="text-sm text-gray-500">
                  {isPickup ? 'Pickup in progress' : 'Return in progress'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Quantity */}
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Package className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-purple-600 font-medium">Loan Quantity</span>
              </div>
              <p className="text-3xl font-bold text-purple-900">{loan.quantity_approved || loan.quantity_bags || 0} bags</p>
              <p className="text-sm text-purple-600">({(loan.quantity_approved || loan.quantity_bags || 0) * 10} kg)</p>
            </div>

            {/* Transfer Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">From (Lender)</span>
                <span className="text-sm font-medium text-gray-900">{lenderName}</span>
              </div>
              <div className="flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">To (Borrower)</span>
                <span className="text-sm font-medium text-gray-900">{borrowerName}</span>
              </div>
            </div>

            {/* Requester Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Requested By
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-medium text-gray-900">{requesterName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Location</span>
                <span className="text-sm font-medium text-gray-900">{borrowerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Requested On</span>
                <span className="text-sm font-medium text-gray-900">{formatCreatedDate(loan.created_at)}</span>
              </div>
            </div>

            {/* Return Date */}
            <div className={`rounded-xl p-4 ${loan.expected_return_date ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${loan.expected_return_date ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${loan.expected_return_date ? 'text-amber-700' : 'text-gray-500'}`}>
                    Expected Return Date
                  </span>
                </div>
                <span className={`text-sm font-bold ${loan.expected_return_date ? 'text-amber-900' : 'text-gray-400'}`}>
                  {formatReturnDate(loan.expected_return_date)}
                </span>
              </div>
            </div>

            {/* Notes */}
            {loan.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                <p className="text-sm text-gray-600">{loan.notes}</p>
              </div>
            )}

            {/* Close Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
