import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ArrowUpFromLine,
  ArrowLeftRight,
  Trash2,
  MapPin,
  Clock,
  Warehouse,
  Store,
  X,
  TrendingDown,
  AlertTriangle,
  Package,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCircle,
  Truck,
  ClipboardList,
  ArrowDownToLine,
  Mail,
  Bell,
  User,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../components/ui';
import { useStockByLocation } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import { pendingDeliveriesApi, tripsApi, stockRequestsApi, alertsApi, usersApi, exportsApi, downloadBlob } from '../lib/api';
import { toast } from '../components/ui/Toast';
import IssueModal from '../components/modals/IssueModal';
import TransferModal from '../components/modals/TransferModal';
import WasteModal from '../components/modals/WasteModal';
import StockRequestModal from '../components/modals/StockRequestModal';
import ConfirmDeliveryModal from '../components/modals/ConfirmDeliveryModal';
import type { LocationStockItem, RecentActivity, PendingDelivery } from '../types';

// Stock status type
type StockStatus = 'healthy' | 'low' | 'critical';

// Get stock status using location-specific thresholds (in bags)
function getStockStatus(
  qtyKg: number,
  criticalThresholdBags: number = 20,
  lowThresholdBags: number = 50
): StockStatus {
  const bags = Math.floor(qtyKg / 10); // Convert kg to bags
  if (bags < criticalThresholdBags) return 'critical';
  if (bags < lowThresholdBags) return 'low';
  return 'healthy';
}

// Get capacity percent based on low threshold (healthy = at or above low threshold)
function getCapacityPercent(
  qtyKg: number,
  lowThresholdBags: number = 50
): number {
  const bags = Math.floor(qtyKg / 10);
  // Use low threshold as 100% capacity indicator
  const percent = (bags / lowThresholdBags) * 100;
  return Math.min(100, Math.round(percent));
}

// Calculate how much needed to reach low threshold (healthy level)
function getNeededToTarget(
  qtyKg: number,
  lowThresholdBags: number = 50
): number {
  const bags = Math.floor(qtyKg / 10);
  return Math.max(0, (lowThresholdBags - bags) * 10); // Return in kg
}

// Conversion: 1 bag = 10 kg
const KG_PER_BAG = 10;

