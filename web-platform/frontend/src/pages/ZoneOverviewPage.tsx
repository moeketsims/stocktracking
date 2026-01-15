import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Warehouse,
  Store,
} from 'lucide-react';
import { Card, Badge, Button, Modal } from '../components/ui';
import { useZoneOverview } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getPreferredValue, getUnitLabel } from '../lib/unitDisplay';

export default function ZoneOverviewPage() {
  const { data, isLoading, error, refetch } = useZoneOverview();
  const { isManager } = useAuthStore();
  const { defaultUnit } = useSettingsStore();
  const unitLabel = getUnitLabel(defaultUnit);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  if (!isManager()) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">
          Zone overview is only available to managers and administrators.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading zone data: {(error as Error).message}
      </div>
    );
  }

  const {
    zone_name,
    total_kg,
    total_bags,
    shop_count,
    low_stock_count,
    warehouse,
    shops,
    reallocation_suggestions,
  } = data || {
    zone_name: '',
    total_kg: 0,
    total_bags: 0,
    shop_count: 0,
    low_stock_count: 0,
    warehouse: null,
    shops: [],
    reallocation_suggestions: [],
  };

  const handleCreateTransfer = () => {
    if (!selectedTransfer) return;

    // For now, we'll just close the modal
    // In a full implementation, you would pre-fill a transfer form
    setSelectedTransfer(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Zone Summary */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{zone_name}</h2>
            <p className="text-blue-100 mt-1">Zone Overview</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{getPreferredValue(total_kg, total_bags, defaultUnit).toFixed(0)} {unitLabel}</p>
            <p className="text-blue-200 text-sm">Total Stock</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-blue-500">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-200" />
            <span>{shop_count} Shops</span>
          </div>
          {low_stock_count > 0 && (
            <div className="flex items-center gap-2 text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>{low_stock_count} Low Stock</span>
            </div>
          )}
        </div>
      </Card>

      {/* Reallocation Suggestions */}
      {reallocation_suggestions.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Reallocation Suggestions</h3>
          <div className="space-y-3">
            {reallocation_suggestions.map((suggestion: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">
                    {suggestion.from_location_name}
                  </span>
                  <div className="flex items-center gap-2 text-amber-600">
                    <ArrowRight className="w-4 h-4" />
                    <span className="font-semibold">{getPreferredValue(suggestion.quantity, suggestion.quantity_bags, defaultUnit).toFixed(0)} {unitLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {suggestion.to_location_name}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTransfer(suggestion)}
                >
                  Create Transfer
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Warehouse */}
      {warehouse && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-600" />
            Warehouse
          </h3>
          <LocationCard location={warehouse} defaultUnit={defaultUnit} unitLabel={unitLabel} />
        </Card>
      )}

      {/* Shops */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          Shops ({shops.length})
        </h3>
        <div className="space-y-3">
          {shops.map((shop: any) => (
            <LocationCard key={shop.location_id} location={shop} defaultUnit={defaultUnit} unitLabel={unitLabel} />
          ))}
          {shops.length === 0 && (
            <p className="text-center text-gray-500 py-4">No shops in this zone</p>
          )}
        </div>
      </Card>

      {/* Transfer Confirmation Modal */}
      <Modal
        isOpen={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        title="Create Transfer"
        size="sm"
      >
        {selectedTransfer && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Transfer <span className="font-semibold">{getPreferredValue(selectedTransfer.quantity, selectedTransfer.quantity_bags, defaultUnit).toFixed(0)} {unitLabel}</span>{' '}
              from <span className="font-semibold">{selectedTransfer.from_location_name}</span>{' '}
              to <span className="font-semibold">{selectedTransfer.to_location_name}</span>?
            </p>
            <p className="text-sm text-gray-500">{selectedTransfer.reason}</p>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedTransfer(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTransfer} className="flex-1">
                Create Transfer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LocationCard({ location, defaultUnit, unitLabel }: { location: any; defaultUnit: 'kg' | 'bag'; unitLabel: string }) {
  const getDaysColor = (days: number) => {
    if (days >= 999) return 'text-gray-400';
    if (days < 3) return 'text-red-600';
    if (days < 7) return 'text-amber-600';
    return 'text-green-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'low_stock':
        return <Badge variant="error">Low Stock</Badge>;
      case 'reorder':
        return <Badge variant="warning">Reorder</Badge>;
      default:
        return <Badge variant="success">OK</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            location.location_type === 'warehouse'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {location.location_type === 'warehouse' ? (
            <Warehouse className="w-5 h-5" />
          ) : (
            <Store className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{location.location_name}</h4>
            {getStatusBadge(location.status)}
          </div>
          <p className="text-sm text-gray-500">
            Avg usage: {getPreferredValue(location.avg_daily_usage, location.avg_daily_usage_bags, defaultUnit).toFixed(1)} {unitLabel}/day
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold text-gray-900">
          {getPreferredValue(location.on_hand_qty, location.on_hand_bags, defaultUnit).toFixed(0)} {unitLabel}
        </p>
        <p className={`text-sm ${getDaysColor(location.days_of_cover)}`}>
          {location.days_of_cover >= 999
            ? 'N/A'
            : `${location.days_of_cover.toFixed(0)} days cover`}
        </p>
      </div>
    </div>
  );
}
