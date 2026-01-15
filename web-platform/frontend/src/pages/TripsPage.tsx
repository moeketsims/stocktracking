import { useState } from 'react';
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
  Package,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import TripModal from '../components/modals/TripModal';
import CompleteTripModal from '../components/modals/CompleteTripModal';
import TripStopsDetail from '../components/trips/TripStopsDetail';
import { useTrips, useTripSummary, useStartTrip, useCancelTrip } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import type { Trip, TripStatus, TripType } from '../types';

const statusConfig: Record<TripStatus, { color: string; bgColor: string; label: string }> = {
  planned: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Planned' },
  in_progress: { color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'In Progress' },
  completed: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completed' },
  cancelled: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Cancelled' },
};

const tripTypeLabels: Record<TripType, string> = {
  supplier_to_warehouse: 'Supplier → Warehouse',
  supplier_to_shop: 'Supplier → Shop',
  warehouse_to_shop: 'Warehouse → Shop',
  shop_to_shop: 'Shop → Shop',
  shop_to_warehouse: 'Shop → Warehouse',
  other: 'Other',
};

const filterOptions = [
  { value: '', label: 'All' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function TripsPage() {
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const isManager = user?.role && ['admin', 'zone_manager', 'location_manager'].includes(user.role);

  const { data: tripsData, isLoading, error, refetch } = useTrips(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: summary } = useTripSummary();
  const startMutation = useStartTrip();
  const cancelMutation = useCancelTrip();

  const handleStartTrip = async (trip: Trip) => {
    try {
      await startMutation.mutateAsync(trip.id);
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
  };

  const handleCompleteTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowCompleteModal(true);
  };

  const handleCancelTrip = async (trip: Trip) => {
    if (window.confirm(`Are you sure you want to cancel trip ${trip.trip_number}?`)) {
      try {
        await cancelMutation.mutateAsync(trip.id);
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
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

  const trips = tripsData?.trips || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trips</h1>
            <p className="text-sm text-gray-500">Track deliveries and costs</p>
          </div>
        </div>
        {isManager && (
          <Button onClick={() => setShowTripModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Trip
          </Button>
        )}
      </div>

      {/* Cost Summary */}
      {summary && summary.total_trips > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Total Cost</p>
                <p className="text-lg font-bold text-green-900">R{summary.total_cost.toFixed(0)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Fuel className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Fuel</p>
                <p className="text-lg font-bold text-amber-900">R{summary.total_fuel_cost.toFixed(0)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Tolls</p>
                <p className="text-lg font-bold text-blue-900">R{summary.total_toll_cost.toFixed(0)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Avg/Trip</p>
                <p className="text-lg font-bold text-purple-900">R{summary.avg_cost_per_trip.toFixed(0)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === option.value
                ? 'bg-amber-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Trips List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {trips.map((trip) => {
            const config = statusConfig[trip.status];
            const isExpanded = expandedTripId === trip.id;
            const isMultiStop = trip.is_multi_stop;

            return (
              <div key={trip.id}>
                <div
                  className={`p-4 hover:bg-gray-50 transition-colors ${isMultiStop ? 'cursor-pointer' : ''}`}
                  onClick={() => isMultiStop && setExpandedTripId(isExpanded ? null : trip.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 mt-1`}>
                        {isMultiStop ? (
                          <GitBranch className={`w-5 h-5 ${config.color}`} />
                        ) : (
                          <MapPin className={`w-5 h-5 ${config.color}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{trip.trip_number}</span>
                          <Badge
                            variant={
                              trip.status === 'completed' ? 'success' :
                              trip.status === 'in_progress' ? 'warning' :
                              trip.status === 'cancelled' ? 'error' : 'info'
                            }
                            size="sm"
                          >
                            {config.label}
                          </Badge>
                          {isMultiStop && (
                            <Badge variant="default" size="sm" className="bg-blue-100 text-blue-700">
                              <GitBranch className="w-3 h-3 mr-1 inline" />
                              Multi-Stop
                            </Badge>
                          )}
                          {!isMultiStop && trip.trip_type && trip.trip_type !== 'other' && (
                            <Badge variant="default" size="sm">
                              {tripTypeLabels[trip.trip_type]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          <Truck className="w-3 h-3 inline mr-1" />
                          {trip.vehicles?.registration_number} • {trip.driver_name}
                        </p>
                        {/* Show route from linked locations/supplier for non multi-stop trips */}
                        {!isMultiStop && (trip.suppliers?.name || trip.from_location?.name || trip.to_location?.name) && (
                          <p className="text-sm text-blue-600 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {trip.suppliers?.name && <span>{trip.suppliers.name}</span>}
                            {trip.from_location?.name && <span>{trip.from_location.name}</span>}
                            {(trip.suppliers?.name || trip.from_location?.name) && trip.to_location?.name && ' → '}
                            {trip.to_location?.name && <span>{trip.to_location.name}</span>}
                          </p>
                        )}
                        {/* Show origin/destination for multi-stop trips */}
                        {isMultiStop && (trip.origin_description || trip.destination_description) && (
                          <p className="text-sm text-blue-600 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {trip.origin_description}
                            {trip.origin_description && trip.destination_description && ' → '}
                            {trip.destination_description}
                          </p>
                        )}
                        {/* Fallback to text descriptions if no locations linked */}
                        {!isMultiStop && !trip.suppliers?.name && !trip.from_location?.name && !trip.to_location?.name &&
                          (trip.origin_description || trip.destination_description) && (
                          <p className="text-sm text-gray-400 mt-1">
                            {trip.origin_description}
                            {trip.origin_description && trip.destination_description && ' → '}
                            {trip.destination_description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(trip.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {trip.status === 'completed' && (
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900">
                            R{trip.total_cost.toFixed(0)}
                          </span>
                          <div className="text-xs text-gray-500">
                            {trip.distance_km ? `${trip.distance_km.toFixed(0)} km` : ''}
                          </div>
                        </div>
                      )}
                      {isManager && trip.status === 'planned' && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleStartTrip(trip)}
                            disabled={startMutation.isPending}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Start Trip"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelTrip(trip)}
                            disabled={cancelMutation.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel Trip"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {isManager && trip.status === 'in_progress' && !isMultiStop && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCompleteTrip(trip); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                      {/* Expand/collapse indicator for multi-stop trips */}
                      {isMultiStop && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedTripId(isExpanded ? null : trip.id); }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable stops detail for multi-stop trips */}
                {isMultiStop && isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-200">
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
              <p className="text-gray-500">No trips found</p>
              <p className="text-sm text-gray-400">
                {statusFilter ? 'Try changing the filter' : 'Create a new trip to get started'}
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
