import { TrendingUp, TrendingDown, Minus, BarChart3, Clock, Award } from 'lucide-react';
import { Card } from '../components/ui';
import { useAnalytics } from '../hooks/useData';

export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
        <div className="h-48 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading analytics: {(error as Error).message}
      </div>
    );
  }

  const { summary, daily_usage, hourly_pattern, peak_day, peak_day_bags } = data || {
    summary: { total_bags_7_days: 0, daily_average: 0, trend_pct: 0, trend_direction: 'stable' },
    daily_usage: [],
    hourly_pattern: [],
    peak_day: null,
    peak_day_bags: 0,
  };

  const TrendIcon =
    summary.trend_direction === 'up'
      ? TrendingUp
      : summary.trend_direction === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    summary.trend_direction === 'up'
      ? 'text-green-600'
      : summary.trend_direction === 'down'
      ? 'text-red-600'
      : 'text-gray-500';

  const maxDailyUsage = Math.max(...daily_usage.map((d: any) => d.bags_used), 1);
  const maxHourlyUsage = Math.max(...hourly_pattern.map((h: any) => h.bags_used), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total (7 days)</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {summary.total_bags_7_days} bags
              </h3>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Daily Average</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {summary.daily_average.toFixed(1)} bags/day
              </h3>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${
              summary.trend_direction === 'up'
                ? 'bg-green-50'
                : summary.trend_direction === 'down'
                ? 'bg-red-50'
                : 'bg-gray-50'
            }`}>
              <TrendIcon className={`w-6 h-6 ${trendColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Trend</p>
              <h3 className={`text-2xl font-bold ${trendColor}`}>
                {summary.trend_pct > 0 ? '+' : ''}{summary.trend_pct.toFixed(1)}%
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Daily Usage (Last 7 Days)</h3>
        <div className="h-48">
          <div className="flex items-end justify-between h-full gap-2">
            {daily_usage.map((day: any, index: number) => {
              const heightPercent = (day.bags_used / maxDailyUsage) * 100;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-36 flex items-end">
                    <div
                      className="w-full bg-amber-500 rounded-t-lg transition-all hover:bg-amber-600"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      title={`${day.bags_used} bags (${day.kg_used.toFixed(1)} kg)`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{dayName}</span>
                  <span className="text-xs font-medium text-gray-700">{day.bags_used}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Hourly Pattern */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Hourly Pattern (Today)</h3>
        <div className="h-32">
          <div className="flex items-end justify-between h-full gap-1">
            {hourly_pattern.map((hour: any, index: number) => {
              const heightPercent = (hour.bags_used / maxHourlyUsage) * 100;
              const hourLabel = hour.hour > 12 ? `${hour.hour - 12}pm` : `${hour.hour}am`;

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-24 flex items-end">
                    <div
                      className="w-full bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      title={`${hour.bags_used} bags at ${hourLabel}`}
                    />
                  </div>
                  {index % 2 === 0 && (
                    <span className="text-xs text-gray-500 mt-1">{hourLabel}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">Working hours (6am - 10pm)</p>
      </Card>

      {/* Peak Usage */}
      {peak_day && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-800">Peak Usage Day</h4>
              <p className="text-amber-600">
                {new Date(peak_day).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                - <span className="font-bold">{peak_day_bags} bags</span> used
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
