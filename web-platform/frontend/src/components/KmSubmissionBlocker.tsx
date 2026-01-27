import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Truck, Gauge, CheckCircle, Phone } from 'lucide-react';
import { tripsApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface AwaitingKmTrip {
  id: string;
  trip_number: string;
  vehicle_id: string;
  vehicle_registration: string | null;
  vehicle_name: string | null;
  destination: string | null;
  driver_name: string | null;
  odometer_start: number | null;
  completed_at: string | null;
}

export default function KmSubmissionBlocker() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [closingKm, setClosingKm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDriver = user?.role === 'driver';

  // Only fetch for drivers
  const { data, isLoading } = useQuery({
    queryKey: ['driver-awaiting-km'],
    queryFn: async () => {
      const response = await tripsApi.getDriverAwaitingKm();
      return response.data as { trip: AwaitingKmTrip | null };
    },
    enabled: isDriver,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Submit km mutation
  const submitMutation = useMutation({
    mutationFn: async ({ tripId, km }: { tripId: string; km: number }) => {
      const response = await tripsApi.submitKm(tripId, km);
      return response.data;
    },
    onSuccess: () => {
      setSuccess(true);
      setClosingKm('');
      setError(null);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['driver-awaiting-km'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      // Dismiss success screen after 2 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to submit closing km. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trip = data?.trip;
    if (!trip) return;

    const kmValue = parseInt(closingKm, 10);
    if (isNaN(kmValue) || kmValue < 0) {
      setError('Please enter a valid kilometer reading');
      return;
    }

    if (trip.odometer_start !== null && kmValue < trip.odometer_start) {
      setError(`Closing km cannot be less than starting km (${trip.odometer_start.toLocaleString()})`);
      return;
    }

    // Max 2000 km per trip validation
    const MAX_TRIP_DISTANCE = 2000;
    if (trip.odometer_start !== null && kmValue > trip.odometer_start + MAX_TRIP_DISTANCE) {
      setError(`Closing km exceeds maximum expected (${(trip.odometer_start + MAX_TRIP_DISTANCE).toLocaleString()} km). Contact your manager if this is correct.`);
      return;
    }

    submitMutation.mutate({ tripId: trip.id, km: kmValue });
  };

  // Don't show for non-drivers
  if (!isDriver) return null;

  // Loading state - show nothing while checking
  if (isLoading) return null;

  // No pending km submission - don't block
  const trip = data?.trip;
  if (!trip && !success) return null;

  // Success state - show briefly then disappear
  if (success) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-emerald-900 to-emerald-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Kilometers Submitted!
          </h2>
          <p className="text-gray-600">
            Thank you for submitting your closing km reading. The vehicle is now available for the next trip.
          </p>
        </div>
      </div>
    );
  }

  // Block screen with km submission form
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Action Required</h2>
              <p className="text-amber-100 text-sm">Submit closing kilometers to continue</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Your trip <span className="font-semibold text-gray-900">{trip.trip_number}</span> has been completed by your manager.
            Please submit your closing odometer reading to free up the vehicle for the next driver.
          </p>

          {/* Trip Details Card */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Vehicle</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {trip.vehicle_registration || 'N/A'}
                  </p>
                  {trip.vehicle_name && (
                    <p className="text-xs text-gray-500">{trip.vehicle_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Starting KM</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {trip.odometer_start?.toLocaleString() || 'N/A'} km
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Closing Odometer Reading
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={closingKm}
                  onChange={(e) => {
                    setClosingKm(e.target.value);
                    setError(null);
                  }}
                  placeholder={trip.odometer_start ? `Must be at least ${trip.odometer_start.toLocaleString()}` : 'Enter closing km'}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  min={trip.odometer_start || 0}
                  autoFocus
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  km
                </span>
              </div>
              <button
                type="submit"
                disabled={submitMutation.isPending || !closingKm}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer - Contact Manager */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="w-4 h-4" />
            <span>Having trouble? Contact your manager for assistance.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
