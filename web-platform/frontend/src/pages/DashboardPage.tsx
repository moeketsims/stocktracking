import { useState } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Clock,
  Warehouse,
  Store,
  BarChart3,
  Activity,
  Trophy,
  Medal,
} from 'lucide-react';
import {
  Line,
  LineChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, Badge } from '../components/ui';
import UsageComparisonCharts from '../components/UsageComparisonCharts';
import LocationSelector from '../components/LocationSelector';
import { useDashboard, useAnalytics, useShopEfficiency } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getPreferredValue, getUnitLabel } from '../lib/unitDisplay';
import type { StockBalanceItem } from '../types';

// Chart color palette - matching the orange theme
const COLORS = {
  primary: '#f97316',    // Orange-500
  secondary: '#3b82f6',  // Blue-500
  success: '#22c55e',    // Green-500
  warning: '#eab308',    // Yellow-500
  danger: '#ef4444',     // Red-500
  purple: '#8b5cf6',     // Purple-500
  teal: '#14b8a6',       // Teal-500
  gray: '#6b7280',       // Gray-500
};

// Helper function to format numbers
const formatQty = (value: number): string => {
  if (value === 0) return '0';
  const formatted = value.toFixed(1);
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
};

// Format date for display
const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper to group stock balance by location
interface GroupedLocation {
  location_id: string;
  location_name: string;
  location_type: 'warehouse' | 'shop';
  total_qty: number;
  total_bags: number;
  items: StockBalanceItem[];
}

