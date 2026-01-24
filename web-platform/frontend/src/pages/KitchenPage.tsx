import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Minus, Plus, Check, AlertCircle, RefreshCw, ArrowDownToLine, ArrowUpFromLine, Truck } from 'lucide-react';
import { Button } from '../components/ui';
import { stockApi, referenceApi, pendingDeliveriesApi, stockRequestsApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import ReceiveModal from '../components/modals/ReceiveModal';

type Mode = 'withdraw' | 'return';

const QUICK_AMOUNTS = [1, 2, 5, 10];

export default function KitchenPage() {
    const queryClient = useQueryClient();
    const { user, isManager } = useAuthStore();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showReceiveModal, setShowReceiveModal] = useState(false);

    // New state for the redesigned UI
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            refetch(); // Explicitly refetch to ensure UI updates
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

    // Return mutation (new - adds stock back)
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
            refetch(); // Explicitly refetch to ensure UI updates
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

    // Mode colors
    const modeColors = {
        withdraw: {
            bg: 'bg-amber-500',
            bgLight: 'bg-amber-50',
            border: 'border-amber-500',
            text: 'text-amber-600',
            hover: 'hover:bg-amber-600',
            ring: 'ring-amber-500',
        },
        return: {
            bg: 'bg-teal-500',
            bgLight: 'bg-teal-50',
            border: 'border-teal-500',
            text: 'text-teal-600',
            hover: 'hover:bg-teal-600',
            ring: 'ring-teal-500',
        },
    };

    const colors = modeColors[mode];

    if (isLoading) return <div className="p-8 text-center">Loading Stock...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Stock Display */}
            <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Package size={120} />
                </div>
                <h2 className="text-xl font-medium opacity-90 mb-2">Current Stock in Kitchen</h2>
                <div className="flex items-baseline gap-2">
                    <span className="text-8xl font-black">{currentBags.toLocaleString()}</span>
                    <span className="text-2xl font-bold uppercase tracking-widest">Bags</span>
                </div>
                <p className="mt-4 text-emerald-100 font-medium bg-emerald-700/50 px-4 py-1 rounded-full text-sm">
                    {potatoStock ? `${currentKg.toLocaleString()} kg total` : 'No stock found'}
                </p>

                {isManager() && (
                    <Button
                        onClick={() => setShowReceiveModal(true)}
                        className="mt-6 bg-white text-emerald-600 hover:bg-emerald-50 rounded-full px-6 border-none shadow-lg text-xs font-bold uppercase tracking-wider"
                    >
                        Receive New Stock
                    </Button>
                )}
            </div>

            {/* Incoming Stock Section */}
            {(pendingDeliveries.length > 0 || myRequests.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-amber-600" />
                        Incoming Stock
                    </h3>

                    {pendingDeliveries.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <p className="text-xs uppercase tracking-wide text-amber-700 font-medium">Awaiting Confirmation</p>
                            {pendingDeliveries.map((d: any) => (
                                <div key={d.id} className="bg-white rounded-xl p-3 border border-amber-100 flex justify-between items-center">
                                    <div>
                                        <span className="font-medium text-gray-800">{d.driver_claimed_bags || Math.round(d.driver_claimed_qty_kg / 10)} bags</span>
                                        <span className="text-gray-400 text-sm ml-2">from {d.supplier?.name || 'Supplier'}</span>
                                    </div>
                                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {myRequests.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-amber-700 font-medium">Open Requests</p>
                            {myRequests.map((r: any) => (
                                <div key={r.id} className="bg-white rounded-xl p-3 border border-amber-100 flex justify-between items-center">
                                    <div>
                                        <span className="font-medium text-gray-800">{r.quantity_bags} bags</span>
                                        <span className="text-gray-400 text-sm ml-2">requested</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'in_delivery' ? 'text-blue-600 bg-blue-100' :
                                        r.status === 'accepted' ? 'text-green-600 bg-green-100' :
                                            'text-gray-600 bg-gray-100'
                                        }`}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Mode Toggle */}
            <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setMode('withdraw'); setQuantity(1); }}
                        className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${mode === 'withdraw'
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <ArrowUpFromLine size={24} />
                        Withdraw
                    </button>
                    <button
                        onClick={() => { setMode('return'); setQuantity(1); }}
                        className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${mode === 'return'
                                ? 'bg-teal-500 text-white shadow-lg'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <ArrowDownToLine size={24} />
                        Return
                    </button>
                </div>
            </div>

            {/* Quantity Input Panel */}
            <div className={`bg-white rounded-2xl p-6 shadow-lg border-2 ${colors.border} transition-colors`}>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${colors.text} mb-4`}>
                    {mode === 'withdraw' ? 'How many bags to withdraw?' : 'How many bags to return?'}
                </h3>

                {/* Quick Select Buttons */}
                <div className="flex gap-3 mb-6">
                    {QUICK_AMOUNTS.map((amount) => (
                        <button
                            key={amount}
                            onClick={() => handleQuickSelect(amount)}
                            disabled={mode === 'withdraw' && amount > currentBags}
                            className={`flex-1 py-4 rounded-xl font-bold text-xl transition-all ${quantity === amount && !showCustomInput
                                    ? `${colors.bg} text-white shadow-lg scale-105`
                                    : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${mode === 'withdraw' && amount > currentBags ? 'opacity-40 cursor-not-allowed' : ''}`
                                }`}
                        >
                            {amount}
                        </button>
                    ))}
                    <button
                        onClick={handleCustomClick}
                        className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all ${showCustomInput
                                ? `${colors.bg} text-white shadow-lg scale-105`
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Other
                    </button>
                </div>

                {/* Manual Input with Stepper */}
                {showCustomInput && (
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button
                            onClick={decrementQuantity}
                            disabled={quantity <= 1}
                            className={`w-14 h-14 rounded-full ${colors.bgLight} ${colors.text} font-bold text-2xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                        >
                            <Minus size={24} />
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
                            className={`w-32 h-16 text-center text-4xl font-black border-2 ${colors.border} rounded-xl focus:outline-none focus:ring-4 ${colors.ring}/30`}
                            min={1}
                            max={mode === 'withdraw' ? currentBags : undefined}
                        />

                        <button
                            onClick={incrementQuantity}
                            disabled={mode === 'withdraw' && quantity >= currentBags}
                            className={`w-14 h-14 rounded-full ${colors.bgLight} ${colors.text} font-bold text-2xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                )}

                {/* Live Preview */}
                <div className={`${colors.bgLight} rounded-xl p-4 mb-6`}>
                    <div className="flex items-center justify-center gap-2 text-lg">
                        {mode === 'withdraw' ? (
                            <>
                                <span className={`font-bold ${colors.text}`}>Removing {quantity} bag{quantity !== 1 ? 's' : ''}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-bold text-gray-800">New total: {newBags.toLocaleString()} bags</span>
                            </>
                        ) : (
                            <>
                                <span className={`font-bold ${colors.text}`}>Adding {quantity} bag{quantity !== 1 ? 's' : ''}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-bold text-gray-800">New total: {newBags.toLocaleString()} bags</span>
                            </>
                        )}
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-1">
                        ({quantity * 10} kg {mode === 'withdraw' ? 'out' : 'in'} → {newKg.toLocaleString()} kg total)
                    </p>
                </div>

                {/* Confirm Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!isValidQuantity || isPending}
                    className={`w-full py-5 rounded-xl font-bold text-xl text-white transition-all ${colors.bg} ${colors.hover} shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-3`}
                >
                    {isPending ? (
                        <RefreshCw className="animate-spin" size={24} />
                    ) : mode === 'withdraw' ? (
                        <>
                            <ArrowUpFromLine size={24} />
                            Withdraw {quantity} Bag{quantity !== 1 ? 's' : ''}
                        </>
                    ) : (
                        <>
                            <ArrowDownToLine size={24} />
                            Return {quantity} Bag{quantity !== 1 ? 's' : ''}
                        </>
                    )}
                </button>

                {/* Validation Warning */}
                {mode === 'withdraw' && quantity > currentBags && (
                    <p className="text-red-500 text-sm text-center mt-3 flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        Cannot withdraw more than available stock
                    </p>
                )}
            </div>

            {/* Feedback Alert */}
            {lastAction && (
                <div className={`${mode === 'withdraw' ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'} border rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
                    <div className={`w-10 h-10 ${mode === 'withdraw' ? 'bg-amber-500' : 'bg-teal-500'} rounded-full flex items-center justify-center text-white`}>
                        <Check size={24} />
                    </div>
                    <span className={`font-bold ${mode === 'withdraw' ? 'text-amber-800' : 'text-teal-800'}`}>{lastAction}</span>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="font-bold text-red-800">Action Failed</p>
                        <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Manual Refresh */}
            <div className="flex justify-center">
                <Button variant="secondary" onClick={() => refetch()} className="gap-2 text-gray-400">
                    <RefreshCw size={16} /> Sync Stock State
                </Button>
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
