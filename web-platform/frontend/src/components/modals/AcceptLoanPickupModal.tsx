import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, MapPin, Gauge, AlertCircle, Package, CheckCircle, ArrowRight } from 'lucide-react';
import { Modal, Button } from '../ui';
import { loansApi } from '../../lib/api';

interface LoanTripData {
  id: string;
  loanId: string;
  tripNumber: string;
  fromLocation: string;
  toLocation: string;
  quantityBags: number;
  vehicle: {
    id: string;
    registration_number: string;
    make?: string;
    model?: string;
    kilometers_traveled?: number;
  } | null;
  assignedBy: string;
}

interface AcceptLoanPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loanTrip: LoanTripData | null;
}

export default function AcceptLoanPickupModal({
  isOpen,
  onClose,
  onSuccess,
  loanTrip,
}: AcceptLoanPickupModalProps) {
  const queryClient = useQueryClient();
  const [odometerStart, setOdometerStart] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOdometerStart('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const acceptMutation = useMutation({
    mutationFn: (data: { loanId: string; odometer_start: number }) =>
      loansApi.acceptPickup(data.loanId, { odometer_start: data.odometer_start }),
    onSuccess: async () => {
      // Invalidate all relevant queries to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['driver-loan-trips'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-loan-trips-count'] });
      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      onSuccess();
      setSuccess(true);
      // Show success message for 2 seconds then close
      setTimeout(() => {
        setSuccess(false);
        handleClose();
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to accept loan pickup');
    },
  });

  const handleClose = () => {
    setOdometerStart('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loanTrip) {
      setError('No loan trip selected');
      return;
    }

    if (!loanTrip.vehicle) {
      setError('No vehicle assigned to this pickup');
      return;
    }

    // Validate odometer start
    if (!odometerStart) {
      setError('Please enter the starting odometer reading');
      return;
    }

    const vehicleCurrentKm = loanTrip.vehicle.kilometers_traveled || 0;
    const enteredKm = parseInt(odometerStart, 10);

    if (isNaN(enteredKm) || enteredKm < 0) {
      setError('Please enter a valid odometer reading');
      return;
    }

    if (enteredKm < vehicleCurrentKm) {
      setError(`Starting km cannot be less than vehicle's current odometer (${vehicleCurrentKm.toLocaleString()} km)`);
      return;
    }

    await acceptMutation.mutateAsync({
      loanId: loanTrip.loanId,
      odometer_start: enteredKm,
    });
  };

  if (!loanTrip) return null;

  const vehicleCurrentKm = loanTrip.vehicle?.kilometers_traveled || 0;

  // Success state - show briefly then close
  if (success) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Loan Pickup Accepted!
            </h2>
            <p className="text-gray-600 text-sm">
              Proceed to {loanTrip.fromLocation} to collect {loanTrip.quantityBags} bags.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Accept Loan Pickup" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loan Pickup Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800">Loan Pickup Assignment</span>
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{loanTrip.fromLocation}</span>
            <ArrowRight className="w-4 h-4 text-blue-400" />
            <span className="font-medium">{loanTrip.toLocation}</span>
          </div>

          <div className="space-y-1 text-sm text-blue-700">
            <p><strong>Quantity:</strong> {loanTrip.quantityBags} bags</p>
            <p><strong>Trip #:</strong> {loanTrip.tripNumber}</p>
            <p><strong>Assigned by:</strong> {loanTrip.assignedBy}</p>
          </div>
        </div>

        {/* Assigned Vehicle */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Assigned Vehicle</span>
          </div>

          {!loanTrip.vehicle ? (
            <div className="text-amber-700 text-sm">No vehicle assigned</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {loanTrip.vehicle.registration_number}
                  </p>
                  {(loanTrip.vehicle.make || loanTrip.vehicle.model) && (
                    <p className="text-sm text-gray-500">
                      {loanTrip.vehicle.make} {loanTrip.vehicle.model}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Current Odometer</p>
                  <p className="font-medium text-gray-700">
                    {vehicleCurrentKm.toLocaleString()} km
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Odometer Input */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-emerald-800 mb-2">
            <Gauge className="w-4 h-4" />
            Starting Odometer Reading *
          </label>
          <input
            type="number"
            value={odometerStart}
            onChange={(e) => setOdometerStart(e.target.value)}
            placeholder={vehicleCurrentKm > 0 ? `Min: ${vehicleCurrentKm.toLocaleString()}` : 'Enter current odometer'}
            min={vehicleCurrentKm}
            required
            className="w-full px-3 py-2.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
          />
          <p className="text-xs text-emerald-600 mt-2">
            {vehicleCurrentKm > 0
              ? `Enter the current odometer reading (must be at least ${vehicleCurrentKm.toLocaleString()} km)`
              : 'Enter the current odometer reading before starting the pickup'
            }
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            After accepting, proceed to <strong>{loanTrip.fromLocation}</strong> to collect the stock.
            The lending manager will confirm when you've collected the bags.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            isLoading={acceptMutation.isPending}
            disabled={!loanTrip.vehicle || !odometerStart}
          >
            Accept & Start Pickup
          </Button>
        </div>
      </form>
    </Modal>
  );
}
