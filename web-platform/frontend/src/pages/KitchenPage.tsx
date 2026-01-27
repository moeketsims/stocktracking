import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package,
    Minus,
    Plus,
    Check,
    AlertCircle,
    RefreshCw,
    ArrowDownToLine,
    ArrowUpFromLine,
    Activity,
    Clock,
    AlertTriangle,
    ChevronRight,
    Scale,
    X,
    MapPin,
    Building2,
    Eye,
    Search,
    Filter,
} from 'lucide-react';
import { stockApi, referenceApi, transactionsApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useLocations } from '../hooks/useData';

type Mode = 'withdraw' | 'return';

const QUICK_AMOUNTS = [1, 2, 5, 10];

// Conversion: 1 bag = 10 kg
const KG_PER_BAG = 10;

// Status thresholds based on location-specific thresholds
type StockStatus = 'healthy' | 'low' | 'critical';

function getStockStatus(
    qtyKg: number,
    criticalThresholdBags: number = 20,
    lowThresholdBags: number = 50
): StockStatus {
    const bags = Math.floor(qtyKg / KG_PER_BAG);
    if (bags < criticalThresholdBags) return 'critical';
    if (bags < lowThresholdBags) return 'low';
    return 'healthy';
}

function getCapacityPercent(qtyKg: number, lowThresholdBags: number = 50): number {
    const bags = Math.floor(qtyKg / KG_PER_BAG);
    const percent = (bags / lowThresholdBags) * 100;
    return Math.min(100, Math.round(percent));
}

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

