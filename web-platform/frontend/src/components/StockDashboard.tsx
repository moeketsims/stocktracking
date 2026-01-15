import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Package, TrendingUp, AlertCircle } from 'lucide-react';

interface StockItem {
    location_name: string;
    item_name: string;
    on_hand_qty: number;
    unit: string;
}

const StockDashboard = () => {
    const { data: stockBalance, isLoading, error } = useQuery<StockItem[]>({
        queryKey: ['stock-balance'],
        queryFn: async () => {
            const response = await axios.get('http://localhost:3001/api/stock-balance');
            return response.data;
        },
    });

    if (isLoading) return <div className="animate-pulse flex items-center justify-center p-12">Loading stock data...</div>;
    if (error) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">Error loading stock data: {(error as Error).message}</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Stock</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {stockBalance?.reduce((acc, curr) => acc + curr.on_hand_qty, 0).toFixed(1)} kg
                            </h3>
                        </div>
                    </div>
                </div>
                {/* Placeholder cards */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Daily Average</p>
                            <h3 className="text-2xl font-bold text-gray-900">45.0 kg</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Days of Cover</p>
                            <h3 className="text-2xl font-bold text-gray-900">5 Days</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Stock Levels by Location</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3">Item</th>
                                <th className="px-6 py-3">On Hand</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {stockBalance?.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.location_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{item.item_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{item.on_hand_qty} {item.unit}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            Healthy
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {!stockBalance?.length && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">No stock data available. Ensure Supabase is running and migrated.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StockDashboard;
