import { useState, useCallback, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { toast } from '../ui';
import BarcodeScanner from '../barcode/BarcodeScanner';
import { bagsApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Package, X, AlertTriangle } from 'lucide-react';

interface RegisteredBag {
  id: string;
  barcode: string;
  weight_kg: number;
}

interface ScanReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  batchInfo?: {
    itemName?: string;
    locationName?: string;
  };
}

export default function ScanReceiveModal({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  batchInfo,
}: ScanReceiveModalProps) {
  const [registeredBags, setRegisteredBags] = useState<RegisteredBag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const queryClient = useQueryClient();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRegisteredBags([]);
      setLastError(null);
      setShowSummary(false);
    }
  }, [isOpen]);

  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    // Check for duplicate in current session
    if (registeredBags.some(b => b.barcode === barcode)) {
      setLastError(`Barcode "${barcode}" already scanned in this session`);
      toast.warning('Duplicate barcode');
      return;
    }

    setIsProcessing(true);
    setLastError(null);

    try {
      const response = await bagsApi.register({ barcode, batch_id: batchId });
      const data = response.data;

      const newBag: RegisteredBag = {
        id: data.bag.id,
        barcode: data.bag.barcode,
        weight_kg: data.bag.weight_kg,
      };

      setRegisteredBags(prev => [newBag, ...prev]);
      toast.success(`Bag registered (${data.bag.weight_kg}kg)`);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to register bag';
      setLastError(detail);
      toast.error(detail);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, batchId, registeredBags]);

  const handleDone = useCallback(() => {
    if (registeredBags.length > 0) {
      setShowSummary(true);
    } else {
      onClose();
    }
  }, [registeredBags.length, onClose]);

  const handleCloseSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['batches'] });
    queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
    queryClient.invalidateQueries({ queryKey: ['stock-by-location'] });
    queryClient.invalidateQueries({ queryKey: ['bags'] });
    onSuccess();
    onClose();
  }, [queryClient, onSuccess, onClose]);

  const totalKg = registeredBags.reduce((sum, b) => sum + b.weight_kg, 0);
  const totalBags = registeredBags.length;

  // Summary view
  if (showSummary) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseSummary} title="Registration Summary" size="md">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800">
              {totalBags} bag{totalBags !== 1 ? 's' : ''} registered
            </h3>
            <p className="text-green-600 text-2xl font-bold mt-1">
              {totalKg.toFixed(1)} kg total
            </p>
            {batchInfo?.itemName && (
              <p className="text-green-600 text-sm mt-2">{batchInfo.itemName}</p>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {registeredBags.map((bag) => (
              <div key={bag.id} className="py-2 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700">{bag.barcode}</span>
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
    <Modal isOpen={isOpen} onClose={handleDone} title="Scan Bags to Register" size="lg">
      <div className="space-y-4">
        {/* Batch info */}
        {batchInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Registering bags for: <span className="font-medium">{batchInfo.itemName || 'Unknown item'}</span>
            {batchInfo.locationName && (
              <span> at {batchInfo.locationName}</span>
            )}
          </div>
        )}

        {/* Scanner */}
        <BarcodeScanner
          onScan={handleScan}
          isActive={isOpen && !isProcessing}
        />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="animate-pulse text-blue-600 text-sm font-medium">
              Registering bag...
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
              {totalBags} bag{totalBags !== 1 ? 's' : ''} registered
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {totalKg.toFixed(1)} kg
          </span>
        </div>

        {/* Registered bags list */}
        {registeredBags.length > 0 && (
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {registeredBags.map((bag) => (
              <div key={bag.id} className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-sm text-gray-700 truncate">{bag.barcode}</span>
                </div>
                <span className="text-sm text-gray-500 flex-shrink-0">{bag.weight_kg}kg</span>
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
