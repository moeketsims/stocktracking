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
    X,
} from 'lucide-react';
import { stockApi, referenceApi, pendingDeliveriesApi, stockRequestsApi, transactionsApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

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
    const { user } = useAuthStore();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showActivityDrawer, setShowActivityDrawer] = useState(false);

    // State for the UI
    const [mode, setMode] = useState<Mode>('withdraw');
    const [quantity, setQuantity] = useState<number>(1);
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Local adjustment to track stock changes immediately (in kg)
    // This ensures the UI updates instantly without waiting for DB view refresh
    const [stockAdjustmentKg, setStockAdjustmentKg] = useState(0);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);

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

    // Fetch transaction history (withdrawals and returns)
    const { data: transactionsData, refetch: refetchTransactions } = useQuery({
        queryKey: ['transactions', 'kitchen', user?.location_id],
        queryFn: async () => {
            console.log('[KitchenPage] Fetching transactions for location:', user?.location_id);
            const response = await transactionsApi.getAll({
                view_location_id: user?.location_id,
                limit: 50
            });
            console.log('[KitchenPage] Full API response:', response);
            console.log('[KitchenPage] Response data:', response.data);
            return response.data;
        },
        enabled: !!user?.location_id,
        staleTime: 0, // Always refetch when invalidated
    });

    const pendingDeliveries = pendingData?.deliveries || [];
    const myRequests = requestsData?.requests || [];

    // Filter for issue (withdraw) and return transactions only
    const allTransactions = transactionsData?.transactions || [];
    console.log('[KitchenPage] transactionsData:', transactionsData);
    console.log('[KitchenPage] allTransactions:', allTransactions);
    console.log('[KitchenPage] user location_id:', user?.location_id);
    const kitchenTransactions = allTransactions.filter(
        (t: any) => t.type === 'issue' || t.type === 'return'
    );
    console.log('[KitchenPage] kitchenTransactions (filtered):', kitchenTransactions);

    // Count totals
    const withdrawCount = kitchenTransactions.filter((t: any) => t.type === 'issue').length;
    const returnCount = kitchenTransactions.filter((t: any) => t.type === 'return').length;

    // Withdraw mutation (existing consume logic)
    const withdrawMutation = useMutation({
        mutationFn: async (qty: number) => {
            const itemId = potatoStock?.item_id || potatoItem?.id;
            console.log('[KitchenPage] WITHDRAW - Starting withdrawal of', qty, 'bags');
            console.log('[KitchenPage] WITHDRAW - Item ID:', itemId);
            if (!itemId) throw new Error("Potato item not found in system");

            const response = await stockApi.issue({
                quantity: qty,
                unit: 'bag',
                notes: 'Kitchen consumption',
                item_id: itemId
            });
            console.log('[KitchenPage] WITHDRAW - API Response:', response.data);
            return response;
        },
        onSuccess: async (_data, qty) => {
            // Immediately adjust local stock (subtract bags * 10kg)
            setStockAdjustmentKg(prev => prev - (qty * 10));

            // Invalidate and refetch all related queries
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            await queryClient.invalidateQueries({ queryKey: ['transactions', 'kitchen'] });

            // Force refetch transactions to update counts
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
        onSuccess: async (_data, qty) => {
            // Immediately adjust local stock (add bags * 10kg)
            setStockAdjustmentKg(prev => prev + (qty * 10));

            // Invalidate and refetch all related queries
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            await queryClient.invalidateQueries({ queryKey: ['transactions', 'kitchen'] });

            // Force refetch transactions to update counts
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

    // Prefer batch_totals (calculated directly from batches) over stock_balance view
    const batchData = stockData?.batch_totals || [];
    const balanceData = stockData?.balance || [];

    // Use batch_totals first as it's more accurate after updates
    const potatoStock = batchData.find((b: any) => b.item_name?.toLowerCase().includes('potato')) ||
        batchData[0] ||
        balanceData.find((b: any) => b.item_name?.toLowerCase().includes('potato')) ||
        balanceData[0];

    // Apply local adjustment to get accurate current stock
    // This ensures immediate UI updates after withdraw/return operations
    const baseKg = potatoStock?.on_hand_qty || 0;
    const currentKg = baseKg + stockAdjustmentKg;
    const currentBags = Math.floor(currentKg / 10);
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

    // Calculate status
    const hasLowStock = stockStatus !== 'healthy';

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
                <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-4">
            {/* Top Section: Stock Summary + Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Stock Card - Takes 2 columns on large screens */}
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

                        {/* Progress bar */}
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

                        {/* Stats row */}
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

                {/* Quick Stats Column */}
                <div className="flex flex-col gap-4">
                    {/* Withdrawals Today */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <ArrowDownToLine className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Withdrawals</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 tabular-nums">{withdrawCount}</p>
                    </div>

                    {/* Returns Today */}
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

            {/* Main Action Card - Withdraw/Return */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className={`h-1.5 ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                <div className="p-6 lg:p-8">
                    {/* Mode Toggle - Pill/Segmented Control */}
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

                    {/* Quick Select Buttons */}
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

                    {/* Manual Input with Stepper */}
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

                    {/* Live Preview */}
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

                    {/* Confirm Button */}
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

                    {/* Validation Warning */}
                    {mode === 'withdraw' && quantity > currentBags && (
                        <p className="text-red-500 text-sm text-center mt-3 flex items-center justify-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            Cannot withdraw more than available stock
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Row: Activity + Sync */}
            <div className="flex items-center gap-4">
                {/* Activity Button */}
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
                        {kitchenTransactions.length > 0 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                                {kitchenTransactions.length} records
                            </span>
                        )}
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                    </div>
                </button>

                {/* Sync Button */}
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
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        onClick={() => setShowActivityDrawer(false)}
                    />

                    {/* Drawer */}
                    <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl text-gray-900">Activity History</h2>
                                    <p className="text-sm text-gray-500">{kitchenTransactions.length} total transactions</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowActivityDrawer(false)}
                                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Summary Stats */}
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

                            {/* Transaction History */}
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
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isWithdraw ? 'bg-amber-100' : 'bg-teal-100'
                                                            }`}>
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

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={handleCancel}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            {/* Header */}
                            <div className={`p-6 ${mode === 'withdraw' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'}`}>
                                        {mode === 'withdraw' ? (
                                            <ArrowDownToLine className="w-7 h-7 text-white" />
                                        ) : (
                                            <ArrowUpFromLine className="w-7 h-7 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900">
                                            Confirm {mode === 'withdraw' ? 'Withdrawal' : 'Return'}
                                        </h3>
                                        <p className="text-sm text-gray-500">Please review before proceeding</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-center text-gray-700 text-xl">
                                    Are you sure you want to {mode} <span className="font-bold">{quantity} bag{quantity !== 1 ? 's' : ''}</span>?
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="p-6 pt-0 flex gap-4">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-4 px-5 rounded-xl font-semibold text-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    No
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isPending}
                                    className={`flex-1 py-4 px-5 rounded-xl font-semibold text-lg text-white transition-colors flex items-center justify-center gap-2 ${mode === 'withdraw'
                                        ? 'bg-amber-500 hover:bg-amber-600'
                                        : 'bg-teal-500 hover:bg-teal-600'
                                        }`}
                                >
                                    {isPending ? (
                                        <RefreshCw className="animate-spin w-5 h-5" />
                                    ) : (
                                        'Yes'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