// Format number with thousand separators
const formatNumber = (value: number, decimals: number = 0): string => {
  if (value === 0) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Convert kg to bags (always floor to whole number - bags can't be fractional)
const kgToBags = (kg: number): number => Math.floor(kg / KG_PER_BAG);

// Format stock value in bags - always whole numbers
const formatStockValue = (kg: number): { value: string; unit: string } => {
  const bags = kgToBags(kg);
  return { value: formatNumber(bags, 0), unit: 'bags' };
};

// Helper to get relative time
const getRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return 'No activity';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Check if location has stale data (no activity in 3+ days)
const isStaleData = (lastActivity: string | null): boolean => {
  if (!lastActivity) return true;
  const date = new Date(lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / 86400000;
  return diffDays >= 3;
};

// Sort options
type SortOption = 'name' | 'lowest_percent' | 'highest_percent' | 'lowest_stock' | 'highest_stock' | 'last_updated';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'lowest_percent', label: 'Lowest %' },
  { value: 'highest_percent', label: 'Highest %' },
  { value: 'lowest_stock', label: 'Least stock' },
  { value: 'highest_stock', label: 'Most stock' },
  { value: 'last_updated', label: 'Last updated' },
];

export default function StockPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useStockByLocation();
  const { isManager, isDriver, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Search/filter/sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'low' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lowest_percent'); // Default: critical locations first
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Drawer state
  const [selectedLocation, setSelectedLocation] = useState<LocationStockItem | null>(null);

  // Modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch pending deliveries
  const { data: pendingDeliveriesData, isFetching: isDeliveriesFetching, refetch: refetchDeliveries } = useQuery({
    queryKey: ['pending-deliveries', 'pending'],
    queryFn: () => pendingDeliveriesApi.getPending(undefined, 10).then(r => r.data),
    staleTime: 30 * 1000,
    placeholderData: (previousData: typeof pendingDeliveriesData) => previousData,
  });

  // Check URL for delivery confirmation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmId = params.get('confirm');
    if (confirmId && pendingDeliveriesData?.deliveries) {
      const delivery = pendingDeliveriesData.deliveries.find((d: PendingDelivery) => d.id === confirmId);
      if (delivery) {
        setSelectedDelivery(delivery);
        setShowConfirmDeliveryModal(true);
        // Clear the URL param
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [pendingDeliveriesData]);

  const pendingDeliveries = pendingDeliveriesData?.deliveries || [];

  // Compute status for all locations using location-specific thresholds
  const locationsWithStatus = useMemo(() =>
    (data?.locations || []).map(loc => ({
      ...loc,
      computedStatus: getStockStatus(
        loc.on_hand_qty,
        loc.critical_stock_threshold || 20,
        loc.low_stock_threshold || 50
      ),
      capacityPercent: getCapacityPercent(
        loc.on_hand_qty,
        loc.low_stock_threshold || 50
      ),
    })),
    [data?.locations]
  );

  // Filter and sort locations
  const filteredLocations = useMemo(() => {
    let result = locationsWithStatus.filter((loc) => {
      const matchesSearch = loc.location_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || loc.computedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    switch (sortBy) {
      case 'lowest_percent':
        result = [...result].sort((a, b) => a.capacityPercent - b.capacityPercent);
        break;
      case 'highest_percent':
        result = [...result].sort((a, b) => b.capacityPercent - a.capacityPercent);
        break;
      case 'lowest_stock':
        result = [...result].sort((a, b) => a.on_hand_qty - b.on_hand_qty);
        break;
      case 'highest_stock':
        result = [...result].sort((a, b) => b.on_hand_qty - a.on_hand_qty);
        break;
      case 'last_updated':
        result = [...result].sort((a, b) => {
          if (!a.last_activity) return 1;
          if (!b.last_activity) return -1;
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
        });
        break;
      case 'name':
      default:
        result = [...result].sort((a, b) => a.location_name.localeCompare(b.location_name));
        break;
    }

    // Always put the user's own location first (for location managers)
    if (user?.location_id) {
      const userLocationIndex = result.findIndex(loc => loc.location_id === user.location_id);
      if (userLocationIndex > 0) {
        const [userLocation] = result.splice(userLocationIndex, 1);
        result.unshift(userLocation);
      }
    }

    return result;
  }, [locationsWithStatus, searchQuery, statusFilter, sortBy, user?.location_id]);

  // Calculate summary stats with computed status
  // For location_managers, show only their location's stock in the Total Stock tile
  const summaryStats = useMemo(() => {
    let totalStock = data?.total_stock_kg || 0;
    let totalStockStatus: StockStatus = 'healthy';

    // If user is a location_manager, show only their location's stock and status
    if (user?.role === 'location_manager' && user?.location_id) {
      const myLocation = locationsWithStatus.find(l => l.location_id === user.location_id);
      totalStock = myLocation?.on_hand_qty || 0;
      // Use the location's thresholds to determine status
      if (myLocation) {
        totalStockStatus = getStockStatus(
          myLocation.on_hand_qty,
          myLocation.critical_stock_threshold || 20,
          myLocation.low_stock_threshold || 50
        );
      } else {
        // No location found, default to critical if 0 stock
        totalStockStatus = totalStock === 0 ? 'critical' : 'healthy';
      }
    }

    return {
      totalStock,
      totalStockStatus,
      locationCount: locationsWithStatus.length,
      healthyCount: locationsWithStatus.filter(l => l.computedStatus === 'healthy').length,
      lowCount: locationsWithStatus.filter(l => l.computedStatus === 'low').length,
      criticalCount: locationsWithStatus.filter(l => l.computedStatus === 'critical').length,
    };
  }, [data?.total_stock_kg, locationsWithStatus, user?.role, user?.location_id]);

  const handleSuccess = () => {
    refetch();
    refetchDeliveries();
    setSelectedLocation(null);
  };

  const handleDeliveryConfirmSuccess = () => {
    refetch();
    refetchDeliveries();
    queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
    setShowConfirmDeliveryModal(false);
    setSelectedDelivery(null);
    // Show success toast
    setSuccessMessage('Delivery confirmed successfully!');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const openModal = (modal: 'issue' | 'transfer' | 'waste') => {
    switch (modal) {
      case 'issue':
        setShowIssueModal(true);
        break;
      case 'transfer':
        setShowTransferModal(true);
        break;
      case 'waste':
        setShowWasteModal(true);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl">
        Error loading stock data: {(error as Error).message}
      </div>
    );
  }

  const totalFormatted = formatStockValue(summaryStats.totalStock);

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Summary Tiles - Clickable to filter */}
      <div className={`grid grid-cols-3 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        {isAdmin && (
          <SummaryTile
            icon={Package}
            iconBg={
              summaryStats.totalStockStatus === 'critical' ? 'bg-red-100' :
              summaryStats.totalStockStatus === 'low' ? 'bg-amber-100' :
              'bg-emerald-100'
            }
            iconColor={
              summaryStats.totalStockStatus === 'critical' ? 'text-red-600' :
              summaryStats.totalStockStatus === 'low' ? 'text-amber-600' :
              'text-emerald-600'
            }
            label="Total Stock"
            value={totalFormatted.value}
            unit={totalFormatted.unit}
            highlight={
              summaryStats.totalStockStatus === 'critical' ? 'error' :
              summaryStats.totalStockStatus === 'low' ? 'warning' :
              undefined
            }
            onClick={() => setStatusFilter('all')}
            isActive={statusFilter === 'all'}
          />
        )}
        <SummaryTile
          icon={MapPin}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
          label="Healthy"
          value={summaryStats.healthyCount.toString()}
          subtitle={summaryStats.healthyCount === 1 ? 'location' : 'locations'}
          onClick={() => setStatusFilter('healthy')}
          isActive={statusFilter === 'healthy'}
        />
        <SummaryTile
          icon={TrendingDown}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="Low"
          value={summaryStats.lowCount.toString()}
          subtitle={summaryStats.lowCount === 1 ? 'location' : 'locations'}
          highlight={summaryStats.lowCount > 0 ? 'warning' : undefined}
          onClick={() => setStatusFilter('low')}
          isActive={statusFilter === 'low'}
        />
        <SummaryTile
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          label="Critical"
          value={summaryStats.criticalCount.toString()}
          subtitle={summaryStats.criticalCount === 1 ? 'location' : 'locations'}
          highlight={summaryStats.criticalCount > 0 ? 'error' : undefined}
          onClick={() => setStatusFilter('critical')}
          isActive={statusFilter === 'critical'}
        />
      </div>

      {/* Controls Row - Sticky */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-4 -mt-4 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'healthy', 'low', 'critical'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort Dropdown - Proper select-style control */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={`flex items-center gap-2 pl-3 pr-2 py-2 text-sm bg-white border rounded-xl transition-all min-w-[140px] ${
              showSortMenu
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-gray-500">Sort by</span>
            <span className="font-medium text-gray-900 flex-1 text-left">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[180px]">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                      sortBy === option.value ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                    {sortBy === option.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          {isManager() && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await exportsApi.stockExcel();
                  downloadBlob(new Blob([response.data]), 'stock_balance.xlsx');
                  toast.success('Excel downloaded');
                } catch {
                  toast.error('Failed to export Excel');
                }
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
          {(user?.role === 'zone_manager' || user?.role === 'location_manager') && (
            <Button
              onClick={() => setShowRequestModal(true)}
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ClipboardList className="w-4 h-4" />
              Request Stock
            </Button>
          )}
        </div>
      </div>

      {/* Pending Deliveries Section - only for managers, not drivers */}
      {!isDriver() && pendingDeliveries.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Pending Deliveries</h3>
            <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
              {pendingDeliveries.length} awaiting confirmation
            </span>
          </div>
          <div className="space-y-3">
            {pendingDeliveries.slice(0, 3).map((delivery: PendingDelivery) => (
              <button
                key={delivery.id}
                onClick={() => {
                  setSelectedDelivery(delivery);
                  setShowConfirmDeliveryModal(true);
                }}
                className="w-full bg-white rounded-xl border border-orange-100 p-4 text-left hover:border-orange-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    Trip #{delivery.trip?.trip_number || 'Unknown'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {delivery.driver_claimed_bags} bags
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    From: {delivery.supplier?.name || 'Unknown supplier'}
                  </span>
                  <span className="text-orange-600 font-medium flex items-center gap-1">
                    Confirm <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Cards Grid */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600">No locations found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No locations have been set up yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => (
            <LocationCard
              key={location.location_id}
              location={location}
              status={location.computedStatus}
              capacityPercent={location.capacityPercent}
              onClick={() => setSelectedLocation(location)}
              canRequestStock={user?.role === 'zone_manager' || user?.role === 'location_manager'}
              onRequestStock={(loc) => {
                setSelectedLocation(loc);
                setShowRequestModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Details Drawer */}
      <DetailsDrawer
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
        onAction={openModal}
        isManager={isManager()}
        isDriver={isDriver()}
      />

      {/* Modals */}
      <IssueModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSuccess={handleSuccess}
        locationId={selectedLocation?.location_id}
      />
      {isManager() && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleSuccess}
          fromLocationId={selectedLocation?.location_id}
        />
      )}
      <WasteModal
        isOpen={showWasteModal}
        onClose={() => setShowWasteModal(false)}
        onSuccess={handleSuccess}
      />
      <StockRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleSuccess}
        locationId={user?.location_id || selectedLocation?.location_id}
        locationName={user?.location_name || selectedLocation?.location_name}
        currentStockKg={selectedLocation?.on_hand_qty || 0}
        targetStockKg={(selectedLocation?.low_stock_threshold || 50) * 10}
      />
      <ConfirmDeliveryModal
        isOpen={showConfirmDeliveryModal}
        onClose={() => {
          setShowConfirmDeliveryModal(false);
          setSelectedDelivery(null);
        }}
        onSuccess={handleDeliveryConfirmSuccess}
        delivery={selectedDelivery}
      />
    </div>
  );
}

// Summary Tile Component - Left accent style matching location cards
function SummaryTile({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  unit,
  subtitle,
  highlight,
  onClick,
  isActive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  unit?: string;
  subtitle?: string;
  highlight?: 'warning' | 'error';
  onClick?: () => void;
  isActive?: boolean;
}) {
  // Determine accent color based on highlight status (priority) or active state
  const accentColor =
    highlight === 'error' ? 'bg-red-400' :
    highlight === 'warning' ? 'bg-amber-400' :
    isActive ? 'bg-emerald-400' :
    'bg-gray-200';

  // Determine ring color based on highlight status when active
  const ringColor =
    highlight === 'error' ? 'ring-red-500' :
    highlight === 'warning' ? 'ring-amber-500' :
    'ring-emerald-500';

  return (
    <button
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-gray-100 transition-all text-left w-full overflow-hidden flex cursor-pointer hover:shadow-md hover:shadow-gray-100/80 hover:border-gray-200 ${
        isActive ? `ring-2 ${ringColor} ring-offset-1` : ''
      }`}
    >
      {/* Left accent bar - thinner (w-0.5 = 2px) */}
      <div className={`w-0.5 shrink-0 ${accentColor}`} />

      {/* Content */}
      <div className="flex-1 p-5 flex items-start justify-between">
        <div>
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">{value}</span>
            {unit && <span className="text-xs text-gray-500">{unit}</span>}
            {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
          </div>
        </div>
        {/* Hover chevron hint */}
        <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </div>
    </button>
  );
}

// Status configuration - semantic colors with softer accents
const STATUS_CONFIG = {
  healthy: { label: 'Healthy', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', barColor: 'bg-emerald-500', accentColor: 'bg-emerald-400' },
  low: { label: 'Low', textColor: 'text-amber-700', bgColor: 'bg-amber-50', barColor: 'bg-amber-500', accentColor: 'bg-amber-400' },
  critical: { label: 'Critical', textColor: 'text-red-700', bgColor: 'bg-red-50', barColor: 'bg-red-500', accentColor: 'bg-red-400' },
};

// Location Card Component - Subtle left accent instead of loud border
function LocationCard({
  location,
  status,
  capacityPercent,
  onClick,
  canRequestStock = false,
  onRequestStock,
}: {
  location: LocationStockItem;
  status: StockStatus;
  capacityPercent: number;
  onClick: () => void;
  canRequestStock?: boolean;
  onRequestStock?: (location: LocationStockItem) => void;
}) {
  // Use location-specific thresholds
  const lowThreshold = location.low_stock_threshold || 50;

  const statusStyle = STATUS_CONFIG[status];
  const LocationIcon = location.location_type === 'warehouse' ? Warehouse : Store;
  const stockFormatted = formatStockValue(location.on_hand_qty);
  const targetFormatted = formatStockValue(lowThreshold * 10); // Convert bags to kg
  const stale = isStaleData(location.last_activity);
  const neededToTarget = getNeededToTarget(location.on_hand_qty, lowThreshold);
  const neededFormatted = formatStockValue(neededToTarget);

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 text-left hover:shadow-lg hover:shadow-gray-100/50 hover:border-gray-200 transition-all duration-200 w-full overflow-hidden flex"
    >
      {/* Left accent bar - thinner (w-0.5 = 2px), purple for warehouse critical */}
      <div className={`w-0.5 shrink-0 ${
        location.location_type === 'warehouse' && status === 'critical'
          ? 'bg-purple-500'
          : statusStyle.accentColor
      }`} />

      {/* Card content */}
      <div className="flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              location.location_type === 'warehouse' ? 'bg-violet-100' : 'bg-slate-100'
            }`}>
              <LocationIcon className={`w-5 h-5 ${
                location.location_type === 'warehouse' ? 'text-violet-600' : 'text-slate-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-[15px] leading-tight">{location.location_name}</h3>
              <p className="text-xs text-gray-500 capitalize">{location.location_type}</p>
            </div>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            location.location_type === 'warehouse' && status === 'critical'
              ? 'bg-purple-100 text-purple-700'
              : `${statusStyle.bgColor} ${statusStyle.textColor}`
          }`}>
            {location.location_type === 'warehouse' && status === 'critical'
              ? 'Supply Critical'
              : statusStyle.label}
          </div>
        </div>

        {/* Stock Value */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{stockFormatted.value}</span>
            <span className="text-xs text-gray-500 leading-none">{stockFormatted.unit}</span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-medium ${statusStyle.textColor}`}>{capacityPercent}% of target</span>
            <span className="text-gray-500">Target: {targetFormatted.value} {targetFormatted.unit}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusStyle.barColor}`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Needed to target with Request button - only show for low/critical */}
        {status !== 'healthy' && neededToTarget > 0 && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">
              Need <span className="font-medium text-gray-700">+{neededFormatted.value} {neededFormatted.unit}</span> to reach target
            </p>
            {canRequestStock && onRequestStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestStock(location);
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  location.location_type === 'warehouse'
                    ? 'text-white bg-purple-500 hover:bg-purple-600'
                    : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                }`}
              >
                <Plus className="w-3 h-3" />
                Request
              </button>
            )}
          </div>
        )}

        {/* Warehouse critical warning banner */}
        {location.location_type === 'warehouse' && status === 'critical' && (
          <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Distribution source is empty - all shops affected
            </p>
          </div>
        )}

        {/* Footer - secondary metrics */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className={`flex items-center gap-1.5 text-xs ${stale ? 'text-amber-500' : 'text-gray-500'}`}>
            {stale ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            <span>{getRelativeTime(location.last_activity)}</span>
          </div>
          {location.recent_activity.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Activity className="w-3 h-3" />
              <span>{location.recent_activity.length} recent</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// Details Drawer Component
function DetailsDrawer({
  location,
  onClose,
  onAction,
  isManager,
  isDriver,
}: {
  location: LocationStockItem | null;
  onClose: () => void;
  onAction: (action: 'issue' | 'transfer' | 'waste') => void;
  isManager: boolean;
  isDriver: boolean;
}) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isLocationManager = user?.role === 'location_manager';
  // Check if location manager is viewing their own assigned location
  const isOwnLocation = isLocationManager && user?.location_id === location?.location_id;

  // Fetch driver's deliveries to this location
  const { data: myDeliveriesData, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['my-deliveries', location?.location_id],
    queryFn: () => tripsApi.getMyDeliveries(location!.location_id, 5).then(r => r.data),
    enabled: isDriver && !!location?.location_id,
  });

  // Fetch pending requests for this location (for driver view)
  const { data: pendingRequestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['stock-requests', 'location', location?.location_id],
    queryFn: () => stockRequestsApi.list({ location_id: location!.location_id, status: 'pending' }).then(r => r.data),
    enabled: isDriver && !!location?.location_id,
  });

  // Admin-specific data fetching
  // Fetch alerts for this specific location
  const { data: locationAlertsData, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['alerts', 'location', location?.location_id],
    queryFn: () => alertsApi.getAll(location!.location_id).then(r => r.data),
    enabled: isAdmin && !!location?.location_id,
  });

  // Fetch pending deliveries for this location
  const { data: locationDeliveriesData, isLoading: isLoadingLocationDeliveries } = useQuery({
    queryKey: ['pending-deliveries', 'location', location?.location_id],
    queryFn: () => pendingDeliveriesApi.getPending(location!.location_id, 5).then(r => r.data),
    enabled: isAdmin && !!location?.location_id,
  });

  // Fetch open stock requests for this location (shop view)
  const { data: locationRequestsData, isLoading: isLoadingLocationRequests } = useQuery({
    queryKey: ['stock-requests', 'location-admin', location?.location_id],
    queryFn: () => stockRequestsApi.list({ location_id: location!.location_id, status: 'pending', limit: 5 }).then(r => r.data),
    enabled: isAdmin && !!location?.location_id && location?.location_type !== 'warehouse',
  });

  // Fetch ALL pending shop requests (warehouse view - to see what shops need)
  const { data: allPendingRequestsData, isLoading: isLoadingAllRequests } = useQuery({
    queryKey: ['stock-requests', 'all-pending'],
    queryFn: () => stockRequestsApi.getAvailable(10).then(r => r.data),
    enabled: isAdmin && !!location?.location_id && location?.location_type === 'warehouse',
  });

  // Fetch manager for this location (for admin view)
  const { data: locationManagerData, isLoading: isLoadingManager } = useQuery({
    queryKey: ['location-manager', location?.location_id],
    queryFn: () => usersApi.list({ role: 'location_manager' }).then(r => {
      // Filter to find the manager assigned to this location
      const manager = r.data.users?.find((u: any) => u.location_id === location!.location_id);
      return manager || null;
    }),
    enabled: isAdmin && !!location?.location_id,
  });

  // Location Manager viewing OTHER locations - fetch manager contact
  const { data: otherLocationManagerData, isLoading: isLoadingOtherManager } = useQuery({
    queryKey: ['location-manager-readonly', location?.location_id],
    queryFn: () => usersApi.list({ role: 'location_manager' }).then(r => {
      const manager = r.data.users?.find((u: any) => u.location_id === location!.location_id);
      return manager || null;
    }),
    enabled: isLocationManager && !isOwnLocation && !!location?.location_id,
  });

  // Location Manager viewing OTHER locations - fetch most recent delivery
  const { data: recentDeliveryData, isLoading: isLoadingRecentDelivery } = useQuery({
    queryKey: ['recent-delivery', location?.location_id],
    queryFn: () => pendingDeliveriesApi.getPending(location!.location_id, 1).then(r => r.data),
    enabled: isLocationManager && !isOwnLocation && !!location?.location_id,
  });

  if (!location) return null;

  // Use location-specific thresholds
  const criticalThreshold = location.critical_stock_threshold || 20;
  const lowThreshold = location.low_stock_threshold || 50;

  const status = getStockStatus(location.on_hand_qty, criticalThreshold, lowThreshold);
  const statusStyle = STATUS_CONFIG[status];
  const LocationIcon = location.location_type === 'warehouse' ? Warehouse : Store;
  const stockFormatted = formatStockValue(location.on_hand_qty);
  const capacityPercent = getCapacityPercent(location.on_hand_qty, lowThreshold);
  // Target is now based on the low threshold (healthy level)
  const targetKg = lowThreshold * 10; // Convert bags to kg
  const targetFormatted = formatStockValue(targetKg);
  const stale = isStaleData(location.last_activity);
  const neededToTarget = getNeededToTarget(location.on_hand_qty, lowThreshold);
  const neededFormatted = formatStockValue(neededToTarget);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              location.location_type === 'warehouse' ? 'bg-violet-100' : 'bg-slate-100'
            }`}>
              <LocationIcon className={`w-5 h-5 ${
                location.location_type === 'warehouse' ? 'text-violet-600' : 'text-slate-600'
              }`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{location.location_name}</h2>
              <p className="text-sm text-gray-500 capitalize">{location.location_type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stock Summary */}
          <div className={`rounded-2xl p-5 ${
            status === 'critical' ? 'bg-red-50' :
            status === 'low' ? 'bg-amber-50' :
            'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                {statusStyle.label}
              </div>
              <div className={`flex items-center gap-1.5 text-sm ${stale ? 'text-amber-600' : 'text-gray-500'}`}>
                {stale ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                <span>{stale ? 'Stale data' : getRelativeTime(location.last_activity)}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{stockFormatted.value}</span>
              <span className="text-sm text-gray-500">{stockFormatted.unit}</span>
              <span className="text-xs text-gray-500">({formatNumber(location.on_hand_qty, 0)} kg)</span>
            </div>

            {/* Needed to target guidance */}
            {status !== 'healthy' && neededToTarget > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                Need <span className="font-semibold text-gray-800">+{neededFormatted.value} {neededFormatted.unit}</span> to reach target
              </p>
            )}

            {/* Capacity visualization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${statusStyle.textColor}`}>{capacityPercent}% of target</span>
                <span className="text-gray-500">Target: {targetFormatted.value} {targetFormatted.unit}</span>
              </div>
              <div className="h-3 bg-white/60 rounded-full overflow-hidden relative">
                {/* 85% threshold marker (Healthy line) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-300 z-10"
                  style={{ left: '85%' }}
                  title="Healthy threshold (85%)"
                />
                {/* 65% threshold marker (Low line) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300 z-10"
                  style={{ left: '65%' }}
                  title="Low threshold (65%)"
                />
                {/* Current level */}
                <div
                  className={`h-full rounded-full transition-all ${statusStyle.barColor}`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Critical &lt;65%</span>
                <span>Low 65-84%</span>
                <span>Healthy ≥85%</span>
              </div>
            </div>
          </div>

          {/* Driver View - My Deliveries & Pending Requests */}
          {isDriver ? (
            <>
              {/* Pending Requests for this location */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-gray-700">Pending Requests</h3>
                </div>
                {isLoadingRequests ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                  </div>
                ) : (pendingRequestsData?.requests || []).length > 0 ? (
                  <div className="space-y-2">
                    {(pendingRequestsData?.requests || []).slice(0, 3).map((request: any) => (
                      <div key={request.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {request.quantity_bags} bags requested
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            request.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                            request.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.urgency || 'normal'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Requested {getRelativeTime(request.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No pending requests</p>
                  </div>
                )}
              </div>

              {/* My Deliveries to this location */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-medium text-gray-700">My Deliveries</h3>
                </div>
                {isLoadingDeliveries ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                    <div className="h-16 bg-gray-100 rounded-xl" />
                  </div>
                ) : (myDeliveriesData?.deliveries || []).length > 0 ? (
                  <div className="space-y-2">
                    {(myDeliveriesData?.deliveries || []).map((delivery: any) => (
                      <div key={delivery.trip_id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {delivery.trip_number}
                          </span>
                          <span className="text-sm font-semibold text-emerald-600">
                            {delivery.qty_bags ? `${delivery.qty_bags} bags` : 'Qty N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{delivery.supplier_name || 'Unknown supplier'}</span>
                          <span>{getRelativeTime(delivery.completed_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">You haven't delivered to this store yet</p>
                  </div>
                )}
              </div>
            </>
          ) : isAdmin ? (
            <>
              {/* Admin View - Monitoring Only (No Quick Actions) */}

              {/* Alerts Section - Common for both warehouse and shop */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-medium text-gray-700">Alerts</h3>
                  {(locationAlertsData?.active_alerts || []).length > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      {locationAlertsData.active_alerts.length}
                    </span>
                  )}
                </div>
                {isLoadingAlerts ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                  </div>
                ) : (locationAlertsData?.active_alerts || []).length > 0 ? (
                  <div className="space-y-2">
                    {locationAlertsData.active_alerts.slice(0, 5).map((alert: any) => {
                      const alertDate = new Date(alert.created_at);
                      const formattedDate = alertDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      const formattedTime = alertDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-xl border ${
                            alert.severity === 'error' ? 'bg-red-50 border-red-100' :
                            alert.severity === 'warning' ? 'bg-amber-50 border-amber-100' :
                            'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              alert.severity === 'error' ? 'text-red-500' :
                              alert.severity === 'warning' ? 'text-amber-500' :
                              'text-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Since {formattedDate}, {formattedTime}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No active alerts</p>
                  </div>
                )}
              </div>

              {/* WAREHOUSE-SPECIFIC: Pending Shop Requests (all shops needing stock) */}
              {location.location_type === 'warehouse' && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-medium text-gray-700">Pending Shop Requests</h3>
                    {(allPendingRequestsData?.requests || []).length > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                        {allPendingRequestsData.requests.length} shops
                      </span>
                    )}
                  </div>
                  {isLoadingAllRequests ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-16 bg-gray-100 rounded-xl" />
                    </div>
                  ) : (allPendingRequestsData?.requests || []).length > 0 ? (
                    <div className="space-y-2">
                      {allPendingRequestsData.requests.slice(0, 5).map((request: any) => (
                        <div key={request.id} className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {request.location?.name || 'Unknown shop'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              request.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {request.urgency || 'normal'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {getRelativeTime(request.created_at)}
                            </p>
                            <span className="text-sm font-semibold text-violet-600">
                              {request.quantity_bags} bags
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No pending shop requests</p>
                    </div>
                  )}
                </div>
              )}

              {/* Incoming Deliveries - Common for both (from suppliers) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-gray-700">Incoming Deliveries</h3>
                </div>
                {isLoadingLocationDeliveries ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                  </div>
                ) : (locationDeliveriesData?.deliveries || []).length > 0 ? (
                  <div className="space-y-2">
                    {locationDeliveriesData.deliveries.slice(0, 3).map((delivery: any) => (
                      <div key={delivery.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            Trip #{delivery.trip?.trip_number || 'Unknown'}
                          </span>
                          <span className="text-sm font-semibold text-orange-600">
                            {delivery.driver_claimed_bags || Math.round(delivery.driver_claimed_qty_kg / 10)} bags
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          From: {delivery.supplier?.name || 'Unknown supplier'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No incoming deliveries</p>
                  </div>
                )}
              </div>

              {/* SHOP-SPECIFIC: Open Stock Requests (this shop's requests) */}
              {location.location_type !== 'warehouse' && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-medium text-gray-700">Open Stock Requests</h3>
                  </div>
                  {isLoadingLocationRequests ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-16 bg-gray-100 rounded-xl" />
                    </div>
                  ) : (locationRequestsData?.requests || []).length > 0 ? (
                    <div className="space-y-2">
                      {locationRequestsData.requests.slice(0, 3).map((request: any) => (
                        <div key={request.id} className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {request.quantity_bags} bags requested
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              request.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {request.urgency || 'normal'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Requested {getRelativeTime(request.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No open requests</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Activity - Common for both */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
                </div>
                {location.recent_activity.length > 0 ? (
                  <div className="space-y-2">
                    {location.recent_activity.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>

              {/* Manager Contact - Common for both */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700">Manager Contact</h3>
                </div>
                {isLoadingManager ? (
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-100 rounded-xl" />
                  </div>
                ) : locationManagerData ? (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {locationManagerData.full_name || 'Manager'}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{locationManagerData.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No manager assigned</p>
                  </div>
                )}
              </div>
            </>
          ) : isLocationManager ? (
            // Location Manager View - Different based on own location vs other locations
            isOwnLocation ? (
              <>
                {/* Own Location - Full functionality */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionButton
                      icon={ArrowUpFromLine}
                      label="Issue Stock"
                      description="Record usage"
                      onClick={() => onAction('issue')}
                      color="slate"
                    />
                    <ActionButton
                      icon={ArrowLeftRight}
                      label="Transfer"
                      description="Move to location"
                      onClick={() => onAction('transfer')}
                      color="violet"
                    />
                    <ActionButton
                      icon={Trash2}
                      label="Record Waste"
                      description="Log spoilage"
                      onClick={() => onAction('waste')}
                      color="red"
                    />
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
                  </div>
                  {location.recent_activity.length > 0 ? (
                    <div className="space-y-2">
                      {location.recent_activity.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Other Locations - Read-only View */}
                {/* Stock levels already shown above */}

                {/* Most Recent Delivery */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-medium text-gray-700">Most Recent Delivery</h3>
                  </div>
                  {isLoadingRecentDelivery ? (
                    <div className="animate-pulse">
                      <div className="h-16 bg-gray-100 rounded-xl" />
                    </div>
                  ) : (recentDeliveryData?.deliveries || []).length > 0 ? (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                      {(() => {
                        const delivery = recentDeliveryData.deliveries[0];
                        return (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                Trip #{delivery.trip?.trip_number || 'Unknown'}
                              </span>
                              <span className="text-sm font-semibold text-orange-600">
                                {delivery.driver_claimed_bags || Math.round(delivery.driver_claimed_qty_kg / 10)} bags
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              From: {delivery.supplier?.name || 'Unknown supplier'}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No recent deliveries</p>
                    </div>
                  )}
                </div>

                {/* Location Manager Contact */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-700">Location Manager</h3>
                  </div>
                  {isLoadingOtherManager ? (
                    <div className="animate-pulse">
                      <div className="h-12 bg-gray-100 rounded-xl" />
                    </div>
                  ) : otherLocationManagerData ? (
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {otherLocationManagerData.full_name || 'Manager'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{otherLocationManagerData.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No manager assigned</p>
                    </div>
                  )}
                </div>

                {/* Read-only notice */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700 text-center">
                    You have read-only access to this location's stock information.
                  </p>
                </div>
              </>
            )
          ) : (
            <>
              {/* Staff/Other Roles - Quick Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ActionButton
                    icon={ArrowUpFromLine}
                    label="Issue Stock"
                    description="Record usage"
                    onClick={() => onAction('issue')}
                    color="slate"
                  />
                  {isManager && (
                    <ActionButton
                      icon={ArrowLeftRight}
                      label="Transfer"
                      description="Move to location"
                      onClick={() => onAction('transfer')}
                      color="violet"
                    />
                  )}
                  <ActionButton
                    icon={Trash2}
                    label="Record Waste"
                    description="Log spoilage"
                    onClick={() => onAction('waste')}
                    color="red"
                  />
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
                </div>
                {location.recent_activity.length > 0 ? (
                  <div className="space-y-2">
                    {location.recent_activity.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Action Button Component
function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  color: 'slate' | 'violet' | 'emerald' | 'red';
}) {
  const colorClasses = {
    slate: 'bg-slate-50 hover:bg-slate-100 text-slate-600 active:bg-slate-200',
    violet: 'bg-violet-50 hover:bg-violet-100 text-violet-600 active:bg-violet-200',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 active:bg-emerald-200',
    red: 'bg-red-50 hover:bg-red-100 text-red-600 active:bg-red-200',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl text-left transition-colors ${colorClasses[color]}`}
    >
      <Icon className="w-5 h-5 mb-2" />
      <p className="font-medium text-sm text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: RecentActivity }) {
  const config = {
    receive: { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Received', sign: '+' },
    issue: { icon: ArrowUpFromLine, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Issued', sign: '-' },
    transfer: { icon: ArrowLeftRight, color: 'text-violet-600', bg: 'bg-violet-100', label: 'Transfer', sign: '' },
    waste: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', label: 'Waste', sign: '-' },
    adjustment: { icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Adjusted', sign: '' },
  };

  const typeConfig = config[activity.type] || config.adjustment;
  const Icon = typeConfig.icon;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeConfig.bg}`}>
        <Icon className={`w-4 h-4 ${typeConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{typeConfig.label}</p>
        {activity.notes && (
          <p className="text-xs text-gray-500 truncate">{activity.notes}</p>
        )}
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold tabular-nums ${typeConfig.color}`}>
          {typeConfig.sign}{formatNumber(kgToBags(activity.qty), activity.qty % KG_PER_BAG === 0 ? 0 : 1)} bags
        </p>
        <p className="text-xs text-gray-500">{getRelativeTime(activity.created_at)}</p>
      </div>
    </div>
  );
}
