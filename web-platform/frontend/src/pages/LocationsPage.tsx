import { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Warehouse,
  Search,
  Sliders,
} from 'lucide-react';
import { Card, Button, Badge, Select, toast } from '../components/ui';
import CreateLocationModal from '../components/modals/CreateLocationModal';
import EditLocationModal from '../components/modals/EditLocationModal';
import EditThresholdsModal from '../components/modals/EditThresholdsModal';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import { useLocations, useZones, useDeleteLocation } from '../hooks/useData';

interface Location {
  id: string;
  name: string;
  type: 'shop' | 'warehouse';
  zone_id: string;
  zone_name?: string;
  address?: string;
  created_at: string;
  critical_stock_threshold?: number;
  low_stock_threshold?: number;
}

const TYPE_LABELS: Record<string, string> = {
  shop: 'Shop',
  warehouse: 'Warehouse',
};

const TYPE_COLORS: Record<string, string> = {
  shop: 'bg-green-100 text-green-800',
  warehouse: 'bg-blue-100 text-blue-800',
};

export default function LocationsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingThresholdsLocation, setEditingThresholdsLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('');

  // Data
  const { data: locations, isLoading, refetch } = useLocations();
  const { data: zones } = useZones();

  // Mutations
  const deleteMutation = useDeleteLocation();

  const handleDeleteClick = (location: Location) => {
    setDeleteError('');
    setDeletingLocation(location);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLocation) return;

    try {
      await deleteMutation.mutateAsync(deletingLocation.id);
      setDeletingLocation(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete location');
      setDeletingLocation(null);
      toast.error(err.response?.data?.detail || 'Failed to delete location');
    }
  };

  const handleSuccess = () => {
    refetch();
  };

  // Filter locations
  const filteredLocations = (locations || []).filter((loc: Location) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      if (!loc.name.toLowerCase().includes(search) &&
          !(loc.address || '').toLowerCase().includes(search)) {
        return false;
      }
    }
    if (typeFilter && loc.type !== typeFilter) {
      return false;
    }
    if (zoneFilter && loc.zone_id !== zoneFilter) {
      return false;
    }
    return true;
  });

  const shopCount = (locations || []).filter((l: Location) => l.type === 'shop').length;
  const warehouseCount = (locations || []).filter((l: Location) => l.type === 'warehouse').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Location Management</h1>
            <p className="text-sm text-gray-500">
              {shopCount} shops, {warehouseCount} warehouse{warehouseCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'All types' },
            { value: 'shop', label: 'Shops' },
            { value: 'warehouse', label: 'Warehouses' },
          ]}
        />
        <Select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          options={[
            { value: '', label: 'All zones' },
            ...(zones || []).map((z: any) => ({ value: z.id, label: z.name })),
          ]}
        />
      </div>

      {/* Locations List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-200">
            {filteredLocations.map((loc: Location) => (
              <div
                key={loc.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-12 h-12 ${loc.type === 'warehouse' ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  {loc.type === 'warehouse' ? (
                    <Warehouse className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Building2 className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {loc.name}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[loc.type]}`}>
                      {TYPE_LABELS[loc.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    {loc.zone_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {loc.zone_name}
                      </span>
                    )}
                    {loc.address && (
                      <span className="text-gray-500">
                        {loc.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs">
                      <Sliders className="w-3 h-3" />
                      Critical: {loc.critical_stock_threshold || 20} | Low: {loc.low_stock_threshold || 50}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingThresholdsLocation(loc)}
                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit Stock Thresholds"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingLocation(loc)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(loc)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filteredLocations.length === 0 && (
              <div className="p-12 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No locations found</p>
                <p className="text-sm text-gray-500">
                  {searchQuery || typeFilter || zoneFilter
                    ? 'Try adjusting your filters'
                    : 'Click "Add Location" to create your first location'}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Modals */}
      <CreateLocationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
      />

      <EditLocationModal
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        onSuccess={handleSuccess}
        location={editingLocation}
      />

      <ConfirmationModal
        isOpen={!!deletingLocation}
        onClose={() => setDeletingLocation(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Location"
        message={`Are you sure you want to delete "${deletingLocation?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />

      <EditThresholdsModal
        isOpen={!!editingThresholdsLocation}
        onClose={() => setEditingThresholdsLocation(null)}
        onSuccess={handleSuccess}
        location={editingThresholdsLocation}
      />
    </div>
  );
}
