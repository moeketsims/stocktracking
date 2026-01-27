import { useState } from 'react';
import {
  Truck,
  Wrench,
  Circle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit2,
  Save,
  X,
  User,
  Calendar,
  Gauge,
} from 'lucide-react';
import { Drawer, Button, Input, Badge } from './ui';
import { useAuthStore } from '../stores/authStore';
import {
  calculateServiceStatus,
  calculateTyreStatus,
  calculateBrakeStatus,
  calculateOverallTyreStatus,
  calculateOverallBrakeStatus,
  getKmUntilService,
  SERVICE_THRESHOLDS,
} from '../utils/vehicleHealth';
import type { Vehicle, HealthStatus, TyreHealth, BrakePadHealth, VehicleHealth } from '../types';

interface VehicleHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSave?: (vehicleId: string, health: Partial<VehicleHealth>) => void;
}

// Status color mappings
const STATUS_COLORS: Record<HealthStatus, { bg: string; text: string; border: string; icon: typeof CheckCircle }> = {
  ok: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
  soon: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  due: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  ok: 'OK',
  soon: 'Due Soon',
  due: 'Overdue',
};

// Health tile component for the overview strip
function HealthTile({
  label,
  status,
  subtitle,
}: {
  label: string;
  status: HealthStatus;
  subtitle?: string;
}) {
  const colors = STATUS_COLORS[status];
  const Icon = colors.icon;

  return (
    <div className={`flex-1 p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colors.text}`} />
        <span className={`text-sm font-medium ${colors.text}`}>{STATUS_LABELS[status]}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// Tyre position grid component
function TyreGrid({
  tyres,
  currentKm,
  onEdit,
  canEdit,
}: {
  tyres: TyreHealth[];
  currentKm: number | null;
  onEdit?: (position: TyreHealth['position']) => void;
  canEdit: boolean;
}) {
  const getTyre = (position: TyreHealth['position']) =>
    tyres.find((t) => t.position === position) || {
      position,
      status: 'ok' as HealthStatus,
      last_replaced_at: null,
      last_replaced_km: null,
      notes: null,
    };

  const positions: { position: TyreHealth['position']; label: string; fullLabel: string }[] = [
    { position: 'front_left', label: 'FL', fullLabel: 'Front Left' },
    { position: 'front_right', label: 'FR', fullLabel: 'Front Right' },
    { position: 'rear_left', label: 'RL', fullLabel: 'Rear Left' },
    { position: 'rear_right', label: 'RR', fullLabel: 'Rear Right' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {positions.map(({ position, fullLabel }) => {
        const tyre = getTyre(position);
        // Calculate status based on km
        const status = calculateTyreStatus(currentKm, tyre.last_replaced_km);
        const colors = STATUS_COLORS[status];
        const Icon = colors.icon;

        return (
          <button
            key={position}
            onClick={() => canEdit && onEdit?.(position)}
            disabled={!canEdit}
            className={`p-4 rounded-xl border-2 ${colors.bg} ${colors.border} transition-all ${
              canEdit ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{fullLabel}</span>
              <Icon className={`w-4 h-4 ${colors.text}`} />
            </div>
            <div className="flex items-center gap-2">
              <Circle className={`w-8 h-8 ${colors.text}`} strokeWidth={3} />
              <div className="text-left">
                <span className={`text-sm font-bold ${colors.text}`}>{STATUS_LABELS[status]}</span>
                {tyre.last_replaced_km && (
                  <p className="text-xs text-gray-500">{tyre.last_replaced_km.toLocaleString()} km</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Brake pads grid component (front/rear)
function BrakePadsGrid({
  brakePads,
  currentKm,
  onEdit,
  canEdit,
}: {
  brakePads: BrakePadHealth[];
  currentKm: number | null;
  onEdit?: (position: BrakePadHealth['position']) => void;
  canEdit: boolean;
}) {
  const getBrakePad = (position: BrakePadHealth['position']) =>
    brakePads.find((b) => b.position === position) || {
      position,
      status: 'ok' as HealthStatus,
      last_replaced_at: null,
      last_replaced_km: null,
      notes: null,
    };

  const positions: { position: BrakePadHealth['position']; label: string }[] = [
    { position: 'front', label: 'Front Brakes' },
    { position: 'rear', label: 'Rear Brakes' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {positions.map(({ position, label }) => {
        const pad = getBrakePad(position);
        // Calculate status based on km
        const status = calculateBrakeStatus(currentKm, pad.last_replaced_km);
        const colors = STATUS_COLORS[status];
        const Icon = colors.icon;

        return (
          <button
            key={position}
            onClick={() => canEdit && onEdit?.(position)}
            disabled={!canEdit}
            className={`p-4 rounded-xl border-2 ${colors.bg} ${colors.border} transition-all ${
              canEdit ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <Icon className={`w-4 h-4 ${colors.text}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}>
                <AlertTriangle className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div className="text-left">
                <span className={`text-sm font-bold ${colors.text}`}>{STATUS_LABELS[status]}</span>
                {pad.last_replaced_km && (
                  <p className="text-xs text-gray-500">{pad.last_replaced_km.toLocaleString()} km</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Editable section component
function EditableSection({
  title,
  icon: Icon,
  status,
  canEdit,
  isEditing,
  onEditToggle,
  onSave,
  children,
  editForm,
}: {
  title: string;
  icon: typeof Wrench;
  status: HealthStatus;
  canEdit: boolean;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  children: React.ReactNode;
  editForm: React.ReactNode;
}) {
  const colors = STATUS_COLORS[status];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className={`flex items-center justify-between p-4 ${colors.bg}`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${colors.text}`} />
          <span className="font-semibold text-gray-900">{title}</span>
          <Badge
            variant={status === 'ok' ? 'success' : status === 'soon' ? 'warning' : 'error'}
            size="sm"
          >
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={onEditToggle}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={onSave}
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onEditToggle}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-4 bg-white">{isEditing ? editForm : children}</div>
    </div>
  );
}

export default function VehicleHealthDrawer({
  isOpen,
  onClose,
  vehicle,
  onSave,
}: VehicleHealthDrawerProps) {
  const { isVehicleManager, isAdmin } = useAuthStore();
  const canEdit = isVehicleManager();
  const canView = canEdit || isAdmin();

  // Edit states
  const [editingSection, setEditingSection] = useState<'service' | null>(null);
  const [editingTyre, setEditingTyre] = useState<TyreHealth['position'] | null>(null);
  const [editingBrake, setEditingBrake] = useState<BrakePadHealth['position'] | null>(null);

  // Form states
  const [serviceForm, setServiceForm] = useState({
    last_service_date: '',
    last_service_km: '',
    next_service_due_km: '',
    notes: '',
  });

  const [tyreForm, setTyreForm] = useState({
    last_replaced_at: '',
    last_replaced_km: '',
    status: 'ok' as HealthStatus,
    notes: '',
  });

  const [brakeForm, setBrakeForm] = useState({
    last_replaced_at: '',
    last_replaced_km: '',
    status: 'ok' as HealthStatus,
    notes: '',
  });

  if (!vehicle) return null;

  // Default health data merged with actual data
  const health: VehicleHealth = {
    last_service_date: null,
    last_service_km: null,
    next_service_due_km: null,
    service_status: 'ok',
    service_notes: null,
    tyres: [],
    tyres_status: 'ok',
    brake_pads: [],
    brake_pads_status: 'ok',
    last_driver_id: null,
    last_driver_name: null,
    last_trip_at: null,
    updated_at: null,
    updated_by: null,
    ...(vehicle.health || {}),
  };

  // Calculate statuses based on kilometers thresholds
  const currentKm = vehicle.kilometers_traveled;
  const serviceStatus = calculateServiceStatus(currentKm, health.last_service_km);
  const tyresStatus = calculateOverallTyreStatus(currentKm, health.tyres);
  const brakesStatus = calculateOverallBrakeStatus(currentKm, health.brake_pads);

  // Calculate km until next service
  const kmUntilService = getKmUntilService(currentKm, health.last_service_km);
  const nextServiceDueKm = health.last_service_km
    ? health.last_service_km + SERVICE_THRESHOLDS.SOON
    : null;

  const handleSaveService = () => {
    if (onSave) {
      onSave(vehicle.id, {
        last_service_date: serviceForm.last_service_date || null,
        last_service_km: serviceForm.last_service_km ? parseInt(serviceForm.last_service_km) : null,
        next_service_due_km: serviceForm.next_service_due_km
          ? parseInt(serviceForm.next_service_due_km)
          : null,
        service_notes: serviceForm.notes || null,
      });
    }
    setEditingSection(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not recorded';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatKm = (km: number | null) => {
    if (!km) return 'Not recorded';
    return `${km.toLocaleString()} km`;
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Vehicle Health" size="lg">
      <div className="p-6 space-y-6">
        {/* Vehicle Header */}
        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 font-mono">
              {vehicle.registration_number}
            </h3>
            <p className="text-sm text-gray-600">
              {vehicle.make && vehicle.model
                ? `${vehicle.make} ${vehicle.model}`
                : vehicle.make || vehicle.model || 'Vehicle'}
            </p>
          </div>
          <Badge variant={vehicle.is_active ? 'success' : 'default'} size="sm">
            {vehicle.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Total Km Travelled & Last Driver */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Total Km Travelled */}
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Gauge className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Total Km Travelled</p>
              <p className="text-lg font-bold text-gray-900">
                {vehicle.kilometers_traveled
                  ? `${vehicle.kilometers_traveled.toLocaleString()} km`
                  : 'Not recorded'}
              </p>
            </div>
          </div>

          {/* Last Driver Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Last Driver</p>
              <p className="text-sm font-semibold text-gray-900">
                {health.last_driver_name || 'Not recorded'}
              </p>
              {health.last_trip_at && (
                <p className="text-xs text-gray-500">{formatDate(health.last_trip_at)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Health Overview Strip */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Health Overview</h4>
          <div className="grid grid-cols-3 gap-3">
            <HealthTile
              label="Service"
              status={serviceStatus}
              subtitle={
                kmUntilService !== null
                  ? kmUntilService <= 0
                    ? 'Service overdue'
                    : `${kmUntilService.toLocaleString()} km until service`
                  : undefined
              }
            />
            <HealthTile label="Tyres" status={tyresStatus} />
            <HealthTile label="Brakes" status={brakesStatus} />
          </div>
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Service Section */}
            <EditableSection
              title="Service"
              icon={Wrench}
              status={serviceStatus}
              canEdit={canEdit}
              isEditing={editingSection === 'service'}
              onEditToggle={() => {
                if (editingSection === 'service') {
                  setEditingSection(null);
                } else {
                  setServiceForm({
                    last_service_date: health.last_service_date || '',
                    last_service_km: health.last_service_km?.toString() || '',
                    next_service_due_km: health.next_service_due_km?.toString() || '',
                    notes: health.service_notes || '',
                  });
                  setEditingSection('service');
                }
              }}
              onSave={handleSaveService}
              editForm={
                <div className="space-y-4">
                  <Input
                    type="date"
                    label="Last Service Date"
                    value={serviceForm.last_service_date}
                    onChange={(e) => setServiceForm({ ...serviceForm, last_service_date: e.target.value })}
                  />
                  <Input
                    type="number"
                    label="Last Service Km"
                    value={serviceForm.last_service_km}
                    onChange={(e) => setServiceForm({ ...serviceForm, last_service_km: e.target.value })}
                    placeholder="e.g., 45000"
                  />
                  <Input
                    type="number"
                    label="Next Service Due Km"
                    value={serviceForm.next_service_due_km}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, next_service_due_km: e.target.value })
                    }
                    placeholder="e.g., 55000"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={2}
                      value={serviceForm.notes}
                      onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                      placeholder="Service notes..."
                    />
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Last Service</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(health.last_service_date)}</p>
                  <p className="text-xs text-gray-500">{formatKm(health.last_service_km)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Service Due</p>
                  <p className="text-sm font-medium text-gray-900">{formatKm(health.next_service_due_km)}</p>
                </div>
              </div>
              {health.service_notes && (
                <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                  {health.service_notes}
                </p>
              )}
            </EditableSection>

            {/* Brake Pads Section */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className={`flex items-center justify-between p-4 ${STATUS_COLORS[brakesStatus].bg}`}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${STATUS_COLORS[brakesStatus].text}`} />
                  <span className="font-semibold text-gray-900">Brake Pads</span>
                  <Badge
                    variant={
                      brakesStatus === 'ok'
                        ? 'success'
                        : brakesStatus === 'soon'
                        ? 'warning'
                        : 'error'
                    }
                    size="sm"
                  >
                    {STATUS_LABELS[brakesStatus]}
                  </Badge>
                </div>
              </div>
              <div className="p-4 bg-white">
                <BrakePadsGrid
                  brakePads={health.brake_pads}
                  currentKm={currentKm}
                  canEdit={canEdit}
                  onEdit={(position) => {
                    const pad = health.brake_pads.find((b) => b.position === position);
                    setBrakeForm({
                      last_replaced_at: pad?.last_replaced_at || '',
                      last_replaced_km: pad?.last_replaced_km?.toString() || '',
                      status: pad?.status || 'ok',
                      notes: pad?.notes || '',
                    });
                    setEditingBrake(position);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Tyres */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className={`flex items-center justify-between p-4 ${STATUS_COLORS[tyresStatus].bg}`}>
                <div className="flex items-center gap-3">
                  <Circle className={`w-5 h-5 ${STATUS_COLORS[tyresStatus].text}`} strokeWidth={3} />
                  <span className="font-semibold text-gray-900">Tyres</span>
                  <Badge
                    variant={
                      tyresStatus === 'ok'
                        ? 'success'
                        : tyresStatus === 'soon'
                        ? 'warning'
                        : 'error'
                    }
                    size="sm"
                  >
                    {STATUS_LABELS[tyresStatus]}
                  </Badge>
                </div>
              </div>
              <div className="p-4 bg-white">
                <TyreGrid
                  tyres={health.tyres}
                  currentKm={currentKm}
                  canEdit={canEdit}
                  onEdit={(position) => {
                    const tyre = health.tyres.find((t) => t.position === position);
                    setTyreForm({
                      last_replaced_at: tyre?.last_replaced_at || '',
                      last_replaced_km: tyre?.last_replaced_km?.toString() || '',
                      status: tyre?.status || 'ok',
                      notes: tyre?.notes || '',
                    });
                    setEditingTyre(position);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated Info */}
        {health.updated_at && (
          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
            Last updated: {formatDate(health.updated_at)}
            {health.updated_by && ` by ${health.updated_by}`}
          </div>
        )}

        {/* Close Button (Mobile) */}
        <div className="md:hidden pt-4">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>

      {/* Tyre Edit Modal */}
      {editingTyre && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingTyre(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {editingTyre.replace('_', ' ').replace('_', ' ')} Tyre
            </h3>
            <Input
              type="date"
              label="Last Replaced Date"
              value={tyreForm.last_replaced_at}
              onChange={(e) => setTyreForm({ ...tyreForm, last_replaced_at: e.target.value })}
            />
            <Input
              type="number"
              label="Last Replaced Km"
              value={tyreForm.last_replaced_km}
              onChange={(e) => setTyreForm({ ...tyreForm, last_replaced_km: e.target.value })}
              placeholder="e.g., 30000"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                value={tyreForm.status}
                onChange={(e) => setTyreForm({ ...tyreForm, status: e.target.value as HealthStatus })}
              >
                <option value="ok">OK</option>
                <option value="soon">Due Soon</option>
                <option value="due">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={2}
                value={tyreForm.notes}
                onChange={(e) => setTyreForm({ ...tyreForm, notes: e.target.value })}
                placeholder="Tyre notes..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingTyre(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (onSave) {
                    const updatedTyres = [...health.tyres];
                    const existingIndex = updatedTyres.findIndex((t) => t.position === editingTyre);
                    const newTyre: TyreHealth = {
                      position: editingTyre,
                      status: tyreForm.status,
                      last_replaced_at: tyreForm.last_replaced_at || null,
                      last_replaced_km: tyreForm.last_replaced_km
                        ? parseInt(tyreForm.last_replaced_km)
                        : null,
                      notes: tyreForm.notes || null,
                    };

                    if (existingIndex >= 0) {
                      updatedTyres[existingIndex] = newTyre;
                    } else {
                      updatedTyres.push(newTyre);
                    }

                    onSave(vehicle.id, { tyres: updatedTyres });
                  }
                  setEditingTyre(null);
                }}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Brake Pad Edit Modal */}
      {editingBrake && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingBrake(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {editingBrake.charAt(0).toUpperCase() + editingBrake.slice(1)} Brake Pads
            </h3>
            <Input
              type="date"
              label="Last Replaced Date"
              value={brakeForm.last_replaced_at}
              onChange={(e) => setBrakeForm({ ...brakeForm, last_replaced_at: e.target.value })}
            />
            <Input
              type="number"
              label="Last Replaced Km"
              value={brakeForm.last_replaced_km}
              onChange={(e) => setBrakeForm({ ...brakeForm, last_replaced_km: e.target.value })}
              placeholder="e.g., 40000"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                value={brakeForm.status}
                onChange={(e) => setBrakeForm({ ...brakeForm, status: e.target.value as HealthStatus })}
              >
                <option value="ok">OK</option>
                <option value="soon">Due Soon</option>
                <option value="due">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={2}
                value={brakeForm.notes}
                onChange={(e) => setBrakeForm({ ...brakeForm, notes: e.target.value })}
                placeholder="Brake pad notes..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingBrake(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (onSave) {
                    const updatedBrakes = [...health.brake_pads];
                    const existingIndex = updatedBrakes.findIndex((b) => b.position === editingBrake);
                    const newBrake: BrakePadHealth = {
                      position: editingBrake,
                      status: brakeForm.status,
                      last_replaced_at: brakeForm.last_replaced_at || null,
                      last_replaced_km: brakeForm.last_replaced_km
                        ? parseInt(brakeForm.last_replaced_km)
                        : null,
                      notes: brakeForm.notes || null,
                    };

                    if (existingIndex >= 0) {
                      updatedBrakes[existingIndex] = newBrake;
                    } else {
                      updatedBrakes.push(newBrake);
                    }

                    onSave(vehicle.id, { brake_pads: updatedBrakes });
                  }
                  setEditingBrake(null);
                }}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
