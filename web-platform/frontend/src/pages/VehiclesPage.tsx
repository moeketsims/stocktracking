import { useState } from 'react';
import { Truck, Plus, Edit2, CheckCircle, XCircle, ChevronRight, AlertTriangle, Navigation, Clock } from 'lucide-react';
import { Card, Button, Badge, toast } from '../components/ui';
import VehicleModal from '../components/modals/VehicleModal';
import VehicleHealthDrawer from '../components/VehicleHealthDrawer';
import { useVehicles, useDeleteVehicle, useUpdateVehicle } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import { calculateVehicleHealth } from '../utils/vehicleHealth';
import type { Vehicle, HealthStatus, VehicleHealth } from '../types';

// Status color/icon mappings for health tiles
const STATUS_CONFIG: Record<HealthStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  ok: { bg: 'bg-green-100', text: 'text-green-600', icon: CheckCircle },
  soon: { bg: 'bg-amber-100', text: 'text-amber-600', icon: AlertTriangle },
  due: { bg: 'bg-red-100', text: 'text-red-600', icon: AlertTriangle },
};

// Mini health indicator component for list view
function HealthIndicator({ status, label }: { status: HealthStatus; label: string }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${config.bg}`}>
      <Icon className={`w-3 h-3 ${config.text}`} />
      <span className={`text-xs font-medium ${config.text}`}>{label}</span>
    </div>
  );
}

export default function VehiclesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showHealthDrawer, setShowHealthDrawer] = useState(false);

  const user = useAuthStore((state) => state.user);
  const { isVehicleManager, isAdmin } = useAuthStore();
  const isVehicleMgr = isVehicleManager();
  const isAdminUser = isAdmin();
  // Only vehicle_manager and admin can edit vehicles
  const canEditVehicles = isAdminUser || isVehicleMgr;

  const { data, isLoading, error, refetch } = useVehicles(!showInactive, true); // Include trip status
  const deleteMutation = useDeleteVehicle();
  const updateMutation = useUpdateVehicle();

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const handleDeactivate = async (vehicle: Vehicle) => {
    if (window.confirm(`Are you sure you want to deactivate ${vehicle.registration_number}?`)) {
      try {
        await deleteMutation.mutateAsync(vehicle.id);
      } catch {
        toast.error('Failed to deactivate vehicle');
      }
    }
  };

  const handleReactivate = async (vehicle: Vehicle) => {
    try {
      await updateMutation.mutateAsync({ vehicleId: vehicle.id, data: { is_active: true } });
    } catch {
      toast.error('Failed to reactivate vehicle');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingVehicle(null);
  };

  const handleSuccess = () => {
    refetch();
    handleModalClose();
  };

  const handleOpenHealth = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowHealthDrawer(true);
  };

  const handleCloseHealth = () => {
    setShowHealthDrawer(false);
    setSelectedVehicle(null);
  };

  const handleSaveHealth = async (_vehicleId: string, _health: Partial<VehicleHealth>) => {
    // TODO: Implement API call to save vehicle health data
    // For now, just close the drawer - backend integration will be added later
    refetch();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading vehicles: {(error as Error).message}
      </div>
    );
  }

  const vehicles = data?.vehicles || [];

  // Calculate summary stats
  const availableCount = vehicles.filter((v) => v.is_active && v.is_available !== false).length;
  const onTripCount = vehicles.filter((v) => v.is_active && v.is_available === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vehicles</h1>
            <p className="text-sm text-gray-500">{vehicles.length} registered</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
          {canEditVehicles && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{availableCount}</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{onTripCount}</p>
              <p className="text-sm text-gray-500">On Trip</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{vehicles.filter((v) => v.is_active).length}</p>
              <p className="text-sm text-gray-500">Total Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {vehicles.map((vehicle) => {
            // Calculate health statuses based on km thresholds
            const { serviceStatus, tyresStatus, brakesStatus } = calculateVehicleHealth(
              vehicle.kilometers_traveled,
              vehicle.health
            );

            // Determine if this row should be clickable (for vehicle manager or admin viewing health)
            const isClickable = isVehicleMgr || isAdminUser;

            return (
              <div
                key={vehicle.id}
                onClick={() => isClickable && handleOpenHealth(vehicle)}
                className={`flex items-center gap-4 p-4 ${!vehicle.is_active ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'} transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
              >
                <div className={`w-12 h-12 ${vehicle.is_active ? 'bg-blue-100' : 'bg-gray-200'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Truck className={`w-6 h-6 ${vehicle.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 font-mono">
                      {vehicle.registration_number}
                    </span>
                    <Badge variant={vehicle.is_active ? 'success' : 'default'} size="sm">
                      {vehicle.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {vehicle.fuel_type}
                    </Badge>
                    {/* Trip status badge */}
                    {vehicle.is_available === false && vehicle.current_trip && (
                      <Badge
                        variant={vehicle.current_trip.status === 'in_progress' ? 'warning' : vehicle.current_trip.status === 'planned' ? 'info' : 'default'}
                        size="sm"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        {vehicle.current_trip.status === 'planned' ? 'Assigned' : vehicle.current_trip.status === 'in_progress' ? 'On Trip' : 'Awaiting Km'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {vehicle.make && vehicle.model
                      ? `${vehicle.make} ${vehicle.model}`
                      : vehicle.make || vehicle.model || 'No make/model specified'}
                  </p>
                  {/* Show trip info when on trip */}
                  {vehicle.is_available === false && vehicle.current_trip && (
                    <p className="text-xs text-blue-600 mt-1">
                      Trip {vehicle.current_trip.trip_number} • Driver: {vehicle.current_trip.driver_name || 'Unknown'}
                    </p>
                  )}
                  {vehicle.notes && !vehicle.current_trip && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{vehicle.notes}</p>
                  )}

                  {/* Health indicators for Vehicle Managers and Admins */}
                  {(isVehicleMgr || isAdminUser) && (
                    <div className="flex items-center gap-2 mt-2">
                      <HealthIndicator status={serviceStatus} label="Service" />
                      <HealthIndicator status={tyresStatus} label="Tyres" />
                      <HealthIndicator status={brakesStatus} label="Brakes" />
                    </div>
                  )}
                </div>

                {/* Action buttons - only for vehicle_manager and admin */}
                {canEditVehicles && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {vehicle.is_active ? (
                      <button
                        onClick={() => handleDeactivate(vehicle)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(vehicle)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reactivate"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Chevron for clickable rows */}
                {isClickable && (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
          {vehicles.length === 0 && (
            <div className="p-12 text-center">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No vehicles registered</p>
              {canEditVehicles && (
                <p className="text-sm text-gray-500">
                  Click "Add Vehicle" to register your first vehicle
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Vehicle Modal */}
      <VehicleModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        vehicle={editingVehicle}
      />

      {/* Vehicle Health Drawer (for Vehicle Managers and Admins) */}
      <VehicleHealthDrawer
        isOpen={showHealthDrawer}
        onClose={handleCloseHealth}
        vehicle={selectedVehicle}
        onSave={handleSaveHealth}
      />
    </div>
  );
}
