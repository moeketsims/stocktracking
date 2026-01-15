import { useState, useEffect } from 'react';
import { MapPin, AlertCircle, Truck, Package, User, Plus, Trash2, ArrowDown, GripVertical } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { useCreateTrip, useCreateMultiStopTrip, useVehicles, useDrivers, useLocations, useSuppliers } from '../../hooks/useData';
import type { CreateTripForm, TripType, Location, Supplier, Driver } from '../../types';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TripStop {
  id: string;
  location_id?: string;
  supplier_id?: string;
  stop_type: 'pickup' | 'dropoff';
  location_name?: string;
  planned_qty_kg?: number;
  notes?: string;
}

const tripTypeOptions: { value: TripType; label: string; icon: string }[] = [
  { value: 'supplier_to_warehouse', label: 'Supplier → Warehouse', icon: '📦➡️🏭' },
  { value: 'supplier_to_shop', label: 'Supplier → Shop', icon: '📦➡️🏪' },
  { value: 'warehouse_to_shop', label: 'Warehouse → Shop', icon: '🏭➡️🏪' },
  { value: 'shop_to_shop', label: 'Shop → Shop', icon: '🏪➡️🏪' },
  { value: 'shop_to_warehouse', label: 'Shop → Warehouse', icon: '🏪➡️🏭' },
];

