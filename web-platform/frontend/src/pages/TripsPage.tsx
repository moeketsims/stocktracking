import { useState, useRef, useEffect } from 'react';
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
  ChevronUp,
  MoreVertical,
  Edit,
  Trash2,
  Search,
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import TripModal from '../components/modals/TripModal';
import CompleteTripModal from '../components/modals/CompleteTripModal';
import TripStopsDetail from '../components/trips/TripStopsDetail';
import { useTrips, useTripSummary, useStartTrip, useCancelTrip } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import type { Trip, TripStatus, TripType } from '../types';

// Status colors for BADGES ONLY - distinct from brand orange
const statusConfig: Record<TripStatus, { color: string; bgColor: string; label: string }> = {
  planned: { color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Planned' },
  in_progress: { color: 'text-amber-700', bgColor: 'bg-amber-100', label: 'In Progress' },
  completed: { color: 'text-emerald-700', bgColor: 'bg-emerald-100', label: 'Completed' },
  cancelled: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Cancelled' },
};

const tripTypeLabels: Record<TripType, string> = {
  supplier_to_warehouse: 'Supplier → Warehouse',
  supplier_to_shop: 'Supplier → Shop',
  warehouse_to_shop: 'Warehouse → Shop',
  shop_to_shop: 'Shop → Shop',
  shop_to_warehouse: 'Shop → Warehouse',
  other: 'Other',
};

// Format number with currency grouping (R470,729)
const formatCurrency = (value: number): string => {
  return 'R' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function TripsPage() {
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);
  const isManager = user?.role && ['admin', 'zone_manager', 'location_manager'].includes(user.role);

  // Fetch all trips for counts, filter client-side for display
  const { data: allTripsData } = useTrips();
  const { data: tripsData, isLoading, error, refetch } = useTrips(
    statusFilter ? { status: statusFilter } : undefined
  );
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

  // Calculate counts for filter tabs
  const allTrips = allTripsData?.trips || [];
  const counts = {
    all: allTrips.length,
    planned: allTrips.filter(t => t.status === 'planned').length,
    in_progress: allTrips.filter(t => t.status === 'in_progress').length,
    completed: allTrips.filter(t => t.status === 'completed').length,
  };

  const filterOptions = [
    { value: '', label: 'All', count: counts.all },
    { value: 'planned', label: 'Planned', count: counts.planned },
    { value: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { value: 'completed', label: 'Completed', count: counts.completed },
  ];

  const handleStartTrip = async (trip: Trip) => {
    try {
      await startMutation.mutateAsync(trip.id);
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get primary action for a trip based on status
  // ALL primary actions use brand orange for consistency
  const getPrimaryAction = (trip: Trip) => {
    if (!isManager) return null;

    switch (trip.status) {
      case 'planned':
        return {
          label: 'Start',
          icon: Play,
          onClick: () => handleStartTrip(trip),
          className: 'bg-orange-500 hover:bg-orange-600 text-white',
          loading: startMutation.isPending,
        };
      case 'in_progress':
        if (!trip.is_multi_stop) {
          return {
            label: 'Complete',
            icon: CheckCircle,
            onClick: () => handleCompleteTrip(trip),
            className: 'bg-orange-500 hover:bg-orange-600 text-white',
            loading: false,
          };
        }
        return null;
      default:
        return null;
    }
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

  // Filter trips by search
  const trips = (tripsData?.trips || []).filter(trip => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.trip_number.toLowerCase().includes(query) ||
      trip.driver_name?.toLowerCase().includes(query) ||
      trip.vehicles?.registration_number?.toLowerCase().includes(query)
    );
  });

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
          {/* Search Input */}
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
          {isManager && (
            <Button onClick={() => setShowTripModal(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-1" />
              New Trip
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary - Consistent Styling */}
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
          <p className="col-span-full text-xs text-gray-400 -mt-2">Last 30 days</p>
        </div>
      )}

      {/* Status Filter Tabs with Counts */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              statusFilter === option.value
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {option.label}
            <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
              statusFilter === option.value
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Trips List */}
      <Card padding="none" className="overflow-hidden">
        <div className="divide-y divide-gray-100">
          {trips.map((trip) => {
            const config = statusConfig[trip.status];
            const isExpanded = expandedTripId === trip.id;
            const isMultiStop = trip.is_multi_stop;
            const primaryAction = getPrimaryAction(trip);
            const route = getRouteString(trip);

            return (
              <div key={trip.id}>
                <div
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${isMultiStop ? 'cursor-pointer' : ''}`}
                  onClick={() => isMultiStop && setExpandedTripId(isExpanded ? null : trip.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Primary Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        {isMultiStop ? (
                          <GitBranch className={`w-4 h-4 ${config.color}`} />
                        ) : (
                          <MapPin className={`w-4 h-4 ${config.color}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Primary scan line: Trip ID, Status, Route */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{trip.trip_number}</span>
                          {/* Status badge - using neutral for planned, not info/blue */}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
                            {config.label}
                          </span>
                          {isMultiStop && (
                            <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">
                              Multi-Stop
                            </span>
                          )}
                        </div>
                        {/* Route - prominent */}
                        {route && (
                          <p className="text-sm text-gray-700 mt-0.5 truncate font-medium">
                            {route}
                          </p>
                        )}
                        {/* Meta line: Vehicle, Driver, Date */}
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {trip.vehicles?.registration_number || 'No vehicle'}
                          </span>
                          <span>•</span>
                          <span>{trip.driver_name || 'No driver'}</span>
                          <span>•</span>
                          <span>{formatDate(trip.created_at)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Cost + Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Cost display for completed trips */}
                      {trip.status === 'completed' && (
                        <div className="text-right mr-2">
                          <span className="text-base font-bold text-gray-900">
                            {formatCurrency(trip.total_cost)}
                          </span>
                          {trip.distance_km > 0 && (
                            <p className="text-xs text-gray-400">{trip.distance_km.toFixed(0)} km</p>
                          )}
                        </div>
                      )}

                      {/* Primary Action Button */}
                      {primaryAction && (
                        <button
                          onClick={(e) => { e.stopPropagation(); primaryAction.onClick(); }}
                          disabled={primaryAction.loading}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${primaryAction.className}`}
                        >
                          <primaryAction.icon className="w-4 h-4" />
                          {primaryAction.label}
                        </button>
                      )}

                      {/* Kebab Menu for secondary actions */}
                      {isManager && trip.status !== 'completed' && trip.status !== 'cancelled' && (
                        <div className="relative" ref={openMenuId === trip.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === trip.id ? null : trip.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === trip.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              {trip.status === 'planned' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelTrip(trip); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Cancel Trip
                                </button>
                              )}
                              {trip.status === 'in_progress' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelTrip(trip); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Cancel Trip
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expand/collapse for multi-stop trips */}
                      {isMultiStop && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedTripId(isExpanded ? null : trip.id); }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable stops detail for multi-stop trips */}
                {isMultiStop && isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100">
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
          })}
          {trips.length === 0 && (
            <div className="p-12 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No trips found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try a different search term' : statusFilter ? 'Try changing the filter' : 'Create a new trip to get started'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Trip Modal */}
      <TripModal
        isOpen={showTripModal}
        onClose={() => setShowTripModal(false)}
        onSuccess={() => {
          refetch();
          setShowTripModal(false);
        }}
      />

      {/* Complete Trip Modal */}
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
    </div>
  );
}
