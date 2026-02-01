import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, MapPin, Gauge, AlertCircle, Package, CheckCircle, ArrowRight } from 'lucide-react';
import { Modal, Button } from '../ui';
import { loansApi, vehiclesApi } from '../../lib/api';

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
  tripType?: 'loan_pickup' | 'loan_return';
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
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isReturn = loanTrip?.tripType === 'loan_return';
  const needsVehicleSelection = !isReturn && !loanTrip?.vehicle;

  // Fetch available vehicles for pickup (driver needs to select)
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.getAll().then(r => r.data),
    enabled: isOpen && needsVehicleSelection,
  });

  const availableVehicles = (vehiclesData?.vehicles || []).filter(
    (v: any) => v.is_active && v.is_available !== false
  );

  // Get selected vehicle details for odometer validation
  const selectedVehicle = needsVehicleSelection
    ? availableVehicles.find((v: any) => v.id === selectedVehicleId)
    : loanTrip?.vehicle;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOdometerStart('');
      setSelectedVehicleId('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const acceptMutation = useMutation({
    mutationFn: (data: { loanId: string; odometer_start: number; vehicle_id: string }) =>
      isReturn
        ? loansApi.acceptReturnAssignment(data.loanId, { odometer_start: data.odometer_start })
        : loansApi.acceptPickup(data.loanId, { odometer_start: data.odometer_start, vehicle_id: data.vehicle_id }),
    onSuccess: async () => {
      // Invalidate all relevant queries to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['driver-loan-trips'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-loan-trips-count'] });
      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onSuccess();
      setSuccess(true);
      // Show success message for 2 seconds then close
      setTimeout(() => {
        setSuccess(false);
        handleClose();
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || (isReturn ? 'Failed to accept loan return' : 'Failed to accept loan pickup'));
    },
  });

  const handleClose = () => {
    setOdometerStart('');
    setSelectedVehicleId('');
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

    // For pickups without pre-assigned vehicle, driver must select one
    const vehicleId = needsVehicleSelection ? selectedVehicleId : loanTrip.vehicle?.id;
    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    // Validate odometer start
    if (!odometerStart) {
      setError('Please enter the starting odometer reading');
      return;
    }

    const vehicleCurrentKm = selectedVehicle?.kilometers_traveled || selectedVehicle?.current_km || 0;
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
      vehicle_id: vehicleId,
    });
  };

  if (!loanTrip) return null;

  const vehicleCurrentKm = selectedVehicle?.kilometers_traveled || selectedVehicle?.current_km || 0;

  // Success state - show briefly then close
  if (success) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className={`w-16 h-16 ${isReturn ? 'bg-orange-100' : 'bg-emerald-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle className={`w-8 h-8 ${isReturn ? 'text-orange-600' : 'text-emerald-600'}`} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isReturn ? 'Loan Return Accepted!' : 'Loan Pickup Accepted!'}
            </h2>
            <p className="text-gray-600 text-sm">
              {isReturn
                ? `Proceed to ${loanTrip.fromLocation} to collect ${loanTrip.quantityBags} bags for return.`
                : `Proceed to ${loanTrip.fromLocation} to collect ${loanTrip.quantityBags} bags.`
              }
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isReturn ? "Accept Loan Return" : "Accept Loan Pickup"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loan Assignment Summary */}
        <div className={`${isReturn ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Package className={`w-5 h-5 ${isReturn ? 'text-orange-600' : 'text-blue-600'}`} />
            <span className={`font-semibold ${isReturn ? 'text-orange-800' : 'text-blue-800'}`}>
              {isReturn ? 'Loan Return Assignment' : 'Loan Pickup Assignment'}
            </span>
          </div>

          {/* Route */}
          <div className={`flex items-center gap-2 text-sm ${isReturn ? 'text-orange-700' : 'text-blue-700'} mb-2`}>
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{loanTrip.fromLocation}</span>
            <ArrowRight className={`w-4 h-4 ${isReturn ? 'text-orange-400' : 'text-blue-400'}`} />
            <span className="font-medium">{loanTrip.toLocation}</span>
          </div>

          <div className={`space-y-1 text-sm ${isReturn ? 'text-orange-700' : 'text-blue-700'}`}>
            <p><strong>Quantity:</strong> {loanTrip.quantityBags} bags</p>
            <p><strong>Trip #:</strong> {loanTrip.tripNumber}</p>
            <p><strong>Assigned by:</strong> {loanTrip.assignedBy}</p>
          </div>
        </div>

        {/* Vehicle Selection or Display */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">
              {needsVehicleSelection ? 'Select Vehicle *' : 'Assigned Vehicle'}
            </span>
          </div>

          {needsVehicleSelection ? (
            // Driver selects vehicle for pickup
            <div className="space-y-3">
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">Select a vehicle...</option>
                {availableVehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} - {v.make} {v.model}
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {selectedVehicle.registration_number}
                        </p>
                        {(selectedVehicle.make || selectedVehicle.model) && (
                          <p className="text-sm text-gray-500">
                            {selectedVehicle.make} {selectedVehicle.model}
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
                  {/* Odometer Input - only shows after vehicle selected */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Gauge className="w-4 h-4" />
                      Start KM (Odometer) *
                    </label>
                    <input
                      type="number"
                      value={odometerStart}
                      onChange={(e) => setOdometerStart(e.target.value)}
                      placeholder={vehicleCurrentKm > 0 ? `Min: ${vehicleCurrentKm.toLocaleString()}` : 'Enter current odometer'}
                      min={vehicleCurrentKm}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {vehicleCurrentKm > 0
                        ? `Must be at least ${vehicleCurrentKm.toLocaleString()} km (vehicle's current reading)`
                        : 'Enter the current odometer reading before starting the trip'
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : loanTrip.vehicle ? (
            // Vehicle already assigned (for returns or pre-assigned pickups)
            <>
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
              {/* Odometer Input for pre-assigned vehicle */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Gauge className="w-4 h-4" />
                  Start KM (Odometer) *
                </label>
                <input
                  type="number"
                  value={odometerStart}
                  onChange={(e) => setOdometerStart(e.target.value)}
                  placeholder={vehicleCurrentKm > 0 ? `Min: ${vehicleCurrentKm.toLocaleString()}` : 'Enter current odometer'}
                  min={vehicleCurrentKm}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {vehicleCurrentKm > 0
                    ? `Must be at least ${vehicleCurrentKm.toLocaleString()} km (vehicle's current reading)`
                    : 'Enter the current odometer reading before starting the trip'
                  }
                </p>
              </div>
            </>
          ) : (
            <div className="text-amber-700 text-sm">No vehicle assigned</div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            {isReturn ? (
              <>After accepting, proceed to <strong>{loanTrip.fromLocation}</strong> to collect the stock for return.
              The lender will confirm receipt when you deliver the bags.</>
            ) : (
              <>After accepting, proceed to <strong>{loanTrip.fromLocation}</strong> to collect the stock.
              The lending manager will confirm when you've collected the bags.</>
            )}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className={`flex-1 ${isReturn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            isLoading={acceptMutation.isPending}
            disabled={(needsVehicleSelection ? !selectedVehicleId : !loanTrip.vehicle) || !odometerStart}
          >
            {isReturn ? 'Accept & Start Return' : 'Accept & Start Pickup'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
