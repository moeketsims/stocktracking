import { useState } from 'react';
import {
  MapPin,
  Package,
  CheckCircle,
  Clock,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { useTripStops, useCompleteStop, useArriveAtStop } from '../../hooks/useData';
import type { TripStatus } from '../../types';

interface TripStopsDetailProps {
  tripId: string;
  tripStatus: TripStatus;
  isManager: boolean;
  onTripComplete: () => void;
}

export default function TripStopsDetail({
  tripId,
  tripStatus,
  isManager,
  onTripComplete,
}: TripStopsDetailProps) {
  const { data: stopsData, isLoading, error } = useTripStops(tripId);
  const completeStopMutation = useCompleteStop();
  const arriveAtStopMutation = useArriveAtStop();
  const [completingStopId, setCompletingStopId] = useState<string | null>(null);

  const handleCompleteStop = async (stopId: string) => {
    setCompletingStopId(stopId);
    try {
      const result = await completeStopMutation.mutateAsync({ stopId });
      if (result.trip_completed) {
        onTripComplete();
      }
    } catch (err) {
      console.error('Failed to complete stop:', err);
    } finally {
      setCompletingStopId(null);
    }
  };

  const handleArriveAtStop = async (stopId: string) => {
    try {
      await arriveAtStopMutation.mutateAsync(stopId);
    } catch (err) {
      console.error('Failed to record arrival:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading stops...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        Error loading stops: {(error as Error).message}
      </div>
    );
  }

  const stops = stopsData?.stops || [];
  const totalStops = stopsData?.total_stops || 0;
  const completedStops = stopsData?.completed_stops || 0;

  if (stops.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center">
        No stops configured for this trip.
      </div>
    );
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Progress: {completedStops} / {totalStops} stops
        </span>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Stops timeline */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-0">
          {stops.map((stop, index) => {
            const isCompleted = stop.is_completed;
            const isNext = !isCompleted && stops.slice(0, index).every((s) => s.is_completed);
            const hasArrived = !!stop.arrived_at;

            return (
              <div key={stop.id} className="relative flex items-start gap-4 pb-4">
                {/* Stop indicator */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-100'
                      : isNext
                      ? 'bg-amber-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : stop.stop_type === 'pickup' ? (
                    <Package className="w-5 h-5 text-gray-600" />
                  ) : (
                    <MapPin className="w-5 h-5 text-gray-600" />
                  )}
                </div>

                {/* Stop details */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {stop.location_name || stop.locations?.name || stop.suppliers?.name || 'Unknown'}
                    </span>
                    <Badge
                      variant={stop.stop_type === 'pickup' ? 'info' : 'default'}
                      size="sm"
                    >
                      {stop.stop_type === 'pickup' ? 'Pickup' : 'Dropoff'}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="success" size="sm">
                        Completed
                      </Badge>
                    )}
                  </div>

                  {/* Quantity info */}
                  {(stop.planned_qty_kg || stop.actual_qty_kg) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {stop.actual_qty_kg
                        ? `${stop.actual_qty_kg} kg delivered`
                        : `${stop.planned_qty_kg} kg planned`}
                    </p>
                  )}

                  {/* Timing info */}
                  {(stop.arrived_at || stop.departed_at) && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      {stop.arrived_at && (
                        <span>Arrived: {formatTime(stop.arrived_at)}</span>
                      )}
                      {stop.departed_at && (
                        <span>• Departed: {formatTime(stop.departed_at)}</span>
                      )}
                    </p>
                  )}

                  {/* Notes */}
                  {stop.notes && (
                    <p className="text-xs text-gray-400 mt-1">{stop.notes}</p>
                  )}

                  {/* Action buttons */}
                  {isManager && tripStatus === 'in_progress' && !isCompleted && (
                    <div className="flex gap-2 mt-2">
                      {!hasArrived && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArriveAtStop(stop.id)}
                          disabled={arriveAtStopMutation.isPending}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Arrive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleCompleteStop(stop.id)}
                        disabled={completingStopId === stop.id}
                      >
                        {completingStopId === stop.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        Complete Stop
                      </Button>
                    </div>
                  )}
                </div>

                {/* Connector arrow for non-last items */}
                {index < stops.length - 1 && (
                  <div className="absolute left-5 top-10 transform -translate-x-1/2">
                    <ArrowRight className="w-4 h-4 text-gray-300 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
