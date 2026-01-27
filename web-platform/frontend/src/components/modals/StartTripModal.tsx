import { useState } from 'react';
import { X, Truck, Clock } from 'lucide-react';
import { tripsApi } from '../../lib/api';
import type { Trip } from '../../types';

interface StartTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onSuccess: () => void;
}

export function StartTripModal({ isOpen, onClose, trip, onSuccess }: StartTripModalProps) {
  const [includeEta, setIncludeEta] = useState(false);
  const [etaTime, setEtaTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let estimatedArrivalTime: string | undefined;

      if (includeEta && etaTime) {
        // Convert local time to ISO string
        const today = new Date();
        const [hours, minutes] = etaTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // If time is earlier than now, assume it's for tomorrow
        if (today < new Date()) {
          today.setDate(today.getDate() + 1);
        }

        estimatedArrivalTime = today.toISOString();
      }

      await tripsApi.start(trip.id, estimatedArrivalTime);
      setIncludeEta(false);
      setEtaTime('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const vehicle = trip.vehicles;
  const vehicleDisplay = vehicle
    ? `${vehicle.registration_number} (${vehicle.make || ''} ${vehicle.model || ''})`
    : 'Unknown vehicle';

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Start Trip</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-medium text-orange-900 mb-2">Trip Details</h3>
            <div className="space-y-1 text-sm text-orange-800">
              <p><strong>Trip:</strong> {trip.trip_number}</p>
              <p><strong>Driver:</strong> {trip.driver_name || 'Not assigned'}</p>
              <p><strong>Vehicle:</strong> {vehicleDisplay}</p>
              <p><strong>Route:</strong> {trip.origin_description} → {trip.destination_description}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                id="include-eta"
                checked={includeEta}
                onChange={(e) => setIncludeEta(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <label htmlFor="include-eta" className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                <Clock className="w-4 h-4" />
                <span>Provide Estimated Arrival Time (ETA)</span>
              </label>
            </div>

            {includeEta && (
              <div className="ml-7">
                <input
                  type="time"
                  value={etaTime}
                  onChange={(e) => setEtaTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Store manager will be notified of your expected arrival time.
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Starting this trip will:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Mark the trip as "In Progress"</li>
              <li>Notify the store manager that delivery is on the way</li>
              {includeEta && etaTime && (
                <li>Include your estimated arrival time in the notification</li>
              )}
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Start Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
