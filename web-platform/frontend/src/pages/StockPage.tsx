import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Trash2,
  Package,
  Boxes,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  X,
  Clock,
} from 'lucide-react';
import { Badge, Button } from '../components/ui';
import { useStockOverview, useBatches, useTransactions } from '../hooks/useData';
import { useAuthStore } from '../stores/authStore';
import ReceiveModal from '../components/modals/ReceiveModal';
import IssueModal from '../components/modals/IssueModal';
import TransferModal from '../components/modals/TransferModal';
import WasteModal from '../components/modals/WasteModal';
import type { StockOverview, BatchDetail, TransactionItem } from '../types';

// Helper function to format numbers
const formatQty = (value: number): string => {
  if (value === 0) return '0';
  const formatted = value.toFixed(1);
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
};

// Helper to get relative time
const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function StockPage() {
  const { data, isLoading, error, refetch } = useStockOverview();
  const { isManager } = useAuthStore();

  // Master pane state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');

  // Detail pane state
  const [showMovements, setShowMovements] = useState(false);

  // Modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    return data?.overview.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];
  }, [data?.overview, searchQuery, statusFilter]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  // Sync selectedItemId with filtered items
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedItemId(null);
    } else if (selectedItemId) {
      const stillExists = filteredItems.some((item) => item.item_id === selectedItemId);
      if (!stillExists) {
        setSelectedItemId(filteredItems[0].item_id);
      }
    } else {
      setSelectedItemId(filteredItems[0].item_id);
    }
  }, [filteredItems, selectedItemId]);

  // Get selected item from filtered list
  const selectedItem = filteredItems.find((item) => item.item_id === selectedItemId);

  // Fetch batches for selected item
  const { data: batchesData } = useBatches('all', selectedItemId || undefined);

  // Fetch transactions for movements section
  const { data: transactionsData } = useTransactions('all', 50);

  // Filter transactions for selected item
  const itemTransactions = useMemo(() => {
    if (!selectedItem || !transactionsData?.transactions) return [];
    return transactionsData.transactions
      .filter((t) => t.item_name === selectedItem.item_name)
      .slice(0, 10);
  }, [selectedItem, transactionsData]);

  // Get last movement time
  const lastMovement = itemTransactions[0];

  // Get FIFO suggestion for selected item
  const fifoSuggestion = data?.fifo_suggestion;
  const selectedItemBatches = batchesData?.batches || [];

  const handleSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex -m-8">
        <div className="w-72 border-r border-gray-200 bg-white animate-pulse">
          <div className="p-3 space-y-2">
            <div className="h-9 bg-gray-100 rounded-md" />
            <div className="h-7 bg-gray-100 rounded-md" />
            <div className="space-y-1 mt-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-md" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 bg-gray-50 animate-pulse p-6">
          <div className="h-28 bg-gray-100 rounded-lg mb-3" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading stock data: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex -m-8">
      {/* Master Pane - Item List (narrower, tool-like) */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters + Count (aligned as control bar) */}
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
          {(['all', 'in_stock', 'low', 'out'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : status === 'in_stock' ? 'In Stock' : status === 'low' ? 'Low' : 'Out'}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {filteredItems.length}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-auto">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No items found</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredItems.map((item) => (
                <ItemRow
                  key={item.item_id}
                  item={item}
                  isSelected={item.item_id === selectedItemId}
                  onClick={() => setSelectedItemId(item.item_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Pane - Single workspace feel */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {selectedItem ? (
          <div className="p-5">
            {/* Item Header Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedItem.item_name}</h2>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {selectedItem.sku}
                    </span>
                    <StatusBadge status={selectedItem.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                    <span>{selectedItem.active_batch_count} batches</span>
                    {lastMovement && (
                      <>
                        <span className="text-gray-300">·</span>
                        <Clock className="w-3 h-3" />
                        <span>{getRelativeTime(lastMovement.created_at)}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatQty(selectedItem.on_hand_qty)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">{selectedItem.unit}</span>
                  </div>
                  <p className="text-xs text-gray-400">on hand</p>
                </div>
              </div>

              {/* Action Bar - Clean alignment */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <Button size="sm" onClick={() => setShowReceiveModal(true)} className="gap-1">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Receive
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowIssueModal(true)} className="gap-1">
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                  Issue
                </Button>
                <div className="flex-1" />
                {isManager() && (
                  <Button size="sm" variant="ghost" onClick={() => setShowTransferModal(true)} className="gap-1 text-gray-600">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Transfer
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWasteModal(true)}
                  className="gap-1 text-gray-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Waste
                </Button>
                <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* FIFO Recommendation Strip - Slim inline */}
            {fifoSuggestion && (
              <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-emerald-50/50 border border-emerald-100 rounded-md">
                <Boxes className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800 flex-1">
                  <span className="font-medium">FIFO:</span>{' '}
                  <button className="font-mono text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded text-xs font-semibold">
                    {fifoSuggestion.batch_id_display}
                  </button>
                  <span className="text-emerald-600 ml-1.5">
                    {formatQty(fifoSuggestion.remaining_qty)} kg · {getRelativeTime(fifoSuggestion.received_at)}
                  </span>
                </p>
                <button className="text-xs text-emerald-600 hover:text-emerald-700">View</button>
                <Button size="sm" onClick={() => setShowIssueModal(true)}>
                  Issue
                </Button>
              </div>
            )}

            {/* Main workspace surface - Batches + Movements */}
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Active Batches Section */}
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Active Batches</h3>
                <span className="text-xs text-gray-400">{selectedItemBatches.length} total</span>
              </div>

              {selectedItemBatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-2 font-medium text-gray-500 text-xs">Batch</th>
                        <th className="px-4 py-2 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700">
                          Remaining <ChevronDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-2 font-medium text-gray-500 text-xs">Quality</th>
                        <th className="px-4 py-2 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700">
                          Received <ChevronDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
                        <th className="px-4 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItemBatches.slice(0, 5).map((batch) => (
                        <BatchRow key={batch.id} batch={batch} onIssue={() => setShowIssueModal(true)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-sm">No active batches for this item</p>
                </div>
              )}

              {selectedItemBatches.length > 5 && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5">
                    View all {selectedItemBatches.length} batches <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Recent Movements - Collapsed panel */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => setShowMovements(!showMovements)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-900">
                    Recent Movements
                    <span className="font-normal text-gray-400 ml-1">({itemTransactions.length})</span>
                  </span>
                  {showMovements ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {showMovements && (
                  <div className="border-t border-gray-50">
                    {itemTransactions.length > 0 ? (
                      <div>
                        {itemTransactions.map((tx) => (
                          <TransactionRow key={tx.id} transaction={tx} />
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-400">No movements yet for this item</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-sm font-medium text-gray-600">
                {hasActiveFilters ? 'No matching items' : 'Select an item'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {hasActiveFilters ? 'Adjust filters to see items' : 'Choose from the list'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-xs text-emerald-600 hover:text-emerald-700">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReceiveModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        onSuccess={handleSuccess}
        preselectedItemId={selectedItemId || undefined}
      />
      <IssueModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSuccess={handleSuccess}
        preselectedItemId={selectedItemId || undefined}
      />
      {isManager() && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleSuccess}
          preselectedItemId={selectedItemId || undefined}
        />
      )}
      <WasteModal
        isOpen={showWasteModal}
        onClose={() => setShowWasteModal(false)}
        onSuccess={handleSuccess}
        preselectedItemId={selectedItemId || undefined}
      />
    </div>
  );
}

// Item Row - Tighter, tool-like
function ItemRow({
  item,
  isSelected,
  onClick,
}: {
  item: StockOverview;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors = {
    in_stock: 'bg-emerald-500',
    low: 'bg-amber-500',
    out: 'bg-red-500',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left transition-all outline-none group ${
        isSelected
          ? 'bg-emerald-50 border-l-2 border-l-emerald-600'
          : 'border-l-2 border-l-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${statusColors[item.status]} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
            {item.item_name}
          </div>
          <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
            {formatQty(item.on_hand_qty)}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1 py-0.5 rounded font-medium">
            {item.unit}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`} />
      </div>
    </button>
  );
}

// Status Badge
function StatusBadge({ status }: { status: 'in_stock' | 'low' | 'out' }) {
  const config = {
    in_stock: { label: 'In Stock', variant: 'success' as const },
    low: { label: 'Low', variant: 'warning' as const },
    out: { label: 'Out', variant: 'error' as const },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

// Batch Row - Tightened status semantics
function BatchRow({ batch, onIssue }: { batch: BatchDetail; onIssue: () => void }) {
  const qualityConfig = {
    1: { label: 'Good', color: 'text-emerald-600' },
    2: { label: 'OK', color: 'text-amber-600' },
    3: { label: 'Poor', color: 'text-red-600' },
  };

  const percentLeft = Math.round((batch.remaining_qty / batch.initial_qty) * 100);

  // Tightened semantics: neutral for normal, amber for <15%, red for <5%
  const getStatusStyle = () => {
    if (percentLeft < 5) return { barColor: 'bg-red-500', textColor: 'text-red-600', label: 'Critical' };
    if (percentLeft < 15) return { barColor: 'bg-amber-500', textColor: 'text-amber-600', label: 'Low' };
    return { barColor: 'bg-gray-300', textColor: 'text-gray-500', label: '' };
  };

  const statusStyle = getStatusStyle();
  const quality = qualityConfig[batch.quality_score];

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 group">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {batch.is_oldest && (
            <span className="px-1 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
              FIFO
            </span>
          )}
          <span className="font-mono text-xs text-gray-700">{batch.batch_id_display}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium text-gray-900">{formatQty(batch.remaining_qty)}</span>
        <span className="text-xs text-gray-400 ml-1">/ {formatQty(batch.initial_qty)} kg</span>
      </td>
      <td className={`px-4 py-2.5 text-sm ${quality.color}`}>
        {quality.label}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-600">
        {getRelativeTime(batch.received_at)}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2" title="Remaining / Original">
          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${statusStyle.barColor}`}
              style={{ width: `${percentLeft}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${statusStyle.textColor}`}>
            {statusStyle.label || `${percentLeft}%`}
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onIssue(); }}
          className="opacity-0 group-hover:opacity-100 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-opacity"
        >
          Issue
        </button>
      </td>
    </tr>
  );
}

// Transaction Row
function TransactionRow({ transaction }: { transaction: TransactionItem }) {
  const config = {
    receive: { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-50', sign: '+' },
    issue: { icon: ArrowUpFromLine, color: 'text-blue-600', bg: 'bg-blue-50', sign: '-' },
    transfer: { icon: ArrowLeftRight, color: 'text-violet-600', bg: 'bg-violet-50', sign: '' },
    waste: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', sign: '-' },
    adjustment: { icon: Package, color: 'text-gray-600', bg: 'bg-gray-50', sign: '' },
  };

  const txConfig = config[transaction.type];
  const Icon = txConfig.icon;

  return (
    <div className="px-4 py-2 flex items-center gap-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
      <div className={`w-6 h-6 ${txConfig.bg} rounded flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-3 h-3 ${txConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 capitalize">{transaction.type}</span>
        <span className="text-xs text-gray-400 ml-2">
          {getRelativeTime(transaction.created_at)} · {transaction.created_by_name}
        </span>
      </div>
      <span className={`text-sm font-medium ${txConfig.color}`}>
        {txConfig.sign}{formatQty(transaction.quantity)} {transaction.unit}
      </span>
    </div>
  );
}
