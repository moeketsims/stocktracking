import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Store,
  Warehouse,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { useOwnerDashboard } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import type { ShopDailyStatus } from '../types';

// Helper to format quantities
const formatQty = (value: number): string => {
  if (value === 0) return '0';
  const formatted = value.toFixed(1);
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
};

export default function OwnerDashboardPage() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useOwnerDashboard();
  const { isAdmin } = useAuthStore();

  // Access control
  if (!isAdmin()) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">
          Owner Dashboard is only available to administrators.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading dashboard: {(error as Error).message}
      </div>
    );
  }

  const {
    date,
    total_stock_bags,
    total_stock_kg,
    total_received_bags,
    total_issued_bags,
    total_wasted_bags,
    total_alerts,
    shops,
    warehouse,
  } = data || {
    date: '',
    total_stock_bags: 0,
    total_stock_kg: 0,
    total_received_bags: 0,
    total_issued_bags: 0,
    total_wasted_bags: 0,
    total_alerts: 0,
    shops: [],
    warehouse: null,
  };

  return (
    <div className="space-y-6">
      {/* Header with date and refresh */}
      <Card className="bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Daily Status Overview</h2>
            <p className="text-orange-100 mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {date ? new Date(date).toLocaleDateString('en-ZA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-orange-500 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {/* Aggregate Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          icon={Package}
          label="Total Stock"
          value={`${total_stock_bags} bags`}
          subValue={`(${formatQty(total_stock_kg)} kg)`}
          color="orange"
        />
        <SummaryCard
          icon={ArrowDownToLine}
          label="Received Today"
          value={`+${total_received_bags} bags`}
          color="green"
        />
        <SummaryCard
          icon={ArrowUpFromLine}
          label="Issued Today"
          value={`-${total_issued_bags} bags`}
          color="blue"
        />
        <SummaryCard
          icon={Trash2}
          label="Wasted Today"
          value={`-${total_wasted_bags} bags`}
          color="red"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={total_alerts.toString()}
          color={total_alerts > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Warehouse Section (if exists) */}
      {warehouse && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-600" />
            Warehouse
          </h3>
          <ShopStatusCard shop={warehouse} />
        </Card>
      )}

      {/* Shops Grid */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          Shops ({shops.length})
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <ShopStatusCard key={shop.location_id} shop={shop} />
          ))}
        </div>
        {shops.length === 0 && (
          <p className="text-center text-gray-500 py-8">No shop data available</p>
        )}
      </Card>

      {/* Last updated timestamp */}
      <p className="text-xs text-gray-400 text-center">
        Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

// Sub-components

function SummaryCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
        </div>
      </div>
    </Card>
  );
}

function ShopStatusCard({ shop }: { shop: ShopDailyStatus }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="error">Critical</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      default:
        return <Badge variant="success">Healthy</Badge>;
    }
  };

  const Icon = shop.location_type === 'warehouse' ? Warehouse : Store;
  const iconBg = shop.location_type === 'warehouse' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600';

  // Build alert text
  const alertParts: string[] = [];
  if (shop.alerts.low_stock_count > 0) alertParts.push(`${shop.alerts.low_stock_count} low stock`);
  if (shop.alerts.expiring_soon_count > 0) alertParts.push(`${shop.alerts.expiring_soon_count} expiring`);
  if (shop.alerts.reorder_count > 0) alertParts.push(`${shop.alerts.reorder_count} reorder`);
  const alertText = alertParts.join(', ');

  return (
    <div className={`p-4 rounded-lg border ${
      shop.status === 'critical' ? 'border-red-200 bg-red-50' :
      shop.status === 'warning' ? 'border-amber-200 bg-amber-50' :
      'border-gray-200 bg-gray-50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{shop.location_name}</h4>
            {getStatusBadge(shop.status)}
          </div>
        </div>
      </div>

      {/* Stock Levels */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Current Stock</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {shop.total_stock_bags} bags
          </span>
          <span className="text-sm text-gray-400">
            ({formatQty(shop.total_stock_kg)} kg)
          </span>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-white rounded">
          <ArrowDownToLine className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Received</p>
          <p className="font-semibold text-sm">+{shop.activity.received_bags}</p>
        </div>
        <div className="text-center p-2 bg-white rounded">
          <ArrowUpFromLine className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Issued</p>
          <p className="font-semibold text-sm">-{shop.activity.issued_bags}</p>
        </div>
        <div className="text-center p-2 bg-white rounded">
          <Trash2 className="w-4 h-4 text-red-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Wasted</p>
          <p className="font-semibold text-sm">-{shop.activity.wasted_bags}</p>
        </div>
      </div>

      {/* Alerts */}
      {shop.alerts.total_alerts > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-gray-600">{alertText}</span>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-gray-200 rounded-xl"></div>
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-xl"></div>
    </div>
  );
}
