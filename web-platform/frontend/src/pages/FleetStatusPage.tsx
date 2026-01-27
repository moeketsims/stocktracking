import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Mail,
  Gauge,
  Navigation,
  MapPin,
} from 'lucide-react';
import { Button } from '../components/ui';
import { vehiclesApi, pendingDeliveriesApi } from '../lib/api';
import type { Vehicle } from '../types';

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

export default function FleetStatusPage() {
  const queryClient = useQueryClient();
  const [resendingTripId, setResendingTripId] = useState<string | null>(null);

  // Fetch vehicles with trip status
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vehicles', true, true], // activeOnly=true, includeTripStatus=true
    queryFn: async () => {
      const response = await vehiclesApi.list(true, true);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get all trips from all vehicles (flatten the all_trips arrays)
  const allTrips = (data?.vehicles || []).flatMap((v: Vehicle) =>
    (v.all_trips || []).map((trip: any) => ({
      ...trip,
      vehicle: v
    }))
  );

  // Get only vehicles currently on trips (for backwards compatibility)
  const vehiclesOnTrips = (data?.vehicles || []).filter(
    (v: Vehicle) => v.is_available === false && v.current_trip
  );

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fleet Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Vehicles currently on trips
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 h-9"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {allTrips.filter((t) => t.status === 'planned').length}
              </p>
              <p className="text-sm text-gray-500">Assigned</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {allTrips.filter((t) => t.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {allTrips.filter((t) => t.awaiting_km).length}
              </p>
              <p className="text-sm text-gray-500">Awaiting Km</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {allTrips.filter((t) => t.km_submitted).length}
              </p>
              <p className="text-sm text-gray-500">Km Submitted</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {allTrips.length}
              </p>
              <p className="text-sm text-gray-500">Total Trips</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trips List */}
      {allTrips.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600">All vehicles available</h3>
          <p className="text-sm text-gray-400 mt-1">
            No vehicles are currently on trips.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Vehicle</div>
            <div className="col-span-3">Driver</div>
            <div className="col-span-2">Trip</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Km Status</div>
          </div>

          {/* Trip Rows */}
          <div className="divide-y divide-gray-100">
            {allTrips.map((tripData) => (
              <TripRow
                key={tripData.trip_id}
                trip={tripData}
                vehicle={tripData.vehicle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TripRow({
  trip,
  vehicle,
}: {
  trip: any;
  vehicle: Vehicle;
}) {
  const isInProgress = trip.status === 'in_progress';
  const isCompleted = trip.status === 'completed';
  const isAwaitingKm = trip.awaiting_km;
  const isKmSubmitted = trip.km_submitted || false;

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      {/* Mobile Layout */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isKmSubmitted ? 'bg-emerald-100' : isInProgress ? 'bg-blue-100' : isAwaitingKm ? 'bg-amber-100' : 'bg-indigo-100'
            }`}>
              <Truck className={`w-5 h-5 ${
                isKmSubmitted ? 'text-emerald-600' : isInProgress ? 'text-blue-600' : isAwaitingKm ? 'text-amber-600' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{vehicle.registration_number}</p>
              <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
            </div>
          </div>
          <StatusBadge status={trip.status} awaitingKm={isAwaitingKm} kmSubmitted={isKmSubmitted} />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>{trip.driver_name || 'Unknown driver'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              {trip.trip_number}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <KmStatusBadge awaitingKm={isAwaitingKm} kmSubmitted={isKmSubmitted} />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
        {/* Vehicle */}
        <div className="col-span-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isKmSubmitted ? 'bg-emerald-100' : isInProgress ? 'bg-blue-100' : isAwaitingKm ? 'bg-amber-100' : 'bg-indigo-100'
          }`}>
            <Truck className={`w-5 h-5 ${
              isKmSubmitted ? 'text-emerald-600' : isInProgress ? 'text-blue-600' : isAwaitingKm ? 'text-amber-600' : 'text-indigo-600'
            }`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{vehicle.registration_number}</p>
            <p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p>
          </div>
        </div>

        {/* Driver */}
        <div className="col-span-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{trip.driver_name || 'Unknown driver'}</span>
          </div>
        </div>

        {/* Trip Number */}
        <div className="col-span-2">
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {trip.trip_number}
          </span>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <StatusBadge status={trip.status} awaitingKm={isAwaitingKm} kmSubmitted={isKmSubmitted} />
        </div>

        {/* Km Status */}
        <div className="col-span-2">
          <KmStatusBadge awaitingKm={isAwaitingKm} kmSubmitted={isKmSubmitted} />
        </div>
      </div>
    </div>
  );
}

function VehicleRow({
  vehicle,
  isResending,
  onResendEmail,
}: {
  vehicle: Vehicle;
  isResending: boolean;
  onResendEmail: () => void;
}) {
  const trip = vehicle.current_trip;
  if (!trip) return null;

  const isInProgress = trip.status === 'in_progress';
  const isAwaitingKm = trip.awaiting_km;
  const isKmSubmitted = trip.km_submitted || false;

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      {/* Mobile Layout */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isInProgress ? 'bg-blue-100' : isAwaitingKm ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              <Truck className={`w-5 h-5 ${
                isInProgress ? 'text-blue-600' : isAwaitingKm ? 'text-amber-600' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{vehicle.registration_number}</p>
              <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
            </div>
          </div>
          <StatusBadge status={trip.status} awaitingKm={isAwaitingKm} />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>{trip.driver_name || 'Unknown driver'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              {trip.trip_number}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <KmStatusBadge awaitingKm={isAwaitingKm} kmSubmitted={isKmSubmitted} />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
        {/* Vehicle */}
        <div className="col-span-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isInProgress ? 'bg-blue-100' : isAwaitingKm ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            <Truck className={`w-5 h-5 ${
              isInProgress ? 'text-blue-600' : isAwaitingKm ? 'text-amber-600' : 'text-emerald-600'
            }`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{vehicle.registration_number}</p>
            <p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p>
          </div>
        </div>

        {/* Driver */}
        <div className="col-span-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{trip.driver_name || 'Unknown driver'}</span>
          </div>
        </div>

        {/* Trip Number */}
        <div className="col-span-2">
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {trip.trip_number}
          </span>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <StatusBadge status={trip.status} awaitingKm={isAwaitingKm} />
        </div>

        {/* Km Status */}
        <div className="col-span-2">
          <KmStatusBadge awaitingKm={isAwaitingKm} kmSubmitted={isKmSubmitted} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, awaitingKm, kmSubmitted }: { status: string; awaitingKm: boolean; kmSubmitted?: boolean }) {
  if (status === 'planned') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
        <Clock className="w-3.5 h-3.5" />
        Assigned
      </span>
    );
  }

  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
        <Navigation className="w-3.5 h-3.5" />
        In Progress
      </span>
    );
  }

  if (status === 'completed' && kmSubmitted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
        <CheckCircle className="w-3.5 h-3.5" />
        Completed
      </span>
    );
  }

  if (awaitingKm) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
        <MapPin className="w-3.5 h-3.5" />
        Awaiting Km
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  );
}

function KmStatusBadge({ awaitingKm, kmSubmitted }: { awaitingKm: boolean; kmSubmitted?: boolean }) {
  if (kmSubmitted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
        <CheckCircle className="w-3.5 h-3.5" />
        Submitted
      </span>
    );
  }

  if (awaitingKm) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
        <Gauge className="w-3.5 h-3.5" />
        Awaiting Km
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  );
}
