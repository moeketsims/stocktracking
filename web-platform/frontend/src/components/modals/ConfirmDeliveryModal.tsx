import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Truck, Package, AlertTriangle, CheckCircle, XCircle, Mail } from 'lucide-react';
import { Button } from '../ui';
import { pendingDeliveriesApi } from '../../lib/api';
import type { PendingDelivery } from '../../types';

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

const KG_PER_BAG = 10;

export default function ConfirmDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  delivery,
}: ConfirmDeliveryModalProps) {
  const queryClient = useQueryClient();
  const [confirmedQtyKg, setConfirmedQtyKg] = useState<number>(0);
  const [unit, setUnit] = useState<'kg' | 'bags'>('bags');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [kmEmailWarning, setKmEmailWarning] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && delivery) {
      setConfirmedQtyKg(delivery.driver_claimed_qty_kg);
      setUnit('bags');
      setNotes('');
      setError(null);
      setShowRejectConfirm(false);
      setRejectReason('');
      setKmEmailWarning(null);
      setShowSuccess(false);
    }
  }, [isOpen, delivery]);

  const confirmMutation = useMutation({
    mutationFn: (data: { confirmed_qty_kg: number; notes?: string }) =>
      pendingDeliveriesApi.confirm(delivery!.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });

      // Feature 5: Check km_email_status for warnings
      const kmEmailStatus = response.data?.km_email_status as KmEmailStatus | undefined;
      if (kmEmailStatus && !kmEmailStatus.sent && kmEmailStatus.reason) {
        setKmEmailWarning(kmEmailStatus.reason);
      }

      // Always show success popup
      setShowSuccess(true);
      onSuccess();

      // Auto-close after 2 seconds if no km email warning (warning requires user acknowledgment)
      if (!kmEmailStatus || kmEmailStatus.sent || !kmEmailStatus.reason) {
        autoCloseTimeoutRef.current = setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to confirm delivery');
    },
  });

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

  const handleConfirm = () => {
    if (confirmedQtyKg <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    setError(null);
    confirmMutation.mutate({
      confirmed_qty_kg: confirmedQtyKg,
      notes: notes || undefined,
    });
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
  const confirmedBags = confirmedQtyKg / KG_PER_BAG;
  const requestedBags = delivery.stock_request?.quantity_bags || 0;
  const hasDiscrepancy = Math.abs(confirmedQtyKg - delivery.driver_claimed_qty_kg) > 0.1;
  const discrepancyKg = Math.abs(confirmedQtyKg - delivery.driver_claimed_qty_kg);

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
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Confirm Delivery</h2>
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

          {/* Delivery Info */}
          <div className="p-5 bg-gray-50 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Driver</span>
              <span className="font-medium text-gray-900">{delivery.trip?.driver_name || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Supplier</span>
              <span className="font-medium text-gray-900">{delivery.supplier?.name || 'Unknown'}</span>
            </div>
            {requestedBags > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Your request</span>
                <span className="font-medium text-gray-900">{requestedBags} bags</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Driver delivered</span>
              <span className="font-semibold text-gray-900">{driverClaimedBags} bags</span>
            </div>
          </div>

          {showSuccess ? (
            // Success screen
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delivery Confirmed!</h3>
                <p className="text-sm text-gray-500 mt-1">Stock has been added to inventory</p>
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
                    onClick={() => {
                      setShowSuccess(false);
                      onClose();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Done
                  </Button>
                </>
              )}
            </div>
          ) : showRejectConfirm ? (
            // Reject Confirmation
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
                  onClick={() => setShowRejectConfirm(false)}
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
          ) : (
            // Confirm Form
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
                      onClick={() => {
                        if (unit === 'kg') {
                          setUnit('bags');
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${unit === 'bags'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      bags
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (unit === 'bags') {
                          setUnit('kg');
                        }
                      }}
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
                  onClick={() => setShowRejectConfirm(true)}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirmMutation.isPending || confirmedQtyKg <= 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm Receipt'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
