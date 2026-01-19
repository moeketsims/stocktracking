import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useCreateInvitation, useZones, useLocations } from '../../hooks/useData';
import { useAuthStore } from '../../stores/authStore';
import type { InviteUserForm, UserRole } from '../../types';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'driver', label: 'Driver' },
  { value: 'location_manager', label: 'Location Manager' },
  { value: 'zone_manager', label: 'Zone Manager' },
  { value: 'admin', label: 'Admin' },
];

export default function InviteUserModal({
  isOpen,
  onClose,
  onSuccess,
}: InviteUserModalProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isZoneManager = user?.role === 'zone_manager';

  const [form, setForm] = useState<InviteUserForm>({
    email: '',
    role: 'staff',
    zone_id: '',
    location_id: '',
    full_name: '',
  });
  const [error, setError] = useState('');

  const createMutation = useCreateInvitation();
  const { data: zones } = useZones();
  const { data: locations } = useLocations();

  // Filter roles based on current user's role
  const availableRoles = ROLE_OPTIONS.filter((role) => {
    if (isAdmin) return true;
    if (isZoneManager) return ['staff', 'driver', 'location_manager'].includes(role.value);
    return false;
  });

  // Filter locations based on selected zone
  const filteredLocations = locations?.filter(
    (loc: any) => !form.zone_id || loc.zone_id === form.zone_id
  );

  useEffect(() => {
    if (isOpen) {
      setForm({
        email: '',
        role: 'staff',
        zone_id: isZoneManager ? user?.zone_id || '' : '',
        location_id: '',
        full_name: '',
      });
      setError('');
    }
  }, [isOpen, isZoneManager, user?.zone_id]);

  // Reset location when zone changes
  useEffect(() => {
    if (form.zone_id) {
      const locationInZone = filteredLocations?.find(
        (loc: any) => loc.id === form.location_id
      );
      if (!locationInZone) {
        setForm((prev) => ({ ...prev, location_id: '' }));
      }
    }
  }, [form.zone_id, filteredLocations, form.location_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!form.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await createMutation.mutateAsync({
        email: form.email,
        role: form.role,
        zone_id: form.zone_id || undefined,
        location_id: form.location_id || undefined,
        full_name: form.full_name || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create invitation');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Input
          type="email"
          label="Email Address *"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="user@example.com"
        />

        <Input
          type="text"
          label="Full Name"
          value={form.full_name || ''}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="John Doe"
        />

        <Select
          label="Role *"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          options={availableRoles}
        />

        {isAdmin && (
          <Select
            label="Zone"
            value={form.zone_id || ''}
            onChange={(e) => setForm({ ...form, zone_id: e.target.value })}
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
            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
            options={[
              { value: '', label: 'No specific location' },
              ...(filteredLocations?.map((l: any) => ({ value: l.id, label: l.name })) || []),
            ]}
          />
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          An invitation email will be sent to this address with a link to set up their account.
          The invitation will expire in 7 days.
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={createMutation.isPending}
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
