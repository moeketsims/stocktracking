import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useCreateAdjustment, useItems, useAdjustmentReasons, useLocations, useBatches } from '../../hooks/useData';
import { useAuthStore } from '../../stores/authStore';
import type { AdjustmentStockForm, AdjustmentReason } from '../../types';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItemId?: string;
  preselectedBatchId?: string;
}

export default function AdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedItemId,
  preselectedBatchId,
}: AdjustmentModalProps) {
  const user = useAuthStore((state) => state.user);
  const needsLocationSelect = !user?.location_id;

  const [form, setForm] = useState<AdjustmentStockForm>({
    item_id: '',
    quantity: 0,
    unit: 'bag',
    reason: 'count_error',
    notes: '',
    batch_id: undefined,
    location_id: undefined,
  });
  const [isNegative, setIsNegative] = useState(false);
  const [error, setError] = useState('');

  const adjustmentMutation = useCreateAdjustment();
  const { data: items } = useItems();
  const { data: reasons } = useAdjustmentReasons();
  const { data: locations } = useLocations();
  const { data: batchesData } = useBatches('all', form.item_id);

  useEffect(() => {
    if (isOpen) {
      setForm({
        item_id: preselectedItemId || items?.[0]?.id || '',
        quantity: 0,
        unit: 'bag',
        reason: 'count_error',
        notes: '',
        batch_id: preselectedBatchId || undefined,
        location_id: locations?.[0]?.id || undefined,
      });
      setIsNegative(false);
      setError('');
    }
  }, [isOpen, items, preselectedItemId, preselectedBatchId, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.item_id || form.quantity <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    if (needsLocationSelect && !form.location_id) {
      setError('Please select a location');
      return;
    }

    try {
      // Apply sign based on adjustment direction
      const adjustedQuantity = isNegative ? -form.quantity : form.quantity;
      await adjustmentMutation.mutateAsync({
        ...form,
        quantity: adjustedQuantity,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create adjustment');
    }
  };

  const itemOptions = (items || []).map((item: any) => ({
    value: item.id,
    label: item.name,
  }));

  const reasonOptions = (reasons || []).map((reason: any) => ({
    value: reason.value,
    label: reason.label,
  }));

  const locationOptions = (locations || []).map((loc: any) => ({
    value: loc.id,
    label: loc.name,
  }));

  const batchOptions = [
    { value: '', label: 'No specific batch' },
    ...(batchesData?.batches || []).map((batch: any) => ({
      value: batch.id,
      label: `${batch.batch_id_display} - ${batch.remaining_qty.toFixed(1)} kg remaining`,
    })),
  ];

  const selectedItem = items?.find((item: any) => item.id === form.item_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inventory Adjustment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            Adjustments are used to correct inventory counts. Positive adjustments add stock
            (e.g., found stock), negative adjustments reduce stock (e.g., theft, count error).
          </p>
        </div>

        {/* Location selector for admins/zone managers without assigned location */}
        {needsLocationSelect && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Select Location</span>
            </div>
            <Select
              options={locationOptions}
              value={form.location_id || ''}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              placeholder="Select a location"
            />
          </div>
        )}

        <Select
          label="Item *"
          options={itemOptions}
          value={form.item_id}
          onChange={(e) => setForm({ ...form, item_id: e.target.value, batch_id: undefined })}
          placeholder="Select an item"
        />

        {/* Adjustment Direction Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjustment Type *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsNegative(false)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                !isNegative
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              + Add Stock
            </button>
            <button
              type="button"
              onClick={() => setIsNegative(true)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                isNegative
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              - Remove Stock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Quantity *"
            value={form.quantity || ''}
            onChange={(e) => setForm({ ...form, quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
            min={0}
            step={0.1}
          />
          <Select
            label="Unit"
            options={[
              { value: 'bag', label: 'Bags (count)' },
              { value: 'kg', label: 'Kilograms (kg)' },
            ]}
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as 'kg' | 'bag' })}
          />
        </div>

        {form.unit === 'bag' && selectedItem && form.quantity > 0 && (
          <p className="text-sm text-gray-500">
            1 bag = {selectedItem.conversion_factor} kg
            <span className="font-medium">
              {' '}
              ({isNegative ? '-' : '+'}
              {(form.quantity * selectedItem.conversion_factor).toFixed(1)} kg)
            </span>
          </p>
        )}

        <Select
          label="Specific Batch (Optional)"
          options={batchOptions}
          value={form.batch_id || ''}
          onChange={(e) => setForm({ ...form, batch_id: e.target.value || undefined })}
        />

        <Select
          label="Reason *"
          options={reasonOptions}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value as AdjustmentReason })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes {form.reason === 'other' && '*'}
          </label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Explain the reason for this adjustment..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={adjustmentMutation.isPending}
            variant={isNegative ? 'danger' : 'primary'}
          >
            {isNegative ? 'Remove Stock' : 'Add Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
