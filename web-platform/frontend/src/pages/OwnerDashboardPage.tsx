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
import { demoApi } from '../lib/api';
import type { ShopDailyStatus } from '../types';
import { useState } from 'react';

// Helper to format quantities
const formatQty = (value: number): string => {
  if (value === 0) return '0';
  const formatted = value.toFixed(1);
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
};

export default function OwnerDashboardPage() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useOwnerDashboard();
  const { isAdmin } = useAuthStore();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleSeedDemoData = async () => {
    if (seeding) return;
    setSeeding(true);
    setSeedMessage(null);
    try {
      const response = await demoApi.seed();
      setSeedMessage(`Success! Created ${response.data.details.receive_transactions + response.data.details.issue_transactions + response.data.details.waste_transactions + response.data.details.transfer_transactions} transactions.`);
      refetch();
    } catch (err: any) {
      setSeedMessage(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSeeding(false);
    }
  };

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
    total_received_bags,
    total_issued_bags,
    total_wasted_bags,
    total_alerts,
    shops,
    warehouse,
  } = data || {
    date: '',
    total_stock_bags: 0,
    total_received_bags: 0,
    total_issued_bags: 0,
    total_wasted_bags: 0,
    total_alerts: 0,
    shops: [],
    warehouse: null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Daily Overview</h2>
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="px-4 h-9 bg-white text-orange-600 hover:bg-orange-50 rounded-[10px] transition-colors text-sm font-medium disabled:opacity-50"
              title="Generate demo transactions"
            >
              {seeding ? 'Seeding...' : 'Seed Demo Data'}
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-orange-500/50 rounded-[10px] transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Seed Message */}
      {seedMessage && (
        <div className={`p-4 rounded-[10px] text-sm flex items-center justify-between ${seedMessage.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{seedMessage}</span>
          <button onClick={() => setSeedMessage(null)} className="ml-4 text-lg font-medium hover:opacity-70">×</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          icon={Package}
          label="Total Stock"
          value={`${formatQty(total_stock_bags)}`}
          unit="bags"
          color="orange"
        />
        <SummaryCard
          icon={ArrowDownToLine}
          label="Received Today"
          value={`+${formatQty(total_received_bags)}`}
          unit="bags"
          color="green"
        />
        <SummaryCard
          icon={ArrowUpFromLine}
          label="Issued Today"
          value={`-${formatQty(total_issued_bags)}`}
          unit="bags"
          color="blue"
        />
        <SummaryCard
          icon={Trash2}
          label="Wasted Today"
          value={`-${formatQty(total_wasted_bags)}`}
          unit="bags"
          color="red"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Alerts"
          value={total_alerts.toString()}
          color={total_alerts > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Warehouse */}
      {warehouse && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-600" />
            Warehouse
          </h3>
          <LocationCard location={warehouse} />
        </Card>
      )}

      {/* Shops */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          Shops ({shops.length})
        </h3>
        {shops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <LocationCard key={shop.location_id} location={shop} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No shop data available</p>
        )}
      </Card>

      {/* Last updated */}
      <p className="text-xs text-gray-500 text-center">
        Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
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
          <p className="text-lg font-bold text-gray-900">
            {value} {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
          </p>
        </div>
      </div>
    </Card>
  );
}

function LocationCard({ location }: { location: ShopDailyStatus }) {
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

  const Icon = location.location_type === 'warehouse' ? Warehouse : Store;
  const iconBg = location.location_type === 'warehouse' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600';

  return (
    <div className={`p-4 rounded-lg border ${
      location.status === 'critical' ? 'border-red-200 bg-red-50' :
      location.status === 'warning' ? 'border-amber-200 bg-amber-50' :
      'border-gray-200 bg-gray-50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-gray-900">{location.location_name}</h4>
        </div>
        {getStatusBadge(location.status)}
      </div>

      {/* Stock */}
      <div className="mb-3">
        <span className="text-2xl font-bold text-gray-900">{formatQty(location.total_stock_bags)}</span>
        <span className="text-sm text-gray-500 ml-1">bags</span>
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="bg-white rounded p-2">
          <p className="text-green-600 font-semibold">+{formatQty(location.activity.received_bags)}</p>
          <p className="text-xs text-gray-500">In</p>
        </div>
        <div className="bg-white rounded p-2">
          <p className="text-blue-600 font-semibold">-{formatQty(location.activity.issued_bags)}</p>
          <p className="text-xs text-gray-500">Out</p>
        </div>
        <div className="bg-white rounded p-2">
          <p className="text-red-600 font-semibold">-{formatQty(location.activity.wasted_bags)}</p>
          <p className="text-xs text-gray-500">Waste</p>
        </div>
      </div>

      {/* Alerts */}
      {location.alerts.total_alerts > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{location.alerts.total_alerts} alert{location.alerts.total_alerts > 1 ? 's' : ''}</span>
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
