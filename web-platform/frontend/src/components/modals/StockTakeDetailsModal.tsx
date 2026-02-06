import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Save,
  Download,
  FileSpreadsheet,
  X as XIcon,
  Pencil,
} from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import {
  useStockTake,
  useUpdateStockTakeLine,
  useCompleteStockTake,
  useCancelStockTake,
} from '../../hooks/useData';
import { exportsApi, downloadBlob } from '../../lib/api';
import { toast } from '../ui/Toast';
import type { StockTakeLine } from '../../types';

interface StockTakeDetailsModalProps {
  stockTakeId: string;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export default function StockTakeDetailsModal({
  stockTakeId,
  isOpen,
  onClose,
}: StockTakeDetailsModalProps) {
  const { data, isLoading } = useStockTake(stockTakeId);
  const updateLineMutation = useUpdateStockTakeLine();
  const completeMutation = useCompleteStockTake();
  const cancelMutation = useCancelStockTake();

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [countValue, setCountValue] = useState<string>('');
  const [lineNotes, setLineNotes] = useState('');

  const stockTake = data?.stock_take;
  const lines: StockTakeLine[] = data?.lines || [];

  const isInProgress = stockTake?.status === 'in_progress';
  const canComplete =
    isInProgress &&
    stockTake?.total_lines > 0 &&
    stockTake?.lines_counted >= stockTake?.total_lines;

  const toBags = (kg: number | null | undefined, cf: number): number => {
    if (kg == null || isNaN(kg)) return 0;
    return Math.round(kg / (cf || 1));
  };

  const startEditing = (line: StockTakeLine) => {
    const cf = line.items?.conversion_factor || 1;
    setEditingLineId(line.id);
    setCountValue(
      line.counted_qty !== null ? String(toBags(line.counted_qty, cf)) : String(toBags(line.expected_qty, cf))
    );
    setLineNotes(line.notes || '');
  };

  const cancelEditing = () => {
    setEditingLineId(null);
    setCountValue('');
    setLineNotes('');
  };

  const handleSaveCount = async (lineId: string) => {
    const bags = parseInt(countValue, 10);
    if (isNaN(bags) || bags < 0) {
      toast.error('Please enter a valid bag count');
      return;
    }

    // Convert bags to kg for the API
    const line = lines.find((l) => l.id === lineId);
    const cf = line?.items?.conversion_factor || 1;
    const kgQty = bags * cf;

    try {
      await updateLineMutation.mutateAsync({
        stockTakeId,
        lineId,
        data: { counted_qty: kgQty, notes: lineNotes || undefined },
      });
      cancelEditing();
      toast.success('Count saved');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save count');
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Complete this stock take? Adjustment transactions will be created for all variances.')) {
      return;
    }

    try {
      const result = await completeMutation.mutateAsync({ stockTakeId });
      toast.success(`Stock take completed. ${result.adjustments_created} adjustment(s) created.`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to complete stock take');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this stock take? No adjustments will be made.')) {
      return;
    }

    try {
      await cancelMutation.mutateAsync(stockTakeId);
      toast.success('Stock take cancelled');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel stock take');
    }
  };

  const handleExportPdf = async () => {
    try {
      const response = await exportsApi.stockTakePdf(stockTakeId);
      downloadBlob(new Blob([response.data]), `stock_take_${stockTakeId.substring(0, 8)}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await exportsApi.stockTakeExcel(stockTakeId);
      downloadBlob(new Blob([response.data]), `stock_take_${stockTakeId.substring(0, 8)}.xlsx`);
      toast.success('Excel downloaded');
    } catch {
      toast.error('Failed to export Excel');
    }
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Stock Take Details" size="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </Modal>
    );
  }

  const progress =
    stockTake && stockTake.total_lines > 0
      ? Math.round((stockTake.lines_counted / stockTake.total_lines) * 100)
      : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock Take Details" size="lg">
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant={
                stockTake?.status === 'completed'
                  ? 'success'
                  : stockTake?.status === 'cancelled'
                  ? 'secondary'
                  : 'warning'
              }
            >
              {STATUS_LABELS[stockTake?.status || ''] || stockTake?.status?.toUpperCase()}
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {stockTake?.locations?.name} &bull; Started{' '}
            {stockTake?.started_at
              ? new Date(stockTake.started_at).toLocaleString()
              : ''}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            By {stockTake?.initiated_by_name || 'Unknown'}
          </p>

          {/* Progress bar */}
          {isInProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">
                  {stockTake?.lines_counted} / {stockTake?.total_lines} items ({progress}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {stockTake && stockTake.variance_count > 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {stockTake.variance_count} variance(s) found
            </p>
          )}
        </div>

        {/* Lines Table */}
        <div className="overflow-y-auto max-h-[400px] border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600">Item</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600">Expected</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600">Counted</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-600">Variance</th>
                {isInProgress && (
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-28">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line) => {
                const isEditing = editingLineId === line.id;
                const cf = line.items?.conversion_factor || 1;
                const hasVariance =
                  line.variance !== null && Math.abs(line.variance) > 0.01;
                const expectedBags = toBags(line.expected_qty, cf);
                const countedBags = line.counted_qty !== null ? toBags(line.counted_qty, cf) : null;
                const varianceBags = line.variance !== null ? toBags(line.variance, cf) : null;

                return (
                  <tr
                    key={line.id}
                    className={hasVariance ? 'bg-amber-50' : ''}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900">
                        {line.items?.name || 'Unknown'}
                      </div>
                      {line.notes && (
                        <div className="text-xs text-gray-400 mt-0.5">{line.notes}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">
                      {expectedBags} bags
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={countValue}
                          onChange={(e) => setCountValue(e.target.value)}
                          step="1"
                          min="0"
                          className="w-24 ml-auto block rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCount(line.id);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              cancelEditing();
                            }
                          }}
                        />
                      ) : countedBags !== null ? (
                        <span className="text-gray-900">{countedBags} bags</span>
                      ) : (
                        <span className="text-gray-300 italic">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {varianceBags !== null ? (
                        <span
                          className={
                            hasVariance
                              ? (line.variance ?? 0) > 0
                                ? 'text-emerald-600 font-medium'
                                : 'text-red-600 font-medium'
                              : 'text-gray-400'
                          }
                        >
                          {varianceBags > 0 ? '+' : ''}
                          {varianceBags} bags
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    {isInProgress && (
                      <td className="px-3 py-2.5 text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleSaveCount(line.id)}
                              disabled={updateLineMutation.isPending}
                              className="p-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(line)}
                            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 ml-auto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {line.counted_qty !== null ? 'Edit' : 'Count'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {isInProgress && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                isLoading={cancelMutation.isPending}
              >
                Cancel Take
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!canComplete}
                isLoading={completeMutation.isPending}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete ({stockTake?.lines_counted}/{stockTake?.total_lines})
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
