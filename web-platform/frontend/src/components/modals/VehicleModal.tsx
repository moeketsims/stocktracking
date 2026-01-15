import { useState, useEffect } from 'react';
import { Truck, AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useCreateVehicle, useUpdateVehicle } from '../../hooks/useData';
import type { Vehicle, CreateVehicleForm } from '../../types';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle?: Vehicle | null; // For editing
}

export default function VehicleModal({
  isOpen,
  onClose,
  onSuccess,
  vehicle,
}: VehicleModalProps) {
  const [form, setForm] = useState<CreateVehicleForm>({
    registration_number: '',
    make: '',
    model: '',
    fuel_type: 'diesel',
    notes: '',
  });
  const [error, setError] = useState('');

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const isEditing = !!vehicle;

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        setForm({
          registration_number: vehicle.registration_number,
          make: vehicle.make || '',
          model: vehicle.model || '',
          fuel_type: vehicle.fuel_type,
          notes: vehicle.notes || '',
        });
      } else {
        setForm({
          registration_number: '',
          make: '',
          model: '',
          fuel_type: 'diesel',
          notes: '',
        });
      }
      setError('');
    }
  }, [isOpen, vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.registration_number.trim()) {
      setError('Registration number is required');
      return;
    }

    try {
      if (isEditing && vehicle) {
        await updateMutation.mutateAsync({ vehicleId: vehicle.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'create'} vehicle`);
    }
  };

  const fuelTypeOptions = [
    { value: 'diesel', label: 'Diesel' },
    { value: 'petrol', label: 'Petrol' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Vehicle Details</span>
          </div>
          <p className="text-sm text-blue-700">
            Register company vehicles to track trips and delivery costs.
          </p>
        </div>

        <Input
          type="text"
          label="Registration Number *"
          value={form.registration_number}
          onChange={(e) => setForm({ ...form, registration_number: e.target.value.toUpperCase() })}
          placeholder="e.g., ABC-123-GP"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            label="Make"
            value={form.make || ''}
            onChange={(e) => setForm({ ...form, make: e.target.value })}
            placeholder="e.g., Toyota"
          />
          <Input
            type="text"
            label="Model"
            value={form.model || ''}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="e.g., Hilux"
          />
        </div>

        <Select
          label="Fuel Type"
          options={fuelTypeOptions}
          value={form.fuel_type}
          onChange={(e) => setForm({ ...form, fuel_type: e.target.value as 'diesel' | 'petrol' })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes about this vehicle..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Save Changes' : 'Add Vehicle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
