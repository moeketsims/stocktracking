import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Package, Truck, X } from 'lucide-react';
import { Button, Modal } from '../ui';
import { toast } from '../ui/Toast';
import BarcodeScanner from '../barcode/BarcodeScanner';
import { bagsApi, tripsApi } from '../../lib/api';
import type { StockRequest } from '../../types';

interface DriverDeliveryScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: StockRequest | null;
}

export default function DriverDeliveryScanModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: DriverDeliveryScanModalProps) {
  const queryClient = useQueryClient();
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [lastScanError, setLastScanError] = useState<string | null>(null);
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScannedBarcodes([]);
      setLastScanError(null);
      setIsCheckingBarcode(false);
      setIsCompleting(false);
    }
  }, [isOpen]);

  const tripId = request?.trips?.id;
  const expectedBags = request?.quantity_bags || 0;

  const { data: stopsData, isLoading: isLoadingStops } = useQuery({
    queryKey: ['trip-stops', tripId, 'driver-delivery-scan'],
    queryFn: () => tripsApi.getStops(tripId!).then((response) => response.data),
    enabled: isOpen && !!tripId,
  });

  const activeStop = useMemo(() => {
    const stops = stopsData?.stops || [];

    const matchingDropoff = stops.find((stop: any) =>
      stop.stop_type === 'dropoff'
      && !stop.is_completed
      && (stop.location_id === request?.location_id || stop.locations?.id === request?.location_id)
    );

    if (matchingDropoff) {
      return matchingDropoff;
    }

    return stops.find((stop: any) => stop.stop_type === 'dropoff' && !stop.is_completed) || null;
  }, [request?.location_id, stopsData?.stops]);

  const handleScan = useCallback(async (barcode: string) => {
    setLastScanError(null);

    if (scannedBarcodes.includes(barcode)) {
      setLastScanError(`"${barcode}" already scanned in this session`);
      toast.warning('Duplicate barcode');
      return;
    }

    setIsCheckingBarcode(true);
    try {
      const response = await bagsApi.check(barcode);
      if (response.data.exists) {
        const receivedDate = response.data.received
          ? new Date(response.data.received).toLocaleDateString()
          : 'unknown date';
        setLastScanError(
          `Barcode "${barcode}" already in system (status: ${response.data.status}, received: ${receivedDate})`
        );
        toast.warning(`Duplicate: ${barcode} is already ${response.data.status}`);
        return;
      }
    } catch {
      // Keep the UX moving. Final duplicate protection still happens when bags are registered later.
    } finally {
      setIsCheckingBarcode(false);
    }

    setScannedBarcodes((prev) => [...prev, barcode]);
  }, [scannedBarcodes]);

  const handleRemoveBarcode = useCallback((barcode: string) => {
    setScannedBarcodes((prev) => prev.filter((value) => value !== barcode));
  }, []);

  const handleComplete = useCallback(async () => {
    if (!request || !tripId) {
      setLastScanError('Trip information is missing for this delivery');
      return;
    }

    if (!activeStop) {
      setLastScanError('No active dropoff stop was found for this delivery');
      return;
    }

    if (scannedBarcodes.length === 0) {
      setLastScanError('Scan at least one bag before completing delivery');
      return;
    }

    setIsCompleting(true);
    setLastScanError(null);

    try {
      await tripsApi.completeStop(activeStop.id, {
        actual_bags: scannedBarcodes.length,
        notes: `Driver scanned ${scannedBarcodes.length} bag(s) on delivery handoff`,
        scanned_barcodes: scannedBarcodes,
      });

      await queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-requests', 'my'] });
      await queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });

      toast.success('Bags scanned. Awaiting location manager confirmation.');
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to complete delivery scan';
      setLastScanError(detail);
      toast.error(detail);
    } finally {
      setIsCompleting(false);
    }
  }, [activeStop, onClose, onSuccess, queryClient, request, scannedBarcodes, tripId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Delivered Bags" size="lg">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900">
                {request?.location?.name || 'Delivery stop'}
              </p>
              <p className="text-blue-700">
                Trip #{request?.trips?.trip_number || 'Unknown'} - Expected {expectedBags} bags
              </p>
              <p className="text-blue-600">
                Scan each delivered bag. The location manager will confirm the total after handoff.
              </p>
            </div>
          </div>
        </div>

        {isLoadingStops && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            Loading delivery stop...
          </div>
        )}

        {!isLoadingStops && !activeStop && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            No active dropoff stop is available for this request.
          </div>
        )}

        <BarcodeScanner
          onScan={handleScan}
          isActive={isOpen && !isCompleting && !!activeStop}
          disabled={!activeStop}
        />

        {isCheckingBarcode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <span className="animate-pulse text-blue-600 text-sm font-medium">
              Checking barcode...
            </span>
          </div>
        )}

        {lastScanError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <span className="text-red-700 text-sm">{lastScanError}</span>
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <span className="text-lg font-bold text-emerald-800">
                {scannedBarcodes.length}
              </span>
              <span className="text-sm text-emerald-700">
                of {expectedBags} bags scanned
              </span>
            </div>
            <span className="text-sm font-medium text-emerald-700">
              {Math.max(0, expectedBags - scannedBarcodes.length)} remaining
            </span>
          </div>
          <div className="mt-2 h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${expectedBags > 0 ? Math.min(100, (scannedBarcodes.length / expectedBags) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {scannedBarcodes.length > 0 && (
          <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {[...scannedBarcodes].reverse().map((barcode) => (
              <div key={barcode} className="px-3 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="font-mono text-sm text-gray-700 truncate">{barcode}</span>
                </div>
                <button
                  onClick={() => handleRemoveBarcode(barcode)}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  title="Remove barcode"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting || scannedBarcodes.length === 0 || !activeStop}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isCompleting ? 'Saving Scan...' : 'Complete Delivery'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
