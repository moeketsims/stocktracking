import { useState, useCallback, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { toast } from '../ui';
import BarcodeScanner from '../barcode/BarcodeScanner';
import { bagsApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Package, Undo2, X } from 'lucide-react';
import type { BagIssueResponse } from '../../types';

interface IssuedBag {
  id: string;
  barcode: string;
  weight_kg: number;
  batch_id: string;
  fifo_warning: BagIssueResponse['fifo_warning'];
  issued_at: string;
}

interface ScanIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanIssueModal({ isOpen, onClose, onSuccess }: ScanIssueModalProps) {
  const [issuedBags, setIssuedBags] = useState<IssuedBag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const queryClient = useQueryClient();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIssuedBags([]);
      setLastError(null);
      setShowSummary(false);
    }
  }, [isOpen]);

  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setLastError(null);

    try {
      const response = await bagsApi.issue({ barcode });
      const data: BagIssueResponse = response.data;

      const newBag: IssuedBag = {
        id: data.bag.id,
        barcode: data.bag.barcode,
        weight_kg: data.bag.weight_kg,
        batch_id: data.bag.batch_id,
        fifo_warning: data.fifo_warning,
        issued_at: new Date().toISOString(),
      };

      setIssuedBags(prev => [newBag, ...prev]);

      if (data.fifo_warning) {
        toast.warning('FIFO Warning: Older stock should be used first');
      } else {
        toast.success(`Bag issued — ${data.kg_deducted}kg deducted`);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to issue bag';
      setLastError(detail);
      toast.error(detail);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const handleUndoIssue = useCallback(async (bag: IssuedBag) => {
    try {
      await bagsApi.undoIssue(bag.id);
      setIssuedBags(prev => prev.filter(b => b.id !== bag.id));
      toast.success(`Undo: ${bag.weight_kg}kg restored`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to undo');
    }
  }, []);

  const handleDone = useCallback(() => {
    if (issuedBags.length > 0) {
      setShowSummary(true);
    } else {
      onClose();
    }
  }, [issuedBags.length, onClose]);

  const handleCloseSummary = useCallback(() => {
    // Invalidate queries to refresh stock data
    queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
    queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
    queryClient.invalidateQueries({ queryKey: ['batches'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['bags'] });
    onSuccess();
    onClose();
  }, [queryClient, onSuccess, onClose]);

  const totalKg = issuedBags.reduce((sum, b) => sum + b.weight_kg, 0);
  const totalBags = issuedBags.length;

  // Summary view after clicking "Done"
  if (showSummary) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseSummary} title="Issue Summary" size="md">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800">
              {totalBags} bag{totalBags !== 1 ? 's' : ''} issued
            </h3>
            <p className="text-green-600 text-2xl font-bold mt-1">
              {totalKg.toFixed(1)} kg total
            </p>
          </div>

          {issuedBags.some(b => b.fifo_warning) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {issuedBags.filter(b => b.fifo_warning).length} bag{issuedBags.filter(b => b.fifo_warning).length !== 1 ? 's' : ''} issued from non-oldest batch (FIFO)
                </span>
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {issuedBags.map((bag) => (
              <div key={bag.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-gray-700">{bag.barcode}</span>
                  {bag.fifo_warning && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1.5" />
                  )}
                </div>
                <span className="text-gray-500">{bag.weight_kg}kg</span>
              </div>
            ))}
          </div>

          <Button onClick={handleCloseSummary} className="w-full">
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  // Main scanning view
  return (
    <Modal isOpen={isOpen} onClose={handleDone} title="Scan to Issue" size="lg">
      <div className="space-y-4">
        {/* Scanner */}
        <BarcodeScanner
          onScan={handleScan}
          isActive={isOpen && !isProcessing}
        />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="animate-pulse text-blue-600 text-sm font-medium">
              Processing scan...
            </div>
          </div>
        )}

        {/* Last error */}
        {lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-red-700 text-sm">{lastError}</span>
          </div>
        )}

        {/* Running total */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">
              {totalBags} bag{totalBags !== 1 ? 's' : ''} scanned
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {totalKg.toFixed(1)} kg
          </span>
        </div>

        {/* Issued bags list */}
        {issuedBags.length > 0 && (
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {issuedBags.map((bag) => (
              <div key={bag.id} className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-sm text-gray-700 truncate">{bag.barcode}</span>
                  {bag.fifo_warning && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded flex-shrink-0">
                      FIFO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-500">{bag.weight_kg}kg</span>
                  <button
                    onClick={() => handleUndoIssue(bag)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Undo issue (5 min window)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleDone} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
