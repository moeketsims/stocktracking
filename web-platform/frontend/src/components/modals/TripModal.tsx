import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, AlertCircle, Truck, Package, User, Plus, Trash2, CheckCircle, Clock, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { useCreateTrip, useCreateMultiStopTrip, useVehicles, useDrivers, useLocations, useSuppliers } from '../../hooks/useData';
import { stockRequestsApi } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { CreateTripForm, TripType, Location, Supplier, Driver, StockRequest } from '../../types';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedRequestId?: string | null;
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
  preSelectedRequestId,
}: TripModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [isMultiStop, setIsMultiStop] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<StockRequest[]>([]);
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
  const [includeEta, setIncludeEta] = useState(false);
  const [etaTime, setEtaTime] = useState('');

  const createMutation = useCreateTrip();
  const createMultiStopMutation = useCreateMultiStopTrip();
  // Fetch vehicles with trip status to show availability
  const { data: vehiclesData } = useVehicles(true, true);
  const { data: driversData } = useDrivers(true);
  const { data: locationsData } = useLocations();
  const { data: suppliersData } = useSuppliers();

  // Fetch accepted stock requests for the current user
  const { data: myRequestsData } = useQuery({
    queryKey: ['stock-requests', 'my'],
    queryFn: () => stockRequestsApi.getMyRequests(undefined, 50).then(r => r.data),
    enabled: isOpen,
  });

  // Get only accepted requests (not yet trip_created or fulfilled)
  const acceptedRequests: StockRequest[] = (myRequestsData?.accepted || []).filter(
    (r: StockRequest) => r.status === 'accepted'
  );

  // Mutation for creating trip from single request
  const createTripFromRequestMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: any }) =>
      stockRequestsApi.createTrip(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create trip from request');
    },
  });

  // Mutation for creating multi-stop trip from multiple requests
  const createMultiTripMutation = useMutation({
    mutationFn: (data: { request_ids: string[]; vehicle_id: string; driver_id?: string; supplier_id: string; notes?: string }) =>
      stockRequestsApi.createMultiTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create multi-stop trip');
    },
  });

  const drivers: Driver[] = driversData?.drivers || [];
  const locations: Location[] = locationsData || [];
  const suppliers: Supplier[] = suppliersData || [];
  const warehouses = locations.filter((l: Location) => l.type === 'warehouse');
  const shops = locations.filter((l: Location) => l.type === 'shop');

  // Get selected names for display
  const getSupplierName = (id?: string) => suppliers.find(s => s.id === id)?.name || '';
  const getLocationName = (id?: string) => locations.find(l => l.id === id)?.name || '';

  // Track if we've initialized this modal session
  const [hasInitialized, setHasInitialized] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      setIncludeEta(false);
      setEtaTime('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !hasInitialized && vehiclesData?.vehicles?.length && drivers.length && suppliers.length && warehouses.length) {
      setHasInitialized(true);

      // Get first available vehicle (not on a trip)
      const firstAvailableVehicle = vehiclesData.vehicles.find((v) => v.is_available !== false);
      const defaultVehicleId = firstAvailableVehicle?.id || '';

      // Check if a specific request is pre-selected (from RequestsPage navigation)
      const preSelectedRequest = preSelectedRequestId
        ? acceptedRequests.find((r: StockRequest) => r.id === preSelectedRequestId)
        : null;

      // If preSelectedRequestId is provided, select only that request
      // Otherwise, auto-select all accepted requests
      if (preSelectedRequest) {
        setSelectedRequests([preSelectedRequest]);
        setIsMultiStop(false);
        setForm({
          vehicle_id: defaultVehicleId,
          driver_id: currentUser?.id,
          driver_name: '',
          origin_description: '',
          destination_description: '',
          notes: '',
          trip_type: 'supplier_to_shop',
          from_location_id: undefined,
          to_location_id: preSelectedRequest.location_id,
          supplier_id: suppliers[0]?.id,
        });
      } else if (acceptedRequests.length > 0) {
        setSelectedRequests(acceptedRequests);
        setIsMultiStop(false);
        setForm({
          vehicle_id: defaultVehicleId,
          driver_id: currentUser?.id, // Driver is current user (who accepted)
          driver_name: '',
          origin_description: '',
          destination_description: '',
          notes: '',
          trip_type: 'supplier_to_shop',
          from_location_id: undefined,
          to_location_id: acceptedRequests[0].location_id,
          supplier_id: suppliers[0]?.id,
        });
      } else {
        // Regular trip mode - no accepted requests
        setSelectedRequests([]);
        setForm({
          vehicle_id: defaultVehicleId,
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
      }

      // Initialize with 2 stops for multi-stop mode
      setStops([
        { id: '1', supplier_id: suppliers[0]?.id, stop_type: 'pickup', location_name: suppliers[0]?.name },
        { id: '2', location_id: warehouses[0]?.id, stop_type: 'dropoff', location_name: warehouses[0]?.name },
      ]);
      setError('');
      setIsMultiStop(false);
    }
  }, [isOpen, hasInitialized, vehiclesData?.vehicles?.length, drivers.length, suppliers.length, warehouses.length, acceptedRequests.length, currentUser?.id, preSelectedRequestId]);

  // Handle toggling a stock request selection
  const handleToggleRequest = (request: StockRequest) => {
    setSelectedRequests((prev) => {
      const isSelected = prev.some((r) => r.id === request.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== request.id);
      } else {
        return [...prev, request];
      }
    });
  };

  // Select all requests
  const handleSelectAll = () => {
    setSelectedRequests(acceptedRequests);
  };

  // Clear all request selections
  const handleClearAll = () => {
    setSelectedRequests([]);
  };

  // Clear request selection (legacy - now using handleClearAll)
  const handleClearRequest = () => {
    setSelectedRequests([]);
    setForm({
      ...form,
      trip_type: 'supplier_to_warehouse',
      to_location_id: warehouses[0]?.id,
      notes: '',
    });
  };

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
      // If fulfilling stock requests, use the appropriate endpoint
      if (selectedRequests.length > 0) {
        if (!form.supplier_id) {
          setError('Please select a supplier');
          return;
        }

        // Calculate ETA if provided
        let estimatedArrivalTime: string | undefined;
        if (includeEta && etaTime) {
          const today = new Date();
          const [hours, minutes] = etaTime.split(':');
          today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          // If time is earlier than now, assume it's for tomorrow
          if (today < new Date()) {
            today.setDate(today.getDate() + 1);
          }
          estimatedArrivalTime = today.toISOString();
        }

        if (selectedRequests.length === 1) {
          // Single request - use original endpoint
          await createTripFromRequestMutation.mutateAsync({
            requestId: selectedRequests[0].id,
            data: {
              vehicle_id: form.vehicle_id,
              driver_id: currentUser?.id,
              supplier_id: form.supplier_id,
              notes: form.notes || undefined,
              auto_start: true,
              estimated_arrival_time: estimatedArrivalTime,
            },
          });
        } else {
          // Multiple requests - use multi-trip endpoint
          await createMultiTripMutation.mutateAsync({
            request_ids: selectedRequests.map(r => r.id),
            vehicle_id: form.vehicle_id,
            driver_id: currentUser?.id,
            supplier_id: form.supplier_id,
            notes: form.notes || undefined,
            auto_start: true,
            estimated_arrival_time: estimatedArrivalTime,
          });
        }
        return; // onSuccess/onClose handled by mutation
      }

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

  // Separate available vehicles from those on trips
  const allVehicles = vehiclesData?.vehicles || [];
  const availableVehicles = allVehicles.filter((v) => v.is_available !== false);
  const vehiclesOnTrips = allVehicles.filter((v) => v.is_available === false && v.current_trip);

  const vehicleOptions = availableVehicles.map((v) => ({
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

        {/* Accepted Stock Requests Section - Multi-select with checkboxes */}
        {acceptedRequests.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">
                  Pending Stock Requests ({acceptedRequests.length})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {acceptedRequests.map((request) => {
                const isSelected = selectedRequests.some((r) => r.id === request.id);
                return (
                  <label
                    key={request.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-100'
                        : 'border-gray-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRequest(request)}
                      className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {request.location?.name || 'Unknown Location'}
                          </span>
                          {request.urgency === 'urgent' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              URGENT
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-emerald-700">
                          {request.quantity_bags} bags
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                        {request.requested_delivery_time && (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Calendar className="w-3 h-3" />
                            Deliver by {new Date(request.requested_delivery_time).toLocaleDateString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            {new Date(request.requested_delivery_time).toLocaleTimeString('en-ZA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      {request.notes && (
                        <div className="flex items-start gap-1 mt-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                          <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{request.notes}</span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedRequests.length > 0 && (
              <div className="mt-3 pt-2 border-t border-emerald-200">
                <p className="text-sm text-emerald-800">
                  <strong>{selectedRequests.length}</strong> request{selectedRequests.length > 1 ? 's' : ''} selected
                  {' • '}
                  <strong>{selectedRequests.reduce((sum, r) => sum + r.quantity_bags, 0)}</strong> bags total
                  {selectedRequests.length > 1 && (
                    <span className="ml-2 text-xs text-emerald-600">
                      (Multi-stop trip)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Show simplified form when fulfilling requests */}
        {selectedRequests.length > 0 ? (
          <>
            {/* Request Info Banner */}
            <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3">
              {selectedRequests.length === 1 ? (
                <div className="text-sm text-emerald-800">
                  <p className="font-medium">
                    Creating trip to deliver <strong>{selectedRequests[0].quantity_bags} bags</strong> to{' '}
                    <strong>{selectedRequests[0].location?.name}</strong>
                  </p>
                  {selectedRequests[0].requested_delivery_time && (
                    <p className="flex items-center gap-1 mt-1.5 text-blue-700 bg-blue-50 rounded px-2 py-1 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Deliver by: {new Date(selectedRequests[0].requested_delivery_time).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}at{' '}
                      {new Date(selectedRequests[0].requested_delivery_time).toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {selectedRequests[0].notes && (
                    <p className="flex items-start gap-1 mt-1.5 text-gray-700 bg-white/50 rounded px-2 py-1 text-xs">
                      <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{selectedRequests[0].notes}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-sm font-medium text-emerald-800">
                  <p className="mb-2">
                    Creating <strong>multi-stop trip</strong> to deliver{' '}
                    <strong>{selectedRequests.reduce((sum, r) => sum + r.quantity_bags, 0)} bags</strong> to{' '}
                    <strong>{selectedRequests.length} locations</strong>:
                  </p>
                  <ol className="list-decimal list-inside text-xs space-y-1.5 ml-2">
                    {selectedRequests.map((r, idx) => (
                      <li key={r.id} className="text-emerald-700">
                        <span className="font-medium">{r.location?.name}</span> ({r.quantity_bags} bags)
                        {r.requested_delivery_time && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-blue-600">
                            <Calendar className="w-2.5 h-2.5" />
                            by {new Date(r.requested_delivery_time).toLocaleTimeString('en-ZA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {r.notes && (
                          <span className="block ml-4 mt-0.5 text-gray-600 italic">"{r.notes}"</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Supplier Selection */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Pickup Location</span>
              </div>
              <Select
                label="From (Supplier) *"
                options={supplierOptions}
                value={form.supplier_id || ''}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                placeholder="Select supplier"
              />
              <div className="mt-3 pt-2 border-t border-green-200">
                <p className="text-sm text-green-700">
                  📍 {getSupplierName(form.supplier_id) || 'Select supplier'} →{' '}
                  {selectedRequests.length === 1
                    ? selectedRequests[0].location?.name
                    : selectedRequests.map((r) => r.location?.name).join(' → ')}
                </p>
              </div>
            </div>

            {/* ETA (Optional) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  id="include-eta"
                  checked={includeEta}
                  onChange={(e) => setIncludeEta(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Store manager will be notified of your expected arrival time.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        {/* Vehicle and Driver */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">
              {selectedRequests.length > 0 ? 'Vehicle' : 'Vehicle & Driver'}
            </span>
          </div>

          {allVehicles.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
              No active vehicles found. Please add a vehicle first.
            </div>
          ) : vehicleOptions.length === 0 ? (
            // All vehicles are on trips
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
              <div className="flex items-center gap-2 font-medium mb-2">
                <AlertTriangle className="w-5 h-5" />
                All vehicles are currently on trips
              </div>
              <p className="text-sm mb-3">
                Please wait for a driver to submit their closing km before starting a new trip.
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
                      {v.current_trip?.awaiting_km && (
                        <span className="text-xs bg-amber-200 px-1.5 py-0.5 rounded">Awaiting Km</span>
                      )}
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
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                placeholder="Select a vehicle"
              />
              {/* Show vehicles currently on trips */}
              {vehiclesOnTrips.length > 0 && (
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Vehicles on trips:</p>
                  <div className="space-y-1">
                    {vehiclesOnTrips.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs text-gray-600">
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

          {/* When fulfilling a stock request, driver is automatically the current user */}
          {selectedRequests.length > 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>
                Driver: <strong>{currentUser?.full_name || 'You'}</strong> (you accepted this request)
              </span>
            </div>
          ) : driverOptions.length === 0 ? (
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
            className={`flex-1 ${selectedRequests.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            isLoading={createMutation.isPending || createMultiStopMutation.isPending || createTripFromRequestMutation.isPending || createMultiTripMutation.isPending}
            disabled={vehicleOptions.length === 0 || (selectedRequests.length === 0 && driverOptions.length === 0)}
          >
            {selectedRequests.length > 0
              ? selectedRequests.length > 1
                ? `Start Delivery (${selectedRequests.length} stops)`
                : 'Start Delivery'
              : isMultiStop
              ? 'Create Multi-Stop Trip'
              : 'Create Trip'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
