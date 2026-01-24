import { useState } from 'react';
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
    Truck,
    Activity,
    Clock,
    AlertTriangle,
    TrendingDown,
    ChevronRight,
    Scale,
} from 'lucide-react';
import { Button } from '../components/ui';
import { stockApi, referenceApi, pendingDeliveriesApi, stockRequestsApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import ReceiveModal from '../components/modals/ReceiveModal';

type Mode = 'withdraw' | 'return';

const QUICK_AMOUNTS = [1, 2, 5, 10];

// Target stock levels (in kg) - matching StockPage
const TARGET_STOCK_KG = 150000; // 150 tons for shop/kitchen

// Status thresholds based on % of target
type StockStatus = 'healthy' | 'low' | 'critical';

function getStockStatus(qty: number): StockStatus {
    const percent = (qty / TARGET_STOCK_KG) * 100;
    if (percent >= 85) return 'healthy';
    if (percent >= 65) return 'low';
    return 'critical';
}

function getCapacityPercent(qty: number): number {
    return Math.min(100, Math.round((qty / TARGET_STOCK_KG) * 100));
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
    healthy: { label: 'Healthy', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', barColor: 'bg-emerald-500', accentColor: 'bg-emerald-400' },
    low: { label: 'Low Stock', textColor: 'text-amber-700', bgColor: 'bg-amber-50', barColor: 'bg-amber-500', accentColor: 'bg-amber-400' },
    critical: { label: 'Critical', textColor: 'text-red-700', bgColor: 'bg-red-50', barColor: 'bg-red-500', accentColor: 'bg-red-400' },
};

export default function KitchenPage() {
    const queryClient = useQueryClient();
    const { user, isManager } = useAuthStore();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showReceiveModal, setShowReceiveModal] = useState(false);

    // State for the UI
    const [mode, setMode] = useState<Mode>('withdraw');
    const [quantity, setQuantity] = useState<number>(1);
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Fetch current stock for this location
    const { data: stockData, isLoading: isStockLoading, refetch } = useQuery({
        queryKey: ['stock', 'balance', user?.location_id],
        queryFn: () => stockApi.getBalance(user?.location_id).then(r => r.data),
        enabled: !!user?.location_id,
    });

    // Fetch items to find Potatoes if balance is zero
    const { data: itemsData, isLoading: isItemsLoading } = useQuery({
        queryKey: ['reference', 'items'],
        queryFn: () => referenceApi.getItems().then(r => r.data),
    });

    const potatoItem = itemsData?.items?.find((i: any) => i.name?.toLowerCase().includes('potato')) ||
        itemsData?.items?.[0];

    // Fetch pending deliveries for this location
    const { data: pendingData } = useQuery({
        queryKey: ['pending-deliveries', 'pending', user?.location_id],
        queryFn: () => pendingDeliveriesApi.getPending(user?.location_id, 5).then(r => r.data),
        enabled: !!user?.location_id,
    });

    // Fetch my stock requests
    const { data: requestsData } = useQuery({
        queryKey: ['stock-requests', 'my', user?.location_id],
        queryFn: () => stockRequestsApi.getMyRequests('pending', 5).then(r => r.data),
        enabled: !!user?.location_id,
    });

    const pendingDeliveries = pendingData?.deliveries || [];
    const myRequests = requestsData?.requests || [];

    // Withdraw mutation (existing consume logic)
    const withdrawMutation = useMutation({
        mutationFn: (qty: number) => {
            const itemId = potatoStock?.item_id || potatoItem?.id;
            if (!itemId) throw new Error("Potato item not found in system");

            return stockApi.issue({
                quantity: qty,
                unit: 'bag',
                notes: 'Kitchen consumption',
                item_id: itemId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            refetch();
            setLastAction(`Withdrew ${quantity} bag${quantity > 1 ? 's' : ''} from stock`);
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

    // Return mutation (adds stock back)
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            refetch();
            setLastAction(`Returned ${quantity} bag${quantity > 1 ? 's' : ''} to stock`);
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

        const actionText = mode === 'withdraw' ? 'withdraw' : 'return';
        if (window.confirm(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${quantity} bag${quantity > 1 ? 's' : ''}?`)) {
            if (mode === 'withdraw') {
                withdrawMutation.mutate(quantity);
            } else {
                returnMutation.mutate(quantity);
            }
        }
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

    // Prefer batch_totals (calculated directly from batches) over stock_balance view
    const batchData = stockData?.batch_totals || [];
    const balanceData = stockData?.balance || [];

    // Use batch_totals first as it's more accurate after updates
    const potatoStock = batchData.find((b: any) => b.item_name?.toLowerCase().includes('potato')) ||
        batchData[0] ||
        balanceData.find((b: any) => b.item_name?.toLowerCase().includes('potato')) ||
        balanceData[0];

    const currentBags = potatoStock ? Math.floor(potatoStock.on_hand_qty / 10) : 0;
    const currentKg = potatoStock?.on_hand_qty || 0;
    const isLoading = isStockLoading || isItemsLoading;
    const isPending = withdrawMutation.isPending || returnMutation.isPending;

    // Calculate preview
    const newBags = mode === 'withdraw' ? currentBags - quantity : currentBags + quantity;
    const newKg = mode === 'withdraw' ? currentKg - (quantity * 10) : currentKg + (quantity * 10);
    const isValidQuantity = quantity > 0 && (mode === 'return' || quantity <= currentBags);

    // Stock status calculations
    const stockStatus = getStockStatus(currentKg);
    const statusStyle = STATUS_CONFIG[stockStatus];
    const capacityPercent = getCapacityPercent(currentKg);
    const targetBags = Math.floor(TARGET_STOCK_KG / 10);
    const neededBags = Math.max(0, targetBags - currentBags);

    // Calculate alerts
    const hasLowStock = stockStatus !== 'healthy';
    const hasPendingDeliveries = pendingDeliveries.length > 0;
    const hasPendingRequests = myRequests.length > 0;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Tiles Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryTile
                    icon={Package}
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                    label="Current Stock"
                    value={formatNumber(currentBags)}
                    unit="bags"
                />
                <SummaryTile
                    icon={Scale}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                    label="Total Weight"
                    value={formatNumber(currentKg)}
                    unit="kg"
                />
                <SummaryTile
                    icon={stockStatus === 'healthy' ? Package : stockStatus === 'low' ? TrendingDown : AlertTriangle}
                    iconBg={statusStyle.bgColor}
                    iconColor={statusStyle.textColor}
                    label="Status"
                    value={statusStyle.label}
                    highlight={stockStatus === 'low' ? 'warning' : stockStatus === 'critical' ? 'error' : undefined}
                />
                <SummaryTile
                    icon={Clock}
                    iconBg="bg-gray-100"
                    iconColor="text-gray-600"
                    label="Last Activity"
                    value={getRelativeTime(potatoStock?.last_activity || null)}
                />
            </div>

            {/* Middle Row: Stock Level + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Stock Level vs Target Card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex">
                    <div className={`w-0.5 shrink-0 ${statusStyle.accentColor}`} />
                    <div className="flex-1 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Stock Level vs Target</h3>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                                {statusStyle.label}
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-4xl font-bold text-gray-900 tabular-nums">{formatNumber(currentBags)}</span>
                            <span className="text-sm text-gray-400">/ {formatNumber(targetBags)} bags</span>
                        </div>

                        {/* Capacity Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className={`font-medium ${statusStyle.textColor}`}>{capacityPercent}% of target</span>
                                <span className="text-gray-400">{formatNumber(currentKg)} / {formatNumber(TARGET_STOCK_KG)} kg</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                                {/* Threshold markers */}
                                <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-300 z-10" style={{ left: '85%' }} />
                                <div className="absolute top-0 bottom-0 w-0.5 bg-amber-300 z-10" style={{ left: '65%' }} />
                                <div className={`h-full rounded-full transition-all ${statusStyle.barColor}`} style={{ width: `${capacityPercent}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Critical &lt;65%</span>
                                <span>Low 65-84%</span>
                                <span>Healthy ≥85%</span>
                            </div>
                        </div>

                        {/* Needed to target */}
                        {stockStatus !== 'healthy' && neededBags > 0 && (
                            <p className="text-sm text-gray-600 mt-4">
                                Need <span className="font-semibold text-gray-800">+{formatNumber(neededBags)} bags</span> to reach target
                            </p>
                        )}

                        {isManager() && (
                            <Button
                                onClick={() => setShowReceiveModal(true)}
                                className="mt-4 w-full gap-2"
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                Receive New Stock
                            </Button>
                        )}
                    </div>
                </div>

                {/* Kitchen Alerts Card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex">
                    <div className={`w-0.5 shrink-0 ${hasLowStock || hasPendingDeliveries ? 'bg-amber-400' : 'bg-gray-200'}`} />
                    <div className="flex-1 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                            <h3 className="font-semibold text-gray-900">Kitchen Alerts</h3>
                        </div>

                        <div className="space-y-3">
                            {/* Low Stock Alert */}
                            {hasLowStock && (
                                <div className={`p-3 rounded-xl ${statusStyle.bgColor} border border-${stockStatus === 'critical' ? 'red' : 'amber'}-200`}>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className={`w-4 h-4 ${statusStyle.textColor}`} />
                                        <span className={`text-sm font-medium ${statusStyle.textColor}`}>
                                            {stockStatus === 'critical' ? 'Critical: Stock below 65%' : 'Warning: Stock below 85%'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Pending Deliveries */}
                            {hasPendingDeliveries && (
                                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-orange-600" />
                                            <span className="text-sm font-medium text-orange-700">
                                                {pendingDeliveries.length} delivery awaiting confirmation
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-orange-400" />
                                    </div>
                                </div>
                            )}

                            {/* Pending Requests */}
                            {hasPendingRequests && (
                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-700">
                                                {myRequests.length} open stock request{myRequests.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-blue-400" />
                                    </div>
                                </div>
                            )}

                            {/* No Alerts */}
                            {!hasLowStock && !hasPendingDeliveries && !hasPendingRequests && (
                                <div className="text-center py-6">
                                    <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                                    <p className="text-sm text-gray-500">All clear - no alerts</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Adjust Stock + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Adjust Stock Card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex">
                    <div className={`w-0.5 shrink-0 ${mode === 'withdraw' ? 'bg-amber-400' : 'bg-teal-400'}`} />
                    <div className="flex-1 p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Adjust Stock</h3>

                        {/* Mode Toggle - Pill/Segmented Control */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mb-5">
                            <button
                                onClick={() => { setMode('withdraw'); setQuantity(1); setShowCustomInput(false); }}
                                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'withdraw'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <ArrowUpFromLine className="w-4 h-4" />
                                Withdraw
                            </button>
                            <button
                                onClick={() => { setMode('return'); setQuantity(1); setShowCustomInput(false); }}
                                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'return'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                Return
                            </button>
                        </div>

                        {/* Quick Select Buttons */}
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                            {mode === 'withdraw' ? 'How many bags to withdraw?' : 'How many bags to return?'}
                        </p>
                        <div className="flex gap-2 mb-4">
                            {QUICK_AMOUNTS.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => handleQuickSelect(amount)}
                                    disabled={mode === 'withdraw' && amount > currentBags}
                                    className={`flex-1 py-3 rounded-xl font-semibold text-lg transition-all ${quantity === amount && !showCustomInput
                                        ? mode === 'withdraw'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'bg-teal-500 text-white shadow-sm'
                                        : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${mode === 'withdraw' && amount > currentBags ? 'opacity-40 cursor-not-allowed' : ''}`
                                        }`}
                                >
                                    {amount}
                                </button>
                            ))}
                            <button
                                onClick={handleCustomClick}
                                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${showCustomInput
                                    ? mode === 'withdraw'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-teal-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Other
                            </button>
                        </div>

                        {/* Manual Input with Stepper */}
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
                                    <Minus className="w-4 h-4" />
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
                                    className={`w-24 h-12 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 ${mode === 'withdraw'
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
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Live Preview */}
                        <div className={`p-3 rounded-xl mb-4 ${mode === 'withdraw' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <span className={`font-medium ${mode === 'withdraw' ? 'text-amber-600' : 'text-teal-600'}`}>
                                    {mode === 'withdraw' ? 'Removing' : 'Adding'} {quantity} bag{quantity !== 1 ? 's' : ''}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="font-semibold text-gray-800">
                                    New total: {formatNumber(newBags)} bags ({formatNumber(newKg)} kg)
                                </span>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!isValidQuantity || isPending}
                            className={`w-full py-3 rounded-xl font-semibold text-white transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${mode === 'withdraw'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-teal-500 hover:bg-teal-600'
                                }`}
                        >
                            {isPending ? (
                                <RefreshCw className="animate-spin w-4 h-4" />
                            ) : mode === 'withdraw' ? (
                                <>
                                    <ArrowUpFromLine className="w-4 h-4" />
                                    Withdraw {quantity} Bag{quantity !== 1 ? 's' : ''}
                                </>
                            ) : (
                                <>
                                    <ArrowDownToLine className="w-4 h-4" />
                                    Return {quantity} Bag{quantity !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>

                        {/* Validation Warning */}
                        {mode === 'withdraw' && quantity > currentBags && (
                            <p className="text-red-500 text-xs text-center mt-2 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Cannot withdraw more than available stock
                            </p>
                        )}
                    </div>
                </div>

                {/* Recent Activity Card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex">
                    <div className="w-0.5 shrink-0 bg-gray-200" />
                    <div className="flex-1 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-gray-400" />
                            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                        </div>

                        {/* Success/Error Feedback */}
                        {lastAction && (
                            <div className={`p-3 rounded-xl mb-3 flex items-center gap-3 ${mode === 'withdraw' ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-200'
                                }`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'
                                    } text-white`}>
                                    <Check className="w-4 h-4" />
                                </div>
                                <span className={`text-sm font-medium ${mode === 'withdraw' ? 'text-amber-800' : 'text-teal-800'}`}>
                                    {lastAction}
                                </span>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="p-3 rounded-xl mb-3 bg-red-50 border border-red-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-red-800">Action Failed</p>
                                    <p className="text-xs text-red-600">{errorMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* Incoming Stock Section */}
                        {(pendingDeliveries.length > 0 || myRequests.length > 0) && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Incoming Stock</p>
                                {pendingDeliveries.map((d: any) => (
                                    <div key={d.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                <Truck className="w-4 h-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">
                                                    {d.driver_claimed_bags || Math.round(d.driver_claimed_qty_kg / 10)} bags
                                                </span>
                                                <span className="text-xs text-gray-400 ml-2">from {d.supplier?.name || 'Supplier'}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full font-medium">
                                            Pending
                                        </span>
                                    </div>
                                ))}
                                {myRequests.map((r: any) => (
                                    <div key={r.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <Package className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">{r.quantity_bags} bags</span>
                                                <span className="text-xs text-gray-400 ml-2">requested</span>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'in_delivery' ? 'text-blue-600 bg-blue-100' :
                                            r.status === 'accepted' ? 'text-emerald-600 bg-emerald-100' :
                                                'text-gray-600 bg-gray-200'
                                            }`}>{r.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!lastAction && !errorMessage && pendingDeliveries.length === 0 && myRequests.length === 0 && (
                            <div className="text-center py-8">
                                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-400">No recent activity</p>
                            </div>
                        )}

                        {/* Manual Refresh */}
                        <div className="pt-4 border-t border-gray-100">
                            <button
                                onClick={() => refetch()}
                                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Sync Stock State
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ReceiveModal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                onSuccess={() => {
                    refetch();
                    setShowReceiveModal(false);
                }}
            />
        </div>
    );
}

// Summary Tile Component - Matching StockPage design
function SummaryTile({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    value,
    unit,
    highlight,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    unit?: string;
    highlight?: 'warning' | 'error';
}) {
    // Determine accent color based on state
    const accentColor =
        highlight === 'warning' ? 'bg-amber-300' :
            highlight === 'error' ? 'bg-red-300' :
                'bg-gray-200';

    return (
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex">
            {/* Left accent bar */}
            <div className={`w-0.5 shrink-0 ${accentColor}`} />

            {/* Content */}
            <div className="flex-1 p-5">
                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-gray-900 tabular-nums">{value}</span>
                    {unit && <span className="text-xs text-gray-400">{unit}</span>}
                </div>
            </div>
        </div>
    );
}