// Format number with thousand separators
const formatNumber = (value: number, decimals: number = 0): string => {
    if (value === 0) return '0';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

// Status configuration
const STATUS_CONFIG = {
    healthy: { label: 'Healthy', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', barColor: 'bg-emerald-500', dotColor: 'bg-emerald-500', borderColor: 'border-emerald-200' },
    low: { label: 'Low Stock', textColor: 'text-amber-700', bgColor: 'bg-amber-50', barColor: 'bg-amber-500', dotColor: 'bg-amber-500', borderColor: 'border-amber-200' },
    critical: { label: 'Critical', textColor: 'text-red-700', bgColor: 'bg-red-50', barColor: 'bg-red-500', dotColor: 'bg-red-500', borderColor: 'border-red-200' },
};

// Kitchen list item component for the left panel
interface KitchenListItemProps {
    location: any;
    isSelected: boolean;
    onClick: () => void;
    stockData?: any;
}

function KitchenListItem({ location, isSelected, onClick, stockData }: KitchenListItemProps) {
    // Use location-specific thresholds
    const criticalThreshold = location.critical_stock_threshold || 20;
    const lowThreshold = location.low_stock_threshold || 50;
    const stockStatus = stockData ? getStockStatus(stockData.totalKg, criticalThreshold, lowThreshold) : 'healthy';
    const statusStyle = STATUS_CONFIG[stockStatus];
    const bags = stockData ? Math.floor(stockData.totalKg / 10) : 0;

    return (
        <button
            onClick={onClick}
            className={`w-full p-3 flex items-center gap-3 rounded-lg transition-all text-left group ${
                isSelected
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'hover:bg-gray-50 border border-transparent'
            }`}
        >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-gray-200'
            }`}>
                <Building2 className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {location.name}
                    </span>
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.dotColor}`} />
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {location.zone_name && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {location.zone_name}
                        </span>
                    )}
                    <span>{bags} bags</span>
                </div>
            </div>

            {/* Arrow */}
            <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${
                isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400'
            }`} />
        </button>
    );
}

export default function KitchenPage() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // State for the UI
    const [mode, setMode] = useState<Mode>('withdraw');
    const [quantity, setQuantity] = useState<number>(1);
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Admin-specific state
    const isAdmin = user?.role === 'admin';
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

    // Search and filter state for kitchen list
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Fetch all locations for admin
    const { data: allLocations, isLoading: isLocationsLoading } = useLocations();

    // Filter to only show shops (not warehouses) for kitchen monitoring
    const shopLocations = useMemo(() =>
        (allLocations || []).filter((loc: any) => loc.type === 'shop'),
        [allLocations]
    );

    // Determine which location to use for queries
    const activeLocationId = isAdmin ? selectedLocationId : user?.location_id;
    const isViewingOtherLocation = isAdmin && selectedLocationId && selectedLocationId !== user?.location_id;

    // Get the selected location details for display
    const selectedLocation = shopLocations.find((loc: any) => loc.id === selectedLocationId);

    // Fetch current stock for this location
    const { data: stockData, isLoading: isStockLoading, refetch } = useQuery({
        queryKey: ['stock', 'balance', activeLocationId],
        queryFn: () => stockApi.getBalance(activeLocationId!).then(r => r.data),
        enabled: !!activeLocationId,
        staleTime: 0,
        refetchInterval: isAdmin ? 30000 : false,
    });

    // Fetch items to find Potatoes if balance is zero
    const { data: itemsData, isLoading: isItemsLoading } = useQuery({
        queryKey: ['reference', 'items'],
        queryFn: () => referenceApi.getItems().then(r => r.data),
    });

    const potatoItem = itemsData?.items?.find((i: any) => i.name?.toLowerCase().includes('potato')) ||
        itemsData?.items?.[0];

    // Fetch transaction history (withdrawals and returns) - today only
    const { data: transactionsData, refetch: refetchTransactions } = useQuery({
        queryKey: ['transactions', 'kitchen', activeLocationId, 'today'],
        queryFn: async () => {
            const response = await transactionsApi.getAll({
                view_location_id: activeLocationId,
                limit: 100,
                days: 1
            });
            return response.data;
        },
        enabled: !!activeLocationId,
        staleTime: 0,
        refetchInterval: isAdmin ? 30000 : false,
    });

    // Filter for issue (withdraw) and return transactions only
    const allTransactions = transactionsData?.transactions || [];
    const kitchenTransactions = allTransactions.filter(
        (t: any) => t.type === 'issue' || t.type === 'return'
    );

    // Get counts from API response
    const withdrawCount = transactionsData?.issue_count ?? kitchenTransactions.filter((t: any) => t.type === 'issue').length;
    const returnCount = transactionsData?.return_count ?? kitchenTransactions.filter((t: any) => t.type === 'return').length;

    // Withdraw mutation
    const withdrawMutation = useMutation({
        mutationFn: async (qty: number) => {
            const itemId = potatoStock?.item_id || potatoItem?.id;
            if (!itemId) throw new Error("Potato item not found in system");

            const response = await stockApi.issue({
                quantity: qty,
                unit: 'bag',
                notes: 'Kitchen consumption',
                item_id: itemId
            });
            return response;
        },
        onSuccess: async (_response, qty) => {
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            await queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await refetch();
            await refetchTransactions();

            setLastAction(`Withdrew ${qty} bag${qty > 1 ? 's' : ''} from stock`);
            setErrorMessage(null);
            setQuantity(1);
            setShowCustomInput(false);
            setTimeout(() => setLastAction(null), 3000);
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || error.message || "Failed to record withdrawal";
            setErrorMessage(msg);
            setTimeout(() => setErrorMessage(null), 5000);
        }
    });

    // Return mutation
    const returnMutation = useMutation({
        mutationFn: (qty: number) => {
            const itemId = potatoStock?.item_id || potatoItem?.id;
            if (!itemId) throw new Error("Potato item not found in system");

            return stockApi.returnStock({
                quantity: qty,
                unit: 'bag',
                notes: 'Kitchen return - unused stock',
                item_id: itemId
            });
        },
        onSuccess: async (_data, qty) => {
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            await queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await refetch();
            await refetchTransactions();

            setLastAction(`Returned ${qty} bag${qty > 1 ? 's' : ''} to stock`);
            setErrorMessage(null);
            setQuantity(1);
            setShowCustomInput(false);
            setTimeout(() => setLastAction(null), 3000);
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || error.message || "Failed to record return";
            setErrorMessage(msg);
            setTimeout(() => setErrorMessage(null), 5000);
        }
    });

    const handleSubmit = () => {
        if (quantity <= 0) return;
        setShowConfirmModal(true);
    };

    const handleConfirm = () => {
        setShowConfirmModal(false);
        if (mode === 'withdraw') {
            withdrawMutation.mutate(quantity);
        } else {
            returnMutation.mutate(quantity);
        }
    };

    const handleCancel = () => {
        setShowConfirmModal(false);
    };

    const handleQuickSelect = (amount: number) => {
        setQuantity(amount);
        setShowCustomInput(false);
    };

    const handleCustomClick = () => {
        setShowCustomInput(true);
    };

    const incrementQuantity = () => {
        if (mode === 'withdraw' && quantity >= currentBags) return;
        setQuantity(q => q + 1);
    };

    const decrementQuantity = () => {
        if (quantity <= 1) return;
        setQuantity(q => q - 1);
    };

    // Stock calculations
    const batchData = stockData?.batch_totals || [];
    const balanceData = stockData?.balance || [];
    const totalKg = batchData.reduce((sum: number, b: any) => sum + (b.on_hand_qty || 0), 0);
    const potatoStock = batchData.find((b: any) => b.item_name?.toLowerCase().includes('potato')) ||
        batchData[0] ||
        balanceData.find((b: any) => b.item_name?.toLowerCase().includes('potato')) ||
        balanceData[0];

    const baseKg = batchData.length > 0 ? totalKg : (potatoStock?.on_hand_qty || 0);
    const currentKg = baseKg;
    const currentBags = Math.floor(currentKg / 10);
    const isLoading = isStockLoading || isItemsLoading;
    const isPending = withdrawMutation.isPending || returnMutation.isPending;

    // Calculate preview
    const newBags = mode === 'withdraw' ? currentBags - quantity : currentBags + quantity;
    const newKg = mode === 'withdraw' ? currentKg - (quantity * 10) : currentKg + (quantity * 10);
    const isValidQuantity = quantity > 0 && (mode === 'return' || quantity <= currentBags);

    // Stock status calculations using location-specific thresholds
    const criticalThreshold = selectedLocation?.critical_stock_threshold || 20;
    const lowThreshold = selectedLocation?.low_stock_threshold || 50;
    const stockStatus = getStockStatus(currentKg, criticalThreshold, lowThreshold);
    const statusStyle = STATUS_CONFIG[stockStatus];
    const capacityPercent = getCapacityPercent(currentKg, lowThreshold);

    // Filter kitchen list
    const filteredLocations = useMemo(() => {
        return shopLocations.filter((loc: any) => {
            // Search filter
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                if (!loc.name.toLowerCase().includes(search) &&
                    !(loc.zone_name || '').toLowerCase().includes(search)) {
                    return false;
                }
            }
            // Status filter would require stock data per location
            // For now, we'll skip this filter
            return true;
        });
    }, [shopLocations, searchQuery]);

    // Non-admin view - show standard kitchen interface
    if (!isAdmin) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto px-4">
                {/* ... original non-admin UI ... */}
                <StandardKitchenUI
                    stockData={stockData}
                    currentKg={currentKg}
                    currentBags={currentBags}
                    stockStatus={stockStatus}
                    statusStyle={statusStyle}
                    capacityPercent={capacityPercent}
                    withdrawCount={withdrawCount}
                    returnCount={returnCount}
                    mode={mode}
                    setMode={setMode}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    showCustomInput={showCustomInput}
                    setShowCustomInput={setShowCustomInput}
                    handleQuickSelect={handleQuickSelect}
                    handleCustomClick={handleCustomClick}
                    incrementQuantity={incrementQuantity}
                    decrementQuantity={decrementQuantity}
                    handleSubmit={handleSubmit}
                    isValidQuantity={isValidQuantity}
                    isPending={isPending}
                    isViewingOtherLocation={false}
                    newBags={newBags}
                    newKg={newKg}
                    lastAction={lastAction}
                    errorMessage={errorMessage}
                    kitchenTransactions={kitchenTransactions}
                    refetch={refetch}
                    refetchTransactions={refetchTransactions}
                    potatoStock={potatoStock}
                />

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <ConfirmModal
                        mode={mode}
                        quantity={quantity}
                        isPending={isPending}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                    />
                )}
            </div>
        );
    }

    // Admin two-panel layout
    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Compact Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Kitchen Monitoring</h1>
                        <p className="text-xs text-gray-500">{shopLocations.length} locations</p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Two-Panel Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Kitchen List */}
                <div className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
                    {/* Search & Filters */}
                    <div className="p-4 space-y-3 border-b border-gray-200 bg-white">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search kitchens..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                            />
                        </div>

                        {/* Filter Pills */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setStatusFilter('critical')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    statusFilter === 'critical'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                            >
                                Critical
                            </button>
                            <button
                                onClick={() => setStatusFilter('low')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    statusFilter === 'low'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                }`}
                            >
                                Low Stock
                            </button>
                        </div>
                    </div>

                    {/* Kitchen List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {isLocationsLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : filteredLocations.length === 0 ? (
                            <div className="text-center py-12">
                                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No kitchens found</p>
                            </div>
                        ) : (
                            filteredLocations.map((loc: any) => (
                                <KitchenListItem
                                    key={loc.id}
                                    location={loc}
                                    isSelected={selectedLocationId === loc.id}
                                    onClick={() => setSelectedLocationId(loc.id)}
                                    stockData={selectedLocationId === loc.id ? { totalKg: currentKg } : undefined}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel - Monitoring Dashboard */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {!selectedLocationId ? (
                        /* Empty State */
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-sm">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Eye className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Kitchen</h3>
                                <p className="text-sm text-gray-500">
                                    Choose a kitchen from the list to view stock levels, activity, and monitoring details.
                                </p>
                            </div>
                        </div>
                    ) : isLoading ? (
                        /* Loading State */
                        <div className="p-6 space-y-6">
                            <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                                <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                            </div>
                            <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                        </div>
                    ) : (
                        /* Dashboard Content */
                        <div className="p-6 space-y-6">
                            {/* Location Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedLocation?.name}</h2>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            {selectedLocation?.zone_name && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {selectedLocation.zone_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                                    {statusStyle.label}
                                </div>
                            </div>

                            {/* Read-only Notice */}
                            {isViewingOtherLocation && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                    <p className="text-sm text-amber-800">
                                        <span className="font-medium">View only.</span> Actions are disabled for this location.
                                    </p>
                                </div>
                            )}

                            {/* Summary Cards Row */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Stock Card */}
                                <div className={`rounded-xl border-2 ${statusStyle.borderColor} ${statusStyle.bgColor} p-4`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className={`w-5 h-5 ${statusStyle.textColor}`} />
                                        <span className="text-sm font-medium text-gray-600">Current Stock</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatNumber(currentBags)}</p>
                                    <p className="text-sm text-gray-500">{formatNumber(currentKg)} kg</p>
                                </div>

                                {/* Withdrawals Card */}
                                <div className="rounded-xl border border-gray-200 bg-white p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowDownToLine className="w-5 h-5 text-amber-600" />
                                        <span className="text-sm font-medium text-gray-600">Withdrawals</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 tabular-nums">{withdrawCount}</p>
                                    <p className="text-sm text-gray-500">Today</p>
                                </div>

                                {/* Returns Card */}
                                <div className="rounded-xl border border-gray-200 bg-white p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowUpFromLine className="w-5 h-5 text-teal-600" />
                                        <span className="text-sm font-medium text-gray-600">Returns</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 tabular-nums">{returnCount}</p>
                                    <p className="text-sm text-gray-500">Today</p>
                                </div>
                            </div>

                            {/* Stock Level Progress */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600 font-medium">Stock Level</span>
                                    <span className="font-semibold text-gray-900">{capacityPercent}% of target</span>
                                </div>
                                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${statusStyle.barColor} transition-all duration-500 rounded-full`}
                                        style={{ width: `${capacityPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                                    <span>0</span>
                                    <span>Target: {formatNumber(TARGET_STOCK_KG / 10)} bags</span>
                                </div>
                            </div>

                            {/* Feedback Alerts */}
                            {lastAction && (
                                <div className={`p-3 rounded-lg flex items-center gap-3 ${mode === 'withdraw' ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-200'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'} text-white`}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <span className={`text-sm font-medium ${mode === 'withdraw' ? 'text-amber-800' : 'text-teal-800'}`}>
                                        {lastAction}
                                    </span>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white">
                                        <AlertCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-red-800">Action Failed</p>
                                        <p className="text-xs text-red-600">{errorMessage}</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Card - Withdraw/Return */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className={`h-1 ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                                <div className="p-5">
                                    {/* Mode Toggle */}
                                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-5">
                                        <button
                                            onClick={() => { setMode('withdraw'); setQuantity(1); setShowCustomInput(false); }}
                                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'withdraw'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <ArrowDownToLine className="w-4 h-4" />
                                            Withdraw
                                        </button>
                                        <button
                                            onClick={() => { setMode('return'); setQuantity(1); setShowCustomInput(false); }}
                                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'return'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <ArrowUpFromLine className="w-4 h-4" />
                                            Return
                                        </button>
                                    </div>

                                    {/* Quick Select */}
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                                        {mode === 'withdraw' ? 'Bags to withdraw' : 'Bags to return'}
                                    </p>
                                    <div className="flex gap-2 mb-4">
                                        {QUICK_AMOUNTS.map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => handleQuickSelect(amount)}
                                                disabled={mode === 'withdraw' && amount > currentBags}
                                                className={`flex-1 py-2.5 rounded-lg font-bold text-base transition-all ${quantity === amount && !showCustomInput
                                                    ? mode === 'withdraw'
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-teal-500 text-white'
                                                    : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${mode === 'withdraw' && amount > currentBags ? 'opacity-40 cursor-not-allowed' : ''}`
                                                    }`}
                                            >
                                                {amount}
                                            </button>
                                        ))}
                                        <button
                                            onClick={handleCustomClick}
                                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${showCustomInput
                                                ? mode === 'withdraw'
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-teal-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Other
                                        </button>
                                    </div>

                                    {/* Custom Input */}
                                    {showCustomInput && (
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <button
                                                onClick={decrementQuantity}
                                                disabled={quantity <= 1}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'withdraw'
                                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                                    : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                                    }`}
                                            >
                                                <Minus className="w-5 h-5" />
                                            </button>

                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    if (mode === 'withdraw') {
                                                        setQuantity(Math.min(Math.max(0, val), currentBags));
                                                    } else {
                                                        setQuantity(Math.max(0, val));
                                                    }
                                                }}
                                                className={`w-24 h-12 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 ${mode === 'withdraw'
                                                    ? 'border-amber-300 focus:ring-amber-500/30'
                                                    : 'border-teal-300 focus:ring-teal-500/30'
                                                    }`}
                                                min={1}
                                                max={mode === 'withdraw' ? currentBags : undefined}
                                            />

                                            <button
                                                onClick={incrementQuantity}
                                                disabled={mode === 'withdraw' && quantity >= currentBags}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'withdraw'
                                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                                    : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                                    }`}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Preview */}
                                    <div className={`p-3 rounded-lg mb-4 ${mode === 'withdraw' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                                        <div className="flex items-center justify-center gap-2 text-sm">
                                            <span className={`font-medium ${mode === 'withdraw' ? 'text-amber-600' : 'text-teal-600'}`}>
                                                {mode === 'withdraw' ? 'Removing' : 'Adding'} {quantity} bag{quantity !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-gray-400">→</span>
                                            <span className="font-semibold text-gray-800">
                                                New: {formatNumber(newBags)} bags
                                            </span>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!isValidQuantity || isPending || isViewingOtherLocation}
                                        className={`w-full py-3 rounded-lg font-semibold text-base text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${mode === 'withdraw'
                                            ? 'bg-amber-500 hover:bg-amber-600'
                                            : 'bg-teal-500 hover:bg-teal-600'
                                            }`}
                                    >
                                        {isPending ? (
                                            <RefreshCw className="animate-spin w-5 h-5" />
                                        ) : isViewingOtherLocation ? (
                                            <>
                                                <Eye className="w-5 h-5" />
                                                View Only
                                            </>
                                        ) : mode === 'withdraw' ? (
                                            <>
                                                <ArrowDownToLine className="w-5 h-5" />
                                                Withdraw {quantity} Bag{quantity !== 1 ? 's' : ''}
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUpFromLine className="w-5 h-5" />
                                                Return {quantity} Bag{quantity !== 1 ? 's' : ''}
                                            </>
                                        )}
                                    </button>

                                    {mode === 'withdraw' && quantity > currentBags && (
                                        <p className="text-red-500 text-xs text-center mt-2 flex items-center justify-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Cannot exceed available stock
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-gray-400" />
                                        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                                    </div>
                                    <button
                                        onClick={() => refetchTransactions()}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                                    {kitchenTransactions.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No activity today</p>
                                        </div>
                                    ) : (
                                        kitchenTransactions.slice(0, 10).map((t: any) => {
                                            const isWithdraw = t.type === 'issue';
                                            const bags = Math.round(t.quantity / 10);
                                            const date = new Date(t.created_at);
                                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isWithdraw ? 'bg-amber-100' : 'bg-teal-100'}`}>
                                                        {isWithdraw ? (
                                                            <ArrowDownToLine className="w-4 h-4 text-amber-600" />
                                                        ) : (
                                                            <ArrowUpFromLine className="w-4 h-4 text-teal-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium ${isWithdraw ? 'text-amber-800' : 'text-teal-800'}`}>
                                                            {isWithdraw ? 'Withdrew' : 'Returned'} {bags} bag{bags !== 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{t.notes || 'Kitchen operation'}</p>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{timeStr}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <ConfirmModal
                    mode={mode}
                    quantity={quantity}
                    isPending={isPending}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
}

// Confirmation Modal Component
interface ConfirmModalProps {
    mode: Mode;
    quantity: number;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmModal({ mode, quantity, isPending, onConfirm, onCancel }: ConfirmModalProps) {
    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                onClick={onCancel}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                    <div className={`p-5 ${mode === 'withdraw' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'}`}>
                                {mode === 'withdraw' ? (
                                    <ArrowDownToLine className="w-6 h-6 text-white" />
                                ) : (
                                    <ArrowUpFromLine className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">
                                    Confirm {mode === 'withdraw' ? 'Withdrawal' : 'Return'}
                                </h3>
                                <p className="text-sm text-gray-500">Review before proceeding</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        <p className="text-center text-gray-700">
                            {mode === 'withdraw' ? 'Withdraw' : 'Return'} <span className="font-bold">{quantity} bag{quantity !== 1 ? 's' : ''}</span>?
                        </p>
                    </div>

                    <div className="p-5 pt-0 flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 px-4 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isPending}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${mode === 'withdraw'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-teal-500 hover:bg-teal-600'
                                }`}
                        >
                            {isPending ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// Standard Kitchen UI Component (for non-admin users)
interface StandardKitchenUIProps {
    stockData: any;
    currentKg: number;
    currentBags: number;
    stockStatus: StockStatus;
    statusStyle: typeof STATUS_CONFIG.healthy;
    capacityPercent: number;
    withdrawCount: number;
    returnCount: number;
    mode: Mode;
    setMode: (mode: Mode) => void;
    quantity: number;
    setQuantity: (qty: number) => void;
    showCustomInput: boolean;
    setShowCustomInput: (show: boolean) => void;
    handleQuickSelect: (amount: number) => void;
    handleCustomClick: () => void;
    incrementQuantity: () => void;
    decrementQuantity: () => void;
    handleSubmit: () => void;
    isValidQuantity: boolean;
    isPending: boolean;
    isViewingOtherLocation: boolean;
    newBags: number;
    newKg: number;
    lastAction: string | null;
    errorMessage: string | null;
    kitchenTransactions: any[];
    refetch: () => void;
    refetchTransactions: () => void;
    potatoStock: any;
}

function StandardKitchenUI({
    currentKg,
    currentBags,
    statusStyle,
    capacityPercent,
    withdrawCount,
    returnCount,
    mode,
    setMode,
    quantity,
    setQuantity,
    showCustomInput,
    setShowCustomInput,
    handleQuickSelect,
    handleCustomClick,
    incrementQuantity,
    decrementQuantity,
    handleSubmit,
    isValidQuantity,
    isPending,
    newBags,
    newKg,
    lastAction,
    errorMessage,
    kitchenTransactions,
    refetch,
    refetchTransactions,
    potatoStock,
}: StandardKitchenUIProps) {
    const [showActivityDrawer, setShowActivityDrawer] = useState(false);

    return (
        <>
            {/* Stock Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className={`h-1.5 ${statusStyle.barColor}`} />
                    <div className="p-6 lg:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl ${statusStyle.bgColor} flex items-center justify-center`}>
                                    <Package className={`w-7 h-7 ${statusStyle.textColor}`} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Current Stock</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-bold text-gray-900 tabular-nums">{formatNumber(currentBags)}</span>
                                        <span className="text-lg text-gray-400">bags</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                                {statusStyle.label}
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">Stock Level</span>
                                <span className="font-medium text-gray-700">{capacityPercent}% of target</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${statusStyle.barColor} transition-all duration-500 rounded-full`}
                                    style={{ width: `${capacityPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-500 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <Scale className="w-5 h-5" />
                                <span className="font-medium">{formatNumber(currentKg)} kg</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                <span>Last: {getRelativeTime(potatoStock?.last_activity || null)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <ArrowDownToLine className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Withdrawals</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 tabular-nums">{withdrawCount}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                <ArrowUpFromLine className="w-5 h-5 text-teal-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Returns</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 tabular-nums">{returnCount}</p>
                    </div>
                </div>
            </div>

            {/* Feedback Alerts */}
            {lastAction && (
                <div className={`p-4 rounded-xl flex items-center gap-4 ${mode === 'withdraw' ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-200'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'} text-white`}>
                        <Check className="w-5 h-5" />
                    </div>
                    <span className={`text-base font-medium ${mode === 'withdraw' ? 'text-amber-800' : 'text-teal-800'}`}>
                        {lastAction}
                    </span>
                </div>
            )}

            {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-base font-medium text-red-800">Action Failed</p>
                        <p className="text-sm text-red-600">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Action Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className={`h-1.5 ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                <div className="p-6 lg:p-8">
                    <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-xl mb-6 max-w-md mx-auto">
                        <button
                            onClick={() => { setMode('withdraw'); setQuantity(1); setShowCustomInput(false); }}
                            className={`flex-1 py-3 px-6 text-base font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'withdraw'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ArrowDownToLine className="w-5 h-5" />
                            Withdraw
                        </button>
                        <button
                            onClick={() => { setMode('return'); setQuantity(1); setShowCustomInput(false); }}
                            className={`flex-1 py-3 px-6 text-base font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'return'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ArrowUpFromLine className="w-5 h-5" />
                            Return
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-3 text-center">
                        {mode === 'withdraw' ? 'How many bags to withdraw?' : 'How many bags to return?'}
                    </p>
                    <div className="flex gap-3 mb-5 max-w-lg mx-auto">
                        {QUICK_AMOUNTS.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => handleQuickSelect(amount)}
                                disabled={mode === 'withdraw' && amount > currentBags}
                                className={`flex-1 py-4 rounded-xl font-bold text-xl transition-all ${quantity === amount && !showCustomInput
                                    ? mode === 'withdraw'
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : 'bg-teal-500 text-white shadow-md'
                                    : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${mode === 'withdraw' && amount > currentBags ? 'opacity-40 cursor-not-allowed' : ''}`
                                    }`}
                            >
                                {amount}
                            </button>
                        ))}
                        <button
                            onClick={handleCustomClick}
                            className={`flex-1 py-4 rounded-xl font-semibold text-base transition-all ${showCustomInput
                                ? mode === 'withdraw'
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-teal-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Other
                        </button>
                    </div>

                    {showCustomInput && (
                        <div className="flex items-center justify-center gap-5 mb-5">
                            <button
                                onClick={decrementQuantity}
                                disabled={quantity <= 1}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'withdraw'
                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                    : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                    }`}
                            >
                                <Minus className="w-6 h-6" />
                            </button>

                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    if (mode === 'withdraw') {
                                        setQuantity(Math.min(Math.max(0, val), currentBags));
                                    } else {
                                        setQuantity(Math.max(0, val));
                                    }
                                }}
                                className={`w-36 h-16 text-center text-4xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 ${mode === 'withdraw'
                                    ? 'border-amber-300 focus:ring-amber-500/30'
                                    : 'border-teal-300 focus:ring-teal-500/30'
                                    }`}
                                min={1}
                                max={mode === 'withdraw' ? currentBags : undefined}
                            />

                            <button
                                onClick={incrementQuantity}
                                disabled={mode === 'withdraw' && quantity >= currentBags}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'withdraw'
                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                    : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                    }`}
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>
                    )}

                    <div className={`p-4 rounded-xl mb-5 max-w-lg mx-auto ${mode === 'withdraw' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                        <div className="flex items-center justify-center gap-3 text-base">
                            <span className={`font-medium ${mode === 'withdraw' ? 'text-amber-600' : 'text-teal-600'}`}>
                                {mode === 'withdraw' ? 'Removing' : 'Adding'} {quantity} bag{quantity !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-semibold text-gray-800">
                                New total: {formatNumber(newBags)} bags ({formatNumber(newKg)} kg)
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!isValidQuantity || isPending}
                        className={`w-full max-w-lg mx-auto block py-5 rounded-xl font-bold text-xl text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${mode === 'withdraw'
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-teal-500 hover:bg-teal-600'
                            }`}
                    >
                        {isPending ? (
                            <RefreshCw className="animate-spin w-6 h-6" />
                        ) : mode === 'withdraw' ? (
                            <>
                                <ArrowDownToLine className="w-6 h-6" />
                                Withdraw {quantity} Bag{quantity !== 1 ? 's' : ''}
                            </>
                        ) : (
                            <>
                                <ArrowUpFromLine className="w-6 h-6" />
                                Return {quantity} Bag{quantity !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>

                    {mode === 'withdraw' && quantity > currentBags && (
                        <p className="text-red-500 text-sm text-center mt-3 flex items-center justify-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            Cannot withdraw more than available stock
                        </p>
                    )}
                </div>
            </div>

            {/* Activity Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        refetchTransactions();
                        setShowActivityDrawer(true);
                    }}
                    className="flex-1 py-4 px-5 bg-white rounded-xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-gray-600" />
                        </div>
                        <span className="font-semibold text-gray-900 text-lg">Activity History</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {(withdrawCount + returnCount) > 0 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                                {withdrawCount + returnCount} records
                            </span>
                        )}
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                    </div>
                </button>

                <button
                    onClick={() => refetch()}
                    className="py-4 px-5 bg-white rounded-xl border border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                >
                    <RefreshCw className="w-5 h-5" />
                    <span className="font-medium">Sync</span>
                </button>
            </div>

            {/* Activity Drawer */}
            {showActivityDrawer && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        onClick={() => setShowActivityDrawer(false)}
                    />

                    <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl text-gray-900">Activity History</h2>
                                    <p className="text-sm text-gray-500">{withdrawCount + returnCount} total transactions</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowActivityDrawer(false)}
                                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-amber-50 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                            <ArrowDownToLine className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <span className="text-sm font-medium text-amber-700">Withdrawals</span>
                                    </div>
                                    <p className="text-4xl font-bold text-amber-800 tabular-nums">{withdrawCount}</p>
                                </div>
                                <div className="bg-teal-50 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                                            <ArrowUpFromLine className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <span className="text-sm font-medium text-teal-700">Returns</span>
                                    </div>
                                    <p className="text-4xl font-bold text-teal-800 tabular-nums">{returnCount}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-4">
                                    Transaction History
                                </h3>
                                <div className="space-y-3">
                                    {kitchenTransactions.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-base text-gray-400 font-medium">No transactions yet</p>
                                            <p className="text-sm text-gray-400">Withdrawals and returns will appear here</p>
                                        </div>
                                    ) : (
                                        kitchenTransactions.map((t: any) => {
                                            const isWithdraw = t.type === 'issue';
                                            const bags = Math.round(t.quantity / 10);
                                            const date = new Date(t.created_at);
                                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                                            return (
                                                <div
                                                    key={t.id}
                                                    className={`p-4 rounded-xl border-2 flex items-center justify-between ${isWithdraw
                                                        ? 'bg-amber-50 border-amber-100'
                                                        : 'bg-teal-50 border-teal-100'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isWithdraw ? 'bg-amber-100' : 'bg-teal-100'}`}>
                                                            {isWithdraw ? (
                                                                <ArrowDownToLine className="w-5 h-5 text-amber-600" />
                                                            ) : (
                                                                <ArrowUpFromLine className="w-5 h-5 text-teal-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className={`text-base font-semibold ${isWithdraw ? 'text-amber-800' : 'text-teal-800'}`}>
                                                                {isWithdraw ? 'Withdrew' : 'Returned'} {bags} bag{bags !== 1 ? 's' : ''}
                                                            </span>
                                                            <p className="text-sm text-gray-500">{t.notes || 'Kitchen operation'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-gray-700">{timeStr}</p>
                                                        <p className="text-sm text-gray-400">{dateStr}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
