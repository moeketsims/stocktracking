import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Truck, AlertTriangle, CheckCircle, XCircle, Mail, Package, Trash2, Keyboard } from 'lucide-react';
import { Button } from '../ui';
import { pendingDeliveriesApi, bagsApi } from '../../lib/api';
import type { PendingDelivery } from '../../types';
import BarcodeScanner from '../barcode/BarcodeScanner';

interface KmEmailStatus {
  sent: boolean;
  reason: string | null;
}

interface ConfirmDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  delivery: PendingDelivery | null;
}

type ModalStep = 'scan' | 'review' | 'manual' | 'reject' | 'success';

const KG_PER_BAG = 10;

export default function ConfirmDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  delivery,
}: ConfirmDeliveryModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ModalStep>('scan');
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [lastScanError, setLastScanError] = useState<string | null>(null);
  const [confirmedQtyKg, setConfirmedQtyKg] = useState<number>(0);
  const [unit, setUnit] = useState<'kg' | 'bags'>('bags');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [kmEmailWarning, setKmEmailWarning] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && delivery) {
      setStep('scan');
      setScannedBarcodes([]);
      setLastScanError(null);
      setConfirmedQtyKg(delivery.driver_claimed_qty_kg);
      setUnit('bags');
      setNotes('');
      setError(null);
      setRejectReason('');
      setKmEmailWarning(null);
      setIsConfirming(false);
    }
  }, [isOpen, delivery]);

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      pendingDeliveriesApi.reject(delivery!.id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to reject delivery');
    },
  });

  // --- Scan handlers ---

  const handleScan = useCallback((barcode: string) => {
    setLastScanError(null);
    if (scannedBarcodes.includes(barcode)) {
      setLastScanError(`"${barcode}" already scanned`);
      return;
    }
    setScannedBarcodes(prev => [...prev, barcode]);
  }, [scannedBarcodes]);

  const handleRemoveBarcode = useCallback((barcode: string) => {
    setScannedBarcodes(prev => prev.filter(b => b !== barcode));
  }, []);

  const handleDoneScanning = () => {
    setConfirmedQtyKg(scannedBarcodes.length * KG_PER_BAG);
    setStep('review');
  };

  const handleManualEntry = () => {
    setStep('manual');
  };

  // --- Confirm handler (scan-based or manual) ---

  const handleConfirm = async () => {
    const qty = step === 'review' ? scannedBarcodes.length * KG_PER_BAG : confirmedQtyKg;
    if (qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setError(null);
    setIsConfirming(true);

    try {
      // Step 1: Confirm delivery → creates batch
      const response = await pendingDeliveriesApi.confirm(delivery!.id, {
        confirmed_qty_kg: qty,
        notes: notes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });

      // Check km_email_status for warnings
      const kmEmailStatus = response.data?.km_email_status as KmEmailStatus | undefined;
      if (kmEmailStatus && !kmEmailStatus.sent && kmEmailStatus.reason) {
        setKmEmailWarning(kmEmailStatus.reason);
      }

      // Step 2: If we have scanned barcodes, bulk register them
      const batchId = response.data?.batch_id;
      if (batchId && scannedBarcodes.length > 0) {
        try {
          await bagsApi.registerBulk({ barcodes: scannedBarcodes, batch_id: batchId });
        } catch (regErr: any) {
          // Delivery confirmed but bag registration failed — not a fatal error
          console.error('Bag registration failed:', regErr);
        }
      }

      setStep('success');
      onSuccess();

      // Auto-close after 2 seconds if no km email warning
      if (!kmEmailStatus || kmEmailStatus.sent || !kmEmailStatus.reason) {
        autoCloseTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to confirm delivery');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate(rejectReason);
  };

  if (!isOpen || !delivery) return null;

  const driverClaimedBags = delivery.driver_claimed_qty_kg / KG_PER_BAG;
  const requestedBags = delivery.stock_request?.quantity_bags || 0;
  const scannedKg = scannedBarcodes.length * KG_PER_BAG;

  // For review/manual steps: check discrepancy
  const activeQtyKg = step === 'review' ? scannedKg : confirmedQtyKg;
  const hasDiscrepancy = Math.abs(activeQtyKg - delivery.driver_claimed_qty_kg) > 0.1;
  const discrepancyKg = Math.abs(activeQtyKg - delivery.driver_claimed_qty_kg);

  const confirmedBags = confirmedQtyKg / KG_PER_BAG;
  const displayQty = unit === 'bags' ? confirmedBags : confirmedQtyKg;
  const handleQtyChange = (value: number) => {
    if (unit === 'bags') {
      setConfirmedQtyKg(value * KG_PER_BAG);
    } else {
      setConfirmedQtyKg(value);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {step === 'scan' ? 'Receive Delivery' : step === 'review' ? 'Review & Confirm' : step === 'reject' ? 'Reject Delivery' : step === 'success' ? 'Delivery Confirmed' : 'Confirm Delivery'}
                </h2>
                <p className="text-sm text-gray-500">Trip #{delivery.trip?.trip_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Delivery Info (compact, always visible except success) */}
          {step !== 'success' && (
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {delivery.supplier?.name || 'Unknown'} via {delivery.trip?.driver_name || 'Unknown'}
                </span>
                <span className="font-semibold text-gray-900">{driverClaimedBags} bags claimed</span>
              </div>
              {requestedBags > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">Requested: {requestedBags} bags</p>
              )}
            </div>
          )}

          {/* Scrollable content area */}
          <div className="overflow-y-auto flex-1">
            {/* ==================== SCAN STEP ==================== */}
            {step === 'scan' && (
              <div className="p-5 space-y-4">
                {/* Scanner */}
                <BarcodeScanner
                  onScan={handleScan}
                  isActive={isOpen && !isConfirming}
                />

                {/* Scan error */}
                {lastScanError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{lastScanError}</span>
                  </div>
                )}

                {/* Running count */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-600" />
                      <span className="text-lg font-bold text-emerald-800">
                        {scannedBarcodes.length}
                      </span>
                      <span className="text-sm text-emerald-600">
                        of {driverClaimedBags} bags scanned
                      </span>
                    </div>
                    <span className="text-sm font-medium text-emerald-700">
                      {scannedKg} kg
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (scannedBarcodes.length / driverClaimedBags) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Scanned barcodes list */}
                {scannedBarcodes.length > 0 && (
                  <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                    {[...scannedBarcodes].reverse().map((barcode, idx) => (
                      <div key={barcode} className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="font-mono text-sm text-gray-700 truncate">{barcode}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveBarcode(barcode)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep('reject')}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      onClick={handleDoneScanning}
                      disabled={scannedBarcodes.length === 0}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Done Scanning ({scannedBarcodes.length} bag{scannedBarcodes.length !== 1 ? 's' : ''})
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualEntry}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Keyboard className="w-4 h-4" />
                    Can't scan? Enter count manually
                  </button>
                </div>
              </div>
            )}

            {/* ==================== REVIEW STEP ==================== */}
            {step === 'review' && (
              <div className="p-5 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Scanned summary */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-800">
                    {scannedBarcodes.length} bag{scannedBarcodes.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-emerald-600 text-sm mt-1">{scannedKg} kg scanned</p>
                </div>

                {/* Comparison */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">You scanned</span>
                    <span className="font-semibold text-gray-900">{scannedBarcodes.length} bags</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Driver claimed</span>
                    <span className="font-medium text-gray-900">{driverClaimedBags} bags</span>
                  </div>
                  {requestedBags > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">You requested</span>
                      <span className="font-medium text-gray-900">{requestedBags} bags</span>
                    </div>
                  )}
                </div>

                {/* Discrepancy Warning */}
                {hasDiscrepancy && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Quantity discrepancy</p>
                      <p className="text-amber-700">
                        {scannedBarcodes.length < driverClaimedBags
                          ? `${driverClaimedBags - scannedBarcodes.length} fewer bags than driver claimed`
                          : `${scannedBarcodes.length - driverClaimedBags} more bags than driver claimed`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes {hasDiscrepancy && <span className="text-amber-600">(recommended)</span>}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder={hasDiscrepancy
                      ? "Explain the discrepancy..."
                      : "Any notes about the delivery..."
                    }
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep('scan')}
                    className="flex-1"
                  >
                    Back to Scanning
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isConfirming ? 'Confirming...' : 'Confirm Receipt'}
                  </Button>
                </div>
              </div>
            )}

            {/* ==================== MANUAL ENTRY STEP ==================== */}
            {step === 'manual' && (
              <div className="p-5 space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Quantity Received */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Received
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step={unit === 'bags' ? '1' : '0.1'}
                        value={displayQty || ''}
                        onChange={(e) => handleQtyChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-semibold"
                      />
                    </div>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { if (unit === 'kg') setUnit('bags'); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${unit === 'bags'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        bags
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (unit === 'bags') setUnit('kg'); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${unit === 'kg'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        kg
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {unit === 'bags'
                      ? `= ${confirmedQtyKg.toLocaleString()} kg`
                      : `= ${confirmedBags.toFixed(1)} bags`}
                  </p>
                </div>

                {/* Discrepancy Warning */}
                {hasDiscrepancy && (
                  <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Quantity discrepancy</p>
                      <p className="text-amber-700">
                        Difference of {(discrepancyKg / KG_PER_BAG).toFixed(1)} bags ({discrepancyKg.toFixed(1)} kg)
                        from driver's claim
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes {hasDiscrepancy && <span className="text-amber-600">(recommended)</span>}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder={hasDiscrepancy
                      ? "Explain the discrepancy..."
                      : "Any notes about the delivery..."
                    }
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep('scan')}
                    className="flex-1"
                  >
                    Back to Scanning
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isConfirming || confirmedQtyKg <= 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isConfirming ? 'Confirming...' : 'Confirm Receipt'}
                  </Button>
                </div>
              </div>
            )}

            {/* ==================== REJECT STEP ==================== */}
            {step === 'reject' && (
              <div className="p-5 space-y-4">
                <div className="p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <XCircle className="w-5 h-5" />
                    Reject this delivery?
                  </div>
                  <p className="text-sm text-red-600">
                    This will cancel the delivery and associated stock request.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Explain why you're rejecting this delivery..."
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setStep('scan'); setError(null); }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending || !rejectReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject Delivery'}
                  </Button>
                </div>
              </div>
            )}

            {/* ==================== SUCCESS STEP ==================== */}
            {step === 'success' && (
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delivery Confirmed!</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {scannedBarcodes.length > 0
                      ? `${scannedBarcodes.length} bags (${scannedKg} kg) received and registered`
                      : 'Stock has been added to inventory'}
                  </p>
                </div>

                {kmEmailWarning && (
                  <>
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">KM Submission Email Not Sent</p>
                          <p className="text-sm text-amber-700 mt-1">{kmEmailWarning}</p>
                          <p className="text-xs text-amber-600 mt-2">
                            The driver will need to manually submit their closing km, or you can resend the email from the deliveries page.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={onClose}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      Done
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
