import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from './ui';
import { useHourlyComparison, useWeeklyComparison, useMonthlyComparison } from '../hooks/useData';
import { useSettingsStore } from '../stores/settingsStore';
import { getUnitLabel } from '../lib/unitDisplay';
import type { HourlyDataPoint, DailyDataPoint, MonthlyDataPoint } from '../types';

// Chart colors for different periods
const PERIOD_COLORS = [
  '#f97316', // Orange - current period
  '#3b82f6', // Blue - previous period
  '#22c55e', // Green - older period
  '#8b5cf6', // Purple - even older
];

const LINE_STYLES = [
  { strokeWidth: 3, strokeDasharray: undefined },      // Solid thick
  { strokeWidth: 2, strokeDasharray: '5 5' },          // Dashed
  { strokeWidth: 2, strokeDasharray: '2 2' },          // Dotted
  { strokeWidth: 2, strokeDasharray: '8 4 2 4' },      // Dash-dot
];

interface UsageComparisonChartsProps {
  locationId?: string;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(1)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function UsageComparisonCharts({ locationId }: UsageComparisonChartsProps) {
  const { defaultUnit } = useSettingsStore();
  const unitLabel = getUnitLabel(defaultUnit);

  // Visibility toggles for each chart
  const [hourlyVisible, setHourlyVisible] = useState<Record<string, boolean>>({});
  const [weeklyVisible, setWeeklyVisible] = useState<Record<string, boolean>>({});
  const [monthlyVisible, setMonthlyVisible] = useState<Record<string, boolean>>({});

  const { data: hourlyData, isLoading: hourlyLoading } = useHourlyComparison(locationId);
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyComparison(locationId);
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyComparison(locationId);

  // Initialize visibility (all visible by default)
  const getVisibility = (periods: { label: string }[] | undefined, state: Record<string, boolean>) => {
    if (!periods) return {};
    const result: Record<string, boolean> = {};
    periods.forEach(p => {
      result[p.label] = state[p.label] !== undefined ? state[p.label] : true;
    });
    return result;
  };

  // Transform data for recharts (combine all periods into single data array)
  const transformHourlyData = () => {
    if (!hourlyData?.periods) return [];
    const visibility = getVisibility(hourlyData.periods, hourlyVisible);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => {
      const point: any = { hour: `${hour}:00` };
      hourlyData.periods.forEach(period => {
        if (visibility[period.label] !== false) {
          const dataPoint = (period.data as HourlyDataPoint[]).find(d => d.hour === hour);
          const value = defaultUnit === 'bag' ? dataPoint?.bags_used : dataPoint?.kg_used;
          point[period.label] = value || 0;
        }
      });
      return point;
    }).filter(p => p.hour >= '06:00' && p.hour <= '22:00'); // Filter to business hours
  };

