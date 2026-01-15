import {
  AlertTriangle,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { useAlerts, useAcknowledgeAlert } from '../hooks/useData';
import { useSettingsStore } from '../stores/settingsStore';
import { getPreferredValue, getUnitLabel } from '../lib/unitDisplay';
import type { AlertItem } from '../types';

export default function AlertsPage() {
  const { data, isLoading, error } = useAlerts();
  const acknowledgeMutation = useAcknowledgeAlert();
  const { defaultUnit } = useSettingsStore();
  const unitLabel = getUnitLabel(defaultUnit);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading alerts: {(error as Error).message}
      </div>
    );
  }

  const { summary, active_alerts, recently_acknowledged } = data || {
    summary: { low_stock_count: 0, reorder_now_count: 0, expiring_soon_count: 0 },
    active_alerts: [],
    recently_acknowledged: [],
  };

  const handleAcknowledge = async (alert: AlertItem) => {
    try {
      await acknowledgeMutation.mutateAsync({
        alert_type: alert.type,
        location_id: alert.location_id,
        item_id: alert.item_id,
      });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-5 h-5" />;
      case 'reorder_now':
        return <ShoppingCart className="w-5 h-5" />;
      case 'expiring_soon':
      case 'expired':
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' };
      case 'warning':
        return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500' };
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' };
    }
  };

  const totalActive = active_alerts.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">Low Stock</p>
              <h3 className="text-2xl font-bold text-red-700">
                {summary.low_stock_count}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">Reorder Now</p>
              <h3 className="text-2xl font-bold text-amber-700">
                {summary.reorder_now_count}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-blue-700">
                {summary.expiring_soon_count}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* All Clear Banner */}
      {totalActive === 0 && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700">All Clear!</h3>
              <p className="text-sm text-green-600">
                No active alerts at this time. Great job maintaining stock levels!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Alerts */}
      {totalActive > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {active_alerts.map((alert) => {
              const styles = getSeverityStyles(alert.severity);

              return (
                <div
                  key={alert.id}
                  className={`${styles.bg} ${styles.border} border rounded-lg p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className={styles.icon}>{getAlertIcon(alert.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                        <Badge
                          variant={
                            alert.severity === 'error'
                              ? 'error'
                              : alert.severity === 'warning'
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          {alert.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {alert.location_name} • {alert.item_name}
                      </p>

                      {/* Alert-specific data */}
                      <div className="mt-2 text-sm">
                        {alert.type === 'low_stock' && (
                          <p className="text-red-600">
                            Current: {getPreferredValue(alert.data.current_qty, alert.data.current_qty_bags, defaultUnit).toFixed(1)} {unitLabel} • Safety level:{' '}
                            {getPreferredValue(alert.data.safety_level, alert.data.safety_level_bags, defaultUnit).toFixed(1)} {unitLabel}
                          </p>
                        )}
                        {alert.type === 'reorder_now' && (
                          <p className="text-amber-600">
                            Current: {getPreferredValue(alert.data.current_qty, alert.data.current_qty_bags, defaultUnit).toFixed(1)} {unitLabel} • Suggested order:{' '}
                            {getPreferredValue(alert.data.suggested_qty, alert.data.suggested_qty_bags, defaultUnit).toFixed(1)} {unitLabel}
                          </p>
                        )}
                        {(alert.type === 'expiring_soon' || alert.type === 'expired') && (
                          <p className="text-blue-600">
                            Batch: {alert.data.batch_id_display} • Remaining:{' '}
                            {getPreferredValue(alert.data.remaining_qty, alert.data.remaining_qty_bags, defaultUnit).toFixed(1)} {unitLabel}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert)}
                      isLoading={acknowledgeMutation.isPending}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recently Acknowledged */}
      {recently_acknowledged.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Recently Acknowledged</h3>
          <div className="space-y-2">
            {recently_acknowledged.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">{alert.title}</p>
                    <p className="text-xs text-gray-400">
                      {alert.location_name} • {alert.item_name}
                    </p>
                  </div>
                </div>
                <Badge variant="default" size="sm">
                  {alert.type.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
