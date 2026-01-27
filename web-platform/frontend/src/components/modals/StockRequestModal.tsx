import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Package, AlertTriangle, Clock, MapPin, CheckCircle } from 'lucide-react';
import { Button } from '../ui';
import { stockRequestsApi } from '../../lib/api';
import { useLocations } from '../../hooks/useData';
import type { CreateStockRequestForm, StockRequestUrgency, Location } from '../../types';

interface StockRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locationId?: string;
  locationName?: string;
  currentStockKg?: number;
  targetStockKg?: number;
}

const KG_PER_BAG = 10;

// Target stock levels by location type (in kg)
const TARGET_STOCK = {
  warehouse: 1500000, // 1,500 tons
  shop: 150000,       // 150 tons
};

export default function StockRequestModal({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  locationName,
  currentStockKg = 0,
  targetStockKg = 150000,
}: StockRequestModalProps) {
  const queryClient = useQueryClient();
  const { data: locations } = useLocations();
  const [formData, setFormData] = useState<CreateStockRequestForm>({
    quantity_bags: 100,
    urgency: 'normal',
    notes: '',
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(locationId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get selected location details
  const selectedLocation = locations?.find((loc: Location) => loc.id === selectedLocationId);
  const effectiveLocationName = selectedLocation?.name || locationName;
  const effectiveTargetStock = selectedLocation
    ? TARGET_STOCK[selectedLocation.type as keyof typeof TARGET_STOCK] || TARGET_STOCK.shop
    : targetStockKg;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialLocationId = locationId;
      setSelectedLocationId(initialLocationId);
      const neededBags = Math.ceil((effectiveTargetStock - currentStockKg) / KG_PER_BAG);
      setFormData({
        location_id: initialLocationId,
        quantity_bags: Math.max(100, Math.min(neededBags, 1000)),
        urgency: 'normal',
        notes: '',
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, locationId, currentStockKg, effectiveTargetStock]);

  const mutation = useMutation({
    mutationFn: (data: CreateStockRequestForm) => stockRequestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      onSuccess();
      setSuccess(true);
      // Show success message for 2 seconds then close
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      let message: string;
      if (typeof detail === 'string' && detail.length > 0) {
        message = detail;
      } else if (typeof detail === 'number') {
        message = `Error code: ${detail}`;
      } else if (detail && typeof detail === 'object') {
        message = JSON.stringify(detail);
      } else {
        message = err.message || 'Failed to create request. Please try again.';
      }
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) {
      setError('Please select a location');
      return;
    }
    if (formData.quantity_bags <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    setError(null);
    mutation.mutate({
      ...formData,
      location_id: selectedLocationId,
    });
  };

  // Handle location change
  const handleLocationChange = (newLocationId: string) => {
    setSelectedLocationId(newLocationId);
    setFormData(prev => ({ ...prev, location_id: newLocationId }));
  };

  if (!isOpen) return null;

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
              Request Submitted!
            </h2>
            <p className="text-gray-600 text-sm">
              Your stock request for {formData.quantity_bags.toLocaleString()} bags has been sent to drivers.
            </p>
          </div>
        </div>
      </>
    );
  }

  const currentBags = currentStockKg / KG_PER_BAG;
  const targetBags = effectiveTargetStock / KG_PER_BAG;
  const capacityPct = effectiveTargetStock > 0 ? Math.round((currentStockKg / effectiveTargetStock) * 100) : 0;
  const neededBags = Math.ceil((effectiveTargetStock - currentStockKg) / KG_PER_BAG);

  // Filter to only show shops (typically requests come from shops)
  const locationOptions = (locations || []).filter((loc: Location) => loc.type === 'shop');
  const needsLocationSelection = !locationId;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Request Stock</h2>
                <p className="text-sm text-gray-500">
                  {effectiveLocationName || (needsLocationSelection ? 'Select a location' : 'Your location')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Location Selector (if no location pre-selected) */}
          {needsLocationSelection && (
            <div className="p-5 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Select Location *
                </div>
              </label>
              <select
                value={selectedLocationId || ''}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="">Choose a location...</option>
                {locationOptions.map((loc: Location) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Current Stock Info */}
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Current Stock</span>
              <span className="font-semibold text-gray-900">
                {currentBags.toLocaleString()} bags ({capacityPct}% of target)
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${capacityPct >= 85 ? 'bg-emerald-500' :
                  capacityPct >= 65 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                style={{ width: `${Math.min(100, capacityPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Target: {targetBags.toLocaleString()} bags</span>
              <span>Need: ~{neededBags.toLocaleString()} bags</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Needed
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.quantity_bags}
                  onChange={(e) => setFormData({ ...formData, quantity_bags: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-semibold"
                  placeholder="500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  bags
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                = {((formData.quantity_bags || 0) * KG_PER_BAG).toLocaleString()} kg
              </p>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'urgent' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${formData.urgency === 'urgent'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${formData.urgency === 'urgent' ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${formData.urgency === 'urgent' ? 'text-red-700' : 'text-gray-700'}`}>
                      Urgent
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Needed today</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'normal' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${formData.urgency === 'normal'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`w-4 h-4 ${formData.urgency === 'normal' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${formData.urgency === 'normal' ? 'text-emerald-700' : 'text-gray-700'}`}>
                      Normal
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Within 3 days</p>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Any additional details..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || formData.quantity_bags <= 0 || !selectedLocationId}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {mutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