  const transformWeeklyData = () => {
    if (!weeklyData?.periods) return [];
    const visibility = getVisibility(weeklyData.periods, weeklyVisible);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, idx) => {
      const point: any = { day };
      weeklyData.periods.forEach(period => {
        if (visibility[period.label] !== false) {
          const dataPoint = (period.data as DailyDataPoint[]).find(d => d.day_index === idx);
          const value = defaultUnit === 'bag' ? dataPoint?.bags_used : dataPoint?.kg_used;
          point[period.label] = value || 0;
        }
      });
      return point;
    });
  };

  const transformMonthlyData = () => {
    if (!monthlyData?.periods) return [];
    const visibility = getVisibility(monthlyData.periods, monthlyVisible);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, idx) => {
      const point: any = { month };
      monthlyData.periods.forEach(period => {
        if (visibility[period.label] !== false) {
          const dataPoint = (period.data as MonthlyDataPoint[]).find(d => d.month_index === idx + 1);
          const value = defaultUnit === 'bag' ? dataPoint?.bags_used : dataPoint?.kg_used;
          point[period.label] = value || 0;
        }
      });
      return point;
    });
  };

  const toggleVisibility = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    label: string
  ) => {
    setter(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderLegend = (
    periods: { label: string }[] | undefined,
    visibility: Record<string, boolean>,
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    if (!periods) return null;
    return (
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {periods.map((period, idx) => {
          const isVisible = visibility[period.label] !== false;
          return (
            <button
              key={period.label}
              onClick={() => toggleVisibility(setter, period.label)}
              className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-opacity ${
                isVisible ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className="w-4 h-0.5"
                style={{
                  backgroundColor: PERIOD_COLORS[idx % PERIOD_COLORS.length],
                  borderStyle: idx === 0 ? 'solid' : 'dashed',
                }}
              />
              <span className="text-gray-700">{period.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Today's Activity - Hourly Comparison */}
      <Card>
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">Today's Activity</h3>
          <p className="text-sm text-gray-500">Hourly usage compared to previous periods</p>
        </div>
        <div className="h-64">
          {hourlyLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transformHourlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                {hourlyData?.periods.map((period, idx) => {
                  const visibility = getVisibility(hourlyData.periods, hourlyVisible);
                  if (visibility[period.label] === false) return null;
                  return (
                    <Line
                      key={period.label}
                      type="monotone"
                      dataKey={period.label}
                      name={`${period.label} (${unitLabel})`}
                      stroke={PERIOD_COLORS[idx % PERIOD_COLORS.length]}
                      strokeWidth={LINE_STYLES[idx % LINE_STYLES.length].strokeWidth}
                      strokeDasharray={LINE_STYLES[idx % LINE_STYLES.length].strokeDasharray}
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {renderLegend(hourlyData?.periods, getVisibility(hourlyData?.periods, hourlyVisible), setHourlyVisible)}
      </Card>

      {/* Weekly Pattern - Daily Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Weekly Pattern</h3>
            <p className="text-sm text-gray-500">This week vs last week</p>
          </div>
          <div className="h-56">
            {weeklyLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transformWeeklyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  {weeklyData?.periods.map((period, idx) => {
                    const visibility = getVisibility(weeklyData.periods, weeklyVisible);
                    if (visibility[period.label] === false) return null;
                    return (
                      <Line
                        key={period.label}
                        type="monotone"
                        dataKey={period.label}
                        name={`${period.label} (${unitLabel})`}
                        stroke={PERIOD_COLORS[idx % PERIOD_COLORS.length]}
                        strokeWidth={LINE_STYLES[idx % LINE_STYLES.length].strokeWidth}
                        strokeDasharray={LINE_STYLES[idx % LINE_STYLES.length].strokeDasharray}
                        dot={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {renderLegend(weeklyData?.periods, getVisibility(weeklyData?.periods, weeklyVisible), setWeeklyVisible)}
        </Card>

        {/* Long-term Trend - Monthly Comparison */}
        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Long-term Trend</h3>
            <p className="text-sm text-gray-500">Year over year comparison</p>
          </div>
          <div className="h-56">
            {monthlyLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transformMonthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  {monthlyData?.periods.map((period, idx) => {
                    const visibility = getVisibility(monthlyData.periods, monthlyVisible);
                    if (visibility[period.label] === false) return null;
                    return (
                      <Line
                        key={period.label}
                        type="monotone"
                        dataKey={period.label}
                        name={`${period.label} (${unitLabel})`}
                        stroke={PERIOD_COLORS[idx % PERIOD_COLORS.length]}
                        strokeWidth={LINE_STYLES[idx % LINE_STYLES.length].strokeWidth}
                        strokeDasharray={LINE_STYLES[idx % LINE_STYLES.length].strokeDasharray}
                        dot={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {renderLegend(monthlyData?.periods, getVisibility(monthlyData?.periods, monthlyVisible), setMonthlyVisible)}
        </Card>
      </div>
    </div>
  );
}
