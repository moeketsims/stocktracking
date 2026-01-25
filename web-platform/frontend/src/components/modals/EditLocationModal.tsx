import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import ConfirmationModal from './ConfirmationModal';
import { useUpdateLocation } from '../../hooks/useData';

interface Location {
  id: string;
  name: string;
  type: 'shop' | 'warehouse';
  zone_id: string;
  zone_name?: string;
  address?: string;
}

interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location: Location | null;
}

interface EditLocationForm {
  name: string;
  address: string;
}

export default function EditLocationModal({
  isOpen,
  onClose,
  onSuccess,
  location,
}: EditLocationModalProps) {
  const [form, setForm] = useState<EditLocationForm>({
    name: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const updateMutation = useUpdateLocation();

  useEffect(() => {
    if (isOpen && location) {
      setForm({
        name: location.name,
        address: location.address || '',
      });
      setError('');
      setShowConfirmation(false);
    }
  }, [isOpen, location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!location) return;

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    if (!location) return;

    try {
      await updateMutation.mutateAsync({
        id: location.id,
        data: {
          name: form.name.trim(),
          address: form.address.trim() || undefined,
        },
      });
      setShowConfirmation(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setShowConfirmation(false);
      setError(err.response?.data?.detail || 'Failed to update location');
    }
  };

  if (!location) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Location">
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

          <Input
            type="text"
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="e.g., 123 Main Street"
          />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            <p><strong>Type:</strong> {location.type === 'shop' ? 'Shop' : 'Warehouse'}</p>
            <p><strong>Zone:</strong> {location.zone_name || 'Unknown'}</p>
            <p className="text-xs text-gray-400 mt-1">Type and zone cannot be changed after creation.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmUpdate}
        title="Confirm Update"
        message={`Are you sure you want to update "${location.name}"?`}
        confirmText="Update"
        cancelText="Cancel"
        type="warning"
        isLoading={updateMutation.isPending}
      />
    </>
  );
}
