import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Keyboard, Mail, Truck, X, XCircle } from 'lucide-react';
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

type ModalStep = 'confirm' | 'reject' | 'success';

const KG_PER_BAG = 10;

function formatBags(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export default function ConfirmDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  delivery,
}: ConfirmDeliveryModalProps) {
  const queryClient = useQueryClient();
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<ModalStep>('confirm');
  const [confirmedBags, setConfirmedBags] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [kmEmailWarning, setKmEmailWarning] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [bagRegistration, setBagRegistration] = useState<{
    registered: { barcode: string }[];
    skipped: { barcode: string; reason: string }[];
  } | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !delivery) {
      return;
    }

    const initialBags = delivery.driver_scanned_bags
      || delivery.driver_claimed_bags
      || Math.round(delivery.driver_claimed_qty_kg / KG_PER_BAG);

    setStep('confirm');
    setConfirmedBags(initialBags);
    setNotes('');
    setError(null);
    setRejectReason('');
    setKmEmailWarning(null);
    setIsConfirming(false);
    setBagRegistration(null);
  }, [delivery, isOpen]);

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => pendingDeliveriesApi.reject(delivery!.id, { reason }),
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

  if (!isOpen || !delivery) {
    return null;
  }

  const driverClaimedBags = delivery.driver_claimed_bags || (delivery.driver_claimed_qty_kg / KG_PER_BAG);
  const driverScannedBags = delivery.driver_scanned_bags || 0;
  const requestedBags = delivery.stock_request?.quantity_bags || 0;
  const driverHasScan = driverScannedBags > 0;
  const discrepancyBags = Math.abs(confirmedBags - driverClaimedBags);
  const discrepancyKg = discrepancyBags * KG_PER_BAG;
  const hasDiscrepancy = discrepancyBags > 0.01;

  const handleConfirm = async () => {
    if (confirmedBags <= 0) {
      setError('Bag count must be greater than 0');
      return;
    }

    setError(null);
    setIsConfirming(true);

    try {
      const response = await pendingDeliveriesApi.confirm(delivery.id, {
        confirmed_bags: confirmedBags,
        notes: notes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });

      const kmEmailStatus = response.data?.km_email_status as KmEmailStatus | undefined;
      if (kmEmailStatus && !kmEmailStatus.sent && kmEmailStatus.reason) {
        setKmEmailWarning(kmEmailStatus.reason);
      }

      setBagRegistration(response.data?.bag_registration || null);
      setStep('success');
      onSuccess();

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

  const successMessage = bagRegistration
    ? `${bagRegistration.registered.length} bag${bagRegistration.registered.length === 1 ? '' : 's'} registered`
    : `${confirmedBags} bag${confirmedBags === 1 ? '' : 's'} confirmed`;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {step === 'reject' ? 'Reject Delivery' : step === 'success' ? 'Delivery Confirmed' : 'Confirm Delivery'}
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

          {step !== 'success' && (
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {delivery.supplier?.name || 'Unknown'} via {delivery.trip?.driver_name || 'Unknown'}
                </span>
                <span className="font-semibold text-gray-900">{formatBags(driverClaimedBags)} bags claimed</span>
              </div>
              {requestedBags > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">Requested: {requestedBags} bags</p>
              )}
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {step === 'confirm' && (
              <div className="p-5 space-y-4">
                {driverHasScan ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Driver scan completed</p>
                        <p className="text-blue-700 mt-1">
                          {driverScannedBags} bag{driverScannedBags === 1 ? '' : 's'} were scanned by the driver before handoff.
                        </p>
                        <p className="text-blue-600 mt-1">
                          Confirm the delivered bag count. The stored barcodes will be registered automatically after confirmation.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Keyboard className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900">No driver scan found</p>
                        <p className="text-amber-700 mt-1">
                          Enter the total number of bags received to confirm this delivery.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className={`rounded-xl p-4 text-center ${driverHasScan ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className={`text-3xl font-bold ${driverHasScan ? 'text-emerald-800' : 'text-gray-900'}`}>
                    {driverHasScan ? driverScannedBags : confirmedBags} bag{(driverHasScan ? driverScannedBags : confirmedBags) === 1 ? '' : 's'}
                  </p>
                  <p className={`text-sm mt-1 ${driverHasScan ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {driverHasScan ? 'Driver-scanned handoff' : 'Manager-confirmed total'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Recorded internally as {(confirmedBags * KG_PER_BAG).toFixed(0)} kg
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Driver claimed</span>
                    <span className="font-medium text-gray-900">{formatBags(driverClaimedBags)} bags</span>
                  </div>
                  {driverHasScan && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Driver scanned</span>
                      <span className="font-semibold text-gray-900">{driverScannedBags} bags</span>
                    </div>
                  )}
                  {requestedBags > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Requested</span>
                      <span className="font-medium text-gray-900">{requestedBags} bags</span>
                    </div>
                  )}
                </div>

                {!driverHasScan && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bags Received
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={confirmedBags || ''}
                      onChange={(e) => setConfirmedBags(e.target.value ? parseInt(e.target.value, 10) : 0)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-semibold"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Equivalent to {(confirmedBags * KG_PER_BAG).toFixed(0)} kg in the current stock model
                    </p>
                  </div>
                )}

                {hasDiscrepancy && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Bag count discrepancy</p>
                      <p className="text-amber-700">
                        Difference of {formatBags(discrepancyBags)} bag{discrepancyBags === 1 ? '' : 's'} ({discrepancyKg.toFixed(1)} kg)
                        from the driver claim.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes {hasDiscrepancy && <span className="text-amber-600">(recommended)</span>}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder={hasDiscrepancy ? 'Explain the discrepancy...' : 'Any notes about the delivery...'}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setStep('reject'); setError(null); }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isConfirming || confirmedBags <= 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isConfirming ? 'Confirming...' : 'Confirm Receipt'}
                  </Button>
                </div>
              </div>
            )}

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
                    onClick={() => { setStep('confirm'); setError(null); }}
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

            {step === 'success' && (
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delivery Confirmed!</h3>
                  <p className="text-sm text-gray-500 mt-1">{successMessage}</p>
                </div>

                {bagRegistration && bagRegistration.skipped.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-800">
                          {bagRegistration.skipped.length} barcode(s) were skipped
                        </p>
                        <div className="mt-2 space-y-1">
                          {bagRegistration.skipped.map((item) => (
                            <p key={item.barcode} className="text-sm text-amber-700">
                              <span className="font-mono">{item.barcode}</span> - {item.reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
