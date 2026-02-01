import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Trash2,
  Settings,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { useTransactions } from '../hooks/useData';
import type { TransactionType } from '../types';

const typeConfig: Record<
  TransactionType,
  { icon: typeof ArrowDownToLine; color: string; bgColor: string; label: string }
> = {
  receive: {
    icon: ArrowDownToLine,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Received',
  },
  issue: {
    icon: ArrowUpFromLine,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Issued',
  },
  transfer: {
    icon: ArrowLeftRight,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Transfer',
  },
  waste: {
    icon: Trash2,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Waste',
  },
  adjustment: {
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Adjustment',
  },
  return: {
    icon: RotateCcw,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    label: 'Return',
  },
};

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'receive', label: 'Receive' },
  { value: 'issue', label: 'Issue' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'waste', label: 'Waste' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
];

export default function TransactionsPage() {
  const [filter, setFilter] = useState('all');
  const { data, isLoading, error } = useTransactions(filter);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading transactions: {(error as Error).message}
      </div>
    );
  }

  const { transactions, total } = data || { transactions: [], total: 0 };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-amber-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {transactions.map((tx) => {
            const config = typeConfig[tx.type as TransactionType];
            const Icon = config?.icon || Settings;

            return (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 ${config?.bgColor || 'bg-gray-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config?.color || 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{tx.item_name}</span>
                    <Badge
                      variant={
                        tx.type === 'receive'
                          ? 'success'
                          : tx.type === 'waste'
                          ? 'error'
                          : tx.type === 'transfer'
                          ? 'info'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {config?.label || tx.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(tx.created_at)} • by {tx.created_by_name}
                  </p>
                  {tx.notes && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{tx.notes}</p>
                  )}
                  {tx.type === 'transfer' && (
                    <p className="text-xs text-blue-600 mt-1">
                      {tx.location_from} → {tx.location_to}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-lg font-semibold ${
                      tx.type === 'receive' ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {tx.type === 'receive' ? '+' : '-'}
                    {tx.quantity.toFixed(1)} {tx.unit}
                  </span>
                  {tx.batch_id && (
                    <p className="text-xs text-gray-500 font-mono">
                      {tx.batch_id.substring(0, 8)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="p-12 text-center">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions found</p>
              <p className="text-sm text-gray-500">
                {filter !== 'all' ? 'Try changing the filter' : 'Start by receiving some stock'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Total Count */}
      {transactions.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {transactions.length} of {total} transactions
        </p>
      )}
    </div>
  );
}
