import { useState } from 'react';
import { Download, TrendingUp, TrendingDown, Minus, Star, AlertCircle } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { useDailySummary, useSupplierQuality } from '../hooks/useData';
import { reportsApi } from '../lib/api';

type TabType = 'daily' | 'supplier';
type PeriodType = 7 | 14 | 30;

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [period, setPeriod] = useState<PeriodType>(7);

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'daily'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Daily Summary
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'supplier'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Supplier Quality
        </button>
      </div>

      {activeTab === 'daily' ? (
        <DailySummaryTab period={period} setPeriod={setPeriod} />
      ) : (
        <SupplierQualityTab />
      )}
    </div>
  );
}

function DailySummaryTab({
  period,
  setPeriod,
}: {
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
}) {
  const { data, isLoading, error } = useDailySummary(period);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await reportsApi.exportDailySummary(period);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily_summary_${period}d.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading report: {(error as Error).message}
      </div>
    );
  }

  const { period_totals, daily_breakdown } = data || {
    period_totals: { total_received: 0, total_issued: 0, total_wasted: 0, net_change: 0 },
    daily_breakdown: [],
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([7, 14, 30] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p} Days
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Period Totals */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Period Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Received</p>
            <p className="text-xl font-bold text-green-700">
              +{period_totals.total_received.toFixed(1)} kg
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-600">Issued</p>
            <p className="text-xl font-bold text-amber-700">
              -{period_totals.total_issued.toFixed(1)} kg
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Wasted</p>
            <p className="text-xl font-bold text-red-700">
              -{period_totals.total_wasted.toFixed(1)} kg
            </p>
          </div>
          <div
            className={`p-3 rounded-lg ${
              period_totals.net_change >= 0 ? 'bg-blue-50' : 'bg-gray-100'
            }`}
          >
            <p className={`text-sm ${period_totals.net_change >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
              Net Change
            </p>
            <p
              className={`text-xl font-bold ${
                period_totals.net_change >= 0 ? 'text-blue-700' : 'text-gray-700'
              }`}
            >
              {period_totals.net_change >= 0 ? '+' : ''}
              {period_totals.net_change.toFixed(1)} kg
            </p>
          </div>
        </div>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Daily Breakdown</h3>
        <div className="space-y-2">
          {daily_breakdown.map((day: any) => (
            <div
              key={day.date}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                  <span className="text-green-600">+{day.received_kg} received</span>
                  <span className="text-amber-600">-{day.issued_kg} issued</span>
                  <span className="text-red-600">-{day.wasted_kg} wasted</span>
                </div>
              </div>
              <div
                className={`font-semibold ${
                  day.net_change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {day.net_change >= 0 ? '+' : ''}
                {day.net_change.toFixed(1)} kg
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SupplierQualityTab() {
  const { data, isLoading, error } = useSupplierQuality();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading supplier data: {(error as Error).message}
      </div>
    );
  }

  const { suppliers } = data || { suppliers: [] };

  return (
    <div className="space-y-4">
      {suppliers.map((supplier: any) => {
        const TrendIcon =
          supplier.quality_trend === 'improving'
            ? TrendingUp
            : supplier.quality_trend === 'declining'
            ? TrendingDown
            : Minus;

        const trendColor =
          supplier.quality_trend === 'improving'
            ? 'text-green-600'
            : supplier.quality_trend === 'declining'
            ? 'text-red-600'
            : 'text-gray-500';

        const scoreColor =
          supplier.avg_quality_score <= 1.5
            ? 'text-green-600 bg-green-100'
            : supplier.avg_quality_score <= 2.5
            ? 'text-amber-600 bg-amber-100'
            : 'text-red-600 bg-red-100';

        return (
          <Card key={supplier.supplier_id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{supplier.supplier_name}</h4>
                  {supplier.needs_review && (
                    <Badge variant="error" size="sm">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Needs Review
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{supplier.delivery_count} deliveries</span>
                  <span>Avg defect: {supplier.avg_defect_pct.toFixed(1)}%</span>
                  <span className={`flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    {supplier.quality_trend}
                  </span>
                </div>

                {/* Quality Breakdown Bar */}
                <div className="mt-3">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500"
                      style={{ width: `${supplier.quality_breakdown.good}%` }}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${supplier.quality_breakdown.ok}%` }}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${supplier.quality_breakdown.poor}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Good: {supplier.quality_breakdown.good.toFixed(0)}%</span>
                    <span>OK: {supplier.quality_breakdown.ok.toFixed(0)}%</span>
                    <span>Poor: {supplier.quality_breakdown.poor.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className={`ml-4 px-3 py-2 rounded-lg text-center ${scoreColor}`}>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  <span className="text-xl font-bold">
                    {supplier.avg_quality_score.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs">Avg Score</p>
              </div>
            </div>
          </Card>
        );
      })}

      {suppliers.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">No supplier data available</p>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span> Good (1)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-500 rounded-full"></span> OK (2)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span> Poor (3)
        </span>
      </div>
    </div>
  );
}
