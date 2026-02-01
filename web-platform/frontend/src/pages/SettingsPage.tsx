import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Package,
  Save,
  Loader2,
  Store,
  CheckCircle,
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { useSettings, useLocations, useLocationThresholds, useUpdateLocationThresholds } from '../hooks/useData';
import { useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const logoutMutation = useLogout();
  const { user, isAdmin } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Admin threshold settings - fetch all locations for dropdown
  const isAdminUser = isAdmin();
  const { data: locationsData, isLoading: locationsLoading } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Fetch thresholds for selected location (admin only)
  const { data: thresholdsData, isLoading: thresholdsLoading } = useLocationThresholds(
    isAdminUser && selectedLocationId ? selectedLocationId : ''
  );
  const updateThresholdsMutation = useUpdateLocationThresholds();

  const [criticalThreshold, setCriticalThreshold] = useState<string>('');
  const [lowThreshold, setLowThreshold] = useState<string>('');
  const [thresholdError, setThresholdError] = useState<string>('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedStoreName, setSavedStoreName] = useState<string>('');

  // Update form when thresholds data loads
  useEffect(() => {
    if (thresholdsData) {
      setCriticalThreshold(thresholdsData.critical_stock_threshold?.toString() || '');
      setLowThreshold(thresholdsData.low_stock_threshold?.toString() || '');
    }
  }, [thresholdsData]);

  // Reset thresholds when location changes
  useEffect(() => {
    if (selectedLocationId && !thresholdsData) {
      setCriticalThreshold('');
      setLowThreshold('');
    }
    setThresholdError('');
  }, [selectedLocationId]);

  const handleSaveThresholds = async () => {
    setThresholdError('');

    const criticalValue = parseInt(criticalThreshold) || 0;
    const lowValue = parseInt(lowThreshold) || 0;

    if (!criticalThreshold || !lowThreshold) {
      setThresholdError('Please enter both threshold values');
      return;
    }

    if (criticalValue >= lowValue) {
      setThresholdError('Critical threshold must be less than low stock threshold');
      return;
    }

    if (!selectedLocationId) {
      setThresholdError('Please select a location');
      return;
    }

    try {
      const locationName = selectedLocation?.name || 'store';
      await updateThresholdsMutation.mutateAsync({
        locationId: selectedLocationId,
        data: {
          critical_stock_threshold: criticalValue,
          low_stock_threshold: lowValue,
        },
      });
      // Show success popup and collapse dropdown
      setSavedStoreName(locationName);
      setSelectedLocationId(''); // Collapse the form after successful save
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (err: any) {
      setThresholdError(err.response?.data?.detail || 'Failed to update thresholds');
    }
  };

  // Get selected location name for display
  const selectedLocation = locationsData?.find((loc: any) => loc.id === selectedLocationId);

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
      {/* Success Popup Overlay */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-600">
              Thresholds updated for <span className="font-semibold">{savedStoreName}</span>
            </p>
          </div>
        </div>
      )}

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

      {/* Stock Thresholds - Admin Only */}
      {isAdminUser && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Stock Thresholds</h3>
              <p className="text-sm text-gray-500">Configure alert levels for each store</p>
            </div>
          </div>

          {locationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Location Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Store
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Select a store...</option>
                    {locationsData?.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.type === 'warehouse' ? '(Warehouse)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Threshold inputs - only show when location is selected */}
              {selectedLocationId && (
                <>
                  {thresholdsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <>
                      {/* Selected location info */}
                      {selectedLocation && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-600">
                            Setting thresholds for: <span className="font-semibold text-gray-900">{selectedLocation.name}</span>
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Critical Stock Level (bags)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Below this level triggers critical alerts (red zone)
                        </p>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={criticalThreshold}
                          onChange={(e) => setCriticalThreshold(e.target.value)}
                          placeholder="e.g. 20"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Low Stock Level (bags)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Below this level triggers low stock warnings (amber zone)
                        </p>
                        <input
                          type="number"
                          min={0}
                          max={2000}
                          value={lowThreshold}
                          onChange={(e) => setLowThreshold(e.target.value)}
                          placeholder="e.g. 50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>

                      {thresholdError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          {thresholdError}
                        </div>
                      )}

                      <Button
                        onClick={handleSaveThresholds}
                        disabled={updateThresholdsMutation.isPending}
                        className="w-full"
                      >
                        {updateThresholdsMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Thresholds for {selectedLocation?.name || 'Store'}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      )}

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
      <p className="text-center text-xs text-gray-500">Version 1.0.0</p>
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
