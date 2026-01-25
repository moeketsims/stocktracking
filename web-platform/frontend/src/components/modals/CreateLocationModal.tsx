import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useCreateLocation, useZones } from '../../hooks/useData';

interface CreateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateLocationForm {
  name: string;
  zone_id: string;
  type: 'shop' | 'warehouse';
  address: string;
}

export default function CreateLocationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateLocationModalProps) {
  const [form, setForm] = useState<CreateLocationForm>({
    name: '',
    zone_id: '',
    type: 'shop',
    address: '',
  });
  const [error, setError] = useState('');

  const createMutation = useCreateLocation();
  const { data: zones } = useZones();

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '',
        zone_id: zones?.[0]?.id || '',
        type: 'shop',
        address: '',
      });
      setError('');
    }
  }, [isOpen, zones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!form.zone_id) {
      setError('Zone is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        zone_id: form.zone_id,
        type: form.type,
        address: form.address.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create location');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Location">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Input
          type="text"
          label="Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Shop 6 - Eastgate"
        />

        <Select
          label="Type *"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as 'shop' | 'warehouse' })}
          options={[
            { value: 'shop', label: 'Shop' },
            { value: 'warehouse', label: 'Warehouse' },
          ]}
        />

        <Select
          label="Zone *"
          value={form.zone_id}
          onChange={(e) => setForm({ ...form, zone_id: e.target.value })}
          options={[
            { value: '', label: 'Select a zone' },
            ...(zones?.map((z: any) => ({ value: z.id, label: z.name })) || []),
          ]}
        />

        <Input
          type="text"
          label="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="e.g., 123 Main Street"
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={createMutation.isPending}
          >
            Create Location
          </Button>
        </div>
      </form>
    </Modal>
  );
}
