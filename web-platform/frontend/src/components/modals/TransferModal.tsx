import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useTransferStock, useItems, useLocations } from '../../hooks/useData';
import type { TransferStockForm } from '../../types';
import { useAuthStore } from '../../stores/authStore';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItemId?: string;
}

export default function TransferModal({ isOpen, onClose, onSuccess, preselectedItemId }: TransferModalProps) {
  const { user } = useAuthStore();
  const [form, setForm] = useState<TransferStockForm>({
    item_id: '',
    quantity: 0,
    unit: 'kg',
    from_location_id: '',
    to_location_id: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const transferMutation = useTransferStock();
  const { data: items } = useItems();
  const { data: locations } = useLocations();

  useEffect(() => {
    if (isOpen) {
      setForm({
        item_id: preselectedItemId || items?.[0]?.id || '',
        quantity: 0,
        unit: 'kg',
        from_location_id: user?.location_id || '',
        to_location_id: '',
        notes: '',
      });
      setError('');
    }
  }, [isOpen, items, user, preselectedItemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.item_id || form.quantity <= 0 || !form.from_location_id || !form.to_location_id) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.from_location_id === form.to_location_id) {
      setError('Source and destination must be different');
      return;
    }

    try {
      await transferMutation.mutateAsync(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to transfer stock');
    }
  };

  const itemOptions = (items || []).map((item: any) => ({
    value: item.id,
    label: item.name,
  }));

  const locationOptions = (locations || []).map((loc: any) => ({
    value: loc.id,
    label: `${loc.name} (${loc.type})`,
  }));

  const toLocationOptions = locationOptions.filter(
    (loc: { value: string; label: string }) => loc.value !== form.from_location_id
  );

  const selectedItem = items?.find((item: any) => item.id === form.item_id);
  const fromLocation = locations?.find((loc: any) => loc.id === form.from_location_id);
  const toLocation = locations?.find((loc: any) => loc.id === form.to_location_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Stock" size="md">
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
          onChange={(e) => setForm({ ...form, item_id: e.target.value })}
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

        {/* Location Selection */}
        <div className="space-y-3">
          <Select
            label="From Location *"
            options={locationOptions}
            value={form.from_location_id}
            onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
            placeholder="Select source location"
          />

          <div className="flex justify-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <Select
            label="To Location *"
            options={toLocationOptions}
            value={form.to_location_id}
            onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}
            placeholder="Select destination location"
          />
        </div>

        {/* Transfer Summary */}
        {fromLocation && toLocation && form.quantity > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Transfer{' '}
              <span className="font-semibold">
                {form.quantity} {form.unit}
              </span>{' '}
              from <span className="font-semibold">{fromLocation.name}</span> to{' '}
              <span className="font-semibold">{toLocation.name}</span>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Transfer reason)
          </label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Reason for transfer..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={transferMutation.isPending}>
            Transfer Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
