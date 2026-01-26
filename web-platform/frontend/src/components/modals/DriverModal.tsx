import { useState, useEffect } from 'react';
import { AlertCircle, Mail } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { useCreateDriver, useUpdateDriver } from '../../hooks/useData';
import type { Driver, CreateDriverForm } from '../../types';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driver?: Driver | null;
}

export default function DriverModal({
  isOpen,
  onClose,
  onSuccess,
  driver,
}: DriverModalProps) {
  const [form, setForm] = useState<CreateDriverForm>({
    email: '',
    full_name: '',
    phone: '',
    license_number: '',
    license_expiry: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const isEditing = !!driver;

  useEffect(() => {
    if (isOpen) {
      if (driver) {
        setForm({
          email: driver.email || '',
          full_name: driver.full_name,
          phone: driver.phone || '',
          license_number: driver.license_number || '',
          license_expiry: driver.license_expiry || '',
          notes: driver.notes || '',
        });
      } else {
        setForm({
          email: '',
          full_name: '',
          phone: '',
          license_number: '',
          license_expiry: '',
          notes: '',
        });
      }
      setError('');
    }
  }, [isOpen, driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) {
      setError('Driver name is required');
      return;
    }

    if (!isEditing && !form.email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!isEditing && !form.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      if (isEditing && driver) {
        // Don't send email when updating - it can't be changed
        const { email, ...updateData } = form;
        await updateMutation.mutateAsync({ id: driver.id, data: updateData });
      } else {
        await createMutation.mutateAsync(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'add'} driver`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Driver' : 'Add Driver'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!isEditing && (
          <>
            <Input
              type="email"
              label="Email Address *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="driver@example.com"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>An invitation email will be sent to this address. The driver will use it to create their account and access the system.</span>
            </div>
          </>
        )}

        {isEditing && driver?.email && (
          <div className="text-sm text-gray-500">
            <span className="font-medium">Email:</span> {driver.email}
          </div>
        )}

        <Input
          type="text"
          label="Full Name *"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="e.g., John Mokoena"
        />

        <Input
          type="tel"
          label="Phone Number"
          value={form.phone || ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="e.g., 082 123 4567"
        />

        <Input
          type="text"
          label="License Number"
          value={form.license_number || ''}
          onChange={(e) => setForm({ ...form, license_number: e.target.value })}
          placeholder="e.g., DL123456"
        />

        <Input
          type="date"
          label="License Expiry"
          value={form.license_expiry || ''}
          onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
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
          <Button
            type="submit"
            className="flex-1"
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Update Driver' : 'Add Driver'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
