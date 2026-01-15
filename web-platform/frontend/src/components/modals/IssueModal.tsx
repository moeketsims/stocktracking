import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Badge } from '../ui';
import { useIssueStock, useItems, useBatches, useOldestBatch } from '../../hooks/useData';
import type { IssueStockForm } from '../../types';
import { Boxes } from 'lucide-react';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItemId?: string;
}

export default function IssueModal({ isOpen, onClose, onSuccess, preselectedItemId }: IssueModalProps) {
  const [form, setForm] = useState<IssueStockForm>({
    item_id: '',
    quantity: 0,
    unit: 'kg',
    batch_id: undefined,
    notes: '',
  });
  const [error, setError] = useState('');
  const [showBatches, setShowBatches] = useState(false);

  const issueMutation = useIssueStock();
  const { data: items } = useItems();
  const { data: batchesData } = useBatches('all', form.item_id);
  const { data: fifoData } = useOldestBatch(form.item_id);

  useEffect(() => {
    if (isOpen) {
      setForm({
        item_id: preselectedItemId || items?.[0]?.id || '',
        quantity: 0,
        unit: 'kg',
        batch_id: undefined,
        notes: '',
      });
      setError('');
      setShowBatches(false);
    }
  }, [isOpen, items, preselectedItemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.item_id || form.quantity <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await issueMutation.mutateAsync(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to issue stock');
    }
  };

  const itemOptions = (items || []).map((item: any) => ({
    value: item.id,
    label: item.name,
  }));

  const selectedItem = items?.find((item: any) => item.id === form.item_id);
  const batches = batchesData?.batches || [];
  const fifoSuggestion = fifoData?.suggestion;

  const useFifoSuggestion = () => {
    if (fifoSuggestion) {
      setForm({ ...form, batch_id: fifoSuggestion.batch_id });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Stock" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Select
          label="Item *"
          options={itemOptions}
          value={form.item_id}
          onChange={(e) => setForm({ ...form, item_id: e.target.value, batch_id: undefined })}
          placeholder="Select an item"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Quantity *"
            value={form.quantity || ''}
            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
            min={0}
            step={0.1}
          />
          <Select
            label="Unit"
            options={[
              { value: 'kg', label: 'Kilograms (kg)' },
              { value: 'bag', label: 'Bags' },
            ]}
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as 'kg' | 'bag' })}
          />
        </div>

        {form.unit === 'bag' && selectedItem && (
          <p className="text-sm text-gray-500">
            1 bag = {selectedItem.conversion_factor} kg
            {form.quantity > 0 && (
              <span className="font-medium">
                {' '}
                ({(form.quantity * selectedItem.conversion_factor).toFixed(1)} kg total)
              </span>
            )}
          </p>
        )}

        {/* FIFO Suggestion */}
        {fifoSuggestion && !form.batch_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Boxes className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">FIFO Recommendation</p>
                <p className="text-sm text-blue-600">
                  Use batch{' '}
                  <span className="font-mono font-semibold">
                    {fifoSuggestion.batch_id_display}
                  </span>{' '}
                  ({fifoSuggestion.remaining_qty.toFixed(1)} kg remaining)
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={useFifoSuggestion}>
                Use
              </Button>
            </div>
          </div>
        )}

        {/* Batch Selection */}
        <div>
          <button
            type="button"
            onClick={() => setShowBatches(!showBatches)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {showBatches ? 'Hide batch selection' : 'Select specific batch (optional)'}
          </button>

          {showBatches && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {batches.map((batch: any) => (
                <label
                  key={batch.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    form.batch_id === batch.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="batch"
                      checked={form.batch_id === batch.id}
                      onChange={() => setForm({ ...form, batch_id: batch.id })}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{batch.batch_id_display}</span>
                        {batch.is_oldest && (
                          <Badge variant="info" size="sm">
                            FIFO
                          </Badge>
                        )}
                        <Badge
                          variant={
                            batch.quality_score === 1
                              ? 'success'
                              : batch.quality_score === 2
                              ? 'warning'
                              : 'error'
                          }
                          size="sm"
                        >
                          Q{batch.quality_score}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Received {new Date(batch.received_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">{batch.remaining_qty.toFixed(1)} kg</span>
                </label>
              ))}
              {batches.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active batches</p>
              )}
              {form.batch_id && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, batch_id: undefined })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear batch selection
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Skip for quick daily totals mode (uses FIFO automatically)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          <Button type="submit" className="flex-1" isLoading={issueMutation.isPending}>
            Issue Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
