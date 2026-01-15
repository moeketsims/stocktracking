import { useState } from 'react';
import { Boxes, Clock, AlertTriangle, Package } from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { useBatches } from '../hooks/useData';

const filterOptions = [
  { value: 'all', label: 'All', icon: Boxes },
  { value: 'expiring_soon', label: 'Expiring Soon', icon: Clock },
  { value: 'poor_quality', label: 'Poor Quality', icon: AlertTriangle },
];

export default function BatchesPage() {
  const [filter, setFilter] = useState('all');
  const { data, isLoading, error } = useBatches(filter);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 bg-gray-200 rounded-full"></div>
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading batches: {(error as Error).message}
      </div>
    );
  }

  const { batches, counts } = data || { batches: [], counts: { all: 0, expiring_soon: 0, poor_quality: 0 } };

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const count = counts[option.value as keyof typeof counts] || 0;

          return (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {option.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === option.value
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Batch List */}
      <div className="space-y-3">
        {batches.map((batch: any) => (
          <Card key={batch.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {batch.is_oldest && (
                    <Badge variant="info" size="sm">
                      FIFO
                    </Badge>
                  )}
                  <span className="font-mono font-semibold text-gray-900">
                    {batch.batch_id_display}
                  </span>
                  <QualityBadge score={batch.quality_score} />
                  {batch.expiry_date && isExpiringSoon(batch.expiry_date) && (
                    <Badge variant="warning" size="sm">
                      Expiring
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Package className="w-4 h-4" />
                    <span>{batch.item_name}</span>
                  </div>
                  <div className="text-gray-500">
                    Supplier: <span className="text-gray-700">{batch.supplier_name}</span>
                  </div>
                  <div className="text-gray-500">
                    Received:{' '}
                    <span className="text-gray-700">
                      {new Date(batch.received_at).toLocaleDateString()}
                    </span>
                  </div>
                  {batch.expiry_date && (
                    <div className="text-gray-500">
                      Expires:{' '}
                      <span
                        className={
                          isExpiringSoon(batch.expiry_date)
                            ? 'text-amber-600 font-medium'
                            : 'text-gray-700'
                        }
                      >
                        {new Date(batch.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {batch.defect_pct > 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    Defect rate: {batch.defect_pct}%
                  </p>
                )}
              </div>

              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {batch.remaining_qty.toFixed(1)} kg
                </div>
                <p className="text-sm text-gray-500">
                  of {batch.initial_qty.toFixed(1)} kg
                </p>
                <div className="mt-2 h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${(batch.remaining_qty / batch.initial_qty) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {batch.used_qty.toFixed(1)} kg used
                </p>
              </div>
            </div>
          </Card>
        ))}

        {batches.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No batches found</p>
              <p className="text-sm text-gray-400">
                {filter !== 'all'
                  ? 'Try changing the filter'
                  : 'Start by receiving some stock'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function QualityBadge({ score }: { score: number }) {
  const variants = {
    1: { label: 'Good', variant: 'success' as const },
    2: { label: 'OK', variant: 'warning' as const },
    3: { label: 'Poor', variant: 'error' as const },
  };

  const { label, variant } = variants[score as 1 | 2 | 3] || variants[1];

  return (
    <Badge variant={variant} size="sm">
      Q{score} - {label}
    </Badge>
  );
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 7;
}