const groupByLocation = (items: StockBalanceItem[]): GroupedLocation[] => {
  const grouped: Record<string, GroupedLocation> = {};

  items.forEach(item => {
    const key = item.location_id;
    if (!grouped[key]) {
      grouped[key] = {
        location_id: item.location_id,
        location_name: item.location_name,
        location_type: item.location_name.toLowerCase().includes('warehouse') ? 'warehouse' : 'shop',
        total_qty: 0,
        total_bags: 0,
        items: [],
      };
    }
    grouped[key].items.push(item);
    // Use fallback calculation if on_hand_bags is undefined/null
    const itemQty = item.on_hand_qty || 0;
    const itemBags = item.on_hand_bags ?? (itemQty / 10);
    grouped[key].total_qty += itemQty;
    grouped[key].total_bags += itemBags;
  });

  return Object.values(grouped).sort((a, b) => {
    if (a.location_type !== b.location_type) {
      return a.location_type === 'warehouse' ? -1 : 1;
    }
    return a.location_name.localeCompare(b.location_name);
  });
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatQty(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [viewLocationId, setViewLocationId] = useState<string | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);
  const { data, isLoading, error } = useDashboard(viewLocationId);
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(selectedPeriod, viewLocationId);
  const { data: efficiencyData } = useShopEfficiency(selectedPeriod);
  const { user } = useAuthStore();
  const { defaultUnit } = useSettingsStore();
  const unitLabel = getUnitLabel(defaultUnit);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading dashboard: {(error as Error).message}
      </div>
    );
  }

  const { stats, forecast, stock_balance } = data || {
    stats: {
      total_stock_kg: 0,
      total_stock_bags: 0,
      received_today_kg: 0,
      received_today_bags: 0,
      issued_today_kg: 0,
      issued_today_bags: 0,
      wasted_today_kg: 0,
      wasted_today_bags: 0,
      active_batches: 0,
      low_stock_alerts: 0,
      reorder_alerts: 0,
      expiring_soon_alerts: 0,
    },
    forecast: {
      avg_daily_usage: 0,
      avg_daily_usage_bags: 0,
      days_of_cover: 0,
      stock_out_date: null,
      reorder_by_date: null,
      lead_time_days: 1,
      safety_stock_qty: 20,
      safety_stock_qty_bags: 2,
      reorder_point_qty: 50,
      reorder_point_qty_bags: 5,
      suggested_order_qty: 0,
      suggested_order_qty_bags: 0,
    },
    stock_balance: [],
  };

  const totalAlerts = stats.low_stock_alerts + stats.reorder_alerts + stats.expiring_soon_alerts;
  const groupedLocations = groupByLocation(stock_balance);

  // Prepare chart data
  const dailyUsageData = analyticsData?.daily_usage?.map(d => ({
    date: formatShortDate(d.date),
    fullDate: d.date,
    usage: defaultUnit === 'bag' ? d.bags_used : d.kg_used,
  })) || [];

  const hourlyData = analyticsData?.hourly_pattern?.map(h => ({
    hour: `${h.hour}:00`,
    usage: h.bags_used,
  })) || [];

  // Stock movement time series data (received/issued/wasted over time)
  const stockMovementData = analyticsData?.transaction_breakdown?.map(d => ({
    date: formatShortDate(d.date),
    fullDate: d.date,
    received: defaultUnit === 'bag' ? d.received_bags : d.received_kg,
    issued: defaultUnit === 'bag' ? d.issued_bags : d.issued_kg,
    wasted: defaultUnit === 'bag' ? d.wasted_bags : d.wasted_kg,
  })) || [];

  const trendDirection = analyticsData?.summary?.trend_direction;
  const trendPct = analyticsData?.summary?.trend_pct || 0;

  return (
    <div className="space-y-6">
      {/* Location Selector for location managers to view other shops */}
      <LocationSelector
        value={viewLocationId}
        onChange={setViewLocationId}
        className="mb-4"
      />

      {/* Premium Enterprise Header - compact overview row */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome back, {user?.full_name || 'User'}
          </h1>
          <p className="text-sm text-gray-500">Stock performance overview</p>
        </div>
        <div className="flex items-center gap-6">
          {/* Total Stock */}
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Stock</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatQty(getPreferredValue(stats.total_stock_kg, stats.total_stock_bags, defaultUnit))} {unitLabel}
            </p>
          </div>
          {/* Trend */}
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Trend</p>
            <div className="flex items-center gap-1.5 justify-end">
              {trendDirection === 'up' ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : trendDirection === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Activity className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-lg font-semibold ${trendDirection === 'up' ? 'text-emerald-600' : trendDirection === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                {trendPct > 0 ? '+' : ''}{trendPct.toFixed(1)}%
              </span>
            </div>
          </div>
          {/* Days of Cover */}
          <div className={`text-right px-4 py-2 rounded-card ${forecast.days_of_cover < 3 ? 'bg-red-50' : forecast.days_of_cover < 7 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Days Cover</p>
            <p className={`text-xl font-semibold ${forecast.days_of_cover < 3 ? 'text-red-600' : forecast.days_of_cover < 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {Math.min(forecast.days_of_cover, 99).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row - clean, no decorative shapes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-orange-50 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Received</p>
              <p className="text-2xl font-semibold text-gray-900">
                +{formatQty(getPreferredValue(stats.received_today_kg, stats.received_today_bags, defaultUnit))}
              </p>
              <p className="text-xs text-gray-400">{unitLabel} today</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-blue-50 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Issued</p>
              <p className="text-2xl font-semibold text-gray-900">
                -{formatQty(getPreferredValue(stats.issued_today_kg, stats.issued_today_bags, defaultUnit))}
              </p>
              <p className="text-xs text-gray-400">{unitLabel} today</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wasted</p>
              <p className="text-2xl font-semibold text-gray-900">
                -{formatQty(getPreferredValue(stats.wasted_today_kg, stats.wasted_today_bags, defaultUnit))}
              </p>
              <p className="text-xs text-gray-400">{unitLabel} today</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-card flex items-center justify-center ${totalAlerts > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <AlertTriangle className={`w-5 h-5 ${totalAlerts > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">{totalAlerts}</p>
              <p className="text-xs text-gray-400">active alerts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 - Usage Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Daily Usage Trend</h3>
              <p className="text-sm text-gray-500">Last 7 days consumption pattern</p>
            </div>
            {analyticsData?.peak_day && (
              <Badge variant="info" size="sm">
                Peak: {formatShortDate(analyticsData.peak_day)}
              </Badge>
            )}
          </div>
          <div className="h-64">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Loading chart...
              </div>
            ) : dailyUsageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyUsageData}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    name={`Usage (${unitLabel})`}
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorUsage)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No usage data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Hourly Usage Pattern */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Hourly Usage Pattern</h3>
              <p className="text-sm text-gray-500">Today's activity by hour</p>
            </div>
          </div>
          <div className="h-64">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Loading chart...
              </div>
            ) : hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="usage"
                    name="Bags Used"
                    fill={COLORS.secondary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hourly data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Stock Movement Time Series */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Stock Movement Over Time</h3>
            <p className="text-sm text-gray-500">Received, issued, and wasted trends</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as 7 | 30 | 90)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  selectedPeriod === period
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period}D
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          {analyticsLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading chart...
            </div>
          ) : stockMovementData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockMovementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  interval={selectedPeriod > 30 ? Math.floor(selectedPeriod / 10) : 'preserveStartEnd'}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="received"
                  name={`Received (${unitLabel})`}
                  stroke={COLORS.success}
                  strokeWidth={2}
                  dot={selectedPeriod <= 14}
                />
                <Line
                  type="monotone"
                  dataKey="issued"
                  name={`Issued (${unitLabel})`}
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  dot={selectedPeriod <= 14}
                />
                <Line
                  type="monotone"
                  dataKey="wasted"
                  name={`Wasted (${unitLabel})`}
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  dot={selectedPeriod <= 14}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No movement data available</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Historical Usage Comparison Charts */}
      <UsageComparisonCharts />

      {/* Shop Efficiency Comparison */}
      {efficiencyData && efficiencyData.locations.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Shop Efficiency Ranking</h3>
              <p className="text-sm text-gray-500">Performance comparison ({selectedPeriod} days)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Avg Waste Rate</p>
                <p className={`text-lg font-bold ${efficiencyData.avg_waste_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {efficiencyData.avg_waste_rate.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Avg Usage Rate</p>
                <p className="text-lg font-bold text-blue-600">{efficiencyData.avg_usage_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Waste Rate</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage Rate</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                </tr>
              </thead>
              <tbody>
                {efficiencyData.locations.map((loc) => (
                  <tr
                    key={loc.location_id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      loc.rank === 1 ? 'bg-green-50' : loc.rank === efficiencyData.locations.length ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {loc.rank === 1 ? (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        ) : loc.rank === 2 ? (
                          <Medal className="w-5 h-5 text-gray-400" />
                        ) : loc.rank === 3 ? (
                          <Medal className="w-5 h-5 text-amber-600" />
                        ) : (
                          <span className="w-5 h-5 flex items-center justify-center text-sm text-gray-500">
                            {loc.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {loc.location_type === 'warehouse' ? (
                          <Warehouse className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Store className="w-4 h-4 text-orange-500" />
                        )}
                        <span className="font-medium text-gray-900">{loc.location_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              loc.efficiency_score >= 70 ? 'bg-green-500' :
                              loc.efficiency_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${loc.efficiency_score}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 w-8">{loc.efficiency_score.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-medium ${loc.waste_rate_pct > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {loc.waste_rate_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-gray-900">{loc.usage_rate_pct.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-gray-700">
                        {defaultUnit === 'bag' ? `${loc.current_stock_bags} bags` : `${formatQty(loc.current_stock_kg)} kg`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {efficiencyData.best_performer && efficiencyData.worst_performer && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-600">Best:</span>
                <span className="font-semibold text-green-600">{efficiencyData.best_performer}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-gray-600">Needs attention:</span>
                <span className="font-semibold text-red-600">{efficiencyData.worst_performer}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Detailed Location Cards */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-800">Stock Details by Location</h3>
          <span className="text-sm text-gray-500">
            {groupedLocations.length} locations
          </span>
        </div>

        {stock_balance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No stock data yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first batch or record a delivery</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedLocations.map((location) => {
              const maxStock = Math.max(...groupedLocations.map(l => l.total_qty));
              const percentage = maxStock > 0 ? (location.total_qty / maxStock) * 100 : 0;

              return (
                <div
                  key={location.location_id}
                  className="rounded-card border border-gray-200 overflow-hidden"
                >
                  {/* Enterprise-style header - neutral with icon accent */}
                  <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-chip flex items-center justify-center ${
                        location.location_type === 'warehouse'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {location.location_type === 'warehouse' ? (
                          <Warehouse className="w-4 h-4" />
                        ) : (
                          <Store className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{location.location_name}</h4>
                        <p className="text-xs text-gray-500">{location.items.length} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatQty(getPreferredValue(location.total_qty, location.total_bags, defaultUnit))}
                      </p>
                      <p className="text-xs text-gray-500">{unitLabel}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-gray-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="space-y-2">
                      {location.items.slice(0, 3).map((item, idx) => {
                        const itemQty = item.on_hand_qty || 0;
                        const status = itemQty < 20 ? 'low' : itemQty < 50 ? 'reorder' : 'ok';
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 truncate flex-1">{item.item_name}</span>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="font-medium text-gray-900">
                                {formatQty(getPreferredValue(item.on_hand_qty, item.on_hand_bags, defaultUnit))}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${
                                status === 'low' ? 'bg-red-500' : status === 'reorder' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                            </div>
                          </div>
                        );
                      })}
                      {location.items.length > 3 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          +{location.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
