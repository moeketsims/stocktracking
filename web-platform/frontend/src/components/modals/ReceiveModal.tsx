import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../ui';
import { useReceiveStock, useSuppliers } from '../../hooks/useData';
import { CheckCircle, ScanLine } from 'lucide-react';
import ScanReceiveModal from './ScanReceiveModal';

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
  const [createdBatchId, setCreatedBatchId] = useState<string | null>(null);
  const [showScanReceive, setShowScanReceive] = useState(false);

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
      setCreatedBatchId(null);
      setShowScanReceive(false);
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
      const result = await receiveMutation.mutateAsync(form);
      // Capture batch_id from response for optional bag scanning
      const batchId = result?.batch_id || result?.data?.batch_id;
      if (batchId) {
        setCreatedBatchId(batchId);
      } else {
        // No batch ID available — just close
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to receive stock');
    }
  };

  const handleSkipScan = () => {
    onSuccess();
    onClose();
  };

  const handleOpenScan = () => {
    setShowScanReceive(true);
  };

  const handleScanDone = () => {
    setShowScanReceive(false);
    onSuccess();
    onClose();
  };

  const supplierOptions = (suppliers || []).map((supplier: any) => ({
    value: supplier.id,
    label: supplier.name,
  }));

  // Conversion factor for potatoes (10kg per bag)
  const CONVERSION_FACTOR = 10;

  // Post-receive: offer to scan bags
  if (createdBatchId && !showScanReceive) {
    return (
      <Modal isOpen={isOpen} onClose={handleSkipScan} title="Stock Received" size="md">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800">Stock received successfully</h3>
            <p className="text-green-600 mt-1">
              {form.quantity} {form.unit === 'bag' ? 'bags' : 'kg'} added to inventory
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ScanLine className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Scan individual bags?</p>
                <p className="text-xs text-blue-600 mt-1">
                  Scan each bag's barcode to track it individually through the system (recommended).
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkipScan} className="flex-1">
              Skip
            </Button>
            <Button onClick={handleOpenScan} className="flex-1 gap-2">
              <ScanLine className="w-4 h-4" />
              Scan Bags
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Scan receive modal (opened from post-receive)
  if (showScanReceive && createdBatchId) {
    return (
      <ScanReceiveModal
        isOpen={isOpen}
        onClose={handleScanDone}
        onSuccess={handleScanDone}
        batchId={createdBatchId}
        batchInfo={{
          itemName: 'Potatoes',
          locationName: undefined,
        }}
      />
    );
  }

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
