import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Truck,
  Fuel,
  DollarSign,
  Clock,
  GitBranch,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Search,
  Package,
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import TripModal from '../components/modals/TripModal';
import CompleteTripModal from '../components/modals/CompleteTripModal';
import { StartTripModal } from '../components/modals/StartTripModal';
import TripStopsDetail from '../components/trips/TripStopsDetail';
import { useTrips, useTripSummary, useStartTrip, useCancelTrip } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import { stockRequestsApi } from '../lib/api';
import type { Trip, TripStatus, TripType, StockRequest } from '../types';

// Status colors for BADGES ONLY - muted/pastel, never same saturation as buttons
// Rule: Orange is reserved for primary actions. Status chips use neutral/distinct colors.
const statusConfig: Record<TripStatus, { color: string; bgColor: string; label: string }> = {
  planned: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Planned' },
  in_progress: { color: 'text-slate-700', bgColor: 'bg-slate-100', label: 'In Progress' },
  completed: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', label: 'Completed' },
  cancelled: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Cancelled' },
};

// Format number with currency grouping (R470,729)
const formatCurrency = (value: number): string => {
  return 'R' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

interface TripsPageProps {
  highlightTripId?: string | null;
  pendingRequestId?: string | null;
  onTripViewed?: () => void;
  onRequestHandled?: () => void;
}

export default function TripsPage({ highlightTripId, pendingRequestId, onTripViewed, onRequestHandled }: TripsPageProps = {}) {
  const queryClient = useQueryClient();
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [preSelectedRequestId, setPreSelectedRequestId] = useState<string | null>(null);

  // Auto-expand highlighted trip when navigating from Requests page
  useEffect(() => {
    if (highlightTripId) {
      setExpandedTripId(highlightTripId);
      // Scroll to the trip after a short delay to allow rendering
      setTimeout(() => {
        const tripElement = document.getElementById(`trip-${highlightTripId}`);
        if (tripElement) {
          tripElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      // Clear the highlight after viewing
      onTripViewed?.();
    }
  }, [highlightTripId, onTripViewed]);

  // Auto-open TripModal when navigating from RequestsPage with a request to fulfill
  useEffect(() => {
    if (pendingRequestId) {
      setPreSelectedRequestId(pendingRequestId);
      setShowTripModal(true);
    }
  }, [pendingRequestId]);

  // Collapsed sections - Completed collapsed by default
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    planned: false,
    in_progress: false,
    completed: true,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);
  const isManager = user?.role && ['admin', 'zone_manager', 'location_manager'].includes(user.role);
  const isDriver = user?.role === 'driver';

  // Fetch accepted stock requests for driver users
  const { data: myRequestsData } = useQuery({
    queryKey: ['stock-requests', 'my'],
    queryFn: () => stockRequestsApi.getMyRequests(undefined, 50).then(r => r.data),
    enabled: isDriver, // Only fetch for driver users
  });

  // Get accepted requests count for drivers
  const acceptedRequests: StockRequest[] = (myRequestsData?.accepted || []).filter(
    (r: StockRequest) => r.status === 'accepted'
  );
  const hasAcceptedRequests = acceptedRequests.length > 0;

  // Show New Trip button for managers OR drivers with accepted requests
  const canCreateTrip = isManager || hasAcceptedRequests;

  const { data: tripsData, isLoading, error, refetch } = useTrips();
  const { data: summary } = useTripSummary();
  const startMutation = useStartTrip();
  const cancelMutation = useCancelTrip();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowStartModal(true);
    setOpenMenuId(null);
  };

  const handleCompleteTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowCompleteModal(true);
    setOpenMenuId(null);
  };

  const handleCancelTrip = async (trip: Trip) => {
    if (window.confirm(`Are you sure you want to cancel trip ${trip.trip_number}?`)) {
      try {
        await cancelMutation.mutateAsync(trip.id);
        setOpenMenuId(null);
      } catch (err) {
        console.error('Failed to cancel trip:', err);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => ({ ...prev, [status]: !prev[status] }));
  };

  // Get route string for display
  const getRouteString = (trip: Trip) => {
    if (trip.is_multi_stop) {
      return [trip.origin_description, trip.destination_description].filter(Boolean).join(' → ');
    }
    const parts = [];
    if (trip.suppliers?.name) parts.push(trip.suppliers.name);
    else if (trip.from_location?.name) parts.push(trip.from_location.name);
    if (trip.to_location?.name) parts.push(trip.to_location.name);
    if (parts.length === 0) {
      return [trip.origin_description, trip.destination_description].filter(Boolean).join(' → ');
    }
    return parts.join(' → ');
  };

  // Filter and group trips
  const allTrips = tripsData?.trips || [];
  const filteredTrips = allTrips.filter(trip => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.trip_number.toLowerCase().includes(query) ||
      trip.driver_name?.toLowerCase().includes(query) ||
      trip.vehicles?.registration_number?.toLowerCase().includes(query)
    );
  });

  // Group by status
  const groupedTrips = {
    planned: filteredTrips.filter(t => t.status === 'planned'),
    in_progress: filteredTrips.filter(t => t.status === 'in_progress'),
    completed: filteredTrips.filter(t => t.status === 'completed'),
  };

  const sectionOrder: Array<{ key: keyof typeof groupedTrips; label: string; icon: typeof Clock }> = [
    { key: 'planned', label: 'Planned', icon: Clock },
    { key: 'in_progress', label: 'In Progress', icon: Truck },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading trips: {(error as Error).message}
      </div>
    );
  }

  // Render a single trip row (table-like)
  const renderTripRow = (trip: Trip) => {
    const config = statusConfig[trip.status];
    const isExpanded = expandedTripId === trip.id;
    const isMultiStop = trip.is_multi_stop;
    const route = getRouteString(trip);

    return (
      <div key={trip.id} id={`trip-${trip.id}`}>
        <div
          className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors border-b border-gray-100 ${isMultiStop ? 'cursor-pointer' : ''} ${highlightTripId === trip.id ? 'bg-orange-50 ring-2 ring-orange-200' : ''}`}
          onClick={() => isMultiStop && setExpandedTripId(isExpanded ? null : trip.id)}
        >
          {/* Trip ID + Route (col-span-4) */}
          <div className="col-span-4 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{trip.trip_number}</span>
              {isMultiStop && (
                <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{route || '—'}</p>
          </div>

          {/* Driver / Vehicle (col-span-2) */}
          <div className="col-span-2 min-w-0">
            <p className="text-sm text-gray-900 truncate">{trip.driver_name || '—'}</p>
            <p className="text-xs text-gray-500">{trip.vehicles?.registration_number || '—'}</p>
          </div>

          {/* Date (col-span-2) */}
          <div className="col-span-2">
            <p className="text-sm text-gray-600">{formatDate(trip.created_at)}</p>
          </div>

          {/* Status (col-span-1) */}
          <div className="col-span-1">
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
          </div>

          {/* Cost (col-span-1) */}
          <div className="col-span-1 text-right">
            {trip.status === 'completed' ? (
              <span className="font-semibold text-gray-900">{formatCurrency(trip.total_cost)}</span>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>

          {/* Actions (col-span-2) */}
          <div className="col-span-2 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
            {/* Primary Action */}
            {isManager && trip.status === 'planned' && (
              <button
                onClick={() => handleStartTrip(trip)}
                disabled={startMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Start
              </button>
            )}
            {isManager && trip.status === 'in_progress' && !isMultiStop && (
              <button
                onClick={() => handleCompleteTrip(trip)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Complete
              </button>
            )}

            {/* Kebab Menu */}
            {isManager && trip.status !== 'completed' && trip.status !== 'cancelled' && (
              <div className="relative" ref={openMenuId === trip.id ? menuRef : null}>
                <button
                  onClick={() => setOpenMenuId(openMenuId === trip.id ? null : trip.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenuId === trip.id && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => handleCancelTrip(trip)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Expand toggle for multi-stop */}
            {isMultiStop && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedTripId(isExpanded ? null : trip.id); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Expandable stops detail */}
        {isMultiStop && isExpanded && (
          <div className="bg-gray-50 border-b border-gray-200">
            <TripStopsDetail
              tripId={trip.id}
              tripStatus={trip.status}
              isManager={isManager || false}
              onTripComplete={() => {
                refetch();
                setExpandedTripId(null);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trips</h1>
            <p className="text-sm text-gray-500">Track deliveries and costs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          {canCreateTrip && (
            <Button
              onClick={() => setShowTripModal(true)}
              className={hasAcceptedRequests && !isManager ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {hasAcceptedRequests && !isManager ? (
                <>
                  <Package className="w-4 h-4 mr-1" />
                  Fulfill Request ({acceptedRequests.length})
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  New Trip
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      {summary && summary.total_trips > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Cost', value: formatCurrency(summary.total_cost), icon: DollarSign },
            { label: 'Fuel Costs', value: formatCurrency(summary.total_fuel_cost), icon: Fuel },
            { label: 'Toll Costs', value: formatCurrency(summary.total_toll_cost), icon: MapPin },
            { label: 'Avg/Trip', value: formatCurrency(summary.avg_cost_per_trip), icon: Clock },
          ].map((kpi, index) => (
            <Card key={index} className="border border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                  <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                </div>
              </div>
            </Card>
          ))}
          <p className="col-span-full text-xs text-gray-500 -mt-2">Last 30 days</p>
        </div>
      )}

      {/* Grouped Sections */}
      <div className="space-y-4">
        {sectionOrder.map(({ key, label, icon: SectionIcon }) => {
          const trips = groupedTrips[key];
          const isCollapsed = collapsedSections[key];
          const config = statusConfig[key];

          if (trips.length === 0) return null;

          return (
            <Card key={key} padding="none" className="overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                    <SectionIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <span className="font-semibold text-gray-900">{label}</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                    {trips.length}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Table Header - Sticky within section */}
              {!isCollapsed && (
                <>
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-[73px] z-10">
                    <div className="col-span-4">Trip</div>
                    <div className="col-span-2">Driver / Vehicle</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right">Cost</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Trip Rows */}
                  {trips.map(renderTripRow)}
                </>
              )}
            </Card>
          );
        })}

        {/* Empty State */}
        {filteredTrips.length === 0 && (
          <Card className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No trips found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Create a new trip to get started'}
            </p>
          </Card>
        )}
      </div>

      {/* Modals */}
      <TripModal
        isOpen={showTripModal}
        onClose={() => {
          setShowTripModal(false);
          setPreSelectedRequestId(null);
          onRequestHandled?.();
        }}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
          setShowTripModal(false);
          setPreSelectedRequestId(null);
          onRequestHandled?.();
        }}
        preSelectedRequestId={preSelectedRequestId}
      />

      <CompleteTripModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedTrip(null);
        }}
        onSuccess={() => {
          refetch();
          setShowCompleteModal(false);
          setSelectedTrip(null);
        }}
        trip={selectedTrip}
      />

      <StartTripModal
        isOpen={showStartModal}
        onClose={() => {
          setShowStartModal(false);
          setSelectedTrip(null);
        }}
        trip={selectedTrip}
        onSuccess={() => {
          refetch();
          setShowStartModal(false);
          setSelectedTrip(null);
        }}
      />
    </div>
  );
}
