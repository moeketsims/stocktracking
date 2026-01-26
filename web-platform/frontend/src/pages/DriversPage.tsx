import { useState } from 'react';
import { User, Plus, Edit2, CheckCircle, XCircle, Phone, CreditCard, AlertTriangle, Mail, RefreshCw, Clock } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import DriverModal from '../components/modals/DriverModal';
import { useDrivers, useDeleteDriver, useUpdateDriver, useResendDriverInvitation } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import type { Driver } from '../types';

const INVITATION_STATUS_CONFIG = {
  active: { label: 'Account Active', variant: 'success' as const, icon: CheckCircle },
  pending: { label: 'Invite Pending', variant: 'warning' as const, icon: Clock },
  expired: { label: 'Invite Expired', variant: 'error' as const, icon: AlertTriangle },
  no_invitation: { label: 'No Invite', variant: 'default' as const, icon: Mail },
};

export default function DriversPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const user = useAuthStore((state) => state.user);
  const isManager = user?.role && ['admin', 'zone_manager', 'location_manager'].includes(user.role);

  const { data, isLoading, error, refetch } = useDrivers(!showInactive);
  const deleteMutation = useDeleteDriver();
  const updateMutation = useUpdateDriver();
  const resendInvitationMutation = useResendDriverInvitation();

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  const handleDeactivate = async (driver: Driver) => {
    if (window.confirm(`Are you sure you want to deactivate ${driver.full_name}?`)) {
      try {
        await deleteMutation.mutateAsync(driver.id);
      } catch (err) {
        console.error('Failed to deactivate driver:', err);
      }
    }
  };

  const handleReactivate = async (driver: Driver) => {
    try {
      await updateMutation.mutateAsync({ id: driver.id, data: { is_active: true } });
    } catch (err) {
      console.error('Failed to reactivate driver:', err);
    }
  };

  const handleResendInvitation = async (driver: Driver) => {
    try {
      await resendInvitationMutation.mutateAsync(driver.id);
      alert('Invitation resent successfully');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resend invitation');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingDriver(null);
  };

  const handleSuccess = () => {
    refetch();
    handleModalClose();
  };

  // Check if license is expired or expiring soon
  const getLicenseStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < today) {
      return { status: 'expired', label: 'License Expired', variant: 'error' as const };
    } else if (expiry < thirtyDaysFromNow) {
      return { status: 'expiring', label: 'Expiring Soon', variant: 'warning' as const };
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading drivers: {(error as Error).message}
      </div>
    );
  }

  const drivers = data?.drivers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
            <p className="text-sm text-gray-500">{drivers.length} registered</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
          {isManager && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Driver
            </Button>
          )}
        </div>
      </div>

      {/* Drivers List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {drivers.map((driver) => {
            const licenseStatus = getLicenseStatus(driver.license_expiry);
            const invitationConfig = INVITATION_STATUS_CONFIG[driver.invitation_status || 'no_invitation'];
            const InvitationIcon = invitationConfig.icon;
            const canResendInvitation = driver.invitation_status === 'pending' || driver.invitation_status === 'expired';

            return (
              <div
                key={driver.id}
                className={`flex items-center gap-4 p-4 ${!driver.is_active ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'} transition-colors`}
              >
                <div className={`w-12 h-12 ${driver.is_active ? 'bg-green-100' : 'bg-gray-200'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <User className={`w-6 h-6 ${driver.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {driver.full_name}
                    </span>
                    <Badge variant={invitationConfig.variant} size="sm">
                      <InvitationIcon className="w-3 h-3 mr-1" />
                      {invitationConfig.label}
                    </Badge>
                    {!driver.is_active && (
                      <Badge variant="default" size="sm">Inactive</Badge>
                    )}
                    {licenseStatus && (
                      <Badge variant={licenseStatus.variant} size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {licenseStatus.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    {driver.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {driver.email}
                      </span>
                    )}
                    {driver.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {driver.phone}
                      </span>
                    )}
                    {driver.license_number && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {driver.license_number}
                      </span>
                    )}
                  </div>
                  {driver.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{driver.notes}</p>
                  )}
                </div>
                {isManager && (
                  <div className="flex items-center gap-2">
                    {canResendInvitation && (
                      <button
                        onClick={() => handleResendInvitation(driver)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Resend Invitation"
                        disabled={resendInvitationMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 ${resendInvitationMutation.isPending ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(driver)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {driver.is_active ? (
                      <button
                        onClick={() => handleDeactivate(driver)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(driver)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reactivate"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {drivers.length === 0 && (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No drivers registered</p>
              {isManager && (
                <p className="text-sm text-gray-400">
                  Click "Add Driver" to register your first driver
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Driver Modal */}
      <DriverModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        driver={editingDriver}
      />
    </div>
  );
}
