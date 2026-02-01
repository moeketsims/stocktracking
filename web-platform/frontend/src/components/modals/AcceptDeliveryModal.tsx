import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, MapPin, Clock, AlertCircle, Package, Gauge, AlertTriangle, User, CheckCircle, Calendar } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { useVehicles, useSuppliers, useLocations } from '../../hooks/useData';
import { stockRequestsApi } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { StockRequest } from '../../types';

interface AcceptDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: StockRequest | null;
}

export default function AcceptDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: AcceptDeliveryModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [vehicleId, setVehicleId] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [includeEta, setIncludeEta] = useState(false);
  const [etaTime, setEtaTime] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: vehiclesData } = useVehicles(true, true); // Include trip status
  const { data: suppliersData } = useSuppliers();
  const { data: locationsData } = useLocations();

  const allVehicles = vehiclesData?.vehicles || [];
  const suppliers = suppliersData || [];
  const warehouses = (locationsData || []).filter((loc: { type: string }) => loc.type === 'warehouse');

  // Filter out vehicles that are on trips
  const availableVehicles = allVehicles.filter((v) => v.is_available !== false);
  const vehiclesOnTrips = allVehicles.filter((v) => v.is_available === false && v.current_trip);

  const vehicleOptions = availableVehicles.map((v) => ({
    value: v.id,
    label: `${v.registration_number} - ${v.make || ''} ${v.model || ''}`.trim(),
  }));

  // Build "From" options: Central Warehouse first, then Supplier
  const fromOptions: { value: string; label: string }[] = [];

  // Add warehouse option(s)
  warehouses.forEach((w: { id: string; name: string }) => {
    fromOptions.push({
      value: `warehouse:${w.id}`,
      label: w.name,
    });
  });

  // Add supplier option(s)
  suppliers.forEach((s) => {
    fromOptions.push({
      value: `supplier:${s.id}`,
      label: s.name,
    });
  });

  // Initialize defaults when modal opens
  useEffect(() => {
    if (isOpen && availableVehicles.length > 0 && !vehicleId) {
      setVehicleId(availableVehicles[0]?.id || '');
    }
    if (isOpen && fromOptions.length > 0 && !fromLocation) {
      setFromLocation(fromOptions[0]?.value || '');
    }
  }, [isOpen, availableVehicles.length, fromOptions.length]);

  const createTripMutation = useMutation({
    mutationFn: (data: { requestId: string; tripData: any }) =>
      stockRequestsApi.createTrip(data.requestId, data.tripData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onSuccess();
      setSuccess(true);
      // Show success message for 2 seconds then close
      setTimeout(() => {
        setSuccess(false);
        handleClose();
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to accept and start delivery');
    },
  });

  const handleClose = () => {
    setVehicleId('');
    setFromLocation('');
    setIncludeEta(false);
    setEtaTime('');
    setOdometerStart('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!request) {
      setError('No request selected');
      return;
    }

    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    if (!fromLocation) {
      setError('Please select a pickup location');
      return;
    }

    // Validate odometer start
    if (!odometerStart) {
      setError('Please enter the starting odometer reading');
      return;
    }

    const selectedVehicle = availableVehicles.find((v) => v.id === vehicleId);
    const vehicleCurrentKm = selectedVehicle?.kilometers_traveled || 0;
    const enteredKm = parseInt(odometerStart, 10);

    if (isNaN(enteredKm) || enteredKm < 0) {
      setError('Please enter a valid odometer reading');
      return;
    }

    if (enteredKm < vehicleCurrentKm) {
      setError(`Starting km cannot be less than vehicle's current odometer (${vehicleCurrentKm.toLocaleString()} km)`);
      return;
    }

    // Calculate ETA if provided
    let estimatedArrivalTime: string | undefined;
    if (includeEta && etaTime) {
      const today = new Date();
      const [hours, minutes] = etaTime.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (today < new Date()) {
        today.setDate(today.getDate() + 1);
      }
      estimatedArrivalTime = today.toISOString();
    }

    // Parse the fromLocation value to determine if it's a warehouse or supplier
    const [fromType, fromId] = fromLocation.split(':');

    await createTripMutation.mutateAsync({
      requestId: request.id,
      tripData: {
        vehicle_id: vehicleId,
        driver_id: currentUser?.id,
        supplier_id: fromType === 'supplier' ? fromId : undefined,
        from_location_id: fromType === 'warehouse' ? fromId : undefined,
        auto_start: true,
        estimated_arrival_time: estimatedArrivalTime,
        odometer_start: odometerStart ? parseInt(odometerStart, 10) : undefined,
      },
    });
  };

  // Parse selected value to get display name
  const getSelectedFromName = () => {
    if (!fromLocation) return null;
    const [type, id] = fromLocation.split(':');
    if (type === 'warehouse') {
      return warehouses.find((w: { id: string }) => w.id === id)?.name;
    }
    return suppliers.find((s) => s.id === id)?.name;
  };

  if (!request) return null;

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
              Request Accepted!
            </h2>
            <p className="text-gray-600 text-sm">
              Your delivery to {request.location?.name} has started. Drive safely!
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Accept & Start Delivery" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Request Summary */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-emerald-800">Delivery Request</span>
            {request.urgency === 'urgent' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                URGENT
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm text-emerald-700">
            <p><strong>Deliver to:</strong> {request.location?.name}</p>
            <p><strong>Quantity:</strong> {request.quantity_bags} bags</p>
            {request.notes && <p><strong>Notes:</strong> {request.notes}</p>}
          </div>

          {/* Requested Delivery Time */}
          {request.requested_delivery_time && (
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <span className="font-medium text-blue-800">Deliver by: </span>
                  <span className="text-blue-700">
                    {new Date(request.requested_delivery_time).toLocaleDateString('en-ZA', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    at{' '}
                    {new Date(request.requested_delivery_time).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pickup Location Selection */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Pickup Location</span>
          </div>
          {fromOptions.length === 0 ? (
            <div className="text-amber-700 text-sm">No pickup locations available</div>
          ) : (
            <Select
              label="From *"
              options={fromOptions}
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="Select pickup location"
            />
          )}
          {fromLocation && (
            <div className="mt-3 pt-2 border-t border-green-200">
              <p className="text-sm text-green-700">
                📍 {getSelectedFromName()} → {request.location?.name}
              </p>
            </div>
          )}
        </div>

        {/* Vehicle Selection */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Vehicle</span>
          </div>

          {allVehicles.length === 0 ? (
            <div className="text-amber-700 text-sm">No active vehicles found</div>
          ) : vehicleOptions.length === 0 ? (
            // All vehicles are on trips
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
              <div className="flex items-center gap-2 font-medium mb-2">
                <AlertTriangle className="w-5 h-5" />
                All vehicles are currently on trips
              </div>
              <p className="text-sm mb-3">
                Please wait for a driver to complete their trip before starting a new delivery.
              </p>
              <div className="space-y-2">
                {vehiclesOnTrips.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm bg-white/50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span className="font-medium">{v.registration_number}</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-700">
                      <User className="w-3.5 h-3.5" />
                      <span>{v.current_trip?.driver_name || 'Unknown driver'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <Select
                label="Vehicle *"
                options={vehicleOptions}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder="Select a vehicle"
              />
              {/* Show vehicles currently on trips */}
              {vehiclesOnTrips.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Vehicles currently on trips:
                  </p>
                  <div className="space-y-1">
                    {vehiclesOnTrips.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs text-amber-800">
                        <span className="font-medium">{v.registration_number}</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {v.current_trip?.driver_name || 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {/* Odometer Start */}
          {(() => {
            const selectedVehicle = availableVehicles.find((v) => v.id === vehicleId);
            const minKm = selectedVehicle?.kilometers_traveled || 0;
            return (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Gauge className="w-4 h-4" />
                  Start KM (Odometer) *
                </label>
                <input
                  type="number"
                  value={odometerStart}
                  onChange={(e) => setOdometerStart(e.target.value)}
                  placeholder={minKm > 0 ? `Min: ${minKm.toLocaleString()}` : 'Enter current odometer'}
                  min={minKm}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {minKm > 0
                    ? `Must be at least ${minKm.toLocaleString()} km (vehicle's current reading)`
                    : 'Enter the current odometer reading before starting the trip'
                  }
                </p>
              </div>
            );
          })()}
        </div>

        {/* ETA (Optional) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              id="include-eta-accept"
              checked={includeEta}
              onChange={(e) => setIncludeEta(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="include-eta-accept" className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Store manager will be notified of your expected arrival time.
              </p>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            This will <strong>accept the request</strong> and <strong>start your delivery</strong> immediately.
            The store manager will be notified that you're on your way.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            isLoading={createTripMutation.isPending}
            disabled={vehicleOptions.length === 0 || fromOptions.length === 0 || !vehicleId || !fromLocation || !odometerStart}
          >
            Accept & Start Delivery
          </Button>
        </div>
      </form>
    </Modal>
  );
}
