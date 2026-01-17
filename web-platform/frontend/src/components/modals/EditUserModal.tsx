import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useUpdateUser, useZones, useLocations } from '../../hooks/useData';
import { useAuthStore } from '../../stores/authStore';
import type { ManagedUser, UpdateUserForm, UserRole } from '../../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: ManagedUser | null;
}

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'location_manager', label: 'Location Manager' },
  { value: 'zone_manager', label: 'Zone Manager' },
  { value: 'admin', label: 'Admin' },
];

export default function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  user: editingUser,
}: EditUserModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'admin';
  const isZoneManager = currentUser?.role === 'zone_manager';

  const [form, setForm] = useState<UpdateUserForm>({
    role: undefined,
    zone_id: undefined,
    location_id: undefined,
    full_name: undefined,
    phone: undefined,
  });
  const [error, setError] = useState('');

  const updateMutation = useUpdateUser();
  const { data: zones } = useZones();
  const { data: locations } = useLocations();

  // Filter roles based on current user's role
  const availableRoles = ROLE_OPTIONS.filter((role) => {
    if (isAdmin) return true;
    if (isZoneManager) return ['staff', 'location_manager'].includes(role.value);
    return false;
  });

  // Filter locations based on selected zone
  const filteredLocations = locations?.filter(
    (loc: any) => !form.zone_id || loc.zone_id === form.zone_id
  );

  useEffect(() => {
    if (isOpen && editingUser) {
      setForm({
        role: editingUser.role,
        zone_id: editingUser.zone_id || undefined,
        location_id: editingUser.location_id || undefined,
        full_name: editingUser.full_name || undefined,
        phone: editingUser.phone || undefined,
      });
      setError('');
    }
  }, [isOpen, editingUser]);

  // Reset location when zone changes
  useEffect(() => {
    if (form.zone_id) {
      const locationInZone = filteredLocations?.find(
        (loc: any) => loc.id === form.location_id
      );
      if (!locationInZone && form.location_id !== editingUser?.location_id) {
        setForm((prev) => ({ ...prev, location_id: undefined }));
      }
    }
  }, [form.zone_id, filteredLocations, form.location_id, editingUser?.location_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingUser) return;

    try {
      await updateMutation.mutateAsync({
        userId: editingUser.id,
        data: {
          role: form.role,
          zone_id: form.zone_id || '',
          location_id: form.location_id || '',
          full_name: form.full_name,
          phone: form.phone,
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    }
  };

  if (!editingUser) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium text-gray-900">{editingUser.email || 'No email'}</p>
        </div>

        <Input
          type="text"
          label="Full Name"
          value={form.full_name || ''}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="John Doe"
        />

        <Input
          type="tel"
          label="Phone"
          value={form.phone || ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+27 82 123 4567"
        />

        <Select
          label="Role"
          value={form.role || ''}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          options={availableRoles}
        />

        {isAdmin && (
          <Select
            label="Zone"
            value={form.zone_id || ''}
            onChange={(e) => setForm({ ...form, zone_id: e.target.value || undefined })}
            options={[
              { value: '', label: 'No zone (admin only)' },
              ...(zones?.map((z: any) => ({ value: z.id, label: z.name })) || []),
            ]}
          />
        )}

        {(form.zone_id || isZoneManager) && (
          <Select
            label="Location"
            value={form.location_id || ''}
            onChange={(e) => setForm({ ...form, location_id: e.target.value || undefined })}
            options={[
              { value: '', label: 'No specific location' },
              ...(filteredLocations?.map((l: any) => ({ value: l.id, label: l.name })) || []),
            ]}
          />
        )}

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
  );
}
