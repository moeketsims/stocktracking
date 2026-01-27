import { useState } from 'react';
import { Boxes, Clock, Package, AlertTriangle } from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { useBatches } from '../hooks/useData';

const filterOptions = [
  { value: 'all', label: 'All', icon: Boxes },
  { value: 'expiring_soon', label: 'Aging', icon: Clock },
];

// Conversion: 1 bag = 10 kg
const KG_PER_BAG = 10;

function formatBatchAge(receivedAt: string): string {
  const received = new Date(receivedAt);
  const now = new Date();
  const diffMs = now.getTime() - received.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function checkFIFOViolation(batches: any[]): Set<string> {
  // Returns IDs of batches that have been used more than older batches (FIFO violation)
  const violations = new Set<string>();

  for (let i = 1; i < batches.length; i++) {
    const olderBatch = batches[i - 1];
    const newerBatch = batches[i];

    // Calculate usage percentage for each batch
    const olderUsedPct = (olderBatch.initial_qty - olderBatch.remaining_qty) / olderBatch.initial_qty;
    const newerUsedPct = (newerBatch.initial_qty - newerBatch.remaining_qty) / newerBatch.initial_qty;

    // If newer batch has been used more than older batch, it's a violation
    if (newerUsedPct > olderUsedPct + 0.1) { // 10% threshold to avoid false positives
      violations.add(newerBatch.id);
    }
  }

  return violations;
}

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

  const { batches: rawBatches, counts } = data || { batches: [], counts: { all: 0, expiring_soon: 0 } };

  // Sort batches by received_at ascending (oldest first - FIFO)
  const batches = [...rawBatches].sort((a: any, b: any) => {
    return new Date(a.received_at).getTime() - new Date(b.received_at).getTime();
  });

  const fifoViolations = checkFIFOViolation(batches);

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
        {batches.map((batch: any) => {
          const hasFIFOViolation = fifoViolations.has(batch.id);
          const daysUntilExpiry = batch.expiry_date ? getDaysUntilExpiry(batch.expiry_date) : null;

          return (
            <Card key={batch.id} className={`hover:shadow-md transition-shadow ${hasFIFOViolation ? 'border-l-4 border-l-amber-500' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {batch.is_oldest && (
                      <Badge variant="info" size="sm" className="bg-blue-600 text-white font-bold">
                        USE FIRST (FIFO)
                      </Badge>
                    )}
                    {hasFIFOViolation && (
                      <Badge variant="warning" size="sm" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        FIFO Warning
                      </Badge>
                    )}
                    <span className="font-mono font-semibold text-gray-900">
                      {batch.batch_id_display}
                    </span>
                    {batch.expiry_date && isExpired(batch.expiry_date) && (
                      <Badge variant="danger" size="sm">
                        Expired
                      </Badge>
                    )}
                    {batch.expiry_date && isExpiringSoon(batch.expiry_date) && (
                      <Badge variant="warning" size="sm">
                        Aging
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
                      <span className="text-gray-700 font-medium">
                        {formatBatchAge(batch.received_at)}
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({new Date(batch.received_at).toLocaleDateString()})
                      </span>
                    </div>
                    {batch.expiry_date && (
                      <div className="text-gray-500">
                        {isExpired(batch.expiry_date) ? 'Expired:' : 'Use by:'}{' '}
                        <span
                          className={
                            isExpired(batch.expiry_date)
                              ? 'text-red-600 font-medium'
                              : isExpiringSoon(batch.expiry_date)
                              ? 'text-amber-600 font-medium'
                              : 'text-gray-700'
                          }
                        >
                          {new Date(batch.expiry_date).toLocaleDateString()}
                        </span>
                        {daysUntilExpiry !== null && (
                          <span className="text-gray-400 ml-1">
                            ({daysUntilExpiry > 0
                              ? `${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} left`
                              : daysUntilExpiry === 0
                              ? 'today'
                              : `${Math.abs(daysUntilExpiry)} ${Math.abs(daysUntilExpiry) === 1 ? 'day' : 'days'} ago`
                            })
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.floor(batch.remaining_qty / KG_PER_BAG)} bags
                  </div>
                  <p className="text-sm text-gray-500">
                    of {Math.floor(batch.initial_qty / KG_PER_BAG)} bags
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
                    {Math.floor(batch.used_qty / KG_PER_BAG)} bags used
                  </p>
                </div>
              </div>
            </Card>
          );
        })}

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

// Expiry logic:
// - "Expiring Soon": current date >= expiry_date AND current date < expiry_date + 7 days
// - "Expired": current date >= expiry_date + 7 days
function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysPastExpiry = Math.floor((now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
  // Expiring soon: 0 to 6 days past expiry date
  return daysPastExpiry >= 0 && daysPastExpiry < 7;
}

function isExpired(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysPastExpiry = Math.floor((now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
  // Expired: 7+ days past expiry date
  return daysPastExpiry >= 7;
}
