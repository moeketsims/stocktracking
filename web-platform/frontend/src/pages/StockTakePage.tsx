import { useState } from 'react';
import { ClipboardCheck, Plus, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { useStockTakes } from '../hooks/useData';
import CreateStockTakeModal from '../components/modals/CreateStockTakeModal';
import StockTakeDetailsModal from '../components/modals/StockTakeDetailsModal';
import type { StockTake } from '../types';

const statusConfig = {
  in_progress: { variant: 'warning' as const, label: 'In Progress', icon: ClipboardCheck },
  completed: { variant: 'success' as const, label: 'Completed', icon: CheckCircle },
  cancelled: { variant: 'secondary' as const, label: 'Cancelled', icon: XCircle },
};

export default function StockTakePage() {
  const [selectedStockTakeId, setSelectedStockTakeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, error } = useStockTakes({
    status: statusFilter || undefined,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        Failed to load stock takes. Please try again.
      </div>
    );
  }

  const stockTakes: StockTake[] = data?.stock_takes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Takes</h1>
          <p className="text-gray-500 text-sm mt-1">Physical inventory counts and reconciliation</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Start Stock Take
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3 p-4">
          <ClipboardCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900">How Stock Takes Work</h3>
            <p className="text-sm text-blue-700 mt-1">
              Start a stock take to count physical inventory. Enter the actual quantity for each item,
              review any variances, then complete to automatically create adjustment transactions.
            </p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === option.value
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stock Takes List */}
      <div className="space-y-3">
        {stockTakes.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No stock takes yet</h3>
              <p className="text-gray-500 mb-4">Start your first physical inventory count</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start Stock Take
              </Button>
            </div>
          </Card>
        ) : (
          stockTakes.map((stockTake) => {
            const config = statusConfig[stockTake.status] || statusConfig.in_progress;
            const progress =
              stockTake.total_lines > 0
                ? Math.round((stockTake.lines_counted / stockTake.total_lines) * 100)
                : 0;

            return (
              <Card key={stockTake.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedStockTakeId(stockTake.id)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <span className="text-sm text-gray-500">
                          {stockTake.locations?.name || 'Unknown Location'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600">
                        Started by {stockTake.initiated_by_name || 'Unknown'} on{' '}
                        {new Date(stockTake.started_at).toLocaleDateString()}{' '}
                        at {new Date(stockTake.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {stockTake.completed_at && (
                        <p className="text-sm text-gray-500 mt-1">
                          Completed {new Date(stockTake.completed_at).toLocaleDateString()}
                        </p>
                      )}

                      {stockTake.status === 'in_progress' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium text-gray-700">
                              {stockTake.lines_counted} / {stockTake.total_lines} items ({progress}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {stockTake.variance_count > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                          {stockTake.variance_count} variance{stockTake.variance_count !== 1 ? 's' : ''} found
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStockTakeId(stockTake.id);
                      }}
                      className="ml-4 flex-shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {stockTake.status === 'in_progress' ? 'Continue' : 'View'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreateStockTakeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(id) => {
          setShowCreateModal(false);
          setSelectedStockTakeId(id);
        }}
      />

      {selectedStockTakeId && (
        <StockTakeDetailsModal
          stockTakeId={selectedStockTakeId}
          isOpen={!!selectedStockTakeId}
          onClose={() => setSelectedStockTakeId(null)}
        />
      )}
    </div>
  );
}
