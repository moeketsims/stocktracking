import { useState, useEffect } from 'react';
import { MapPin, RotateCcw, Package } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useCreateReturn, useItems, useLocations, useBatches, useQualityScores } from '../../hooks/useData';
import { useAuthStore } from '../../stores/authStore';
import type { ReturnStockForm, QualityScore } from '../../types';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItemId?: string;
  preselectedBatchId?: string;
}

export default function ReturnModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedItemId,
  preselectedBatchId,
}: ReturnModalProps) {
  const user = useAuthStore((state) => state.user);
  const needsLocationSelect = !user?.location_id;

  const [form, setForm] = useState<ReturnStockForm>({
    item_id: '',
    quantity: 0,
    unit: 'bag',
    original_batch_id: undefined,
    return_to_original: true,
    return_reason: '',
    quality_score: undefined,
    notes: '',
    location_id: undefined,
  });
  const [error, setError] = useState('');

  const returnMutation = useCreateReturn();
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const { data: batchesData } = useBatches('all', form.item_id);
  const { data: qualityScores } = useQualityScores();

  useEffect(() => {
    if (isOpen) {
      setForm({
        item_id: preselectedItemId || items?.[0]?.id || '',
        quantity: 0,
        unit: 'bag',
        original_batch_id: preselectedBatchId || undefined,
        return_to_original: true,
        return_reason: '',
        quality_score: undefined,
        notes: '',
        location_id: locations?.[0]?.id || undefined,
      });
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

    if (!form.return_reason.trim()) {
      setError('Please provide a return reason');
      return;
    }

    if (!form.return_to_original && !form.quality_score) {
      setError('Quality score is required when creating a new batch');
      return;
    }

    if (form.return_to_original && !form.original_batch_id) {
      setError('Please select the original batch to return to');
      return;
    }

    if (needsLocationSelect && !form.location_id) {
      setError('Please select a location');
      return;
    }

    try {
      await returnMutation.mutateAsync(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process return');
    }
  };

  const itemOptions = (items || []).map((item: any) => ({
    value: item.id,
    label: item.name,
  }));

  const locationOptions = (locations || []).map((loc: any) => ({
    value: loc.id,
    label: loc.name,
  }));

  const batchOptions = (batchesData?.batches || []).map((batch: any) => ({
    value: batch.id,
    label: `${batch.batch_id_display} - ${batch.remaining_qty.toFixed(1)} kg remaining`,
  }));

  const qualityOptions = (qualityScores || []).map((score: any) => ({
    value: String(score.value),
    label: `${score.value} - ${score.label}`,
  }));

  const selectedItem = items?.find((item: any) => item.id === form.item_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Stock" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Stock Return</span>
          </div>
          <p className="text-sm text-blue-700">
            Return previously issued stock. You can return it to the original batch
            or create a new batch for inspection.
          </p>
        </div>

        {/* Location selector for admins/zone managers without assigned location */}
        {needsLocationSelect && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Select Location</span>
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
          onChange={(e) =>
            setForm({ ...form, item_id: e.target.value, original_batch_id: undefined })
          }
          placeholder="Select an item"
        />

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
              ({(form.quantity * selectedItem.conversion_factor).toFixed(1)} kg total)
            </span>
          </p>
        )}

        {/* Return Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Return Method *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, return_to_original: true, quality_score: undefined })}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                form.return_to_original
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              To Original Batch
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, return_to_original: false })}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                !form.return_to_original
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4" />
              New Batch (Quarantine)
            </button>
          </div>
        </div>

        <Select
          label={form.return_to_original ? 'Original Batch *' : 'Original Batch (for reference)'}
          options={[{ value: '', label: 'Select original batch' }, ...batchOptions]}
          value={form.original_batch_id || ''}
          onChange={(e) => setForm({ ...form, original_batch_id: e.target.value || undefined })}
        />

        {!form.return_to_original && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
            <p className="text-sm text-amber-800 font-medium">
              New batch will be created with "Quarantine" status for inspection.
            </p>
            <Select
              label="Quality Score *"
              options={qualityOptions}
              value={String(form.quality_score || '')}
              onChange={(e) =>
                setForm({ ...form, quality_score: parseInt(e.target.value) as QualityScore })
              }
              placeholder="Select quality score"
            />
          </div>
        )}

        <Input
          type="text"
          label="Return Reason *"
          value={form.return_reason}
          onChange={(e) => setForm({ ...form, return_reason: e.target.value })}
          placeholder="e.g., Customer rejected, over-ordered, quality issue"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={returnMutation.isPending}>
            Process Return
          </Button>
        </div>
      </form>
    </Modal>
  );
}
