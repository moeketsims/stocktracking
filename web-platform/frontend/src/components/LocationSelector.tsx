import { useState, useEffect } from 'react';
import { Eye, Building2 } from 'lucide-react';
import { referenceApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import Select from './ui/Select';

interface Location {
  id: string;
  name: string;
  type: string;
  zone_name?: string;
}

interface LocationSelectorProps {
  value?: string;
  onChange: (locationId: string | undefined) => void;
  showReadOnlyBadge?: boolean;
  className?: string;
}

export default function LocationSelector({
  value,
  onChange,
  showReadOnlyBadge = true,
  className = '',
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isLocationManager, isAdmin, isZoneManager } = useAuthStore();

  // Only show for location_manager, admin, and zone_manager
  const canViewOtherLocations = isLocationManager() || isAdmin() || isZoneManager();

  useEffect(() => {
    if (canViewOtherLocations) {
      loadLocations();
    }
  }, [canViewOtherLocations]);

  const loadLocations = async () => {
    try {
      const response = await referenceApi.getLocations();
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canViewOtherLocations) {
    return null;
  }

  const userLocationId = user?.location_id;
  const isViewingOtherLocation = value && value !== userLocationId;

  const options = [
    { value: '', label: `My Location (${user?.location_name || 'Default'})` },
    ...locations
      .filter((loc) => loc.id !== userLocationId)
      .map((loc) => ({
        value: loc.id,
        label: `${loc.name}${loc.zone_name ? ` (${loc.zone_name})` : ''}`,
      })),
  ];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-gray-600">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">View Location:</span>
      </div>

      <div className="w-64">
        <Select
          options={options}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          disabled={loading}
          className="text-sm"
        />
      </div>

      {showReadOnlyBadge && isViewingOtherLocation && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Read-only view</span>
        </div>
      )}
    </div>
  );
}
