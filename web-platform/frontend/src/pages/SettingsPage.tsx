import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Moon,
  Globe,
  Scale,
  Cloud,
  HelpCircle,
  MessageSquare,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { useSettings } from '../hooks/useData';
import { useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const logoutMutation = useLogout();
  const { user, isAdmin } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'info';
      case 'zone_manager':
        return 'success';
      case 'location_manager':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-amber-700">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {user?.full_name || 'User'}
            </h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <Badge variant={getRoleBadgeVariant(user?.role || 'staff')} className="mt-1">
              {user?.role?.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        {user?.location_name && (
          <p className="text-sm text-gray-500 mt-3">
            Location: {user.location_name}
            {user.zone_name && ` • ${user.zone_name}`}
          </p>
        )}
      </Card>

      {/* Menu Sections */}
      <Card padding="none">
        {/* Account Section */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Account
          </h4>
        </div>
        <MenuLink icon={<User className="w-5 h-5" />} label="Profile" />
        <MenuLink icon={<Bell className="w-5 h-5" />} label="Notifications" />

        {/* Administration Section - Admin Only */}
        {isAdmin() && (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 border-t">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h4>
            </div>
            <MenuLink
              icon={<Shield className="w-5 h-5" />}
              label="Admin Console"
              badge={<Badge variant="info" size="sm">Admin</Badge>}
            />
          </>
        )}

        {/* Preferences Section */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 border-t">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Preferences
          </h4>
        </div>
        <MenuToggle
          icon={<Moon className="w-5 h-5" />}
          label="Dark Mode"
          enabled={data?.preferences?.dark_mode || false}
        />
        <MenuLink
          icon={<Globe className="w-5 h-5" />}
          label="Language"
          value="English"
        />
        <MenuLink
          icon={<Scale className="w-5 h-5" />}
          label="Default Unit"
          value={data?.preferences?.default_unit || 'kg'}
        />

        {/* Data Section */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 border-t">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Data
          </h4>
        </div>
        <MenuLink
          icon={<Cloud className="w-5 h-5" />}
          label="Sync Status"
          value="Online"
          valueColor="text-green-600"
        />

        {/* Support Section */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 border-t">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Support
          </h4>
        </div>
        <MenuLink icon={<HelpCircle className="w-5 h-5" />} label="Help Center" />
        <MenuLink icon={<MessageSquare className="w-5 h-5" />} label="Contact Support" />
        <MenuLink icon={<Info className="w-5 h-5" />} label="About" />
      </Card>

      {/* Sign Out */}
      <Card>
        {showLogoutConfirm ? (
          <div className="space-y-4">
            <p className="text-gray-700">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleLogout}
                className="flex-1"
                isLoading={logoutMutation.isPending}
              >
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 font-medium py-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        )}
      </Card>

      {/* Version */}
      <p className="text-center text-xs text-gray-400">Version 1.0.0</p>
    </div>
  );
}

function MenuLink({
  icon,
  label,
  value,
  valueColor = 'text-gray-500',
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueColor?: string;
  badge?: React.ReactNode;
}) {
  return (
    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{icon}</span>
        <span className="text-gray-700">{label}</span>
        {badge}
      </div>
      <div className="flex items-center gap-2">
        {value && <span className={`text-sm ${valueColor}`}>{value}</span>}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  );
}

function MenuToggle({
  icon,
  label,
  enabled,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{icon}</span>
        <span className="text-gray-700">{label}</span>
      </div>
      <div
        className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
          enabled ? 'bg-amber-600' : 'bg-gray-200'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}
