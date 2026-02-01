import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../ui';
import { useWasteStock, useWasteReasons } from '../../hooks/useData';
import type { WasteStockForm, WasteReason } from '../../types';

interface WasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WasteModal({ isOpen, onClose, onSuccess }: WasteModalProps) {
  const [form, setForm] = useState<WasteStockForm>({
    quantity: 0,
    unit: 'bag',  // Default to bags
    reason: 'spoiled',
    notes: '',
  });
  const [error, setError] = useState('');

  const wasteMutation = useWasteStock();
  const { data: wasteReasons } = useWasteReasons();

  useEffect(() => {
    if (isOpen) {
      setForm({
        quantity: 0,
        unit: 'bag',  // Default to bags
        reason: 'spoiled',
        notes: '',
      });
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.quantity <= 0 || !form.reason) {
      setError('Please fill in quantity and reason');
      return;
    }

    try {
      await wasteMutation.mutateAsync(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record waste');
    }
  };

  const reasonOptions = (wasteReasons || []).map((reason: any) => ({
    value: reason.value,
    label: reason.label,
  }));

  // Conversion factor for potatoes (10kg per bag)
  const CONVERSION_FACTOR = 10;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Waste" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
              { value: 'bag', label: 'Bags (10 kg each)' },
              { value: 'kg', label: 'Kilograms' },
            ]}
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as 'kg' | 'bag' })}
          />
        </div>

        {form.unit === 'bag' && (
          <p className="text-sm text-gray-500">
            1 bag = {CONVERSION_FACTOR} kg
            {form.quantity > 0 && (
              <span className="font-medium">
                {' '}
                ({(form.quantity * CONVERSION_FACTOR).toFixed(1)} kg total)
              </span>
            )}
          </p>
        )}

        <Select
          label="Reason *"
          options={reasonOptions}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value as WasteReason })}
          placeholder="Select a reason"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional details about the waste..."
          />
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            This will permanently record{' '}
            <span className="font-semibold">
              {form.quantity} {form.unit}
            </span>{' '}
            as wasted stock. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            className="flex-1"
            isLoading={wasteMutation.isPending}
          >
            Record Waste
          </Button>
        </div>
      </form>
    </Modal>
  );
}
