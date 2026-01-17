import { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  CheckCircle,
  XCircle,
  Mail,
  MapPin,
  Building2,
  Search,
  Key,
  Clock,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';
import { Card, Button, Badge, Select } from '../components/ui';
import InviteUserModal from '../components/modals/InviteUserModal';
import EditUserModal from '../components/modals/EditUserModal';
import {
  useUsers,
  useDeactivateUser,
  useActivateUser,
  useResetUserPassword,
  useInvitations,
  useCancelInvitation,
  useResendInvitation,
} from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import type { ManagedUser, UserInvitation } from '../types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  zone_manager: 'Zone Manager',
  location_manager: 'Location Manager',
  staff: 'Staff',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  zone_manager: 'bg-blue-100 text-blue-800',
  location_manager: 'bg-green-100 text-green-800',
  staff: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // Users data
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useUsers({
    is_active: showInactive ? undefined : true,
    role: roleFilter || undefined,
    search: searchQuery || undefined,
  });

  // Invitations data
  const { data: invitationsData, isLoading: invitationsLoading, refetch: refetchInvitations } = useInvitations('pending');

  // Mutations
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const resetPasswordMutation = useResetUserPassword();
  const cancelInvitationMutation = useCancelInvitation();
  const resendInvitationMutation = useResendInvitation();

  const handleDeactivate = async (u: ManagedUser) => {
    if (window.confirm(`Are you sure you want to deactivate ${u.full_name || u.email}?`)) {
      try {
        await deactivateMutation.mutateAsync(u.id);
      } catch (err) {
        console.error('Failed to deactivate user:', err);
      }
    }
  };

  const handleActivate = async (u: ManagedUser) => {
    try {
      await activateMutation.mutateAsync(u.id);
    } catch (err) {
      console.error('Failed to activate user:', err);
    }
  };

  const handleResetPassword = async (u: ManagedUser) => {
    if (window.confirm(`Send password reset email to ${u.email}?`)) {
      try {
        await resetPasswordMutation.mutateAsync(u.id);
        alert('Password reset email sent');
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to send reset email');
      }
    }
  };

  const handleCancelInvitation = async (inv: UserInvitation) => {
    if (window.confirm(`Cancel invitation to ${inv.email}?`)) {
      try {
        await cancelInvitationMutation.mutateAsync(inv.id);
      } catch (err) {
        console.error('Failed to cancel invitation:', err);
      }
    }
  };

  const handleResendInvitation = async (inv: UserInvitation) => {
    try {
      await resendInvitationMutation.mutateAsync(inv.id);
      alert('Invitation resent');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resend invitation');
    }
  };

  const handleSuccess = () => {
    refetchUsers();
    refetchInvitations();
  };

  const users = usersData?.users || [];
  const invitations = invitationsData?.invitations || [];
  const pendingCount = invitations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">
              {users.length} users{pendingCount > 0 && `, ${pendingCount} pending invitations`}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="w-4 h-4 mr-1" />
          Invite User
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'users'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeTab === 'invitations'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Invitations
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: '', label: 'All roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'zone_manager', label: 'Zone Manager' },
                { value: 'location_manager', label: 'Location Manager' },
                { value: 'staff', label: 'Staff' },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
          </div>

          {/* Users List */}
          {usersLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-gray-200">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center gap-4 p-4 ${!u.is_active ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <div className={`w-12 h-12 ${u.is_active ? 'bg-indigo-100' : 'bg-gray-200'} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Users className={`w-6 h-6 ${u.is_active ? 'text-indigo-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {u.full_name || 'No name'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                        {!u.is_active && (
                          <Badge variant="default" size="sm">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </span>
                        )}
                        {u.zone_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {u.zone_name}
                          </span>
                        )}
                        {u.location_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {u.location_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && u.email && (
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && u.user_id !== user?.user_id && (
                        u.is_active ? (
                          <button
                            onClick={() => handleDeactivate(u)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(u)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No users found</p>
                    <p className="text-sm text-gray-400">
                      {searchQuery || roleFilter
                        ? 'Try adjusting your filters'
                        : 'Click "Invite User" to add your first user'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'invitations' && (
        <>
          {invitationsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-gray-200">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {inv.full_name || inv.email}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[inv.role]}`}>
                          {ROLE_LABELS[inv.role]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {inv.email}
                        </span>
                        <span className="text-amber-600">
                          Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResendInvitation(inv)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Resend"
                        disabled={resendInvitationMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 ${resendInvitationMutation.isPending ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleCancelInvitation(inv)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel"
                        disabled={cancelInvitationMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {invitations.length === 0 && (
                  <div className="p-12 text-center">
                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending invitations</p>
                    <p className="text-sm text-gray-400">
                      Click "Invite User" to send an invitation
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleSuccess}
      />

      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={handleSuccess}
        user={editingUser}
      />
    </div>
  );
}
