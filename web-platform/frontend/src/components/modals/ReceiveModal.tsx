import { useState, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useReceiveStock, useItems, useSuppliers, useQualityScores } from '../../hooks/useData';
import type { ReceiveStockForm, QualityScore } from '../../types';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItemId?: string;
}

export default function ReceiveModal({ isOpen, onClose, onSuccess, preselectedItemId }: ReceiveModalProps) {
  const [form, setForm] = useState<ReceiveStockForm>({
    item_id: '',
    quantity: 0,
    unit: 'kg',
    supplier_id: '',
    quality_score: 1,
    defect_pct: undefined,
    quality_notes: '',
    expiry_date: '',
    photo_url: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receiveMutation = useReceiveStock();
  const { data: items } = useItems();
  const { data: suppliers } = useSuppliers();
  const { data: qualityScores } = useQualityScores();

  useEffect(() => {
    if (isOpen) {
      setForm({
        item_id: preselectedItemId || items?.[0]?.id || '',
        quantity: 0,
        unit: 'kg',
        supplier_id: '',
        quality_score: 1,
        defect_pct: undefined,
        quality_notes: '',
        expiry_date: '',
        photo_url: '',
        notes: '',
      });
      setError('');
      setPhotoPreview(null);
    }
  }, [isOpen, items, preselectedItemId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setForm({ ...form, photo_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setForm({ ...form, photo_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.item_id || !form.supplier_id || form.quantity <= 0) {
      setError('Please fill in all required fields');
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

  const itemOptions = (items || []).map((item: any) => ({
    value: item.id,
    label: item.name,
  }));

  const supplierOptions = (suppliers || []).map((supplier: any) => ({
    value: supplier.id,
    label: supplier.name,
  }));

  const qualityOptions = (qualityScores || []).map((score: any) => ({
    value: String(score.value),
    label: `${score.value} - ${score.label}`,
  }));

  const selectedItem = items?.find((item: any) => item.id === form.item_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Stock" size="md">
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

        <Select
          label="Supplier *"
          options={supplierOptions}
          value={form.supplier_id}
          onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
          placeholder="Select a supplier"
        />

        <Select
          label="Quality Score"
          options={qualityOptions}
          value={String(form.quality_score)}
          onChange={(e) =>
            setForm({ ...form, quality_score: parseInt(e.target.value) as QualityScore })
          }
        />

        {form.quality_score > 1 && (
          <>
            <Input
              type="number"
              label="Defect Percentage"
              value={form.defect_pct || ''}
              onChange={(e) =>
                setForm({ ...form, defect_pct: parseFloat(e.target.value) || undefined })
              }
              min={0}
              max={100}
              step={0.1}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Notes
              </label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={2}
                value={form.quality_notes || ''}
                onChange={(e) => setForm({ ...form, quality_notes: e.target.value })}
                placeholder="Describe quality issues..."
              />
            </div>
          </>
        )}

        <Input
          type="date"
          label="Expiry Date"
          value={form.expiry_date || ''}
          onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
        />

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock Photo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Stock photo preview"
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>Add Photo</span>
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">Max 5MB, JPEG or PNG</p>
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
          <Button type="submit" className="flex-1" isLoading={receiveMutation.isPending}>
            Receive Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
