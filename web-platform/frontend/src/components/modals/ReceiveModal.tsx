import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../ui';
import { useReceiveStock, useSuppliers } from '../../hooks/useData';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReceiveFormData {
  quantity: number;
  unit: 'kg' | 'bag';
  supplier_id: string;
  notes?: string;
}

export default function ReceiveModal({ isOpen, onClose, onSuccess }: ReceiveModalProps) {
  const [form, setForm] = useState<ReceiveFormData>({
    quantity: 0,
    unit: 'bag',
    supplier_id: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const receiveMutation = useReceiveStock();
  const { data: suppliers } = useSuppliers();

  useEffect(() => {
    if (isOpen) {
      setForm({
        quantity: 0,
        unit: 'bag',
        supplier_id: '',
        notes: '',
      });
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.supplier_id || form.quantity <= 0) {
      setError('Please fill in quantity and supplier');
      return;
    }

    try {
      await receiveMutation.mutateAsync(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to receive stock');
    }
  };

  const supplierOptions = (suppliers || []).map((supplier: any) => ({
    value: supplier.id,
    label: supplier.name,
  }));

  // Conversion factor for potatoes (10kg per bag)
  const CONVERSION_FACTOR = 10;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Stock" size="md">
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
            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
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
          label="Supplier *"
          options={supplierOptions}
          value={form.supplier_id}
          onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
          placeholder="Select a supplier"
        />

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
          <Button type="submit" className="flex-1" isLoading={receiveMutation.isPending}>
            Receive Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