export default function TripModal({
  isOpen,
  onClose,
  onSuccess,
}: TripModalProps) {
  const [isMultiStop, setIsMultiStop] = useState(false);
  const [form, setForm] = useState<CreateTripForm>({
    vehicle_id: '',
    driver_id: undefined,
    driver_name: '',
    origin_description: '',
    destination_description: '',
    notes: '',
    trip_type: 'supplier_to_warehouse',
    from_location_id: undefined,
    to_location_id: undefined,
    supplier_id: undefined,
  });
  const [stops, setStops] = useState<TripStop[]>([]);
  const [error, setError] = useState('');

  const createMutation = useCreateTrip();
  const createMultiStopMutation = useCreateMultiStopTrip();
  const { data: vehiclesData } = useVehicles(true);
  const { data: driversData } = useDrivers(true);
  const { data: locationsData } = useLocations();
  const { data: suppliersData } = useSuppliers();

  const drivers: Driver[] = driversData?.drivers || [];
  const locations: Location[] = locationsData || [];
  const suppliers: Supplier[] = suppliersData || [];
  const warehouses = locations.filter((l: Location) => l.type === 'warehouse');
  const shops = locations.filter((l: Location) => l.type === 'shop');

  // Get selected names for display
  const getSupplierName = (id?: string) => suppliers.find(s => s.id === id)?.name || '';
  const getLocationName = (id?: string) => locations.find(l => l.id === id)?.name || '';

  useEffect(() => {
    if (isOpen && vehiclesData?.vehicles?.length && drivers.length && suppliers.length && warehouses.length) {
      setForm({
        vehicle_id: vehiclesData.vehicles[0]?.id || '',
        driver_id: drivers[0]?.id,
        driver_name: '',
        origin_description: '',
        destination_description: '',
        notes: '',
        trip_type: 'supplier_to_warehouse',
        from_location_id: undefined,
        to_location_id: warehouses[0]?.id,
        supplier_id: suppliers[0]?.id,
      });
      // Initialize with 2 stops for multi-stop mode
      setStops([
        { id: '1', supplier_id: suppliers[0]?.id, stop_type: 'pickup', location_name: suppliers[0]?.name },
        { id: '2', location_id: warehouses[0]?.id, stop_type: 'dropoff', location_name: warehouses[0]?.name },
      ]);
      setError('');
      setIsMultiStop(false);
    }
  }, [isOpen, vehiclesData?.vehicles?.length, drivers.length, suppliers.length, warehouses.length]);

  // Get appropriate location options based on trip type
  const getFromLocationOptions = () => {
    if (form.trip_type === 'warehouse_to_shop') {
      return warehouses.map((l: Location) => ({ value: l.id, label: l.name }));
    }
    if (form.trip_type === 'shop_to_shop' || form.trip_type === 'shop_to_warehouse') {
      return shops.map((l: Location) => ({ value: l.id, label: l.name }));
    }
    return [];
  };

  const getToLocationOptions = () => {
    if (form.trip_type === 'supplier_to_warehouse' || form.trip_type === 'shop_to_warehouse') {
      return warehouses.map((l: Location) => ({ value: l.id, label: l.name }));
    }
    if (form.trip_type === 'supplier_to_shop' || form.trip_type === 'warehouse_to_shop' || form.trip_type === 'shop_to_shop') {
      const filteredShops = form.trip_type === 'shop_to_shop'
        ? shops.filter(s => s.id !== form.from_location_id)
        : shops;
      return filteredShops.map((l: Location) => ({ value: l.id, label: l.name }));
    }
    return [];
  };

  const handleTripTypeChange = (newType: TripType) => {
    let newFromLocation: string | undefined = undefined;
    let newToLocation: string | undefined = undefined;
    let newSupplier: string | undefined = undefined;

    if (newType === 'supplier_to_warehouse') {
      newSupplier = suppliers[0]?.id;
      newToLocation = warehouses[0]?.id;
    } else if (newType === 'supplier_to_shop') {
      newSupplier = suppliers[0]?.id;
      newToLocation = shops[0]?.id;
    } else if (newType === 'warehouse_to_shop') {
      newFromLocation = warehouses[0]?.id;
      newToLocation = shops[0]?.id;
    } else if (newType === 'shop_to_shop') {
      newFromLocation = shops[0]?.id;
      newToLocation = shops[1]?.id || shops[0]?.id;
    } else if (newType === 'shop_to_warehouse') {
      newFromLocation = shops[0]?.id;
      newToLocation = warehouses[0]?.id;
    }

    setForm({
      ...form,
      trip_type: newType,
      from_location_id: newFromLocation,
      to_location_id: newToLocation,
      supplier_id: newSupplier,
    });
  };

  // Multi-stop functions
  const addStop = () => {
    const newId = String(Date.now());
    setStops([...stops, {
      id: newId,
      stop_type: 'dropoff',
      location_id: shops[0]?.id,
      location_name: shops[0]?.name
    }]);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) {
      setError('Multi-stop trips require at least 2 stops');
      return;
    }
    setStops(stops.filter(s => s.id !== id));
  };

  const updateStop = (id: string, updates: Partial<TripStop>) => {
    setStops(stops.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updates };

      // Auto-update location_name when location changes
      if (updates.location_id) {
        const loc = locations.find(l => l.id === updates.location_id);
        updated.location_name = loc?.name;
        updated.supplier_id = undefined;
      } else if (updates.supplier_id) {
        const sup = suppliers.find(s => s.id === updates.supplier_id);
        updated.location_name = sup?.name;
        updated.location_id = undefined;
      }

      return updated;
    }));
  };

  const getStopLocationOptions = (stop: TripStop) => {
    if (stop.stop_type === 'pickup') {
      return [
        { label: '-- Suppliers --', value: '', disabled: true },
        ...suppliers.map(s => ({ value: `supplier:${s.id}`, label: `📦 ${s.name}` })),
        { label: '-- Warehouses --', value: '', disabled: true },
        ...warehouses.map(w => ({ value: `location:${w.id}`, label: `🏭 ${w.name}` })),
      ];
    } else {
      return [
        { label: '-- Warehouses --', value: '', disabled: true },
        ...warehouses.map(w => ({ value: `location:${w.id}`, label: `🏭 ${w.name}` })),
        { label: '-- Shops --', value: '', disabled: true },
        ...shops.map(s => ({ value: `location:${s.id}`, label: `🏪 ${s.name}` })),
      ];
    }
  };

  const handleStopLocationChange = (stopId: string, value: string) => {
    const [type, id] = value.split(':');
    if (type === 'supplier') {
      updateStop(stopId, { supplier_id: id, location_id: undefined });
    } else {
      updateStop(stopId, { location_id: id, supplier_id: undefined });
    }
  };

  const getStopLocationValue = (stop: TripStop) => {
    if (stop.supplier_id) return `supplier:${stop.supplier_id}`;
    if (stop.location_id) return `location:${stop.location_id}`;
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.vehicle_id) {
      setError('Please select a vehicle');
      return;
    }

    if (!form.driver_id) {
      setError('Please select a driver');
      return;
    }

    try {
      if (isMultiStop) {
        // Validate stops
        if (stops.length < 2) {
          setError('Multi-stop trips require at least 2 stops');
          return;
        }

        const validStops = stops.filter(s => s.location_id || s.supplier_id);
        if (validStops.length < 2) {
          setError('Please select a location for all stops');
          return;
        }

        await createMultiStopMutation.mutateAsync({
          vehicle_id: form.vehicle_id,
          driver_id: form.driver_id,
          driver_name: form.driver_name || undefined,
          notes: form.notes || undefined,
          stops: validStops.map(s => ({
            location_id: s.location_id,
            supplier_id: s.supplier_id,
            stop_type: s.stop_type,
            location_name: s.location_name,
            planned_qty_kg: s.planned_qty_kg,
            notes: s.notes,
          })),
        });
      } else {
        // Simple trip
        const isSupplierTrip = form.trip_type === 'supplier_to_warehouse' || form.trip_type === 'supplier_to_shop';
        const originDesc = isSupplierTrip
          ? getSupplierName(form.supplier_id)
          : getLocationName(form.from_location_id);
        const destDesc = getLocationName(form.to_location_id);

        await createMutation.mutateAsync({
          ...form,
          origin_description: originDesc,
          destination_description: destDesc,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create trip');
    }
  };

  const vehicleOptions = (vehiclesData?.vehicles || []).map((v) => ({
    value: v.id,
    label: `${v.registration_number} - ${v.make || ''} ${v.model || ''}`.trim(),
  }));

  const driverOptions = drivers.map((d: Driver) => ({
    value: d.id,
    label: d.full_name,
  }));

  const supplierOptions = suppliers.map((s: Supplier) => ({
    value: s.id,
    label: s.name,
  }));

  // Determine what to show for simple trip
  const showSupplier = form.trip_type === 'supplier_to_warehouse' || form.trip_type === 'supplier_to_shop';
  const showFromLocation = form.trip_type === 'warehouse_to_shop' || form.trip_type === 'shop_to_shop' || form.trip_type === 'shop_to_warehouse';

  // Build route summary for simple trip
  const getRouteSummary = () => {
    const parts: string[] = [];
    if (showSupplier && form.supplier_id) {
      parts.push(getSupplierName(form.supplier_id));
    } else if (showFromLocation && form.from_location_id) {
      parts.push(getLocationName(form.from_location_id));
    }
    if (form.to_location_id) {
      parts.push(getLocationName(form.to_location_id));
    }
    return parts.length === 2 ? `${parts[0]} → ${parts[1]}` : '';
  };

  // Build route summary for multi-stop trip
  const getMultiStopRouteSummary = () => {
    return stops
      .filter(s => s.location_name)
      .map(s => s.location_name)
      .join(' → ');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Trip" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Trip Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMultiStop(false)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              !isMultiStop
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Simple Trip
          </button>
          <button
            type="button"
            onClick={() => setIsMultiStop(true)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              isMultiStop
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Multi-Stop Trip
          </button>
        </div>

        {/* Simple Trip Mode */}
        {!isMultiStop && (
          <>
            {/* Trip Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type *</label>
              <div className="grid grid-cols-1 gap-2">
                {tripTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTripTypeChange(option.value)}
                    className={`p-3 text-left rounded-lg border-2 transition-all flex items-center gap-3 ${
                      form.trip_type === option.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Route Selection */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Route</span>
              </div>

              {/* Origin: Supplier or Location */}
              {showSupplier ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From (Supplier)</label>
                  <Select
                    options={supplierOptions}
                    value={form.supplier_id || ''}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    placeholder="Select supplier"
                  />
                </div>
              ) : showFromLocation ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    From ({form.trip_type === 'warehouse_to_shop' ? 'Warehouse' : 'Shop'})
                  </label>
                  <Select
                    options={getFromLocationOptions()}
                    value={form.from_location_id || ''}
                    onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
                    placeholder="Select origin"
                  />
                </div>
              ) : null}

              {/* Destination */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To ({form.trip_type?.includes('warehouse') && !form.trip_type?.startsWith('warehouse') ? 'Warehouse' : 'Shop/Warehouse'})
                </label>
                <Select
                  options={getToLocationOptions()}
                  value={form.to_location_id || ''}
                  onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}
                  placeholder="Select destination"
                />
              </div>

              {/* Route Summary */}
              {getRouteSummary() && (
                <div className="pt-2 border-t border-green-200">
                  <p className="text-sm text-green-700 font-medium">
                    📍 {getRouteSummary()}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Multi-Stop Trip Mode */}
        {isMultiStop && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Route Stops ({stops.length})</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addStop}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Stop
              </Button>
            </div>

            <div className="space-y-2">
              {stops.map((stop, index) => (
                <div key={stop.id} className="bg-white rounded-lg border border-blue-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <select
                        value={stop.stop_type}
                        onChange={(e) => updateStop(stop.id, { stop_type: e.target.value as 'pickup' | 'dropoff' })}
                        className="text-xs font-medium px-2 py-1 rounded border border-gray-300 bg-white"
                      >
                        <option value="pickup">📦 Pickup</option>
                        <option value="dropoff">📍 Dropoff</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStop(stop.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={stops.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Location</label>
                      <select
                        value={getStopLocationValue(stop)}
                        onChange={(e) => handleStopLocationChange(stop.id, e.target.value)}
                        className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 bg-white"
                      >
                        <option value="">Select...</option>
                        {getStopLocationOptions(stop).map((opt, i) => (
                          <option
                            key={`${opt.value}-${i}`}
                            value={opt.value}
                            disabled={opt.disabled}
                            className={opt.disabled ? 'font-bold text-gray-500' : ''}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Qty (kg)</label>
                      <input
                        type="number"
                        value={stop.planned_qty_kg || ''}
                        onChange={(e) => updateStop(stop.id, { planned_qty_kg: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Optional"
                        className="w-full text-sm px-2 py-1.5 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Route Summary */}
            {getMultiStopRouteSummary() && (
              <div className="pt-2 border-t border-blue-200">
                <p className="text-sm text-blue-700 font-medium">
                  📍 {getMultiStopRouteSummary()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vehicle and Driver */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Vehicle & Driver</span>
          </div>

          {vehicleOptions.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
              No active vehicles found. Please add a vehicle first.
            </div>
          ) : (
            <Select
              label="Vehicle *"
              options={vehicleOptions}
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
              placeholder="Select a vehicle"
            />
          )}

          {driverOptions.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              No active drivers found. Please add a driver first.
            </div>
          ) : (
            <Select
              label="Driver *"
              options={driverOptions}
              value={form.driver_id || ''}
              onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
              placeholder="Select a driver"
            />
          )}
        </div>

        {/* Notes (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes about this trip..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={createMutation.isPending || createMultiStopMutation.isPending}
            disabled={vehicleOptions.length === 0 || driverOptions.length === 0}
          >
            {isMultiStop ? 'Create Multi-Stop Trip' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
